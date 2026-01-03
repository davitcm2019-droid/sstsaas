import { useState, useEffect } from 'react';
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
// removi uso direto de tarefasService para controlar chamadas localmente
import { empresasService } from '../services/api';
import FormModal from '../components/FormModal';

const API_BASE = '/api/tarefas';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const Tarefas = () => {
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

  // estados para criação/edição
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState(null);
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    prioridade: 'media',
    status: 'pendente',
    empresaId: '',
    responsavel: '',
    categoria: '',
    dataVencimento: ''
  });

  useEffect(() => {
    loadData();
    loadEmpresas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload quando filtros ou busca mudam
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filters]);

  const loadEmpresas = async () => {
    try {
      const res = await empresasService.getAll();
      setEmpresas(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar empresas', err);
    }
  };

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.prioridade) params.append('prioridade', filters.prioridade);
    if (filters.empresaId) params.append('empresaId', filters.empresaId);
    if (filters.categoria) params.append('categoria', filters.categoria);
    if (searchTerm) params.append('search', searchTerm);
    return params.toString();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const q = buildQuery();
      const res = await fetch(`${API_BASE}${q ? '?' + q : ''}`, {
        headers: getAuthHeaders()
      });
      const payload = await res.json();
      if (payload && payload.success) {
        setTarefas(payload.data || []);
      } else {
        setTarefas([]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'concluido':
        return <span className="status-badge status-success">Concluída</span>;
      case 'em_andamento':
        return <span className="status-badge status-warning">Em Andamento</span>;
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
        return <span className="status-badge status-warning">Média</span>;
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
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const isOverdue = (dataVencimento) => {
    if (!dataVencimento) return false;
    // considera só a data (ignora hora)
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dataVencimento);
    due.setHours(0,0,0,0);
    return due < today;
  };

  const getDaysUntilDue = (dataVencimento) => {
    if (!dataVencimento) return Infinity;
    const today = new Date();
    today.setHours(0,0,0,0);
    const dueDate = new Date(dataVencimento);
    dueDate.setHours(0,0,0,0);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // abrir modal para nova tarefa
  const openCreateForm = () => {
    setIsEditing(false);
    setEditingTarefa(null);
    setForm({
      titulo: '',
      descricao: '',
      prioridade: 'media',
      status: 'pendente',
      empresaId: '',
      responsavel: '',
      categoria: '',
      dataVencimento: ''
    });
    setModalOpen(true);
  };

  // abrir modal para edição
  const openEditForm = (tarefa) => {
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
  };

  // criar
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // validações mínimas
      if (!form.titulo) {
        alert('Título é obrigatório');
        return;
      }

      const payload = {
        ...form,
        empresaId: form.empresaId ? parseInt(form.empresaId) : undefined
      };

      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload)
      });

      const body = await res.json();
      if (body.success) {
        await loadData();
        closeForm();
      } else {
        alert(body.message || body.error || 'Erro ao criar tarefa');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao criar tarefa');
    }
  };

  // atualizar
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingTarefa) return;
    try {
      const payload = {
        ...form,
        empresaId: form.empresaId ? parseInt(form.empresaId) : undefined
      };

      const res = await fetch(`${API_BASE}/${editingTarefa.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload)
      });

      const body = await res.json();
      if (body.success) {
        await loadData();
        closeForm();
      } else {
        alert(body.message || body.error || 'Erro ao atualizar tarefa');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar tarefa');
    }
  };

  // deletar (simples)
  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir essa tarefa?')) return;
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      const body = await res.json();
      if (body.success) {
        await loadData();
      } else {
        alert(body.message || body.error || 'Erro ao deletar');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao deletar tarefa');
    }
  };

  const handleComplete = async (tarefa) => {
    if (tarefa.status === 'concluido') return;
    try {
      const payload = { ...tarefa, status: 'concluido' };
      const res = await fetch(`${API_BASE}/${tarefa.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload)
      });
      const body = await res.json();
      if (body.success) {
        await loadData();
      } else {
        alert(body.message || body.error || 'Erro ao concluir tarefa');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao concluir tarefa');
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tarefas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie todas as tarefas de segurança do trabalho
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary flex items-center" onClick={openCreateForm}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </button>
        </div>
      </div>

      {/* Modal (create / edit) */}
      <FormModal
        isOpen={modalOpen}
        onClose={closeForm}
        title={isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
        onSubmit={isEditing ? handleUpdate : handleCreate}
        submitText={isEditing ? 'Salvar alterações' : 'Criar tarefa'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              required
              placeholder="Título"
              value={form.titulo}
              onChange={(e) => setForm({...form, titulo: e.target.value})}
              className="input-field col-span-2"
            />
            <select
              value={form.prioridade}
              onChange={(e) => setForm({...form, prioridade: e.target.value})}
              className="input-field"
            >
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={form.empresaId}
              onChange={(e) => setForm({...form, empresaId: e.target.value})}
              className="input-field"
            >
              <option value="">Selecione a empresa</option>
              {empresas.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nome}</option>
              ))}
            </select>

            <input
              placeholder="Responsável"
              value={form.responsavel}
              onChange={(e) => setForm({...form, responsavel: e.target.value})}
              className="input-field"
            />

            <input
              type="date"
              value={form.dataVencimento}
              onChange={(e) => setForm({...form, dataVencimento: e.target.value})}
              className="input-field"
            />
          </div>

          <div>
            <textarea
              placeholder="Descrição"
              value={form.descricao}
              onChange={(e) => setForm({...form, descricao: e.target.value})}
              className="input-field w-full"
              rows={3}
            />
          </div>
        </div>
      </FormModal>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por título ou descrição..."
                className="input-field pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="input-field"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluido">Concluída</option>
            </select>
            <select
              className="input-field"
              value={filters.prioridade}
              onChange={(e) => setFilters({...filters, prioridade: e.target.value})}
            >
              <option value="">Todas as prioridades</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
            <select
              className="input-field"
              value={filters.empresaId}
              onChange={(e) => setFilters({...filters, empresaId: e.target.value})}
            >
              <option value="">Todas as empresas</option>
              {empresas.map(empresa => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nome}
                </option>
              ))}
            </select>
            <select
              className="input-field"
              value={filters.categoria}
              onChange={(e) => setFilters({...filters, categoria: e.target.value})}
            >
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

      {/* Tasks List */}
      <div className="space-y-4">
        {tarefas.map((tarefa) => {
          const daysUntilDue = getDaysUntilDue(tarefa.dataVencimento);
          const isOverdueTask = isOverdue(tarefa.dataVencimento);

          return (
            <div key={tarefa.id} className="card hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    {getStatusIcon(tarefa.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {tarefa.titulo}
                      </h3>
                      {getStatusBadge(tarefa.status)}
                      {getPriorityBadge(tarefa.prioridade)}
                    </div>
                    <p className="text-sm text-gray-600 mb-3 truncate">{tarefa.descricao}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 mr-1" />
                        {tarefa.empresaNome || '-'}
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {tarefa.responsavel || '-'}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Vence em: {formatDate(tarefa.dataVencimento)}
                      </div>
                      <div className="flex items-center">
                        <CheckSquare className="h-4 w-4 mr-1" />
                        {tarefa.categoria || '-'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {isOverdueTask && tarefa.status !== 'concluido' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Vencida
                    </span>
                  )}
                  {!isOverdueTask && daysUntilDue <= 7 && tarefa.status !== 'concluido' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {daysUntilDue} dias
                    </span>
                  )}
              <button
                className="btn-secondary text-sm"
                onClick={() => openEditForm(tarefa)}
              >
                Editar
              </button>
              <button
                className="btn-secondary text-sm text-green-600 hover:bg-green-50"
                disabled={tarefa.status === 'concluido'}
                onClick={() => handleComplete(tarefa)}
              >
                Concluir
              </button>
              <button
                className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 hover:text-red-700"
                onClick={() => handleDelete(tarefa.id)}
              >
                Excluir
              </button>
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
            {searchTerm || Object.values(filters).some(f => f) 
              ? 'Tente ajustar os filtros de busca.' 
              : 'Comece criando uma nova tarefa.'
            }
          </p>
        </div>
      )}

      {/* Summary Stats */}
      {tarefas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="text-2xl font-bold text-gray-900">
              {tarefas.filter(t => t.status === 'pendente').length}
            </div>
            <div className="text-sm text-gray-500">Pendentes</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {tarefas.filter(t => t.status === 'em_andamento').length}
            </div>
            <div className="text-sm text-gray-500">Em Andamento</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600">
              {tarefas.filter(t => t.status === 'concluido').length}
            </div>
            <div className="text-sm text-gray-500">Concluídas</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-red-600">
              {tarefas.filter(t => isOverdue(t.dataVencimento) && t.status !== 'concluido').length}
            </div>
            <div className="text-sm text-gray-500">Vencidas</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tarefas;
