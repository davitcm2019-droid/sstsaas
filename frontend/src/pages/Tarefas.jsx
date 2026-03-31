import { useEffect, useState } from 'react';
import {
  CheckSquare,
  Search,
  Plus,
  Calendar,
  User,
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { empresasService, tarefasService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import FormModal from '../components/FormModal';

const EMPTY_FORM = {
  titulo: '',
  descricao: '',
  prioridade: 'media',
  status: 'pendente',
  empresaId: '',
  responsavel: '',
  categoria: '',
  dataVencimento: ''
};

const Tarefas = () => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('tasks:write');
  const [tarefas, setTarefas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    prioridade: '',
    empresaId: '',
    categoria: ''
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadEmpresas();
  }, []);

  useEffect(() => {
    void loadData();
  }, [searchTerm, filters]);

  const getApiMessage = (err, fallback) => err?.response?.data?.message || err?.response?.data?.error || fallback;

  const loadEmpresas = async () => {
    try {
      const res = await empresasService.getAll();
      setEmpresas(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar empresas', err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.prioridade) params.prioridade = filters.prioridade;
      if (filters.empresaId) params.empresaId = filters.empresaId;
      if (filters.categoria) params.categoria = filters.categoria;
      if (searchTerm) params.search = searchTerm;

      const res = await tarefasService.getAll(params);
      setTarefas(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar tarefas:', err);
      setTarefas([]);
      setError(getApiMessage(err, 'Erro ao carregar tarefas'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'concluido':
        return <span className="status-badge status-success">Concluida</span>;
      case 'em_andamento':
        return <span className="status-badge status-warning">Em andamento</span>;
      case 'pendente':
        return <span className="status-badge status-info">Pendente</span>;
      default:
        return <span className="status-badge status-info">{status}</span>;
    }
  };

  const getPriorityBadge = (prioridade) => {
    switch (prioridade) {
      case 'alta':
        return <span className="status-badge status-danger">Alta</span>;
      case 'media':
        return <span className="status-badge status-warning">Media</span>;
      case 'baixa':
        return <span className="status-badge status-success">Baixa</span>;
      default:
        return <span className="status-badge status-info">{prioridade}</span>;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'concluido':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'em_andamento':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'pendente':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <CheckSquare className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('pt-BR');
  };

  const isOverdue = (dataVencimento) => {
    if (!dataVencimento) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dataVencimento);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  const getDaysUntilDue = (dataVencimento) => {
    if (!dataVencimento) return Infinity;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dataVencimento);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const openCreateForm = () => {
    if (!canWrite) return;
    setIsEditing(false);
    setEditingTarefa(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEditForm = (tarefa) => {
    if (!canWrite) return;
    setIsEditing(true);
    setEditingTarefa(tarefa);
    setForm({
      titulo: tarefa.titulo || '',
      descricao: tarefa.descricao || '',
      prioridade: tarefa.prioridade || 'media',
      status: tarefa.status || 'pendente',
      empresaId: tarefa.empresaId ? String(tarefa.empresaId) : '',
      responsavel: tarefa.responsavel || '',
      categoria: tarefa.categoria || '',
      dataVencimento: tarefa.dataVencimento || ''
    });
    setModalOpen(true);
  };

  const closeForm = () => {
    setModalOpen(false);
    setIsEditing(false);
    setEditingTarefa(null);
    setForm({ ...EMPTY_FORM });
  };

  const buildPayload = () => ({
    ...form,
    empresaId: form.empresaId || null
  });

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!canWrite) return;

    try {
      if (!form.titulo) {
        setError('Titulo e obrigatorio');
        return;
      }

      await tarefasService.create(buildPayload());
      await loadData();
      closeForm();
    } catch (err) {
      console.error(err);
      setError(getApiMessage(err, 'Erro ao criar tarefa'));
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!canWrite || !editingTarefa) return;

    try {
      await tarefasService.update(editingTarefa.id, buildPayload());
      await loadData();
      closeForm();
    } catch (err) {
      console.error(err);
      setError(getApiMessage(err, 'Erro ao atualizar tarefa'));
    }
  };

  const handleDelete = async (id) => {
    if (!canWrite || !window.confirm('Deseja realmente excluir essa tarefa?')) return;
    try {
      await tarefasService.delete(id);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(getApiMessage(err, 'Erro ao deletar tarefa'));
    }
  };

  const handleComplete = async (tarefa) => {
    if (!canWrite || tarefa.status === 'concluido') return;
    try {
      await tarefasService.update(tarefa.id, { ...tarefa, status: 'concluido' });
      await loadData();
    } catch (err) {
      console.error(err);
      setError(getApiMessage(err, 'Erro ao concluir tarefa'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tarefas</h1>
          <p className="mt-1 text-sm text-gray-500">Gerencie todas as tarefas de seguranca do trabalho</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className={`btn-primary flex items-center ${canWrite ? '' : 'opacity-60 cursor-not-allowed'}`}
            disabled={!canWrite}
            onClick={openCreateForm}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <FormModal
        isOpen={modalOpen}
        onClose={closeForm}
        title={isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
        onSubmit={isEditing ? handleUpdate : handleCreate}
        submitText={isEditing ? 'Salvar alteracoes' : 'Criar tarefa'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              required
              placeholder="Titulo"
              value={form.titulo}
              onChange={(event) => setForm({ ...form, titulo: event.target.value })}
              className="input-field col-span-2"
            />
            <select
              value={form.prioridade}
              onChange={(event) => setForm({ ...form, prioridade: event.target.value })}
              className="input-field"
            >
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={form.empresaId}
              onChange={(event) => setForm({ ...form, empresaId: event.target.value })}
              className="input-field"
            >
              <option value="">Selecione a empresa</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>
              ))}
            </select>

            <input
              placeholder="Responsavel"
              value={form.responsavel}
              onChange={(event) => setForm({ ...form, responsavel: event.target.value })}
              className="input-field"
            />

            <input
              type="date"
              value={form.dataVencimento}
              onChange={(event) => setForm({ ...form, dataVencimento: event.target.value })}
              className="input-field"
            />
          </div>

          <textarea
            placeholder="Descricao"
            value={form.descricao}
            onChange={(event) => setForm({ ...form, descricao: event.target.value })}
            className="input-field w-full"
            rows={3}
          />
        </div>
      </FormModal>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por titulo ou descricao..."
                className="input-field pl-10"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select className="input-field" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluido">Concluida</option>
            </select>
            <select className="input-field" value={filters.prioridade} onChange={(event) => setFilters({ ...filters, prioridade: event.target.value })}>
              <option value="">Todas as prioridades</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baixa">Baixa</option>
            </select>
            <select className="input-field" value={filters.empresaId} onChange={(event) => setFilters({ ...filters, empresaId: event.target.value })}>
              <option value="">Todas as empresas</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>
              ))}
            </select>
            <select className="input-field" value={filters.categoria} onChange={(event) => setFilters({ ...filters, categoria: event.target.value })}>
              <option value="">Todas as categorias</option>
              <option value="EPI">EPI</option>
              <option value="Treinamento">Treinamento</option>
              <option value="PGR">PGR</option>
              <option value="CIPA">CIPA</option>
              <option value="SIPAT">SIPAT</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {tarefas.map((tarefa) => {
          const daysUntilDue = getDaysUntilDue(tarefa.dataVencimento);
          const overdue = isOverdue(tarefa.dataVencimento);

          return (
            <div key={tarefa.id} className="card hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex-shrink-0">{getStatusIcon(tarefa.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 truncate">{tarefa.titulo}</h3>
                      {getStatusBadge(tarefa.status)}
                      {getPriorityBadge(tarefa.prioridade)}
                    </div>
                    <p className="text-sm text-gray-600 mb-3 truncate">{tarefa.descricao}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center"><Building2 className="h-4 w-4 mr-1" />{tarefa.empresaNome || '-'}</div>
                      <div className="flex items-center"><User className="h-4 w-4 mr-1" />{tarefa.responsavel || '-'}</div>
                      <div className="flex items-center"><Calendar className="h-4 w-4 mr-1" />Vence em: {formatDate(tarefa.dataVencimento)}</div>
                      <div className="flex items-center"><CheckSquare className="h-4 w-4 mr-1" />{tarefa.categoria || '-'}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {overdue && tarefa.status !== 'concluido' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Vencida</span>
                  )}
                  {!overdue && daysUntilDue <= 7 && tarefa.status !== 'concluido' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">{daysUntilDue} dias</span>
                  )}
                  {canWrite && (
                    <>
                      <button className="btn-secondary text-sm" onClick={() => openEditForm(tarefa)}>Editar</button>
                      <button className="btn-secondary text-sm text-green-600 hover:bg-green-50" disabled={tarefa.status === 'concluido'} onClick={() => handleComplete(tarefa)}>Concluir</button>
                      <button className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 hover:text-red-700" onClick={() => handleDelete(tarefa.id)}>Excluir</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {tarefas.length === 0 && (
        <div className="text-center py-12">
          <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma tarefa encontrada</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || Object.values(filters).some((value) => value)
              ? 'Tente ajustar os filtros de busca.'
              : 'Comece criando uma nova tarefa.'}
          </p>
        </div>
      )}

      {tarefas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="text-2xl font-bold text-gray-900">{tarefas.filter((item) => item.status === 'pendente').length}</div>
            <div className="text-sm text-gray-500">Pendentes</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-yellow-600">{tarefas.filter((item) => item.status === 'em_andamento').length}</div>
            <div className="text-sm text-gray-500">Em andamento</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600">{tarefas.filter((item) => item.status === 'concluido').length}</div>
            <div className="text-sm text-gray-500">Concluidas</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-red-600">{tarefas.filter((item) => isOverdue(item.dataVencimento) && item.status !== 'concluido').length}</div>
            <div className="text-sm text-gray-500">Vencidas</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tarefas;
