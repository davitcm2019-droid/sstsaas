import { useEffect, useMemo, useState } from 'react';
import { FileStack, Layers3, Paperclip, Plus, Sparkles } from 'lucide-react';

import FormModal from '../components/FormModal';
import EmptyState from '../components/ui/EmptyState';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { empresasService, sstService } from '../services/api';

const DOCUMENT_TYPE_LABELS = {
  inventario: 'Inventario',
  pgr: 'PGR',
  ltcat: 'LTCAT',
  laudo_insalubridade: 'Laudo de Insalubridade',
  laudo_periculosidade: 'Laudo de Periculosidade',
  laudo_tecnico: 'Laudo Tecnico'
};

const SCOPE_OPTIONS = [
  { value: 'assessment', label: 'Avaliacao' },
  { value: 'sector', label: 'Setor' },
  { value: 'establishment', label: 'Estabelecimento' }
];

const INITIAL_FORM = {
  empresaId: '',
  code: '',
  title: '',
  description: '',
  documentType: 'inventario',
  allowedScopeTypes: ['assessment'],
  active: true,
  layers: {
    fixed: '',
    editable: { resumo: '', notas: '', ressalvas: '' },
    annexes: []
  }
};

const summarize = (value, fallback) => {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return text.length > 140 ? `${text.slice(0, 140)}...` : text;
};

