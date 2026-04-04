import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, FileStack, FileText, ShieldCheck, Sparkles, XCircle } from 'lucide-react';

import EmptyState from '../components/ui/EmptyState';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { documentsService, riskSurveyService } from '../services/api';

const ISSUE_DEFAULT = {
  cycleId: '',
  templateCode: 'inventario_riscos',
  issueJustification: '',
  editableContent: {
    resumo: '',
    notas: '',
    ressalvas: ''
  }
};

const STATUS_CLASSES = {
  active: 'status-success',
  invalidated: 'status-danger',
  superseded: 'status-warning'
};

const STATUS_LABELS = {
  active: 'Ativo',
  invalidated: 'Invalidado',
  superseded: 'Substituido'
};

const formatDate = (value, includeTime = false) => {
  if (!value) return 'Sem data';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Data invalida';
  return parsed.toLocaleString('pt-BR', includeTime ? undefined : { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const Documentos = () => {
  const { hasPermission } = useAuth();
  const canIssue = hasPermission('documents:issue');
  const canInvalidate = hasPermission('documents:invalidate');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [legacyDocuments, setLegacyDocuments] = useState([]);
  const [issuedDocuments, setIssuedDocuments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [publishedCycles, setPublishedCycles] = useState([]);
  const [issueForm, setIssueForm] = useState(ISSUE_DEFAULT);
  const [issuing, setIssuing] = useState(false);

  const metrics = useMemo(
    () => ({
      issued: issuedDocuments.length,
      active: issuedDocuments.filter((item) => item.status === 'active').length,
      invalidated: issuedDocuments.filter((item) => item.status === 'invalidated').length,
      legacy: legacyDocuments.length
    }),
    [issuedDocuments, legacyDocuments]
  );

  const selectedCycle = useMemo(
    () => publishedCycles.find((cycle) => String(cycle.id) === String(issueForm.cycleId)) || null,
    [publishedCycles, issueForm.cycleId]
  );

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.code === issueForm.templateCode) || null,
    [templates, issueForm.templateCode]
  );

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [legacyRes, issuedRes, templatesRes, cyclesRes] = await Promise.all([
        documentsService.getAll({ search: searchTerm }),
        documentsService.getIssued({ search: searchTerm }),
        documentsService.getTemplates(),
        riskSurveyService.listCycles({ status: 'published', includeCompletion: true })
      ]);

      const nextCycles = cyclesRes.data.data || [];

      setLegacyDocuments(legacyRes.data.data || []);
      setIssuedDocuments(issuedRes.data.data || []);
      setTemplates(templatesRes.data.data || []);
      setPublishedCycles(nextCycles);
      setIssueForm((prev) => ({
        ...prev,
        cycleId:
          nextCycles.some((cycle) => String(cycle.id) === String(prev.cycleId)) ? prev.cycleId : nextCycles[0]?.id || '',
        templateCode:
          (templatesRes.data.data || []).some((template) => template.code === prev.templateCode)
            ? prev.templateCode
            : templatesRes.data.data?.[0]?.code || 'inventario_riscos'
      }));
    } catch (loadError) {
      setError(loadError?.response?.data?.message || 'Erro ao carregar documentos e emissões.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [searchTerm]);

  const handleIssueDocument = async (event) => {
    event.preventDefault();
    if (!canIssue) return;

    try {
      setIssuing(true);
      setError('');
      await documentsService.issue(issueForm);
      setIssueForm((prev) => ({
        ...ISSUE_DEFAULT,
        cycleId: prev.cycleId,
        templateCode: prev.templateCode
      }));
      await loadData();
    } catch (issueError) {
      setError(issueError?.response?.data?.message || 'Erro ao emitir documento.');
    } finally {
      setIssuing(false);
    }
  };

  const handleInvalidate = async (documentId) => {
    const reason = window.prompt('Informe o motivo da invalidação:');
    if (!reason) return;

    try {
      setError('');
      await documentsService.invalidateIssued(documentId, { reason });
      await loadData();
    } catch (invalidateError) {
      setError(invalidateError?.response?.data?.message || 'Erro ao invalidar documento emitido.');
    }
  };

  const handleLegacyDownload = async (documentId) => {
    try {
      await documentsService.download(documentId);
      await loadData();
    } catch (downloadError) {
      setError(downloadError?.response?.data?.message || 'Erro ao registrar download.');
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
        eyebrow="Documentacao normativa"
        title="Documentos e emissao tecnica"
        description="Templates versionados, documentos emitidos por ciclo publicado e biblioteca documental legada no mesmo workspace."
      >
        <div className="grid gap-3 md:grid-cols-[1.3fr_1fr]">
          <input
            className="input-field"
            placeholder="Buscar por titulo, tipo, template ou documento legado"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <div className="rounded-[1.2rem] border border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate-600">
            Ciclos publicados disponiveis: <strong className="text-slate-900">{publishedCycles.length}</strong>
          </div>
        </div>
      </PageHeader>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={FileStack} label="Emitidos" value={metrics.issued} meta="Versoes documentais" tone="blue" />
        <MetricCard icon={ShieldCheck} label="Ativos" value={metrics.active} meta="Documentos vigentes" tone="lime" />
        <MetricCard icon={AlertTriangle} label="Invalidos" value={metrics.invalidated} meta="Exigem rastreio" tone="amber" />
        <MetricCard icon={FileText} label="Biblioteca antiga" value={metrics.legacy} meta="Acervo legado" tone="slate" />
      </section>

      <section className="panel-surface p-6">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Motor documental</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Emitir documentos a partir de ciclos publicados</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              A emissão técnica agora parte do snapshot publicado do ciclo. O conteúdo fixo e dinâmico é derivado dos dados avaliados; apenas a camada editável permanece controlada.
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
            Template atual: <strong className="text-slate-900">{selectedTemplate?.title || 'Nao selecionado'}</strong>
          </div>
        </div>

        {!publishedCycles.length ? (
          <EmptyState
            icon={Sparkles}
            title="Nenhum ciclo publicado"
            description="Publique ao menos um ciclo de levantamento para habilitar a emissao normativa."
          />
        ) : (
          <form className="grid gap-4 lg:grid-cols-[1.2fr_1fr]" onSubmit={handleIssueDocument}>
            <div className="grid gap-4">
              <select className="input-field" value={issueForm.cycleId} onChange={(event) => setIssueForm((prev) => ({ ...prev, cycleId: event.target.value }))} required>
                <option value="">Selecione o ciclo publicado</option>
                {publishedCycles.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {(cycle.title || `Levantamento ${cycle.estabelecimento}`)} • v{cycle.version}
                  </option>
                ))}
              </select>

              <select className="input-field" value={issueForm.templateCode} onChange={(event) => setIssueForm((prev) => ({ ...prev, templateCode: event.target.value }))} required>
                {templates.map((template) => (
                  <option key={template.code} value={template.code}>
                    {template.title}
                  </option>
                ))}
              </select>

              <textarea
                className="input-field min-h-[100px]"
                placeholder="Resumo executivo editavel"
                value={issueForm.editableContent.resumo}
                onChange={(event) => setIssueForm((prev) => ({ ...prev, editableContent: { ...prev.editableContent, resumo: event.target.value } }))}
              />
              <textarea
                className="input-field min-h-[100px]"
                placeholder="Notas tecnicas complementares"
                value={issueForm.editableContent.notas}
                onChange={(event) => setIssueForm((prev) => ({ ...prev, editableContent: { ...prev.editableContent, notas: event.target.value } }))}
              />
              <textarea
                className="input-field min-h-[90px]"
                placeholder="Justificativa para emissao com acoes vencidas, se aplicavel"
                value={issueForm.issueJustification}
                onChange={(event) => setIssueForm((prev) => ({ ...prev, issueJustification: event.target.value }))}
              />
            </div>

            <div className="grid gap-4 rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Escopo selecionado</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedCycle?.title || 'Selecione um ciclo'}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedCycle ? `${selectedCycle.unidade} / ${selectedCycle.estabelecimento}` : 'Sem escopo ativo'}
                </p>
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Responsavel tecnico</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedCycle?.responsibleTechnical?.nome || 'Nao informado'}</p>
                <p className="mt-1 text-sm text-slate-600">{selectedCycle?.responsibleTechnical?.registro || 'Registro pendente'}</p>
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Impacto documental</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedCycle?.documentImpactStatus || 'sem_impacto'}</p>
              </div>
              <button type="submit" className="btn-primary" disabled={!canIssue || !issueForm.cycleId || issuing}>
                {issuing ? 'Emitindo...' : 'Emitir documento'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="panel-surface p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Versoes emitidas</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">Documentos normativos gerados</h2>
          </div>
          <span className="text-sm font-semibold text-slate-500">{issuedDocuments.length} documento(s)</span>
        </div>

        {issuedDocuments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum documento emitido"
            description="A primeira emissão aparecerá aqui com hash, versão, RT e resumo do snapshot de origem."
          />
        ) : (
          <div className="space-y-3">
            {issuedDocuments.map((document) => (
              <article key={document.id} className="rounded-[1.35rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`status-pill ${STATUS_CLASSES[document.status] || 'status-info'}`}>{STATUS_LABELS[document.status] || document.status}</span>
                      <span className="status-pill status-info">v{document.version}</span>
                      <span className="status-pill status-info">{document.templateCode}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-slate-950">{document.title}</h3>
                    <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                      <div><span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Tipo</span><strong className="mt-1 block text-sm text-slate-900">{document.documentType}</strong></div>
                      <div><span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Escopo</span><strong className="mt-1 block text-sm text-slate-900">{document.unidade} / {document.estabelecimento}</strong></div>
                      <div><span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Emitido em</span><strong className="mt-1 block text-sm text-slate-900">{formatDate(document.issuedAt, true)}</strong></div>
                      <div><span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">RT</span><strong className="mt-1 block text-sm text-slate-900">{document.responsibleTechnical?.nome || 'Nao informado'}</strong></div>
                    </div>
                    <div className="mt-3 rounded-[1rem] border border-slate-200/70 bg-slate-50/70 p-3 text-xs leading-6 text-slate-600">
                      <div><strong className="text-slate-900">Hash:</strong> {document.hash}</div>
                      <div><strong className="text-slate-900">Base:</strong> {document.sourceSummary?.environments || 0} ambientes • {document.sourceSummary?.ghes || 0} GHEs • {document.sourceSummary?.risks || 0} riscos</div>
                      {document.contentLayers?.editable?.resumo ? <div><strong className="text-slate-900">Resumo editavel:</strong> {document.contentLayers.editable.resumo}</div> : null}
                    </div>
                  </div>

                  <div className="flex min-w-[220px] flex-col gap-2">
                    {canInvalidate && document.status === 'active' ? (
                      <button type="button" className="btn-secondary text-red-600" onClick={() => handleInvalidate(document.id)}>
                        <XCircle className="h-4 w-4" />
                        Invalidar versao
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel-surface p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Biblioteca legada</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">Documentos manuais e anexos</h2>
          </div>
          <span className="text-sm font-semibold text-slate-500">{legacyDocuments.length} item(ns)</span>
        </div>

        {legacyDocuments.length === 0 ? (
          <EmptyState
            icon={FileStack}
            title="Nenhum documento legado"
            description="O acervo manual continuará disponível aqui enquanto a camada normativa migra para emissão rastreável."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {legacyDocuments.map((document) => (
              <article key={document.id} className="rounded-[1.35rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">{document.nome}</h3>
                    <p className="mt-1 text-sm text-slate-600">{document.descricao || 'Sem descricao detalhada.'}</p>
                  </div>
                  <span className="status-pill status-info">{document.tipo}</span>
                </div>
                <div className="mt-4 space-y-1 text-sm text-slate-600">
                  <div>{document.empresaNome || 'Sem empresa vinculada'}</div>
                  <div>Categoria: {document.categoria}</div>
                  <div>Upload: {formatDate(document.dataUpload, true)}</div>
                  <div>Versao: {document.versao}</div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" className="btn-secondary flex-1" onClick={() => handleLegacyDownload(document.id)}>
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Documentos;
