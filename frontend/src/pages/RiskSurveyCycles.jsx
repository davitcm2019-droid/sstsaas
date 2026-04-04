import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Eye, FileClock, GitBranch, Layers3, PencilLine, Plus, Rocket, ShieldCheck } from 'lucide-react';

import FormModal from '../components/FormModal';
import EmptyState from '../components/ui/EmptyState';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { empresasService, riskSurveyService } from '../services/api';

const STATUS_LABELS = { draft: 'Rascunho', in_review: 'Em revisao', published: 'Publicado', superseded: 'Substituido' };
const STATUS_CLASSES = { draft: 'status-warning', in_review: 'status-info', published: 'status-success', superseded: 'status-danger' };
const REVIEW_REASON_LABELS = {
  implantacao_inicial: 'Implantacao inicial',
  revisao_periodica: 'Revisao periodica',
  mudanca_processo: 'Mudanca de processo',
  incidente: 'Incidente',
  solicitacao_interna: 'Solicitacao interna',
  atualizacao_normativa: 'Atualizacao normativa',
  outro: 'Outro'
};
const METHODOLOGY_LABELS = {
  gro_pgr: 'GRO / PGR',
  gro_pgr_iso45001: 'GRO / PGR + ISO 45001',
  customizada: 'Customizada'
};

const buildInitialForm = (user) => ({
  empresaId: '',
  unidade: '',
  estabelecimento: '',
  title: '',
  description: '',
  reviewReason: 'implantacao_inicial',
  methodology: 'gro_pgr',
  responsibleTechnical: { nome: user?.nome || '', email: user?.email || '', registro: '' }
});

const buildContextForm = (cycle) => ({
  scopeSummary: cycle?.context?.scopeSummary || '',
  operationDescription: cycle?.context?.operationDescription || '',
  workerParticipation: cycle?.context?.workerParticipation || '',
  contractors: cycle?.context?.contractors || '',
  changesSinceLastReview: cycle?.context?.changesSinceLastReview || '',
  contextOfOrganization: cycle?.context?.contextOfOrganization || '',
  reviewIntervalMonths: cycle?.context?.reviewIntervalMonths || 12,
  lastFieldVisitAt: cycle?.context?.lastFieldVisitAt ? new Date(cycle.context.lastFieldVisitAt).toISOString().slice(0, 10) : '',
  nextReviewAt: cycle?.context?.nextReviewAt ? new Date(cycle.context.nextReviewAt).toISOString().slice(0, 10) : ''
});

const formatDate = (value) => {
  if (!value) return 'Sem movimentacao';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Data invalida';
  return parsed.toLocaleDateString('pt-BR');
};

const formatDateTime = (value) => {
  if (!value) return 'Nao publicado';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Data invalida';
  return parsed.toLocaleString('pt-BR');
};

