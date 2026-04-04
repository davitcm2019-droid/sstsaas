import { useEffect, useMemo, useState } from 'react';
import { Building2, Factory, MapPinned, Plus } from 'lucide-react';

import FormModal from '../components/FormModal';
import EmptyState from '../components/ui/EmptyState';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { empresasService, sstService } from '../services/api';

const INITIAL_FORM = {
  empresaId: '',
  nome: '',
  codigo: '',
  endereco: '',
  status: 'ativo'
};

const SstEstablishments = () => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('sst:write');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [items, setItems] = useState([]);
  const [companyFilter, setCompanyFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);

  const metrics = useMemo(
    () => ({
      total: items.length,
      ativos: items.filter((item) => item.status === 'ativo').length,
      inativos: items.filter((item) => item.status === 'inativo').length
    }),
    [items]
  );

  const loadData = async () => {
    const [companiesResponse, itemsResponse] = await Promise.all([
      empresasService.getAll(),
      sstService.listEstablishments(companyFilter ? { empresaId: companyFilter } : {})
    ]);
    setCompanies(companiesResponse.data.data || []);
    setItems(itemsResponse.data.data || []);
  };

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError('');
        await loadData();
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Erro ao carregar estabelecimentos.');
      } finally {
        setLoading(false);
      }
    })();
  }, [companyFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...INITIAL_FORM,
      empresaId: companyFilter || ''
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      empresaId: item.empresaId || '',
      nome: item.nome || '',
      codigo: item.codigo || '',
      endereco: item.endereco || '',
      status: item.status || 'ativo'
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
        await sstService.updateEstablishment(editingId, form);
      } else {
        await sstService.createEstablishment(form);
      }
      setModalOpen(false);
      setForm(INITIAL_FORM);
      await loadData();
    } catch (requestError) {
      setFormError(requestError?.response?.data?.message || 'Erro ao salvar estabelecimento.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Descontinuar/remover ${item.nome}?`)) return;
    try {
      setError('');
      await sstService.deleteEstablishment(item.id);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Erro ao remover estabelecimento.');
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Estrutura organizacional"
        title="Estabelecimentos"
        description="Base fisica do SST por empresa, usada como raiz para setores, cargos, avaliacoes e documentos."
        actions={canWrite ? <button type="button" className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" />Novo estabelecimento</button> : null}
      >
        <select className="input-field max-w-md" value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
          <option value="">Todas as empresas</option>
          {companies.map((company) => <option key={company.id} value={company.id}>{company.nome}</option>)}
        </select>
      </PageHeader>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={Factory} label="Estabelecimentos" value={metrics.total} meta="Base estrutural ativa" tone="blue" />
        <MetricCard icon={Building2} label="Ativos" value={metrics.ativos} meta="Operando no modulo" tone="lime" />
        <MetricCard icon={MapPinned} label="Inativos" value={metrics.inativos} meta="Descontinuados logicamente" tone="amber" />
      </section>

      <section className="panel-surface p-6">
        {items.length === 0 ? (
          <EmptyState
            icon={Factory}
            title="Nenhum estabelecimento cadastrado"
            description="Crie o primeiro estabelecimento para iniciar a estrutura organizacional do novo SST."
            action={canWrite ? <button type="button" className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" />Criar estabelecimento</button> : null}
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const company = companies.find((companyItem) => String(companyItem.id) === String(item.empresaId));
              return (
                <article key={item.id} className="rounded-[1.35rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`status-pill ${item.status === 'ativo' ? 'status-success' : 'status-warning'}`}>{item.status}</span>
                        {item.codigo ? <span className="status-pill status-info">{item.codigo}</span> : null}
                      </div>
                      <h2 className="mt-3 text-lg font-semibold text-slate-950">{item.nome}</h2>
                      <p className="mt-2 text-sm text-slate-600">{company?.nome || 'Empresa nao encontrada'}</p>
                      <p className="mt-2 text-sm text-slate-500">{item.endereco || 'Endereco nao informado'}</p>
                    </div>
                    {canWrite ? (
                      <div className="flex min-w-[200px] flex-col gap-2">
                        <button type="button" className="btn-secondary" onClick={() => openEdit(item)}>Editar</button>
                        <button type="button" className="btn-secondary text-red-600" onClick={() => handleDelete(item)}>Descontinuar</button>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar estabelecimento' : 'Novo estabelecimento'}
        onSubmit={handleSubmit}
        loading={saving}
        error={formError}
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
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Nome</label>
            <input className="input-field" value={form.nome} onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))} required />
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Codigo</label>
            <input className="input-field" value={form.codigo} onChange={(event) => setForm((prev) => ({ ...prev, codigo: event.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Endereco</label>
            <input className="input-field" value={form.endereco} onChange={(event) => setForm((prev) => ({ ...prev, endereco: event.target.value }))} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Status</label>
            <select className="input-field" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>
      </FormModal>
    </div>
  );
};

export default SstEstablishments;
