import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRightCircle, ClipboardCheck, FileCheck2, FilePlus2, Pencil, Plus, ShieldCheck, Sparkles } from 'lucide-react';

import FormModal from '../components/FormModal';
import EmptyState from '../components/ui/EmptyState';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { empresasService, sstService } from '../services/api';

const STATUS_LABELS = { draft: 'Rascunho', in_review: 'Em revisao', published: 'Publicada', superseded: 'Substituida' };
const STATUS_CLASSES = { draft: 'status-warning', in_review: 'status-info', published: 'status-success', superseded: 'status-danger' };

const splitLines = (value) => String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
const formatDate = (value) => {
  if (!value) return 'Sem data';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Data invalida' : parsed.toLocaleDateString('pt-BR');
};

const formatDateOnly = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return 'Sem data';
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split('-');
    return `${day}/${month}/${year}`;
  }
  return formatDate(normalized);
};

const formatCoverageRange = (start, end) => {
  const normalizedStart = String(start || '').trim();
  const normalizedEnd = String(end || '').trim();
  if (!normalizedStart || !normalizedEnd) return 'Abrangencia nao informada';
  return `${formatDateOnly(normalizedStart)} a ${formatDateOnly(normalizedEnd)}`;
};

const mapReadinessLabel = (entry) => {
  if (!entry) return 'Sem validacao';
  if (entry.loading) return 'Validando...';
  if (entry.error) return 'Erro na validacao';
  if (entry.blocking) return `Bloqueado (${entry.missingFields?.length || 0})`;
  return 'Emitivel';
};

