import { useState, useEffect, useMemo } from 'react';
import {
  Target,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Filter,
  ShieldAlert,
  ClipboardList
} from 'lucide-react';
import FormModal from '../components/FormModal';
import EmptyState from '../components/ui/EmptyState';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import { empresasService, sstService } from '../services/api';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : dateFormatter.format(d);
};

const isOverdue = (item) =>
  item.dueDate && new Date(item.dueDate) < new Date() && item.status !== 'concluida' && item.status !== 'cancelada';

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', class: 'status-warning' },
  em_andamento: { label: 'Em andamento', class: 'status-info' },
  concluida: { label: 'Concluida', class: 'status-success' },
  cancelada: { label: 'Cancelada', class: 'status-danger' }
};

const PRIORITY_CONFIG = {
  baixa: { label: 'Baixa', class: 'status-success' },
  media: { label: 'Media', class: 'status-warning' },
  alta: { label: 'Alta', class: 'status-danger' },
  critica: { label: 'Critica', class: 'status-danger', extra: 'font-bold' }
};

const TIPO_CONFIG = {
  preventiva: { label: 'Preventiva', class: 'status-info' },
  corretiva: { label: 'Corretiva', class: 'status-danger' },
  melhoria: { label: 'Melhoria', class: 'status-success' },
  emergencia: { label: 'Emergencia', class: 'status-danger', extra: 'font-bold' }
};

const RISK_LEVEL_CONFIG = {
  toleravel: { label: 'Toleravel', class: 'status-success' },
  moderado: { label: 'Moderado', class: 'status-info' },
  alto: { label: 'Alto', class: 'status-warning' },
  critico: { label: 'Critico', class: 'status-danger' }
};

const Badge = ({ value, config }) => {
  const cfg = config[value] || { label: value || '—', class: 'status-info' };
  return <span className={`status-pill ${cfg.class} ${cfg.extra || ''}`}>{cfg.label}</span>;
};

