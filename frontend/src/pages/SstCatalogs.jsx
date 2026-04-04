import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, LibraryBig, Plus, Shield } from 'lucide-react';

import FormModal from '../components/FormModal';
import EmptyState from '../components/ui/EmptyState';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { sstService } from '../services/api';

const INITIAL_FORM = {
  catalogType: 'hazard',
  code: '',
  title: '',
  description: '',
  active: true
};

const CATALOG_LABELS = {
  hazard: 'Perigos',
  risk_factor: 'Fatores',
  agent: 'Agentes',
  control: 'Controles',
  normative_reference: 'Referencias'
};

const SstCatalogs = () => {
  const { hasPermission } = useAuth();
  const canConfigure = hasPermission('sst:configure');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const metrics = useMemo(
    () => ({
      total: items.length,
      ativos: items.filter((item) => item.active).length,
      categorias: new Set(items.map((item) => item.catalogType)).size
    }),
    [items]
  );

  const loadData = async () => {
    const response = await sstService.listCatalogs(typeFilter ? { catalogType: typeFilter } : {});
    setItems(response.data.data || []);
  };

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError('');
        await loadData();
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Erro ao carregar catalogos.');
      } finally {
        setLoading(false);
      }
    })();
  }, [typeFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...INITIAL_FORM, catalogType: typeFilter || 'hazard' });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      catalogType: item.catalogType,
      code: item.code,
      title: item.title,
      description: item.description || '',
      active: Boolean(item.active)
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setFormError('');
      if (editingId) {
        await sstService.updateCatalogItem(editingId, form);
      } else {
        await sstService.createCatalogItem(form);
      }
      setModalOpen(false);
      await loadData();
    } catch (requestError) {
      setFormError(requestError?.response?.data?.message || 'Erro ao salvar item de catalogo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Governanca tecnica" title="Catalogos" description="Base controlada para perigos, fatores, agentes, controles e referencias normativas." actions={canConfigure ? <button type="button" className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" />Novo item</button> : null}>
        <select className="input-field max-w-md" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="">Todos os catalogos</option>
          {Object.entries(CATALOG_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </PageHeader>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={LibraryBig} label="Itens" value={metrics.total} meta="Biblioteca tecnica" tone="blue" />
        <MetricCard icon={Shield} label="Ativos" value={metrics.ativos} meta="Disponiveis para uso" tone="lime" />
        <MetricCard icon={BookOpenText} label="Categorias" value={metrics.categorias} meta="Tipos de catalogo" tone="slate" />
      </section>

      <section className="panel-surface p-6">
        {items.length === 0 ? (
          <EmptyState icon={LibraryBig} title="Nenhum item cadastrado" description="O sistema ja semeia um conjunto base; novos itens entram aqui com governanca." />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <article key={item.id} className="rounded-[1.35rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`status-pill ${item.active ? 'status-success' : 'status-warning'}`}>{item.active ? 'ativo' : 'inativo'}</span>
                      <span className="status-pill status-info">{CATALOG_LABELS[item.catalogType] || item.catalogType}</span>
                      <span className="status-pill status-info">{item.code}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{item.description || 'Sem descricao detalhada.'}</p>
                  </div>
                  {canConfigure ? <button type="button" className="btn-secondary" onClick={() => openEdit(item)}>Editar</button> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <FormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar item de catalogo' : 'Novo item de catalogo'} onSubmit={handleSubmit} loading={saving} error={formError}>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Catalogo</label><select className="input-field" value={form.catalogType} onChange={(event) => setForm((prev) => ({ ...prev, catalogType: event.target.value }))}>{Object.entries(CATALOG_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Codigo</label><input className="input-field" value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} required /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Titulo</label><input className="input-field" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} required /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Descricao</label><textarea className="input-field min-h-[90px]" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} /></div>
          <div><label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Status</label><select className="input-field" value={String(form.active)} onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.value === 'true' }))}><option value="true">Ativo</option><option value="false">Inativo</option></select></div>
        </div>
      </FormModal>
    </div>
  );
};

export default SstCatalogs;
