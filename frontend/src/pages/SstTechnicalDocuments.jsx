import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FileStack, FileText, ShieldCheck, Sparkles } from 'lucide-react';

import EmptyState from '../components/ui/EmptyState';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { sstService } from '../services/api';

const formatDate = (value) => {
  if (!value) return 'Sem data';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Data invalida' : parsed.toLocaleString('pt-BR');
};

const SstTechnicalDocuments = () => {
  const { hasPermission } = useAuth();
  const canSign = hasPermission('sst:sign');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState([]);
  const [pppStatus, setPppStatus] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [form, setForm] = useState({ templateCode: '', scopeType: 'assessment', scopeRefId: '', editable: { resumo: '', notas: '', ressalvas: '' } });
  const [issuing, setIssuing] = useState(false);

  const metrics = useMemo(
    () => ({
      templates: templates.length,
      issued: documents.length,
      active: documents.filter((item) => item.status === 'issued').length,
      invalidated: documents.filter((item) => item.status === 'invalidated').length
    }),
    [templates, documents]
  );

  const loadData = async () => {
    const [templateResponse, assessmentsResponse, documentsResponse] = await Promise.all([
      sstService.getDocumentTemplates(),
      sstService.listAssessments({ status: 'published' }),
      sstService.listIssuedDocuments()
    ]);
    const nextTemplates = templateResponse.data.data?.templates || [];
    const nextAssessments = assessmentsResponse.data.data || [];
    setTemplates(nextTemplates);
    setPppStatus(templateResponse.data.data?.ppp || null);
    setAssessments(nextAssessments);
    setDocuments(documentsResponse.data.data || []);
    setForm((prev) => ({
      ...prev,
      templateCode: nextTemplates.some((item) => item.code === prev.templateCode) ? prev.templateCode : nextTemplates[0]?.code || '',
      scopeRefId: nextAssessments.some((item) => String(item.id) === String(prev.scopeRefId)) ? prev.scopeRefId : nextAssessments[0]?.id || ''
    }));
  };

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError('');
        await loadData();
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Erro ao carregar documentos tecnicos.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleIssue = async (event) => {
    event.preventDefault();
    try {
      setIssuing(true);
      setError('');
      await sstService.issueDocument(form);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Erro ao emitir documento tecnico.');
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
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Erro ao invalidar documento.');
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Documentacao tecnica" title="Emitidos e templates" description="Emissao rastreavel a partir de avaliacoes publicadas. PPP fica preparado, mas nao emitivel nesta fase." />

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={FileText} label="Templates" value={metrics.templates} meta="Motor documental ativo" tone="blue" />
        <MetricCard icon={FileStack} label="Emitidos" value={metrics.issued} meta="Versoes rastreaveis" tone="lime" />
        <MetricCard icon={ShieldCheck} label="Ativos" value={metrics.active} meta="Documentos vigentes" tone="blue" />
        <MetricCard icon={AlertTriangle} label="Invalidos" value={metrics.invalidated} meta="Exigem rastreio" tone="amber" />
      </section>

      <section className="panel-surface p-6">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Motor documental</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">Emitir a partir de avaliacoes publicadas</h2>
          </div>
          <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            PPP: <strong className="text-slate-900">{pppStatus?.status || 'prepared'}</strong> • {pppStatus?.reason || 'Dependencia de trabalhador nominal'}
          </div>
        </div>

        <form className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr_auto]" onSubmit={handleIssue}>
          <select className="input-field" value={form.templateCode} onChange={(event) => setForm((prev) => ({ ...prev, templateCode: event.target.value }))} required>
            <option value="">Selecione o template</option>
            {templates.map((template) => <option key={template.code} value={template.code}>{template.title}</option>)}
          </select>
          <select className="input-field" value={form.scopeRefId} onChange={(event) => setForm((prev) => ({ ...prev, scopeRefId: event.target.value }))} required>
            <option value="">Selecione a avaliacao publicada</option>
            {assessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.title}</option>)}
          </select>
          <textarea className="input-field min-h-[90px]" value={form.editable.resumo} onChange={(event) => setForm((prev) => ({ ...prev, editable: { ...prev.editable, resumo: event.target.value } }))} placeholder="Resumo tecnico editavel" />
          <button type="submit" className="btn-primary" disabled={!canSign || !form.templateCode || !form.scopeRefId || issuing}>
            {issuing ? 'Emitindo...' : 'Emitir'}
          </button>
        </form>
      </section>

      <section className="panel-surface p-6">
        {documents.length === 0 ? (
          <EmptyState icon={Sparkles} title="Nenhum documento emitido" description="Os documentos emitidos aparecerao aqui com hash, versao e escopo." />
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <article key={document.id} className="rounded-[1.35rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`status-pill ${document.status === 'invalidated' ? 'status-danger' : document.status === 'superseded' ? 'status-warning' : 'status-success'}`}>{document.status}</span>
                      <span className="status-pill status-info">{document.documentType}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-slate-950">{document.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">Escopo: {document.scopeType} • Ref: {document.scopeRefId}</p>
                    <p className="mt-2 text-xs text-slate-500">Ultima versao: v{document.latestIssuedVersion?.version || document.latestVersion} • Hash: {document.latestIssuedVersion?.hash || 'n/a'}</p>
                    <p className="mt-2 text-xs text-slate-500">Emitido em {formatDate(document.latestIssuedVersion?.issuedAt)}</p>
                  </div>
                  {canSign && document.status === 'issued' ? <button type="button" className="btn-secondary text-red-600" onClick={() => handleInvalidate(document.id)}>Invalidar</button> : null}
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