const Acoes = () => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [risksLookup, setRisksLookup] = useState([]);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [editItem, setEditItem] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await empresasService.getAll();
        const list = res.data?.data || [];
        setCompanies(list);
        if (list.length && !selectedEmpresa) setSelectedEmpresa(list[0].id);
      } catch (err) {
        console.error('Erro ao carregar empresas:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadData = async (empresaId) => {
    if (!empresaId) return;
    try {
      setLoading(true);
      const params = { empresaId };
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      const [planRes, summaryRes, lookupRes] = await Promise.all([
        sstService.getActionPlan(params),
        sstService.getActionPlanSummary({ empresaId }),
        sstService.getActionPlanRisksLookup({ empresaId })
      ]);
      setItems(planRes.data?.data || []);
      setSummary(summaryRes.data?.data || null);
      setRisksLookup(lookupRes.data?.data || []);
    } catch (err) {
      console.error('Erro ao carregar plano de acao:', err);
      setItems([]);
      setSummary(null);
      setRisksLookup([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEmpresa) loadData(selectedEmpresa);
  }, [selectedEmpresa, filters.status, filters.priority]);

  const filteredItems = useMemo(() => {
    if (!filters.search) return items;
    const term = filters.search.toLowerCase();
    return items.filter(
      (item) =>
        item.title?.toLowerCase().includes(term) ||
        item.responsible?.toLowerCase().includes(term) ||
        item.context?.hazard?.toLowerCase().includes(term) ||
        item.context?.sector?.toLowerCase().includes(term) ||
        item.context?.role?.toLowerCase().includes(term)
    );
  }, [items, filters.search]);

  const openCreateModal = () => {
    setIsCreating(true);
    setEditItem(null);
    setEditForm({
      riskId: '',
      title: '',
      description: '',
      responsible: '',
      dueDate: '',
      status: 'pendente',
      priority: 'media',
      tipo: 'corretiva',
      cost: 0,
      acceptanceCriteria: '',
      observations: ''
    });
    setEditError('');
    setEditModalOpen(true);
  };

  const openEditModal = (item) => {
    setIsCreating(false);
    setEditItem(item);
    setEditForm({
      riskId: item.riskId,
      title: item.title || '',
      description: item.description || '',
      responsible: item.responsible || '',
      dueDate: item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : '',
      status: item.status || 'pendente',
      priority: item.priority || 'media',
      tipo: item.tipo || 'corretiva',
      cost: item.cost || 0,
      acceptanceCriteria: item.acceptanceCriteria || '',
      observations: item.observations || ''
    });
    setEditError('');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.riskId) {
      setEditError('Selecione um risco para vincular a acao.');
      return;
    }
    try {
      setEditSaving(true);
      setEditError('');
      if (isCreating) {
        await sstService.createActionPlanItem(editForm.riskId, {
          ...editForm,
          cost: Number(editForm.cost) || 0
        });
      } else if (editItem) {
        await sstService.updateActionPlanItem(editItem.riskId, editItem.id, {
          ...editForm,
          cost: Number(editForm.cost) || 0
        });
      }
      setEditModalOpen(false);
      setEditItem(null);
      await loadData(selectedEmpresa);
    } catch (err) {
      setEditError(err?.response?.data?.message || 'Erro ao salvar acao.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleQuickStatus = async (item, newStatus) => {
    try {
      await sstService.updateActionPlanItem(item.riskId, item.id, { status: newStatus });
      await loadData(selectedEmpresa);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  if (loading && !companies.length) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gestao de riscos"
        title="Plano de Acao SST"
        description="Visao consolidada de todas as acoes vinculadas a riscos das avaliacoes SST."
        actions={
          selectedEmpresa && (
            <button type="button" className="btn-primary" onClick={openCreateModal}>
              + Nova Acao
            </button>
          )
        }
      >
        <div className="grid gap-3 xl:grid-cols-2">
          <select
            id="action-plan-empresa-filter"
            className="input-field"
            value={selectedEmpresa}
            onChange={(e) => setSelectedEmpresa(e.target.value)}
          >
            <option value="">Selecione a empresa</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="action-plan-search"
              type="text"
              placeholder="Buscar por titulo, responsavel, risco, setor..."
              className="input-field pl-10"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </div>
      </PageHeader>

      {summary ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard icon={ClipboardList} label="Total" value={summary.total} meta="Acoes registradas" tone="blue" />
          <MetricCard icon={Clock} label="Pendentes" value={summary.pendentes} meta={`${summary.emAndamento} em andamento`} tone="amber" />
          <MetricCard icon={CheckCircle2} label="Concluidas" value={summary.concluidas} meta="Implementadas" tone="lime" />
          <MetricCard icon={ShieldAlert} label="Vencidas" value={summary.vencidas} meta="Prazo expirado" tone="red" />
          <MetricCard icon={DollarSign} label="Custo total" value={currencyFormatter.format(summary.custoTotal)} meta="Investimento planejado" tone="slate" />
        </section>
      ) : null}

      <div className="panel-surface p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            id="action-plan-status-filter"
            className="input-field max-w-[200px]"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluida">Concluida</option>
            <option value="cancelada">Cancelada</option>
          </select>
          <select
            id="action-plan-priority-filter"
            className="input-field max-w-[200px]"
            value={filters.priority}
            onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
          >
            <option value="">Todas as prioridades</option>
            <option value="baixa">Baixa</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="critica">Critica</option>
          </select>
        </div>

        {!selectedEmpresa ? (
          <EmptyState icon={Target} title="Selecione uma empresa" description="Escolha a empresa para visualizar o plano de acao consolidado." />
        ) : loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" />
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Nenhuma acao encontrada"
            description={filters.status || filters.priority || filters.search
              ? 'Tente ajustar os filtros.'
              : 'Cadastre riscos com acoes nas avaliacoes SST para popular o plano de acao.'
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <article
                key={`${item.riskId}-${item.id}`}
                className={`rounded-[1.2rem] border bg-white/90 p-4 transition-all hover:shadow-md ${
                  isOverdue(item)
                    ? 'border-red-300 bg-red-50/50'
                    : 'border-slate-200/80'
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge value={item.status} config={STATUS_CONFIG} />
                      <Badge value={item.priority} config={PRIORITY_CONFIG} />
                      <Badge value={item.tipo} config={TIPO_CONFIG} />
                      {isOverdue(item) && (
                        <span className="status-pill status-danger font-bold">
                          <AlertTriangle className="mr-1 inline h-3 w-3" />Vencida
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-slate-950">{item.title}</h3>
                    {item.description && <p className="mt-1 text-sm text-slate-600">{item.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                      {item.responsible && <span>Responsavel: <strong className="text-slate-700">{item.responsible}</strong></span>}
                      {item.dueDate && <span>Prazo: <strong className={isOverdue(item) ? 'text-red-600' : 'text-slate-700'}>{formatDate(item.dueDate)}</strong></span>}
                      {item.cost > 0 && <span>Custo: <strong className="text-slate-700">{currencyFormatter.format(item.cost)}</strong></span>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <Badge value={item.context?.riskLevel} config={RISK_LEVEL_CONFIG} />
                      <span>{item.context?.hazard}</span>
                      <span>•</span>
                      <span>{item.context?.sector} / {item.context?.role}</span>
                      <span>•</span>
                      <span>{item.context?.assessmentTitle}</span>
                    </div>
                  </div>
                  <div className="flex min-w-[200px] flex-col gap-2">
                    <button type="button" className="btn-secondary" onClick={() => openEditModal(item)}>
                      Editar acao
                    </button>
                    {item.status === 'pendente' && (
                      <button
                        type="button"
                        className="btn-secondary text-blue-600"
                        onClick={() => handleQuickStatus(item, 'em_andamento')}
                      >
                        Iniciar
                      </button>
                    )}
                    {(item.status === 'pendente' || item.status === 'em_andamento') && (
                      <button
                        type="button"
                        className="btn-secondary text-green-600"
                        onClick={() => handleQuickStatus(item, 'concluida')}
                      >
                        Concluir
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <FormModal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditItem(null); }}
        title={isCreating ? 'Nova acao do plano' : 'Editar acao do plano'}
        onSubmit={handleSaveEdit}
        loading={editSaving}
        error={editError}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {isCreating && (
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
                Risco Vinculado
              </label>
              <select
                className="input-field"
                value={editForm.riskId || ''}
                onChange={(e) => setEditForm((prev) => ({ ...prev, riskId: e.target.value }))}
                required
              >
                <option value="">Selecione o risco...</option>
                {risksLookup.map((risk) => (
                  <option key={risk.id} value={risk.id}>
                    {risk.hazard} ({risk.riskLevel}) — {risk.sector} / {risk.role}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Titulo</label>
            <input id="edit-action-title" className="input-field" value={editForm.title || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))} required />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Descricao</label>
            <textarea id="edit-action-description" className="input-field min-h-[80px]" value={editForm.description || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Responsavel</label>
            <input id="edit-action-responsible" className="input-field" value={editForm.responsible || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, responsible: e.target.value }))} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Prazo</label>
            <input id="edit-action-dueDate" type="date" className="input-field" value={editForm.dueDate || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Status</label>
            <select id="edit-action-status" className="input-field" value={editForm.status || 'pendente'} onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluida">Concluida</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Prioridade</label>
            <select id="edit-action-priority" className="input-field" value={editForm.priority || 'media'} onChange={(e) => setEditForm((prev) => ({ ...prev, priority: e.target.value }))}>
              <option value="baixa">Baixa</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Critica</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Tipo</label>
            <select id="edit-action-tipo" className="input-field" value={editForm.tipo || 'corretiva'} onChange={(e) => setEditForm((prev) => ({ ...prev, tipo: e.target.value }))}>
              <option value="preventiva">Preventiva</option>
              <option value="corretiva">Corretiva</option>
              <option value="melhoria">Melhoria</option>
              <option value="emergencia">Emergencia</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Custo estimado (R$)</label>
            <input id="edit-action-cost" type="number" min="0" step="0.01" className="input-field" value={editForm.cost || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, cost: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Criterio de aceite</label>
            <textarea id="edit-action-acceptance" className="input-field min-h-[70px]" value={editForm.acceptanceCriteria || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, acceptanceCriteria: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Observacoes</label>
            <textarea id="edit-action-observations" className="input-field min-h-[70px]" value={editForm.observations || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, observations: e.target.value }))} />
          </div>
        </div>
        {editItem?.context && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
            <strong>Vinculado a:</strong> {editItem.context.hazard} ({editItem.context.riskLevel}) — {editItem.context.sector} / {editItem.context.role} — {editItem.context.assessmentTitle}
          </div>
        )}
      </FormModal>
    </div>
  );
};

export default Acoes;