const RiskSurveyCycles = () => {
  const { hasPermission, user } = useAuth();
  const canWrite = hasPermission('riskSurvey:write');
  const canFinalize = hasPermission('riskSurvey:finalize');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [companyFilter, setCompanyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState(buildInitialForm(user));
  const [contextOpen, setContextOpen] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState('');
  const [contextCycle, setContextCycle] = useState(null);
  const [contextForm, setContextForm] = useState(buildContextForm(null));
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState('');
  const [snapshotCycle, setSnapshotCycle] = useState(null);
  const [snapshot, setSnapshot] = useState(null);

  const companyMap = useMemo(() => new Map(companies.map((company) => [String(company.id), company.nome])), [companies]);
  const metrics = useMemo(() => ({
    total: cycles.length,
    rascunhos: cycles.filter((cycle) => cycle.status === 'draft').length,
    revisao: cycles.filter((cycle) => cycle.status === 'in_review').length,
    publicados: cycles.filter((cycle) => cycle.status === 'published').length,
    prontos: cycles.filter((cycle) => cycle.completion?.readyToPublish).length
  }), [cycles]);

  const loadCycles = async () => {
    const response = await riskSurveyService.listCycles({
      includeCompletion: true,
      ...(companyFilter ? { empresaId: companyFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {})
    });
    setCycles(response.data.data || []);
  };

  useEffect(() => setForm(buildInitialForm(user)), [user]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await empresasService.getAll();
        setCompanies(response.data.data || []);
      } catch (err) {
        setError(err?.response?.data?.message || 'Erro ao carregar empresas do modulo.');
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError('');
        await loadCycles();
      } catch (err) {
        setError(err?.response?.data?.message || 'Erro ao carregar ciclos de levantamento.');
      } finally {
        setLoading(false);
      }
    })();
  }, [companyFilter, statusFilter]);

  const handleCreateCycle = async (event) => {
    event.preventDefault();
    if (!canWrite) return;
    try {
      setCreateLoading(true);
      setCreateError('');
      await riskSurveyService.createCycle(form);
      await loadCycles();
      setCreateOpen(false);
      setForm(buildInitialForm(user));
    } catch (err) {
      setCreateError(err?.response?.data?.message || 'Erro ao criar ciclo.');
    } finally {
      setCreateLoading(false);
    }
  };

  const openContextModal = (cycle) => {
    setContextCycle(cycle);
    setContextForm(buildContextForm(cycle));
    setContextError('');
    setContextOpen(true);
  };

  const handleSaveContext = async (event) => {
    event.preventDefault();
    if (!contextCycle?.id) return;
    try {
      setContextLoading(true);
      setContextError('');
      await riskSurveyService.updateCycleContext(contextCycle.id, contextForm);
      await loadCycles();
      setContextOpen(false);
    } catch (err) {
      setContextError(err?.response?.data?.message || 'Erro ao atualizar contexto do ciclo.');
    } finally {
      setContextLoading(false);
    }
  };

  const handleStartReview = async (cycleId) => {
    try {
      setError('');
      await riskSurveyService.startCycleReview(cycleId);
      await loadCycles();
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao iniciar revisao do ciclo.');
    }
  };

  const handlePublish = async (cycleId) => {
    try {
      setError('');
      await riskSurveyService.publishCycle(cycleId);
      await loadCycles();
    } catch (err) {
      const blockers = err?.response?.data?.meta?.completion?.blockers;
      setError(Array.isArray(blockers) && blockers.length ? `Publicacao bloqueada: ${blockers.join(' • ')}` : err?.response?.data?.message || 'Erro ao publicar ciclo.');
    }
  };

  const openSnapshotModal = async (cycle) => {
    try {
      setSnapshotOpen(true);
      setSnapshotCycle(cycle);
      setSnapshotLoading(true);
      setSnapshotError('');
      setSnapshot(null);
      const response = await riskSurveyService.getCycleSnapshot(cycle.id);
      setSnapshot(response.data.data || null);
    } catch (err) {
      setSnapshotError(err?.response?.data?.message || 'Erro ao carregar snapshot do ciclo.');
    } finally {
      setSnapshotLoading(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Levantamento v2"
        title="Ciclos de levantamento"
        description="Hub de contexto, completude, revisao e publicacao do inventario por estabelecimento."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/levantamento-riscos/ambientes" className="btn-secondary"><Layers3 className="h-4 w-4" />Ambientes</Link>
            <Link to="/levantamento-riscos/execucao" className="btn-secondary"><ArrowRight className="h-4 w-4" />Execucao atual</Link>
            <button type="button" className="btn-primary" disabled={!canWrite} onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Novo ciclo</button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <select className="input-field" value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
            <option value="">Todas as empresas</option>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.nome}</option>)}
          </select>
          <select className="input-field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </PageHeader>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Building2} label="Ciclos no modulo" value={metrics.total} meta="Base de levantamento" tone="blue" />
        <MetricCard icon={FileClock} label="Rascunhos" value={metrics.rascunhos} meta="Ciclos abertos" tone="amber" />
        <MetricCard icon={ShieldCheck} label="Publicados" value={metrics.publicados} meta="Versoes consolidadas" tone="lime" />
        <MetricCard icon={GitBranch} label="Prontos para publicar" value={metrics.prontos} meta={`${metrics.revisao} em revisao`} tone="slate" />
      </section>

      <section className="panel-surface p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Camada de governanca</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Publicacao por ciclo com contexto e snapshot</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Cada ciclo agora concentra escopo, progresso estrutural, pendencias de publicacao, revisao tecnica e o snapshot consolidado do inventario.
            </p>
          </div>
          <div className="grid min-w-[280px] gap-3 rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Completude</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Contexto, estrutura, riscos, avaliacao, controles e plano</p>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Publicacao</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Snapshot imutavel da versao publicada por estabelecimento</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel-surface p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Backbone do modulo</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">Ciclos cadastrados</h2>
          </div>
          <span className="text-sm font-semibold text-slate-500">{metrics.total} registro(s)</span>
        </div>

        {cycles.length === 0 ? (
          <EmptyState
            icon={FileClock}
            title="Nenhum ciclo cadastrado"
            description="Crie o primeiro ciclo para iniciar a nova camada de governanca do levantamento."
            action={canWrite ? <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Criar ciclo</button> : null}
          />
        ) : (
          <div className="space-y-4">
            {cycles.map((cycle) => {
              const companyName = companyMap.get(String(cycle.empresaId)) || 'Empresa vinculada';
              const completion = cycle.completion;
              const blockers = completion?.blockers || [];
              return (
                <article key={cycle.id} className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`status-pill ${STATUS_CLASSES[cycle.status] || 'status-info'}`}>{STATUS_LABELS[cycle.status] || cycle.status}</span>
                        <span className="status-pill status-info">v{cycle.version}</span>
                        {completion ? <span className={`status-pill ${completion.readyToPublish ? 'status-success' : 'status-warning'}`}>{completion.percentage}% concluido</span> : null}
                        {cycle.clonedFromCycleId ? <span className="status-pill status-warning">Revisao derivada</span> : null}
                      </div>

                      <h3 className="mt-3 text-xl font-semibold text-slate-950">{cycle.title || `Levantamento ${cycle.estabelecimento}`}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{cycle.description || 'Ciclo preparado para estruturar contexto, versao, riscos, controles e publicacao regulatoria.'}</p>

                      <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                        <div><span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Empresa</span><strong className="mt-1 block text-sm text-slate-900">{companyName}</strong></div>
                        <div><span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Escopo</span><strong className="mt-1 block text-sm text-slate-900">{cycle.unidade} / {cycle.estabelecimento}</strong></div>
                        <div><span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Motivo</span><strong className="mt-1 block text-sm text-slate-900">{REVIEW_REASON_LABELS[cycle.reviewReason] || cycle.reviewReason}</strong></div>
                        <div><span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Metodologia</span><strong className="mt-1 block text-sm text-slate-900">{METHODOLOGY_LABELS[cycle.methodology] || cycle.methodology}</strong></div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-[1.15rem] border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                          <span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Responsavel tecnico</span>
                          <strong className="mt-1 block text-sm text-slate-900">{cycle.responsibleTechnical?.nome || 'Nao informado'}</strong>
                          <span className="mt-1 block text-xs text-slate-500">{cycle.responsibleTechnical?.registro || 'Sem registro informado'}</span>
                        </div>
                        <div className="rounded-[1.15rem] border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                          <span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Ultima atualizacao</span>
                          <strong className="mt-1 block text-sm text-slate-900">{formatDate(cycle.updatedAt)}</strong>
                          <span className="mt-1 block text-xs text-slate-500">Criado em {formatDate(cycle.createdAt)}</span>
                        </div>
                        <div className="rounded-[1.15rem] border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                          <span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Publicacao</span>
                          <strong className="mt-1 block text-sm text-slate-900">{formatDate(cycle.publishedAt)}</strong>
                          <span className="mt-1 block text-xs text-slate-500">{cycle.context?.nextReviewAt ? `Proxima revisao: ${formatDate(cycle.context.nextReviewAt)}` : 'Revisao ainda nao planejada'}</span>
                        </div>
                      </div>

                      {completion ? (
                        <div className="mt-4 rounded-[1.25rem] border border-slate-200/70 bg-slate-50/70 p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Completude do ciclo</p>
                                  <p className="mt-1 text-sm font-semibold text-slate-900">{completion.readyToPublish ? 'Pronto para publicacao' : 'Pendencias para consolidacao'}</p>
                                </div>
                                <span className={`status-pill ${completion.readyToPublish ? 'status-success' : 'status-warning'}`}>{completion.percentage}%</span>
                              </div>
                              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200/80"><div className={`h-full rounded-full ${completion.readyToPublish ? 'bg-lime-400' : 'bg-sky-500'}`} style={{ width: `${completion.percentage}%` }} /></div>
                              <div className="mt-4 grid gap-2 text-xs text-slate-500 md:grid-cols-3">
                                <div>Ambientes: <strong className="text-slate-900">{completion.counts?.environments || 0}</strong></div>
                                <div>Cargos: <strong className="text-slate-900">{completion.counts?.cargos || 0}</strong></div>
                                <div>Atividades: <strong className="text-slate-900">{completion.counts?.activities || 0}</strong></div>
                                <div>Riscos: <strong className="text-slate-900">{completion.counts?.risks || 0}</strong></div>
                                <div>Avaliados: <strong className="text-slate-900">{completion.counts?.assessedRisks || 0}</strong></div>
                                <div>Acoes: <strong className="text-slate-900">{completion.counts?.actionPlanItems || 0}</strong></div>
                              </div>
                            </div>
                            <div className="w-full rounded-[1rem] border border-white/70 bg-white/80 p-3 lg:max-w-sm">
                              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Bloqueios atuais</p>
                              {blockers.length ? blockers.map((blocker) => <div key={blocker} className="mt-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-slate-600">{blocker}</div>) : <div className="mt-2 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-700">Nenhum bloqueio. O ciclo pode seguir para publicacao.</div>}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex min-w-[250px] flex-col gap-2">
                      <button type="button" className="btn-secondary" disabled={!canWrite || cycle.status === 'published' || cycle.status === 'superseded'} onClick={() => openContextModal(cycle)}><PencilLine className="h-4 w-4" />Contexto do ciclo</button>
                      <Link to={`/levantamento-riscos/ambientes?cycleId=${cycle.id}`} className="btn-secondary"><Layers3 className="h-4 w-4" />Ambientes</Link>
                      <Link to={`/levantamento-riscos/execucao?cycleId=${cycle.id}`} className="btn-secondary"><ArrowRight className="h-4 w-4" />Abrir execucao atual</Link>
                      {canFinalize && cycle.status !== 'in_review' && cycle.status !== 'published' && cycle.status !== 'superseded' ? <button type="button" className="btn-secondary" onClick={() => handleStartReview(cycle.id)}><ShieldCheck className="h-4 w-4" />Iniciar revisao</button> : null}
                      {canFinalize && cycle.status !== 'published' && cycle.status !== 'superseded' ? <button type="button" className="btn-primary" onClick={() => handlePublish(cycle.id)}><Rocket className="h-4 w-4" />Publicar ciclo</button> : null}
                      {cycle.status === 'published' ? <button type="button" className="btn-secondary" onClick={() => openSnapshotModal(cycle)}><Eye className="h-4 w-4" />Ver snapshot</button> : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <FormModal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); setCreateError(''); setForm(buildInitialForm(user)); }}
        title="Novo ciclo de levantamento"
        onSubmit={handleCreateCycle}
        loading={createLoading}
        error={createError}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Empresa</label>
            <select className="input-field" value={form.empresaId} onChange={(event) => setForm((prev) => ({ ...prev, empresaId: event.target.value }))} required>
              <option value="">Selecione a empresa</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Unidade</label>
            <input className="input-field" value={form.unidade} onChange={(event) => setForm((prev) => ({ ...prev, unidade: event.target.value }))} placeholder="Ex.: Matriz" required />
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Estabelecimento</label>
            <input className="input-field" value={form.estabelecimento} onChange={(event) => setForm((prev) => ({ ...prev, estabelecimento: event.target.value }))} placeholder="Ex.: Planta 01" required />
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Motivo da revisao</label>
            <select className="input-field" value={form.reviewReason} onChange={(event) => setForm((prev) => ({ ...prev, reviewReason: event.target.value }))}>
              {Object.entries(REVIEW_REASON_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Metodologia</label>
            <select className="input-field" value={form.methodology} onChange={(event) => setForm((prev) => ({ ...prev, methodology: event.target.value }))}>
              {Object.entries(METHODOLOGY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Titulo interno</label>
            <input className="input-field" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Ex.: Inventario 2026 - Unidade Matriz" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Descricao operacional</label>
            <textarea className="input-field min-h-[110px]" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Contexto, objetivo da revisao ou observacoes do ciclo." />
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Responsavel tecnico</label>
            <input className="input-field" value={form.responsibleTechnical.nome} onChange={(event) => setForm((prev) => ({ ...prev, responsibleTechnical: { ...prev.responsibleTechnical, nome: event.target.value } }))} placeholder="Nome do responsavel" required />
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Registro profissional</label>
            <input className="input-field" value={form.responsibleTechnical.registro} onChange={(event) => setForm((prev) => ({ ...prev, responsibleTechnical: { ...prev.responsibleTechnical, registro: event.target.value } }))} placeholder="CREA / registro" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Email tecnico</label>
            <input className="input-field" type="email" value={form.responsibleTechnical.email} onChange={(event) => setForm((prev) => ({ ...prev, responsibleTechnical: { ...prev.responsibleTechnical, email: event.target.value } }))} placeholder="email@empresa.com" />
          </div>
        </div>
      </FormModal>

      <FormModal
        isOpen={contextOpen}
        onClose={() => { setContextOpen(false); setContextError(''); setContextCycle(null); setContextForm(buildContextForm(null)); }}
        title={`Contexto do ciclo${contextCycle?.title ? ` - ${contextCycle.title}` : ''}`}
        onSubmit={handleSaveContext}
        loading={contextLoading}
        error={contextError}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Resumo do escopo</label><textarea className="input-field min-h-[100px]" value={contextForm.scopeSummary} onChange={(event) => setContextForm((prev) => ({ ...prev, scopeSummary: event.target.value }))} placeholder="Escopo do levantamento, unidades abrangidas e criterio de consolidacao." required /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Descricao operacional</label><textarea className="input-field min-h-[100px]" value={contextForm.operationDescription} onChange={(event) => setContextForm((prev) => ({ ...prev, operationDescription: event.target.value }))} placeholder="Caracterize processo, turnos, variacoes operacionais e complexidade da operacao." required /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Participacao dos trabalhadores</label><textarea className="input-field min-h-[90px]" value={contextForm.workerParticipation} onChange={(event) => setContextForm((prev) => ({ ...prev, workerParticipation: event.target.value }))} placeholder="Registre entrevistas, validacoes em campo, consulta a CIPA ou retornos dos trabalhadores." required /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Contexto da organizacao</label><textarea className="input-field min-h-[90px]" value={contextForm.contextOfOrganization} onChange={(event) => setContextForm((prev) => ({ ...prev, contextOfOrganization: event.target.value }))} placeholder="Fatores organizacionais, mudancas relevantes, requisitos internos e premissas de gestao." /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Intervalo de revisao (meses)</label><input className="input-field" type="number" min="1" value={contextForm.reviewIntervalMonths} onChange={(event) => setContextForm((prev) => ({ ...prev, reviewIntervalMonths: Number(event.target.value) || 1 }))} /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Ultima visita de campo</label><input className="input-field" type="date" value={contextForm.lastFieldVisitAt} onChange={(event) => setContextForm((prev) => ({ ...prev, lastFieldVisitAt: event.target.value }))} /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Proxima revisao</label><input className="input-field" type="date" value={contextForm.nextReviewAt} onChange={(event) => setContextForm((prev) => ({ ...prev, nextReviewAt: event.target.value }))} /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Contratadas e interfaces</label><textarea className="input-field min-h-[90px]" value={contextForm.contractors} onChange={(event) => setContextForm((prev) => ({ ...prev, contractors: event.target.value }))} placeholder="Descreva empresas terceiras, compartilhamento de area e interfaces operacionais relevantes." /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Mudancas desde a ultima revisao</label><textarea className="input-field min-h-[90px]" value={contextForm.changesSinceLastReview} onChange={(event) => setContextForm((prev) => ({ ...prev, changesSinceLastReview: event.target.value }))} placeholder="Mudancas de layout, processo, tecnologia, organizacao do trabalho, acidentes ou novas evidencias." /></div>
        </div>
      </FormModal>

      <FormModal
        isOpen={snapshotOpen}
        onClose={() => { setSnapshotOpen(false); setSnapshotCycle(null); setSnapshot(null); setSnapshotError(''); }}
        title={`Snapshot publicado${snapshotCycle?.title ? ` - ${snapshotCycle.title}` : ''}`}
        onSubmit={(event) => event.preventDefault()}
        loading={false}
        error={snapshotError}
        showFooter={false}
        asForm={false}
      >
        {snapshotLoading ? (
          <div className="flex h-48 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" /></div>
        ) : snapshot ? (
          <div className="space-y-4 pb-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Versao</p><p className="mt-2 text-lg font-semibold text-slate-950">v{snapshot.version}</p></div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Publicado em</p><p className="mt-2 text-sm font-semibold text-slate-950">{formatDateTime(snapshot.publishedAt)}</p></div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Publicado por</p><p className="mt-2 text-sm font-semibold text-slate-950">{snapshot.publishedBy?.nome || 'Nao identificado'}</p></div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-sm text-slate-600"><span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Ambientes</span><strong className="mt-2 block text-lg text-slate-950">{snapshot.payload?.environments?.length || 0}</strong></div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-sm text-slate-600"><span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Riscos</span><strong className="mt-2 block text-lg text-slate-950">{snapshot.payload?.completion?.counts?.risks || 0}</strong></div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-sm text-slate-600"><span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Qualitativas</span><strong className="mt-2 block text-lg text-slate-950">{snapshot.payload?.completion?.counts?.assessedRisks || 0}</strong></div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-sm text-slate-600"><span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Plano de acao</span><strong className="mt-2 block text-lg text-slate-950">{snapshot.payload?.actionPlanItems?.length || 0}</strong></div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-950 p-4 text-xs leading-6 text-slate-100"><pre className="overflow-auto whitespace-pre-wrap">{JSON.stringify(snapshot.payload, null, 2)}</pre></div>
          </div>
        ) : <div className="py-8 text-sm text-slate-500">Nenhum snapshot disponivel para este ciclo.</div>}
      </FormModal>
    </div>
  );
};

export default RiskSurveyCycles;
