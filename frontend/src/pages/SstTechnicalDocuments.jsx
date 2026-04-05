import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Eye,
  FileStack,
  FileText,
  Layers3,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
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

const DOCUMENT_TYPE_LABELS = {
  inventario: 'Inventario',
  pgr: 'PGR',
  ltcat: 'LTCAT',
  ordem_servico: 'Ordem de Servico',
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

const getAssetBadge = (asset = null) => {
  if (!asset) return 'Nao gerado';
  if (asset.provider === 's3') return 'S3/MinIO';
  if (asset.absolutePath || asset.relativePath) return 'Local';
  return asset.provider || 'Gerado';
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
  const [previewDocumentId, setPreviewDocumentId] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewAssets, setPreviewAssets] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
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

  const selectedAssessment = useMemo(
    () => assessments.find((item) => String(item.id) === String(form.scopeRefId)) || null,
    [assessments, form.scopeRefId]
  );

  const selectedPreviewDocument = useMemo(
    () => documents.find((item) => String(item.id) === String(previewDocumentId)) || null,
    [documents, previewDocumentId]
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
    const nextDocuments = documentsResponse.data.data || [];

    setCompanies(nextCompanies);
    setModels(nextModels);
    setPppStatus(templatesResponse.data.data?.ppp || null);
    setAssessments(nextAssessments);
    setDocuments(nextDocuments);
    if (previewDocumentId && !nextDocuments.some((item) => String(item.id) === String(previewDocumentId))) {
      setPreviewDocumentId('');
      setPreviewHtml('');
      setPreviewAssets(null);
    }
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
          missingFields: [requestError?.response?.data?.message || 'Erro ao calcular prontidao documental.']
        });
      } finally {
        if (active) setReadinessLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedModel?.documentType, form.scopeRefId, form.scopeType]);

  const loadPreview = async (documentId) => {
    try {
      setPreviewLoading(true);
      setError('');
      setPreviewDocumentId(documentId);
      const [htmlResponse, assetsResponse] = await Promise.all([
        sstService.getIssuedDocumentHtmlPreview(documentId),
        sstService.getIssuedDocumentAssets(documentId)
      ]);
      setPreviewHtml(htmlResponse.data || '');
      setPreviewAssets(assetsResponse.data?.data?.assets || null);
    } catch (requestError) {
      setPreviewHtml('');
      setPreviewAssets(null);
      setError(requestError?.response?.data?.message || 'Erro ao carregar preview do documento.');
    } finally {
      setPreviewLoading(false);
    }
  };

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
      if (String(previewDocumentId) === String(documentId)) {
        await loadPreview(documentId);
      }
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
      if (String(previewDocumentId) === String(documentId)) {
        const assetsResponse = await sstService.getIssuedDocumentAssets(documentId);
        setPreviewAssets(assetsResponse.data?.data?.assets || null);
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Erro ao baixar PDF do documento.');
    } finally {
      setDownloadingId('');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Documentacao tecnica"
        title="Emitidos com preview HTML"
        description="Emissao por empresa e modelo, com preview institucional em HTML, download imediato do PDF e armazenamento externo quando configurado."
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
            {assessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{`${assessment.title} • ${formatCoverageRange(assessment.abrangenciaInicio, assessment.abrangenciaFim)} • v${assessment.version}`}</option>)}
          </select>

          <textarea className="input-field min-h-[110px]" value={form.editable.resumo} onChange={(event) => setForm((prev) => ({ ...prev, editable: { ...prev.editable, resumo: event.target.value } }))} placeholder="Resumo tecnico editavel" />
          <textarea className="input-field min-h-[110px]" value={form.editable.notas} onChange={(event) => setForm((prev) => ({ ...prev, editable: { ...prev.editable, notas: event.target.value } }))} placeholder="Notas complementares" />
          <textarea className="input-field min-h-[110px]" value={form.editable.ressalvas} onChange={(event) => setForm((prev) => ({ ...prev, editable: { ...prev.editable, ressalvas: event.target.value } }))} placeholder="Ressalvas tecnicas" />

          <div className="xl:col-span-3 flex justify-end">
            <button
              type="submit"
              className="btn-primary"
              disabled={!canSign || !form.empresaId || !form.documentModelId || !form.scopeRefId || issuing || readinessLoading || Boolean(readiness?.blocking)}
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

        {selectedAssessment ? (
          <div className="mt-4 rounded-[1.1rem] border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
            Avaliacao selecionada: <strong className="text-slate-950">{selectedAssessment.title}</strong> • {formatCoverageRange(selectedAssessment.abrangenciaInicio, selectedAssessment.abrangenciaFim)}
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

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.9fr)]">
        <div className="panel-surface p-6">
          {documents.length === 0 ? (
            <EmptyState icon={Sparkles} title="Nenhum documento emitido" description="Os documentos emitidos aparecerao aqui com versao, hash, preview HTML e download em PDF." />
          ) : (
            <div className="space-y-3">
              {documents.map((document) => {
                const latestVersion = document.latestIssuedVersion || {};
                const assets = latestVersion.assets || {};

                return (
                  <article key={document.id} className="rounded-[1.35rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`status-pill ${document.status === 'invalidated' ? 'status-danger' : document.status === 'superseded' ? 'status-warning' : 'status-success'}`}>{document.status}</span>
                          <span className="status-pill status-info">{DOCUMENT_TYPE_LABELS[document.documentType] || document.documentType}</span>
                          <span className="status-pill status-info">{document.documentModelTitle || latestVersion.documentModelTitle || 'Modelo padrao'}</span>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-slate-950">{document.title}</h3>
                        <p className="mt-2 text-sm text-slate-600">Empresa: {document.empresaId} • Escopo: {document.scopeType} • Ref: {document.scopeRefId}</p>
                        <p className="mt-2 text-xs text-slate-500">Ultima versao: v{latestVersion.version || document.latestVersion} • Hash: {latestVersion.hash || 'n/a'}</p>
                        <p className="mt-2 text-xs text-slate-500">Emitido em {formatDate(latestVersion.issuedAt)}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="status-pill status-info">HTML: {getAssetBadge(assets.html)}</span>
                          <span className="status-pill status-info">PDF: {getAssetBadge(assets.pdf)}</span>
                        </div>
                      </div>

                      <div className="flex min-w-[240px] flex-col gap-2">
                        <button type="button" className="btn-secondary" disabled={previewLoading && previewDocumentId === document.id} onClick={() => loadPreview(document.id)}>
                          <Eye className="h-4 w-4" />
                          {previewLoading && previewDocumentId === document.id ? 'Carregando preview...' : 'Preview HTML'}
                        </button>
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
                );
              })}
            </div>
          )}
        </div>

        <aside className="panel-surface p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Preview documental</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">HTML institucional</h2>
            </div>
            {selectedPreviewDocument ? (
              <button type="button" className="btn-secondary" onClick={() => loadPreview(selectedPreviewDocument.id)} disabled={previewLoading}>
                <Eye className="h-4 w-4" />
                Atualizar
              </button>
            ) : null}
          </div>

          {!selectedPreviewDocument ? (
            <div className="mt-6">
              <EmptyState icon={Eye} title="Nenhum preview carregado" description="Selecione um documento emitido para visualizar o HTML consolidado e os links de armazenamento." />
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/70 p-4">
                <p className="text-sm font-semibold text-slate-950">{selectedPreviewDocument.title}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {DOCUMENT_TYPE_LABELS[selectedPreviewDocument.documentType] || selectedPreviewDocument.documentType} • {selectedPreviewDocument.documentModelTitle || 'Modelo padrao'}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.1rem] border border-slate-200/80 bg-white/80 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Asset HTML</p>
                  <p className="mt-2 text-sm text-slate-700">{getAssetBadge(previewAssets?.html)}</p>
                  {previewAssets?.html?.url ? (
                    <a className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-sky-700" href={previewAssets.html.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Abrir link externo
                    </a>
                  ) : null}
                </div>
                <div className="rounded-[1.1rem] border border-slate-200/80 bg-white/80 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Asset PDF</p>
                  <p className="mt-2 text-sm text-slate-700">{getAssetBadge(previewAssets?.pdf)}</p>
                  {previewAssets?.pdf?.url ? (
                    <a className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-sky-700" href={previewAssets.pdf.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Abrir link externo
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white">
                {previewLoading ? (
                  <div className="flex h-[720px] items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" />
                  </div>
                ) : previewHtml ? (
                  <iframe
                    title={`preview-${selectedPreviewDocument.id}`}
                    srcDoc={previewHtml}
                    className="h-[720px] w-full bg-white"
                  />
                ) : (
                  <div className="flex h-[720px] items-center justify-center px-6 text-center text-sm text-slate-500">
                    Nao foi possivel montar o preview HTML deste documento.
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
};

export default SstTechnicalDocuments;
