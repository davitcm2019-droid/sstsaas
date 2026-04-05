import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, FileStack, FileText, Layers3, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import EmptyState from '../components/ui/EmptyState';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { empresasService, sstService } from '../services/api';

const parseFilename = (headerValue) => {
  const match = String(headerValue || '').match(/filename="?([^"]+)"?/i);
  return match?.[1] || 'documento-tecnico.pdf';
};

const formatDate = (value) => {
  if (!value) return 'Sem data';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Data invalida' : parsed.toLocaleString('pt-BR');
};

const DOCUMENT_TYPE_LABELS = {
  inventario: 'Inventario',
  pgr: 'PGR',
  ltcat: 'LTCAT',
  laudo_insalubridade: 'Laudo de Insalubridade',
  laudo_periculosidade: 'Laudo de Periculosidade',
  laudo_tecnico: 'Laudo Tecnico'
};

const formatMissingField = (item) => {
  if (!item) return 'Pendencia tecnica nao detalhada.';
  if (typeof item === 'string') return item;
  const section = item.section ? `[${item.section}] ` : '';
  return `${section}${item.message || item.field || item.code || 'Pendencia tecnica.'}`;
};

const SstTechnicalDocuments = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canSign = hasPermission('sst:sign');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [models, setModels] = useState([]);
  const [pppStatus, setPppStatus] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [seededModelId, setSeededModelId] = useState('');
  const [downloadingId, setDownloadingId] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [form, setForm] = useState({
    empresaId: '',
    documentModelId: '',
    scopeType: 'assessment',
    scopeRefId: '',
    editable: { resumo: '', notas: '', ressalvas: '' }
  });

  const selectedModel = useMemo(
    () => models.find((item) => String(item.id) === String(form.documentModelId)) || null,
    [models, form.documentModelId]
  );

  const metrics = useMemo(
    () => ({
      modelos: models.length,
      publicados: assessments.length,
      emitidos: documents.length,
      ativos: documents.filter((item) => item.status === 'issued').length
    }),
    [models, assessments, documents]
  );

  const loadData = async (empresaId = '') => {
    const [companiesResponse, templatesResponse, assessmentsResponse, documentsResponse] = await Promise.all([
      empresasService.getAll(),
      sstService.getDocumentTemplates(empresaId ? { empresaId } : {}),
      empresaId ? sstService.listAssessments({ status: 'published', empresaId }) : Promise.resolve({ data: { data: [] } }),
      sstService.listIssuedDocuments(empresaId ? { empresaId } : {})
    ]);

    const nextCompanies = companiesResponse.data.data || [];
    const nextModels = templatesResponse.data.data?.templates || [];
    const nextAssessments = assessmentsResponse.data.data || [];

    setCompanies(nextCompanies);
    setModels(nextModels);
    setPppStatus(templatesResponse.data.data?.ppp || null);
    setAssessments(nextAssessments);
    setDocuments(documentsResponse.data.data || []);
    setForm((prev) => ({
      ...prev,
      documentModelId: nextModels.some((item) => String(item.id) === String(prev.documentModelId)) ? prev.documentModelId : nextModels[0]?.id || '',
      scopeRefId: nextAssessments.some((item) => String(item.id) === String(prev.scopeRefId)) ? prev.scopeRefId : nextAssessments[0]?.id || ''
    }));
  };

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError('');
        await loadData(form.empresaId);
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Erro ao carregar documentos tecnicos.');
      } finally {
        setLoading(false);
      }
    })();
  }, [form.empresaId]);

  useEffect(() => {
    if (!selectedModel) return;
    if (String(seededModelId) === String(selectedModel.id)) return;
    setForm((prev) => ({
      ...prev,
      editable: {
        resumo: selectedModel.layers?.editable?.resumo || '',
        notas: selectedModel.layers?.editable?.notas || '',
        ressalvas: selectedModel.layers?.editable?.ressalvas || ''
      }
    }));
    setSeededModelId(String(selectedModel.id));
  }, [selectedModel, seededModelId]);

  useEffect(() => {
    if (!selectedModel?.documentType || !form.scopeRefId || !form.scopeType) {
      setReadiness(null);
      return;
    }

    let active = true;
    void (async () => {
      try {
        setReadinessLoading(true);
        const response = await sstService.getDocumentReadiness({
          documentType: selectedModel.documentType,
          scopeType: form.scopeType,
          scopeRefId: form.scopeRefId
        });
        if (!active) return;
        setReadiness(response.data?.data || null);
      } catch (requestError) {
        if (!active) return;
        setReadiness({
          emitible: false,
          blocking: true,
          missingFields: [
            requestError?.response?.data?.message || 'Erro ao calcular prontidao documental.'
          ]
        });
      } finally {
        if (active) setReadinessLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedModel?.documentType, form.scopeRefId, form.scopeType]);

  const handleIssue = async (event) => {
    event.preventDefault();
    try {
      setIssuing(true);
      setError('');
      if (readinessLoading) {
        setError('Aguarde a validacao de prontidao documental.');
        return;
      }
      if (readiness?.blocking) {
        setError('Documento bloqueado por pendencias obrigatorias. Revise a prontidao antes de emitir.');
        return;
      }
      await sstService.issueDocument({
        empresaId: form.empresaId,
        documentModelId: form.documentModelId,
        scopeType: form.scopeType,
        scopeRefId: form.scopeRefId,
        editable: form.editable
      });
      await loadData(form.empresaId);
    } catch (requestError) {
      const responseError = requestError?.response?.data || {};
      const readinessMeta = responseError?.meta?.code === 'DOCUMENT_READINESS_BLOCKED'
        ? {
            emitible: false,
            blocking: true,
            missingFields: responseError?.meta?.missingFields || []
          }
        : null;
      if (readinessMeta) setReadiness(readinessMeta);
      setError(responseError?.message || 'Erro ao emitir documento tecnico.');
    } finally {
      setIssuing(false);
    }
  };

  const handleInvalidate = async (documentId) => {
    const reason = window.prompt('Informe o motivo da invalidacao:');
    if (!reason) return;
    try {
      setError('');
      await sstService.invalidateDocument(documentId, { reason });
      await loadData(form.empresaId);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Erro ao invalidar documento.');
    }
  };

  const handleDownload = async (documentId) => {
    try {
      setDownloadingId(documentId);
      setError('');
      const response = await sstService.downloadIssuedDocumentPdf(documentId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = parseFilename(response.headers['content-disposition']);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Erro ao baixar PDF do documento.');
    } finally {
      setDownloadingId('');
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Documentacao tecnica"
        title="Emitidos em PDF"
        description="Emissao por empresa e modelo, com download imediato do PDF e rastreabilidade da versao emitida."
        actions={<button type="button" className="btn-secondary" onClick={() => navigate('/sst/documentos/modelos')}><Layers3 className="h-4 w-4" />Modelos</button>}
      />

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={FileStack} label="Modelos" value={metrics.modelos} meta="Disponiveis para emissao" tone="blue" />
        <MetricCard icon={ShieldCheck} label="Avaliacoes publicadas" value={metrics.publicados} meta="Base apta para documentos" tone="lime" />
        <MetricCard icon={FileText} label="Emitidos" value={metrics.emitidos} meta="Versoes documentais geradas" tone="blue" />
        <MetricCard icon={Download} label="Ativos" value={metrics.ativos} meta="Documentos vigentes para PDF" tone="slate" />
      </section>

      <section className="panel-surface p-6">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Emissao documental</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">Empresa + modelo + avaliacao publicada</h2>
          </div>
          <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            PPP: <strong className="text-slate-900">{pppStatus?.status || 'prepared'}</strong> • {pppStatus?.reason || 'Dependencia de trabalhador nominal'}
          </div>
        </div>

        <form className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]" onSubmit={handleIssue}>
          <select className="input-field" value={form.empresaId} onChange={(event) => { setSeededModelId(''); setForm((prev) => ({ ...prev, empresaId: event.target.value, documentModelId: '', scopeRefId: '' })); }}>
            <option value="">Selecione a empresa</option>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.nome}</option>)}
          </select>

          <select className="input-field" value={form.documentModelId} onChange={(event) => { setSeededModelId(''); setForm((prev) => ({ ...prev, documentModelId: event.target.value })); }} required>
            <option value="">Selecione o modelo</option>
            {models.map((model) => <option key={model.id} value={model.id}>{model.title}</option>)}
          </select>

          <select className="input-field" value={form.scopeRefId} onChange={(event) => setForm((prev) => ({ ...prev, scopeRefId: event.target.value }))} required>
            <option value="">Selecione a avaliacao publicada</option>
            {assessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.title}</option>)}
          </select>

          <textarea className="input-field min-h-[110px]" value={form.editable.resumo} onChange={(event) => setForm((prev) => ({ ...prev, editable: { ...prev.editable, resumo: event.target.value } }))} placeholder="Resumo tecnico editavel" />
          <textarea className="input-field min-h-[110px]" value={form.editable.notas} onChange={(event) => setForm((prev) => ({ ...prev, editable: { ...prev.editable, notas: event.target.value } }))} placeholder="Notas complementares" />
          <textarea className="input-field min-h-[110px]" value={form.editable.ressalvas} onChange={(event) => setForm((prev) => ({ ...prev, editable: { ...prev.editable, ressalvas: event.target.value } }))} placeholder="Ressalvas tecnicas" />

          <div className="xl:col-span-3 flex justify-end">
            <button
              type="submit"
              className="btn-primary"
              disabled={
                !canSign ||
                !form.empresaId ||
                !form.documentModelId ||
                !form.scopeRefId ||
                issuing ||
                readinessLoading ||
                Boolean(readiness?.blocking)
              }
            >
              {issuing ? 'Emitindo...' : 'Emitir PDF'}
            </button>
          </div>
        </form>

        {selectedModel ? (
          <div className={`mt-4 rounded-[1.1rem] border px-4 py-3 text-sm ${
            readinessLoading
              ? 'border-slate-200 bg-slate-50 text-slate-600'
              : readiness?.blocking
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-lime-200 bg-lime-50 text-lime-800'
          }`}>
            {readinessLoading ? (
              'Validando prontidao documental...'
            ) : readiness?.blocking ? (
              <div className="space-y-2">
                <p className="font-semibold">Emissao bloqueada por pendencias obrigatorias.</p>
                <ul className="list-disc pl-5">
                  {(readiness?.missingFields || []).slice(0, 8).map((item, index) => (
                    <li key={`${index}-${typeof item === 'string' ? item : item?.code || 'missing'}`}>
                      {formatMissingField(item)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>
                Prontidao documental validada para <strong>{DOCUMENT_TYPE_LABELS[selectedModel.documentType] || selectedModel.documentType}</strong>.
              </p>
            )}
          </div>
        ) : null}

        {selectedModel ? (
          <div className="mt-5 grid gap-3 xl:grid-cols-3">
            <div className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Camada fixa</p>
              <p className="mt-2 text-sm text-slate-700">{selectedModel.layers?.fixed || 'Sem conteudo fixo no modelo.'}</p>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Camada editavel</p>
              <p className="mt-2 text-sm text-slate-700">{selectedModel.layers?.editable?.resumo || selectedModel.layers?.editable?.notas || selectedModel.layers?.editable?.ressalvas || 'Sem defaults configurados.'}</p>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Anexos</p>
              <p className="mt-2 text-sm text-slate-700">{selectedModel.layers?.annexes?.length || 0} anexo(s) serao incorporados ao PDF.</p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel-surface p-6">
        {documents.length === 0 ? (
          <EmptyState icon={Sparkles} title="Nenhum documento emitido" description="Os documentos emitidos aparecerao aqui com versao, hash e download em PDF." />
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <article key={document.id} className="rounded-[1.35rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`status-pill ${document.status === 'invalidated' ? 'status-danger' : document.status === 'superseded' ? 'status-warning' : 'status-success'}`}>{document.status}</span>
                      <span className="status-pill status-info">{DOCUMENT_TYPE_LABELS[document.documentType] || document.documentType}</span>
                      <span className="status-pill status-info">{document.documentModelTitle || document.latestIssuedVersion?.documentModelTitle || 'Modelo padrao'}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-slate-950">{document.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">Empresa: {document.empresaId} • Escopo: {document.scopeType} • Ref: {document.scopeRefId}</p>
                    <p className="mt-2 text-xs text-slate-500">Ultima versao: v{document.latestIssuedVersion?.version || document.latestVersion} • Hash: {document.latestIssuedVersion?.hash || 'n/a'}</p>
                    <p className="mt-2 text-xs text-slate-500">Emitido em {formatDate(document.latestIssuedVersion?.issuedAt)}</p>
                  </div>

                  <div className="flex min-w-[220px] flex-col gap-2">
                    <button type="button" className="btn-secondary" disabled={downloadingId === document.id} onClick={() => handleDownload(document.id)}>
                      <Download className="h-4 w-4" />
                      {downloadingId === document.id ? 'Gerando PDF...' : 'Baixar PDF'}
                    </button>
                    {canSign && document.status === 'issued' ? (
                      <button type="button" className="btn-secondary text-red-600" onClick={() => handleInvalidate(document.id)}>
                        <AlertTriangle className="h-4 w-4" />
                        Invalidar
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default SstTechnicalDocuments;