const SstAssessments = () => {
  const { hasPermission, user } = useAuth();
  const canWrite = hasPermission('sst:write');
  const canApprove = hasPermission('sst:approve');
  const canSign = hasPermission('sst:sign');

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [roles, setRoles] = useState([]);
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ empresaId: '', sectorId: '', roleId: '', status: '' });
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);

  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [editingAssessmentId, setEditingAssessmentId] = useState(null);
  const [assessmentForm, setAssessmentForm] = useState({
    roleId: '',
    title: '',
    abrangenciaInicio: '',
    abrangenciaFim: '',
    context: {
      processoPrincipal: '',
      localAreaPosto: '',
      jornadaTurno: '',
      quantidadeExpostos: 1,
      condicaoOperacional: '',
      metodologia: '',
      instrumentosUtilizados: '',
      criteriosAvaliacao: '',
      matrizRisco: ''
    },
    responsibleTechnical: { nome: '', email: '', registro: '' }
  });
  const [assessmentError, setAssessmentError] = useState('');
  const [assessmentSaving, setAssessmentSaving] = useState(false);

  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const [riskForm, setRiskForm] = useState({ factor: '', hazard: '', agent: '', source: '', exposure: '', damage: '', probability: 1, severity: 1, controls: '', actionPlanItems: '', highRiskJustification: '' });
  const [riskError, setRiskError] = useState('');
  const [riskSaving, setRiskSaving] = useState(false);
  const [editingRiskId, setEditingRiskId] = useState(null);

  const [conclusionModalOpen, setConclusionModalOpen] = useState(false);
  const [conclusionForm, setConclusionForm] = useState({ result: '', basis: '', normativeFrame: '' });
  const [conclusionError, setConclusionError] = useState('');
  const [conclusionSaving, setConclusionSaving] = useState(false);
  const [documentReadiness, setDocumentReadiness] = useState({ pgr: null, ltcat: null });

  const resetAssessmentForm = () =>
    setAssessmentForm({
      roleId: '',
      title: '',
      abrangenciaInicio: '',
      abrangenciaFim: '',
      context: {
        processoPrincipal: '',
        localAreaPosto: '',
        jornadaTurno: '',
        quantidadeExpostos: 1,
        condicaoOperacional: '',
        metodologia: '',
        instrumentosUtilizados: '',
        criteriosAvaliacao: '',
        matrizRisco: ''
      },
      responsibleTechnical: { nome: user?.nome || '', email: user?.email || '', registro: '' }
    });

  const hydrateAssessmentForm = (assessment) =>
    setAssessmentForm({
      roleId: assessment?.roleId || '',
      title: assessment?.title || '',
      abrangenciaInicio: assessment?.abrangenciaInicio || '',
      abrangenciaFim: assessment?.abrangenciaFim || '',
      context: {
        processoPrincipal: assessment?.context?.processoPrincipal || '',
        localAreaPosto: assessment?.context?.localAreaPosto || '',
        jornadaTurno: assessment?.context?.jornadaTurno || '',
        quantidadeExpostos: assessment?.context?.quantidadeExpostos || 1,
        condicaoOperacional: assessment?.context?.condicaoOperacional || '',
        metodologia: assessment?.context?.metodologia || '',
        instrumentosUtilizados: assessment?.context?.instrumentosUtilizados || '',
        criteriosAvaliacao: assessment?.context?.criteriosAvaliacao || '',
        matrizRisco: assessment?.context?.matrizRisco || ''
      },
      responsibleTechnical: {
        nome: assessment?.responsibleTechnical?.nome || user?.nome || '',
        email: assessment?.responsibleTechnical?.email || user?.email || '',
        registro: assessment?.responsibleTechnical?.registro || ''
      }
    });

  const metrics = useMemo(() => ({
    total: items.length,
    draft: items.filter((item) => item.status === 'draft').length,
    review: items.filter((item) => item.status === 'in_review').length,
    published: items.filter((item) => item.status === 'published').length,
    revisionRequired: items.filter((item) => item.revisionRequired).length
  }), [items]);

  const filteredRoles = useMemo(
    () => roles.filter((item) => (!filters.sectorId || String(item.sectorId) === String(filters.sectorId)) && (!filters.empresaId || String(item.empresaId) === String(filters.empresaId))),
    [roles, filters]
  );

  const loadBase = async () => {
    const [companiesResponse, sectorsResponse, rolesResponse, assessmentsResponse] = await Promise.all([
      empresasService.getAll(),
      sstService.listSectors(filters.empresaId ? { empresaId: filters.empresaId } : {}),
      sstService.listRoles({ ...(filters.empresaId ? { empresaId: filters.empresaId } : {}), ...(filters.sectorId ? { sectorId: filters.sectorId } : {}) }),
      sstService.listAssessments({
        ...(filters.empresaId ? { empresaId: filters.empresaId } : {}),
        ...(filters.sectorId ? { sectorId: filters.sectorId } : {}),
        ...(filters.roleId ? { roleId: filters.roleId } : {}),
        ...(filters.status ? { status: filters.status } : {})
      })
    ]);
    const nextItems = assessmentsResponse.data.data || [];
    setCompanies(companiesResponse.data.data || []);
    setSectors(sectorsResponse.data.data || []);
    setRoles(rolesResponse.data.data || []);
    setItems(nextItems);
    setSelectedId((prev) => (nextItems.some((item) => String(item.id) === String(prev)) ? prev : nextItems[0]?.id || ''));
  };

  const loadDetail = async (assessmentId) => {
    if (!assessmentId) return setDetail(null);
    try {
      setDetailLoading(true);
      const response = await sstService.getAssessment(assessmentId);
      setDetail(response.data.data || null);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Erro ao carregar detalhe da avaliacao.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError('');
        await loadBase();
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Erro ao carregar avaliacoes.');
      } finally {
        setLoading(false);
      }
    })();
  }, [filters.empresaId, filters.sectorId, filters.roleId, filters.status]);

  useEffect(() => {
    void loadDetail(selectedId);
  }, [selectedId]);

  useEffect(() => {
    const assessmentId = detail?.assessment?.id;
    if (!assessmentId || detail?.assessment?.status !== 'published') {
      setDocumentReadiness({ pgr: null, ltcat: null });
      return;
    }

    let active = true;
    setDocumentReadiness({
      pgr: { loading: true },
      ltcat: { loading: true }
    });

    void Promise.all([
      sstService.getDocumentReadiness({ documentType: 'pgr', scopeType: 'assessment', scopeRefId: assessmentId }),
      sstService.getDocumentReadiness({ documentType: 'ltcat', scopeType: 'assessment', scopeRefId: assessmentId })
    ])
      .then(([pgrResponse, ltcatResponse]) => {
        if (!active) return;
        setDocumentReadiness({
          pgr: pgrResponse.data?.data || null,
          ltcat: ltcatResponse.data?.data || null
        });
      })
      .catch((requestError) => {
        if (!active) return;
        const message = requestError?.response?.data?.message || 'Erro ao validar prontidao documental.';
        setDocumentReadiness({
          pgr: { error: message, blocking: true, missingFields: [message] },
          ltcat: { error: message, blocking: true, missingFields: [message] }
        });
      });

    return () => {
      active = false;
    };
  }, [detail?.assessment?.id, detail?.assessment?.status]);

  const refreshSelected = async (id = selectedId) => {
    await loadBase();
    if (id) await loadDetail(id);
  };

  const handleSaveAssessment = async (event) => {
    event.preventDefault();
    try {
      setAssessmentSaving(true);
      setAssessmentError('');
      const response = editingAssessmentId
        ? await sstService.updateAssessment(editingAssessmentId, assessmentForm)
        : await sstService.createAssessment(assessmentForm);
      const nextSelectedId = response.data.data?.id || editingAssessmentId || '';
      setAssessmentModalOpen(false);
      await loadBase();
      if (nextSelectedId) {
        setSelectedId(nextSelectedId);
        await loadDetail(nextSelectedId);
      }
      setEditingAssessmentId(null);
    } catch (requestError) {
      setAssessmentError(
        requestError?.response?.data?.message || (editingAssessmentId ? 'Erro ao atualizar avaliacao.' : 'Erro ao criar avaliacao.')
      );
    } finally {
      setAssessmentSaving(false);
    }
  };

  const openRiskModal = (risk = null) => {
    setEditingRiskId(risk?.id || null);
    setRiskForm(
      risk
        ? {
            factor: risk.factor || '',
            hazard: risk.hazard || '',
            agent: risk.agent || '',
            source: risk.source || '',
            exposure: risk.exposure || '',
            damage: risk.damage || '',
            probability: risk.probability || 1,
            severity: risk.severity || 1,
            controls: (risk.controls || []).map((item) => item.description).join('\n'),
            actionPlanItems: (risk.actionPlanItems || []).map((item) => item.title).join('\n'),
            highRiskJustification: risk.highRiskJustification || ''
          }
        : { factor: '', hazard: '', agent: '', source: '', exposure: '', damage: '', probability: 1, severity: 1, controls: '', actionPlanItems: '', highRiskJustification: '' }
    );
    setRiskError('');
    setRiskModalOpen(true);
  };

  const handleSaveRisk = async (event) => {
    event.preventDefault();
    if (!detail?.assessment?.id) return;
    try {
      setRiskSaving(true);
      setRiskError('');
      const payload = {
        factor: riskForm.factor,
        hazard: riskForm.hazard,
        agent: riskForm.agent,
        source: riskForm.source,
        exposure: riskForm.exposure,
        damage: riskForm.damage,
        probability: Number(riskForm.probability) || 1,
        severity: Number(riskForm.severity) || 1,
        controls: splitLines(riskForm.controls).map((description, index) => ({ type: index === 0 ? 'engenharia' : 'administrativo', description, hierarchyLevel: index + 1 })),
        actionPlanItems: splitLines(riskForm.actionPlanItems).map((title) => ({ title, status: 'pendente' })),
        highRiskJustification: riskForm.highRiskJustification
      };
      if (editingRiskId) {
        await sstService.updateAssessmentRisk(editingRiskId, payload);
      } else {
        await sstService.createAssessmentRisk(detail.assessment.id, payload);
      }
      setRiskModalOpen(false);
      await refreshSelected(detail.assessment.id);
    } catch (requestError) {
      setRiskError(requestError?.response?.data?.message || 'Erro ao salvar risco.');
    } finally {
      setRiskSaving(false);
    }
  };

  const handleDeleteRisk = async (riskId) => {
    if (!window.confirm('Remover este risco da avaliacao?')) return;
    try {
      setError('');
      await sstService.deleteAssessmentRisk(riskId);
      await refreshSelected(detail.assessment.id);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Erro ao remover risco.');
    }
  };

  const openConclusion = () => {
    setConclusionForm({
      result: detail?.conclusion?.result || '',
      basis: detail?.conclusion?.basis || '',
      normativeFrame: detail?.conclusion?.normativeFrame || ''
    });
    setConclusionError('');
    setConclusionModalOpen(true);
  };

  const handleSaveConclusion = async (event) => {
    event.preventDefault();
    if (!detail?.assessment?.id) return;
    try {
      setConclusionSaving(true);
      setConclusionError('');
      await sstService.upsertAssessmentConclusion(detail.assessment.id, conclusionForm);
      setConclusionModalOpen(false);
      await refreshSelected(detail.assessment.id);
    } catch (requestError) {
      setConclusionError(requestError?.response?.data?.message || 'Erro ao salvar conclusao tecnica.');
    } finally {
      setConclusionSaving(false);
    }
  };

  const runAction = async (action) => {
    if (!detail?.assessment?.id) return;
    try {
      setError('');
      await action(detail.assessment.id);
      await refreshSelected(detail.assessment.id);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Erro ao executar acao na avaliacao.');
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Levantamento de riscos" title="Avaliacoes" description="Fluxo autoritativo do SST: cargo -> avaliacao -> riscos da avaliacao." actions={canWrite ? <button type="button" className="btn-primary" onClick={() => { setEditingAssessmentId(null); resetAssessmentForm(); setAssessmentError(''); setAssessmentModalOpen(true); }}><Plus className="h-4 w-4" />Nova avaliacao</button> : null}>
        <div className="grid gap-3 xl:grid-cols-4">
          <select className="input-field" value={filters.empresaId} onChange={(event) => setFilters((prev) => ({ ...prev, empresaId: event.target.value, sectorId: '', roleId: '' }))}><option value="">Todas as empresas</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.nome}</option>)}</select>
          <select className="input-field" value={filters.sectorId} onChange={(event) => setFilters((prev) => ({ ...prev, sectorId: event.target.value, roleId: '' }))}><option value="">Todos os setores</option>{sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.nome}</option>)}</select>
          <select className="input-field" value={filters.roleId} onChange={(event) => setFilters((prev) => ({ ...prev, roleId: event.target.value }))}><option value="">Todos os cargos</option>{filteredRoles.map((role) => <option key={role.id} value={role.id}>{role.nome}</option>)}</select>
          <select className="input-field" value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}><option value="">Todos os status</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </div>
      </PageHeader>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ClipboardCheck} label="Avaliacoes" value={metrics.total} meta="Base tecnica do modulo" tone="blue" />
        <MetricCard icon={FilePlus2} label="Rascunhos" value={metrics.draft} meta={`${metrics.review} em revisao`} tone="amber" />
        <MetricCard icon={ShieldCheck} label="Publicadas" value={metrics.published} meta="Base valida para documentos" tone="lime" />
        <MetricCard icon={Sparkles} label="Revisao pendente" value={metrics.revisionRequired} meta="Mudanca estrutural detectada" tone="slate" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
        <div className="panel-surface p-6">
          {items.length === 0 ? <EmptyState icon={ClipboardCheck} title="Nenhuma avaliacao cadastrada" description="Crie a primeira avaliacao a partir de um cargo." /> : <div className="space-y-3">{items.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`w-full rounded-[1.35rem] border p-4 text-left transition-all ${String(selectedId) === String(item.id) ? 'border-lime-300 bg-lime-50/50 shadow-[0_20px_40px_rgba(132,204,22,0.12)]' : 'border-slate-200/80 bg-white/90 shadow-[0_18px_40px_rgba(15,23,42,0.05)]'}`}><div className="flex flex-wrap items-center gap-2"><span className={`status-pill ${STATUS_CLASSES[item.status] || 'status-info'}`}>{STATUS_LABELS[item.status] || item.status}</span><span className="status-pill status-info">v{item.version}</span>{item.revisionRequired ? <span className="status-pill status-warning">Revisao pendente</span> : null}</div><h3 className="mt-3 text-base font-semibold text-slate-950">{item.title}</h3><p className="mt-2 text-sm text-slate-600">{formatCoverageRange(item.abrangenciaInicio, item.abrangenciaFim)}</p><p className="mt-1 text-sm text-slate-500">Riscos: {item.riskCount || 0} • Conclusao: {item.conclusionStatus || 'pendente'}</p></button>)}</div>}
        </div>

        <div className="panel-surface p-6">
          {detailLoading ? <div className="flex h-64 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" /></div> : !detail ? <EmptyState icon={AlertTriangle} title="Selecione uma avaliacao" description="O detalhe tecnico mostrara contexto, riscos, conclusao e publicacao." /> : (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`status-pill ${STATUS_CLASSES[detail.assessment.status] || 'status-info'}`}>{STATUS_LABELS[detail.assessment.status] || detail.assessment.status}</span>
                    <span className="status-pill status-info">v{detail.assessment.version}</span>
                    {detail.assessment.revisionRequired ? <span className="status-pill status-warning">{detail.assessment.revisionReason || 'Revisao pendente'}</span> : null}
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-950">{detail.assessment.title}</h2>
                  <p className="mt-2 text-sm text-slate-600">{detail.sector?.nome || 'Setor'} • {detail.role?.nome || 'Cargo'}</p>
                  <p className="mt-2 text-sm text-slate-600">Abrangencia: {formatCoverageRange(detail.assessment.abrangenciaInicio, detail.assessment.abrangenciaFim)}</p>
                  <p className="mt-2 text-xs text-slate-500">Processo: {detail.assessment.context?.processoPrincipal || 'Nao informado'} • Area: {detail.assessment.context?.localAreaPosto || 'Nao informada'} • Expostos: {detail.assessment.context?.quantidadeExpostos || 1}</p>
                  <p className="mt-1 text-xs text-slate-500">Metodologia: {detail.assessment.context?.metodologia || 'Nao informada'} • Instrumentos: {detail.assessment.context?.instrumentosUtilizados || 'Nao informados'}</p>
                </div>
                <div className="flex min-w-[230px] flex-col gap-2">
                  {canWrite && detail.assessment.status !== 'published' && detail.assessment.status !== 'superseded' ? <button type="button" className="btn-secondary" onClick={() => { setEditingAssessmentId(detail.assessment.id); hydrateAssessmentForm(detail.assessment); setAssessmentError(''); setAssessmentModalOpen(true); }}><Pencil className="h-4 w-4" />Editar avaliacao</button> : null}
                  {canWrite && detail.assessment.status === 'draft' ? <button type="button" className="btn-secondary" onClick={() => runAction(sstService.startReview)}><ArrowRightCircle className="h-4 w-4" />Enviar para revisao</button> : null}
                  {canWrite && (detail.assessment.status === 'published' || detail.assessment.status === 'superseded') ? <button type="button" className="btn-secondary" onClick={() => runAction((id) => sstService.createRevision(id, { reviewReason: 'revisao_periodica' }))}><FilePlus2 className="h-4 w-4" />Criar revisao</button> : null}
                  {canSign ? <button type="button" className="btn-secondary" onClick={openConclusion}><FileCheck2 className="h-4 w-4" />Conclusao tecnica</button> : null}
                  {canSign && detail.conclusion && detail.conclusion.status !== 'signed' ? <button type="button" className="btn-secondary" onClick={() => runAction(sstService.signAssessmentConclusion)}><ShieldCheck className="h-4 w-4" />Assinar conclusao</button> : null}
                  {canApprove && detail.assessment.status !== 'published' && detail.assessment.status !== 'superseded' ? <button type="button" className="btn-primary" onClick={() => runAction(sstService.publishAssessment)}><ShieldCheck className="h-4 w-4" />Publicar avaliacao</button> : null}
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/80 p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Prontidao documental</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className={`rounded-[1rem] border px-3 py-3 text-sm ${documentReadiness.pgr?.blocking ? 'border-red-200 bg-red-50 text-red-700' : 'border-lime-200 bg-lime-50 text-lime-800'}`}>
                    <p className="font-semibold">PGR: {mapReadinessLabel(documentReadiness.pgr)}</p>
                    {documentReadiness.pgr?.blocking ? <p className="mt-1 text-xs">{documentReadiness.pgr?.missingFields?.[0]?.message || documentReadiness.pgr?.missingFields?.[0] || 'Pendencias tecnicas encontradas.'}</p> : null}
                  </div>
                  <div className={`rounded-[1rem] border px-3 py-3 text-sm ${documentReadiness.ltcat?.blocking ? 'border-red-200 bg-red-50 text-red-700' : 'border-lime-200 bg-lime-50 text-lime-800'}`}>
                    <p className="font-semibold">LTCAT: {mapReadinessLabel(documentReadiness.ltcat)}</p>
                    {documentReadiness.ltcat?.blocking ? <p className="mt-1 text-xs">{documentReadiness.ltcat?.missingFields?.[0]?.message || documentReadiness.ltcat?.missingFields?.[0] || 'Pendencias tecnicas encontradas.'}</p> : null}
                  </div>
                </div>
              </div>

              <div className="rounded-[1.45rem] border border-slate-200/80 bg-slate-50/60 p-4">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Riscos da avaliacao</p><h3 className="mt-1 text-xl font-semibold text-slate-950">Perigos, agentes, danos e acoes</h3></div>
                  {canWrite && detail.assessment.status !== 'published' && detail.assessment.status !== 'superseded' ? <button type="button" className="btn-primary" onClick={() => openRiskModal()}><Plus className="h-4 w-4" />Novo risco</button> : null}
                </div>
                {!detail.risks?.length ? <EmptyState icon={AlertTriangle} title="Nenhum risco registrado" description="Cadastre os riscos identificados para esta avaliacao." /> : <div className="space-y-3">{detail.risks.map((risk) => <article key={risk.id} className="rounded-[1.2rem] border border-slate-200/80 bg-white/90 p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`status-pill ${risk.level === 'critico' ? 'status-danger' : risk.level === 'alto' ? 'status-warning' : risk.level === 'moderado' ? 'status-info' : 'status-success'}`}>{risk.level}</span></div><h4 className="mt-3 text-base font-semibold text-slate-950">{risk.hazard}</h4><p className="mt-2 text-sm text-slate-600">{risk.factor} • {risk.agent || 'Sem agente detalhado'}</p><p className="mt-2 text-sm text-slate-500">Fonte: {risk.source || 'Nao informada'} • Dano: {risk.damage}</p><p className="mt-2 text-xs text-slate-500">Controles: {(risk.controls || []).map((item) => item.description).join(', ') || 'Nenhum'} • Acoes: {(risk.actionPlanItems || []).length}</p></div>{canWrite && detail.assessment.status !== 'published' && detail.assessment.status !== 'superseded' ? <div className="flex min-w-[180px] flex-col gap-2"><button type="button" className="btn-secondary" onClick={() => openRiskModal(risk)}>Editar risco</button><button type="button" className="btn-secondary text-red-600" onClick={() => handleDeleteRisk(risk.id)}>Remover risco</button></div> : null}</div></article>)}</div>}
              </div>

              <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/80 p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Conclusao tecnica</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">{detail.conclusion?.result || 'Conclusao ainda nao registrada'}</h3>
                <p className="mt-2 text-sm text-slate-600">{detail.conclusion?.basis || 'Registre e assine a conclusao tecnica antes da publicacao.'}</p>
                <p className="mt-2 text-xs text-slate-500">Status: {detail.conclusion?.status || 'pendente'} • Assinada em {formatDate(detail.conclusion?.signedAt)}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <FormModal isOpen={assessmentModalOpen} onClose={() => { setAssessmentModalOpen(false); setEditingAssessmentId(null); }} title={editingAssessmentId ? 'Editar avaliacao' : 'Nova avaliacao'} onSubmit={handleSaveAssessment} loading={assessmentSaving} error={assessmentError}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Cargo</label><select className="input-field" value={assessmentForm.roleId} onChange={(event) => setAssessmentForm((prev) => ({ ...prev, roleId: event.target.value }))} required disabled={Boolean(editingAssessmentId)}><option value="">Selecione o cargo</option>{filteredRoles.map((role) => <option key={role.id} value={role.id}>{role.nome}</option>)}</select></div>
          <div className="md:col-span-2"><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Titulo</label><input className="input-field" value={assessmentForm.title} onChange={(event) => setAssessmentForm((prev) => ({ ...prev, title: event.target.value }))} /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Abrangencia inicial</label><input className="input-field" type="date" value={assessmentForm.abrangenciaInicio} onChange={(event) => setAssessmentForm((prev) => ({ ...prev, abrangenciaInicio: event.target.value }))} /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Abrangencia final</label><input className="input-field" type="date" value={assessmentForm.abrangenciaFim} onChange={(event) => setAssessmentForm((prev) => ({ ...prev, abrangenciaFim: event.target.value }))} /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Processo principal</label><input className="input-field" value={assessmentForm.context.processoPrincipal} onChange={(event) => setAssessmentForm((prev) => ({ ...prev, context: { ...prev.context, processoPrincipal: event.target.value } }))} /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Area / posto</label><input className="input-field" value={assessmentForm.context.localAreaPosto} onChange={(event) => setAssessmentForm((prev) => ({ ...prev, context: { ...prev.context, localAreaPosto: event.target.value } }))} /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Jornada / turno</label><input className="input-field" value={assessmentForm.context.jornadaTurno} onChange={(event) => setAssessmentForm((prev) => ({ ...prev, context: { ...prev.context, jornadaTurno: event.target.value } }))} /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Quantidade exposta</label><input className="input-field" type="number" min="1" value={assessmentForm.context.quantidadeExpostos} onChange={(event) => setAssessmentForm((prev) => ({ ...prev, context: { ...prev.context, quantidadeExpostos: Number(event.target.value) || 1 } }))} /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Condicao operacional</label><textarea className="input-field min-h-[90px]" value={assessmentForm.context.condicaoOperacional} onChange={(event) => setAssessmentForm((prev) => ({ ...prev, context: { ...prev.context, condicaoOperacional: event.target.value } }))} /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Metodologia</label><input className="input-field" value={assessmentForm.context.metodologia} onChange={(event) => setAssessmentForm((prev) => ({ ...prev, context: { ...prev.context, metodologia: event.target.value } }))} /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Instrumentos utilizados</label><input className="input-field" value={assessmentForm.context.instrumentosUtilizados} onChange={(event) => setAssessmentForm((prev) => ({ ...prev, context: { ...prev.context, instrumentosUtilizados: event.target.value } }))} /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Criterios de avaliacao</label><input className="input-field" value={assessmentForm.context.criteriosAvaliacao} onChange={(event) => setAssessmentForm((prev) => ({ ...prev, context: { ...prev.context, criteriosAvaliacao: event.target.value } }))} /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Matriz de risco</label><input className="input-field" value={assessmentForm.context.matrizRisco} onChange={(event) => setAssessmentForm((prev) => ({ ...prev, context: { ...prev.context, matrizRisco: event.target.value } }))} /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Responsavel tecnico</label><div className="grid gap-3 md:grid-cols-3"><input className="input-field" value={assessmentForm.responsibleTechnical.nome} onChange={(event) => setAssessmentForm((prev) => ({ ...prev, responsibleTechnical: { ...prev.responsibleTechnical, nome: event.target.value } }))} placeholder="Nome" /><input className="input-field" value={assessmentForm.responsibleTechnical.email} onChange={(event) => setAssessmentForm((prev) => ({ ...prev, responsibleTechnical: { ...prev.responsibleTechnical, email: event.target.value } }))} placeholder="Email" /><input className="input-field" value={assessmentForm.responsibleTechnical.registro} onChange={(event) => setAssessmentForm((prev) => ({ ...prev, responsibleTechnical: { ...prev.responsibleTechnical, registro: event.target.value } }))} placeholder="Registro" /></div></div>
        </div>
      </FormModal>

      <FormModal isOpen={riskModalOpen} onClose={() => setRiskModalOpen(false)} title={editingRiskId ? 'Editar risco' : 'Novo risco'} onSubmit={handleSaveRisk} loading={riskSaving} error={riskError}>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Fator</label><input className="input-field" value={riskForm.factor} onChange={(event) => setRiskForm((prev) => ({ ...prev, factor: event.target.value }))} required /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Perigo</label><input className="input-field" value={riskForm.hazard} onChange={(event) => setRiskForm((prev) => ({ ...prev, hazard: event.target.value }))} required /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Agente</label><input className="input-field" value={riskForm.agent} onChange={(event) => setRiskForm((prev) => ({ ...prev, agent: event.target.value }))} /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Fonte geradora</label><input className="input-field" value={riskForm.source} onChange={(event) => setRiskForm((prev) => ({ ...prev, source: event.target.value }))} /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Exposicao</label><textarea className="input-field min-h-[90px]" value={riskForm.exposure} onChange={(event) => setRiskForm((prev) => ({ ...prev, exposure: event.target.value }))} /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Possiveis danos</label><textarea className="input-field min-h-[90px]" value={riskForm.damage} onChange={(event) => setRiskForm((prev) => ({ ...prev, damage: event.target.value }))} required /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Probabilidade</label><input className="input-field" type="number" min="1" max="5" value={riskForm.probability} onChange={(event) => setRiskForm((prev) => ({ ...prev, probability: Number(event.target.value) || 1 }))} /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Severidade</label><input className="input-field" type="number" min="1" max="5" value={riskForm.severity} onChange={(event) => setRiskForm((prev) => ({ ...prev, severity: Number(event.target.value) || 1 }))} /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Controles</label><textarea className="input-field min-h-[90px]" value={riskForm.controls} onChange={(event) => setRiskForm((prev) => ({ ...prev, controls: event.target.value }))} placeholder="Um controle por linha" /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Plano de acao</label><textarea className="input-field min-h-[90px]" value={riskForm.actionPlanItems} onChange={(event) => setRiskForm((prev) => ({ ...prev, actionPlanItems: event.target.value }))} placeholder="Uma acao por linha" /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Justificativa para risco alto/critico</label><textarea className="input-field min-h-[90px]" value={riskForm.highRiskJustification} onChange={(event) => setRiskForm((prev) => ({ ...prev, highRiskJustification: event.target.value }))} /></div>
        </div>
      </FormModal>

      <FormModal isOpen={conclusionModalOpen} onClose={() => setConclusionModalOpen(false)} title="Conclusao tecnica" onSubmit={handleSaveConclusion} loading={conclusionSaving} error={conclusionError}>
        <div className="grid gap-4">
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Resultado</label><input className="input-field" value={conclusionForm.result} onChange={(event) => setConclusionForm((prev) => ({ ...prev, result: event.target.value }))} required /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Base tecnica</label><textarea className="input-field min-h-[100px]" value={conclusionForm.basis} onChange={(event) => setConclusionForm((prev) => ({ ...prev, basis: event.target.value }))} /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Enquadramento normativo</label><textarea className="input-field min-h-[90px]" value={conclusionForm.normativeFrame} onChange={(event) => setConclusionForm((prev) => ({ ...prev, normativeFrame: event.target.value }))} /></div>
        </div>
      </FormModal>
    </div>
  );
};

export default SstAssessments;
