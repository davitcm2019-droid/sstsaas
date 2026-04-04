import { useEffect, useMemo, useState } from 'react';
import { Briefcase, Layers3, Plus, ShieldCheck } from 'lucide-react';

import FormModal from '../components/FormModal';
import EmptyState from '../components/ui/EmptyState';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { empresasService, sstService } from '../services/api';

const INITIAL_FORM = {
  empresaId: '',
  establishmentId: '',
  sectorId: '',
  nome: '',
  descricao: '',
  atividadesBase: '',
  exposicaoBase: '',
  status: 'ativo'
};

const splitLines = (value) =>
  String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const SstRoles = () => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('sst:write');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [establishments, setEstablishments] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ empresaId: '', establishmentId: '', sectorId: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);

  const filteredEstablishments = useMemo(
    () => establishments.filter((item) => !filters.empresaId || String(item.empresaId) === String(filters.empresaId)),
    [establishments, filters.empresaId]
  );

  const filteredSectors = useMemo(
    () =>
      sectors.filter((item) => {
        if (filters.empresaId && String(item.empresaId) !== String(filters.empresaId)) return false;
        if (filters.establishmentId && String(item.establishmentId) !== String(filters.establishmentId)) return false;
        return true;
      }),
    [sectors, filters.empresaId, filters.establishmentId]
  );

  const availableFormEstablishments = useMemo(
    () => establishments.filter((item) => !form.empresaId || String(item.empresaId) === String(form.empresaId)),
    [establishments, form.empresaId]
  );

  const availableFormSectors = useMemo(
    () =>
      sectors.filter((item) => {
        if (form.empresaId && String(item.empresaId) !== String(form.empresaId)) return false;
        if (form.establishmentId && String(item.establishmentId) !== String(form.establishmentId)) return false;
        return true;
      }),
    [sectors, form.empresaId, form.establishmentId]
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
    const [companiesResponse, establishmentsResponse, sectorsResponse, rolesResponse] = await Promise.all([
      empresasService.getAll(),
      sstService.listEstablishments(filters.empresaId ? { empresaId: filters.empresaId } : {}),
      sstService.listSectors({
        ...(filters.empresaId ? { empresaId: filters.empresaId } : {}),
        ...(filters.establishmentId ? { establishmentId: filters.establishmentId } : {})
      }),
      sstService.listRoles({
        ...(filters.empresaId ? { empresaId: filters.empresaId } : {}),
        ...(filters.establishmentId ? { establishmentId: filters.establishmentId } : {}),
        ...(filters.sectorId ? { sectorId: filters.sectorId } : {})
      })
    ]);
    setCompanies(companiesResponse.data.data || []);
    setEstablishments(establishmentsResponse.data.data || []);
    setSectors(sectorsResponse.data.data || []);
    setItems(rolesResponse.data.data || []);
  };

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError('');
        await loadData();
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Erro ao carregar cargos.');
      } finally {
        setLoading(false);
      }
    })();
  }, [filters.empresaId, filters.establishmentId, filters.sectorId]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...INITIAL_FORM,
      empresaId: filters.empresaId || '',
      establishmentId: filters.establishmentId || '',
      sectorId: filters.sectorId || ''
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      empresaId: item.empresaId || '',
      establishmentId: item.establishmentId || '',
      sectorId: item.sectorId || '',
      nome: item.nome || '',
      descricao: item.descricao || '',
      atividadesBase: (item.atividadesBase || []).join('\n'),
      exposicaoBase: item.exposicaoBase || '',
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
      const payload = {
        ...form,
        atividadesBase: splitLines(form.atividadesBase)
      };
      if (editingId) {
        await sstService.updateRole(editingId, payload);
      } else {
        await sstService.createRole(payload);
      }
      setModalOpen(false);
      await loadData();
    } catch (requestError) {
      setFormError(requestError?.response?.data?.message || 'Erro ao salvar cargo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Descontinuar/remover o cargo ${item.nome}?`)) return;
    try {
      setError('');
      await sstService.deleteRole(item.id);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Erro ao remover cargo.');
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Estrutura organizacional"
        title="Cargos"
        description="Cada cargo pertence a um setor e vira a raiz obrigatoria de toda avaliacao de risco no novo fluxo."
        actions={canWrite ? <button type="button" className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" />Novo cargo</button> : null}
      >
        <div className="grid gap-3 xl:grid-cols-3">
          <select className="input-field" value={filters.empresaId} onChange={(event) => setFilters({ empresaId: event.target.value, establishmentId: '', sectorId: '' })}>
            <option value="">Todas as empresas</option>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.nome}</option>)}
          </select>
          <select className="input-field" value={filters.establishmentId} onChange={(event) => setFilters((prev) => ({ ...prev, establishmentId: event.target.value, sectorId: '' }))}>
            <option value="">Todos os estabelecimentos</option>
            {filteredEstablishments.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
          <select className="input-field" value={filters.sectorId} onChange={(event) => setFilters((prev) => ({ ...prev, sectorId: event.target.value }))}>
            <option value="">Todos os setores</option>
            {filteredSectors.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        </div>
      </PageHeader>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={Briefcase} label="Cargos" value={metrics.total} meta="Base avaliada pelo SST" tone="blue" />
        <MetricCard icon={ShieldCheck} label="Ativos" value={metrics.ativos} meta="Prontos para avaliacao" tone="lime" />
        <MetricCard icon={Layers3} label="Inativos" value={metrics.inativos} meta="Descontinuados com rastreio" tone="amber" />
      </section>

      <section className="panel-surface p-6">
        {items.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="Nenhum cargo cadastrado"
            description="Cadastre os cargos vinculados a setores para habilitar o fluxo de avaliacao de riscos."
            action={canWrite ? <button type="button" className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" />Criar cargo</button> : null}
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const sector = sectors.find((entry) => String(entry.id) === String(item.sectorId));
              const establishment = establishments.find((entry) => String(entry.id) === String(item.establishmentId));
              return (
                <article key={item.id} className="rounded-[1.35rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`status-pill ${item.status === 'ativo' ? 'status-success' : 'status-warning'}`}>{item.status}</span>
                        {sector ? <span className="status-pill status-info">{sector.nome}</span> : null}
                      </div>
                      <h2 className="mt-3 text-lg font-semibold text-slate-950">{item.nome}</h2>
                      <p className="mt-2 text-sm text-slate-600">{establishment?.nome || 'Estabelecimento nao encontrado'} • {sector?.nome || 'Setor nao encontrado'}</p>
                      <p className="mt-2 text-sm text-slate-500">{item.descricao || 'Sem descricao operacional.'}</p>
                      {item.atividadesBase?.length ? <p className="mt-3 text-xs text-slate-500">Atividades-base: {item.atividadesBase.join(', ')}</p> : null}
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
        title={editingId ? 'Editar cargo' : 'Novo cargo'}
        onSubmit={handleSubmit}
        loading={saving}
        error={formError}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Empresa</label>
            <select className="input-field" value={form.empresaId} onChange={(event) => setForm((prev) => ({ ...prev, empresaId: event.target.value, establishmentId: '', sectorId: '' }))} required>
              <option value="">Selecione a empresa</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Estabelecimento</label>
            <select className="input-field" value={form.establishmentId} onChange={(event) => setForm((prev) => ({ ...prev, establishmentId: event.target.value, sectorId: '' }))} required>
              <option value="">Selecione o estabelecimento</option>
              {availableFormEstablishments.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Setor</label>
            <select className="input-field" value={form.sectorId} onChange={(event) => setForm((prev) => ({ ...prev, sectorId: event.target.value }))} required>
              <option value="">Selecione o setor</option>
              {availableFormSectors.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Nome do cargo</label>
            <input className="input-field" value={form.nome} onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))} required />
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Status</label>
            <select className="input-field" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Descricao</label>
            <textarea className="input-field min-h-[90px]" value={form.descricao} onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Atividades-base</label>
            <textarea className="input-field min-h-[110px]" value={form.atividadesBase} onChange={(event) => setForm((prev) => ({ ...prev, atividadesBase: event.target.value }))} placeholder="Uma atividade por linha" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Exposicao-base</label>
            <textarea className="input-field min-h-[90px]" value={form.exposicaoBase} onChange={(event) => setForm((prev) => ({ ...prev, exposicaoBase: event.target.value }))} />
          </div>
        </div>
      </FormModal>
    </div>
  );
};

export default SstRoles;