const SstDocumentModels = () => {
  const { hasPermission } = useAuth();
  const canConfigure = hasPermission('sst:configure');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [models, setModels] = useState([]);
  const [filters, setFilters] = useState({ empresaId: '', documentType: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const metrics = useMemo(
    () => ({
      total: models.length,
      ativos: models.filter((item) => item.active).length,
      customizados: models.filter((item) => item.empresaId).length,
      anexos: models.reduce((total, item) => total + (item.layers?.annexes?.length || 0), 0)
    }),
    [models]
  );

  const loadData = async () => {
    const [companiesResponse, modelsResponse] = await Promise.all([
      empresasService.getAll(),
      sstService.listDocumentModels({
        ...(filters.empresaId ? { empresaId: filters.empresaId } : {}),
        ...(filters.documentType ? { documentType: filters.documentType } : {})
      })
    ]);

    setCompanies(companiesResponse.data.data || []);
    setModels(modelsResponse.data.data || []);
  };

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError('');
        await loadData();
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Erro ao carregar modelos documentais.');
      } finally {
        setLoading(false);
      }
    })();
  }, [filters.empresaId, filters.documentType]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...INITIAL_FORM,
      empresaId: filters.empresaId,
      documentType: filters.documentType || 'inventario'
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      empresaId: item.empresaId || '',
      code: item.code,
      title: item.title,
      description: item.description || '',
      documentType: item.documentType,
      allowedScopeTypes: item.allowedScopeTypes || ['assessment'],
      active: Boolean(item.active),
      layers: {
        fixed: item.layers?.fixed || '',
        editable: {
          resumo: item.layers?.editable?.resumo || '',
          notas: item.layers?.editable?.notas || '',
          ressalvas: item.layers?.editable?.ressalvas || ''
        },
        annexes: item.layers?.annexes || []
      }
    });
    setFormError('');
    setModalOpen(true);
  };

  const toggleScope = (scopeType) => {
    setForm((prev) => {
      const exists = prev.allowedScopeTypes.includes(scopeType);
      const nextScopes = exists ? prev.allowedScopeTypes.filter((item) => item !== scopeType) : [...prev.allowedScopeTypes, scopeType];
      return { ...prev, allowedScopeTypes: nextScopes.length ? nextScopes : ['assessment'] };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setFormError('');
      if (editingId) {
        await sstService.updateDocumentModel(editingId, form);
      } else {
        await sstService.createDocumentModel(form);
      }
      setModalOpen(false);
      await loadData();
    } catch (requestError) {
      setFormError(requestError?.response?.data?.message || 'Erro ao salvar modelo documental.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Documentacao tecnica"
        title="Modelos"
        description="Governanca dos modelos por empresa, com camadas fixas, editaveis e anexos para emissao rastreavel em PDF."
        actions={canConfigure ? <button type="button" className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" />Novo modelo</button> : null}
      >
        <div className="grid gap-3 xl:grid-cols-2">
          <select className="input-field" value={filters.empresaId} onChange={(event) => setFilters((prev) => ({ ...prev, empresaId: event.target.value }))}>
            <option value="">Todos os contextos</option>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.nome}</option>)}
          </select>
          <select className="input-field" value={filters.documentType} onChange={(event) => setFilters((prev) => ({ ...prev, documentType: event.target.value }))}>
            <option value="">Todos os tipos</option>
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </PageHeader>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={FileStack} label="Modelos" value={metrics.total} meta="Base ativa do motor documental" tone="blue" />
        <MetricCard icon={Layers3} label="Ativos" value={metrics.ativos} meta="Disponiveis para emissao" tone="lime" />
        <MetricCard icon={Sparkles} label="Por empresa" value={metrics.customizados} meta="Modelos customizados" tone="slate" />
        <MetricCard icon={Paperclip} label="Anexos" value={metrics.anexos} meta="Blocos complementares" tone="blue" />
      </section>

      <section className="panel-surface p-6">
        {models.length === 0 ? (
          <EmptyState icon={FileStack} title="Nenhum modelo disponivel" description="Crie modelos por empresa ou mantenha os padroes globais para emitir documentos em PDF." />
        ) : (
          <div className="space-y-3">
            {models.map((item) => (
              <article key={item.id} className="rounded-[1.35rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`status-pill ${item.active ? 'status-success' : 'status-warning'}`}>{item.active ? 'ativo' : 'inativo'}</span>
                      <span className="status-pill status-info">{DOCUMENT_TYPE_LABELS[item.documentType] || item.documentType}</span>
                      <span className="status-pill status-info">{item.empresaId ? 'empresa' : 'global'}</span>
                      <span className="status-pill status-info">{item.code}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{item.description || 'Sem descricao adicional.'}</p>
                    <div className="mt-4 grid gap-3 xl:grid-cols-3">
                      <div className="rounded-[1.1rem] border border-slate-200/80 bg-slate-50/70 p-3">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Fixo</p>
                        <p className="mt-2 text-sm text-slate-700">{summarize(item.layers?.fixed, 'Sem camada fixa definida.')}</p>
                      </div>
                      <div className="rounded-[1.1rem] border border-slate-200/80 bg-slate-50/70 p-3">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Editavel</p>
                        <p className="mt-2 text-sm text-slate-700">{summarize(item.layers?.editable?.resumo || item.layers?.editable?.notas || item.layers?.editable?.ressalvas, 'Sem defaults editaveis.')}</p>
                      </div>
                      <div className="rounded-[1.1rem] border border-slate-200/80 bg-slate-50/70 p-3">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Anexos</p>
                        <p className="mt-2 text-sm text-slate-700">{item.layers?.annexes?.length || 0} anexo(s) configurado(s)</p>
                        <p className="mt-1 text-xs text-slate-500">{(item.allowedScopeTypes || []).join(' • ')}</p>
                      </div>
                    </div>
                  </div>
                  {canConfigure ? <button type="button" className="btn-secondary" onClick={() => openEdit(item)}>Editar</button> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar modelo documental' : 'Novo modelo documental'}
        onSubmit={handleSubmit}
        loading={saving}
        error={formError}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Empresa</label>
            <select className="input-field" value={form.empresaId} onChange={(event) => setForm((prev) => ({ ...prev, empresaId: event.target.value }))}>
              <option value="">Global</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Tipo documental</label>
            <select className="input-field" value={form.documentType} onChange={(event) => setForm((prev) => ({ ...prev, documentType: event.target.value }))} required>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Codigo</label>
            <input className="input-field" value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} required disabled={Boolean(editingId && models.find((item) => item.id === editingId)?.isSystem)} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Status</label>
            <select className="input-field" value={String(form.active)} onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.value === 'true' }))}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Titulo</label>
            <input className="input-field" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} required />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Descricao</label>
            <textarea className="input-field min-h-[90px]" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          </div>

          <div className="md:col-span-2 rounded-[1.2rem] border border-slate-200/80 bg-slate-50/70 p-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Escopos permitidos</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {SCOPE_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.allowedScopeTypes.includes(option.value)} onChange={() => toggleScope(option.value)} />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Camada fixa</label>
            <textarea className="input-field min-h-[120px]" value={form.layers.fixed} onChange={(event) => setForm((prev) => ({ ...prev, layers: { ...prev.layers, fixed: event.target.value } }))} />
          </div>

          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Resumo editavel</label>
            <textarea className="input-field min-h-[100px]" value={form.layers.editable.resumo} onChange={(event) => setForm((prev) => ({ ...prev, layers: { ...prev.layers, editable: { ...prev.layers.editable, resumo: event.target.value } } }))} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Notas editaveis</label>
            <textarea className="input-field min-h-[100px]" value={form.layers.editable.notas} onChange={(event) => setForm((prev) => ({ ...prev, layers: { ...prev.layers, editable: { ...prev.layers.editable, notas: event.target.value } } }))} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Ressalvas editaveis</label>
            <textarea className="input-field min-h-[100px]" value={form.layers.editable.ressalvas} onChange={(event) => setForm((prev) => ({ ...prev, layers: { ...prev.layers, editable: { ...prev.layers.editable, ressalvas: event.target.value } } }))} />
          </div>

          <div className="md:col-span-2 rounded-[1.2rem] border border-slate-200/80 bg-white/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Anexos</p>
                <p className="mt-1 text-sm text-slate-600">Blocos complementares que vao junto para o PDF emitido.</p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    layers: {
                      ...prev.layers,
                      annexes: [...prev.layers.annexes, { title: '', content: '', order: prev.layers.annexes.length + 1 }]
                    }
                  }))
                }
              >
                <Plus className="h-4 w-4" />Adicionar anexo
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {form.layers.annexes.length === 0 ? (
                <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-500">Nenhum anexo configurado.</div>
              ) : (
                form.layers.annexes.map((annex, index) => (
                  <div key={`${index}-${annex.title}`} className="rounded-[1rem] border border-slate-200/80 bg-slate-50/70 p-3">
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                      <input
                        className="input-field"
                        value={annex.title}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            layers: {
                              ...prev.layers,
                              annexes: prev.layers.annexes.map((item, itemIndex) => (itemIndex === index ? { ...item, title: event.target.value } : item))
                            }
                          }))
                        }
                        placeholder="Titulo do anexo"
                      />
                      <button
                        type="button"
                        className="btn-secondary text-red-600"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            layers: {
                              ...prev.layers,
                              annexes: prev.layers.annexes.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, order: itemIndex + 1 }))
                            }
                          }))
                        }
                      >
                        Remover
                      </button>
                    </div>
                    <textarea
                      className="input-field mt-3 min-h-[110px]"
                      value={annex.content}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          layers: {
                            ...prev.layers,
                            annexes: prev.layers.annexes.map((item, itemIndex) => (itemIndex === index ? { ...item, content: event.target.value } : item))
                          }
                        }))
                      }
                      placeholder="Conteudo do anexo"
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </FormModal>
    </div>
  );
};

export default SstDocumentModels;
