import { useEffect, useMemo, useState } from 'react';
import { Factory, Layers3, Plus, Workflow } from 'lucide-react';

import FormModal from '../components/FormModal';
import EmptyState from '../components/ui/EmptyState';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { empresasService, sstService } from '../services/api';

const INITIAL_FORM = {
  empresaId: '',
  establishmentId: '',
  nome: '',
  descricao: '',
  status: 'ativo'
};

const SstSectors = () => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('sst:write');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [establishments, setEstablishments] = useState([]);
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ empresaId: '', establishmentId: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);

  const filteredEstablishments = useMemo(
    () => establishments.filter((item) => !filters.empresaId || String(item.empresaId) === String(filters.empresaId)),
    [establishments, filters.empresaId]
  );

  const availableFormEstablishments = useMemo(
    () => establishments.filter((item) => !form.empresaId || String(item.empresaId) === String(form.empresaId)),
    [establishments, form.empresaId]
  );

  const metrics = useMemo(
    () => ({
      total: items.length,
      ativos: items.filter((item) => item.status === 'ativo').length,
      inativos: items.filter((item) => item.status === 'inativo').length
    }),
    [items]
  );

  const loadData = async () => {
    const [companiesResponse, establishmentsResponse, sectorsResponse] = await Promise.all([
      empresasService.getAll(),
      sstService.listEstablishments(filters.empresaId ? { empresaId: filters.empresaId } : {}),
      sstService.listSectors({
        ...(filters.empresaId ? { empresaId: filters.empresaId } : {}),
        ...(filters.establishmentId ? { establishmentId: filters.establishmentId } : {})
      })
    ]);
    setCompanies(companiesResponse.data.data || []);
    setEstablishments(establishmentsResponse.data.data || []);
    setItems(sectorsResponse.data.data || []);
  };

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError('');
        await loadData();
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Erro ao carregar setores.');
      } finally {
        setLoading(false);
      }
    })();
  }, [filters.empresaId, filters.establishmentId]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...INITIAL_FORM,
      empresaId: filters.empresaId || '',
      establishmentId: filters.establishmentId || ''
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      empresaId: item.empresaId || '',
      establishmentId: item.establishmentId || '',
      nome: item.nome || '',
      descricao: item.descricao || '',
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
        await sstService.updateSector(editingId, form);
      } else {
        await sstService.createSector(form);
      }
      setModalOpen(false);
      await loadData();
    } catch (requestError) {
      setFormError(requestError?.response?.data?.message || 'Erro ao salvar setor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Descontinuar/remover o setor ${item.nome}?`)) return;
    try {
      setError('');
      await sstService.deleteSector(item.id);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Erro ao remover setor.');
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Estrutura organizacional"
        title="Setores"
        description="Setor passa a ser a unidade-base do SST, conectando estabelecimento, cargos, avaliacoes e riscos."
        actions={canWrite ? <button type="button" className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" />Novo setor</button> : null}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <select className="input-field" value={filters.empresaId} onChange={(event) => setFilters((prev) => ({ ...prev, empresaId: event.target.value, establishmentId: '' }))}>
            <option value="">Todas as empresas</option>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.nome}</option>)}
          </select>
          <select className="input-field" value={filters.establishmentId} onChange={(event) => setFilters((prev) => ({ ...prev, establishmentId: event.target.value }))}>
            <option value="">Todos os estabelecimentos</option>
            {filteredEstablishments.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        </div>
      </PageHeader>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={Layers3} label="Setores" value={metrics.total} meta="Estrutura ativa do SST" tone="blue" />
        <MetricCard icon={Workflow} label="Ativos" value={metrics.ativos} meta="Elegiveis para cargos e avaliacoes" tone="lime" />
        <MetricCard icon={Factory} label="Inativos" value={metrics.inativos} meta="Descontinuados com rastreio" tone="amber" />
      </section>

      <section className="panel-surface p-6">
        {items.length === 0 ? (
          <EmptyState
            icon={Layers3}
            title="Nenhum setor cadastrado"
            description="Comece cadastrando os setores operacionais que vao organizar cargos e avaliacoes."
            action={canWrite ? <button type="button" className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" />Criar setor</button> : null}
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const establishment = establishments.find((entry) => String(entry.id) === String(item.establishmentId));
              const company = companies.find((entry) => String(entry.id) === String(item.empresaId));
              return (
                <article key={item.id} className="rounded-[1.35rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`status-pill ${item.status === 'ativo' ? 'status-success' : 'status-warning'}`}>{item.status}</span>
                      </div>
                      <h2 className="mt-3 text-lg font-semibold text-slate-950">{item.nome}</h2>
                      <p className="mt-2 text-sm text-slate-600">{company?.nome || 'Empresa nao encontrada'} • {establishment?.nome || 'Estabelecimento nao encontrado'}</p>
                      <p className="mt-2 text-sm text-slate-500">{item.descricao || 'Sem descricao operacional.'}</p>
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
        title={editingId ? 'Editar setor' : 'Novo setor'}
        onSubmit={handleSubmit}
        loading={saving}
        error={formError}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Empresa</label>
            <select className="input-field" value={form.empresaId} onChange={(event) => setForm((prev) => ({ ...prev, empresaId: event.target.value, establishmentId: '' }))} required>
              <option value="">Selecione a empresa</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Estabelecimento</label>
            <select className="input-field" value={form.establishmentId} onChange={(event) => setForm((prev) => ({ ...prev, establishmentId: event.target.value }))} required>
              <option value="">Selecione o estabelecimento</option>
              {availableFormEstablishments.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Nome do setor</label>
            <input className="input-field" value={form.nome} onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))} required />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Descricao</label>
            <textarea className="input-field min-h-[100px]" value={form.descricao} onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))} />
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

export default SstSectors;
