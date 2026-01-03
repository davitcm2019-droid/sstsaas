import { useState, useEffect } from 'react';
import {
  GraduationCap,
  Search,
  Plus,
  Edit,
  Trash2,
  Calendar,
  MapPin
} from 'lucide-react';
import FormModal from '../components/FormModal';
import TreinamentoForm from '../components/forms/TreinamentoForm';
import { treinamentosService } from '../services/api';

const Treinamentos = () => {
  const [treinamentos, setTreinamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    tipo: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [selectedTreinamento, setSelectedTreinamento] = useState(null);

  useEffect(() => {
    loadTreinamentos();
  }, [searchTerm, filters]);

  const loadTreinamentos = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) {
        params.search = searchTerm;
      }
      if (filters.status) {
        params.status = filters.status;
      }
      if (filters.tipo) {
        params.tipo = filters.tipo;
      }
      const response = await treinamentosService.getAll(params);
      setTreinamentos(response.data?.data || []);
    } catch (error) {
      console.error('Erro ao carregar treinamentos:', error);
      setTreinamentos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedTreinamento(null);
    setShowModal(true);
  };

  const handleEdit = (treinamento) => {
    setSelectedTreinamento(treinamento);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este treinamento?')) {
      try {
        await treinamentosService.delete(id);
        loadTreinamentos();
      } catch (error) {
        console.error('Erro ao excluir treinamento:', error);
      }
    }
  };

  const handleCompleteTreinamento = async (treinamento) => {
    try {
      await treinamentosService.update(treinamento.id, {
        ...treinamento,
        status: 'concluido'
      });
      loadTreinamentos();
    } catch (error) {
      console.error('Erro ao atualizar status do treinamento:', error);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedTreinamento(null);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'agendado':
        return <span className="status-badge status-info">Agendado</span>;
      case 'em_andamento':
        return <span className="status-badge status-warning">Em andamento</span>;
      case 'concluido':
        return <span className="status-badge status-success">Concluido</span>;
      case 'cancelado':
        return <span className="status-badge status-danger">Cancelado</span>;
      case 'adiado':
        return <span className="status-badge status-warning">Adiado</span>;
      default:
        return <span className="status-badge status-info">{status}</span>;
    }
  };

  const getTipoBadge = (tipo) => {
    switch (tipo) {
      case 'obrigatorio':
        return <span className="status-badge status-danger">Obrigatorio</span>;
      case 'complementar':
        return <span className="status-badge status-info">Complementar</span>;
      case 'reciclagem':
        return <span className="status-badge status-warning">Reciclagem</span>;
      case 'especifico':
        return <span className="status-badge status-info">Especifico</span>;
      case 'emergencia':
        return <span className="status-badge status-danger">Emergencia</span>;
      default:
        return <span className="status-badge status-info">{tipo}</span>;
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
          <h1 className="text-2xl font-bold text-gray-900">Treinamentos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie os treinamentos corporativos e acompanhe o status de cada turma.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Treinamento
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por titulo, instrutor ou empresa..."
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
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Todos os status</option>
              <option value="agendado">Agendado</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluido">Concluido</option>
              <option value="cancelado">Cancelado</option>
              <option value="adiado">Adiado</option>
            </select>
            <select
              className="input-field"
              value={filters.tipo}
              onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
            >
              <option value="">Todos os tipos</option>
              <option value="obrigatorio">Obrigatorio</option>
              <option value="complementar">Complementar</option>
              <option value="reciclagem">Reciclagem</option>
              <option value="especifico">Especifico</option>
              <option value="emergencia">Emergencia</option>
            </select>
          </div>
        </div>
      </div>

      {/* Treinamentos List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {treinamentos.map((treinamento) => (
          <div key={treinamento.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-5 w-5 text-primary-500" />
                <div>
                  <h3 className="font-semibold text-gray-900">{treinamento.titulo}</h3>
                  <p className="text-sm text-gray-500">
                    {treinamento.empresaNome || treinamento.empresa}
                  </p>
                </div>
              </div>
              {getStatusBadge(treinamento.status)}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Instrutor:</span>
                <span className="font-medium">{treinamento.instrutor}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Duracao:</span>
                <span className="font-medium">{treinamento.duracao}h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Participantes:</span>
                <span className="font-medium">
                  {(treinamento.participantes ?? 0)}/{treinamento.maxParticipantes ?? 0}
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{treinamento.local}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{treinamento.dataInicio}</span>
              </div>
              {getTipoBadge(treinamento.tipo)}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => handleCompleteTreinamento(treinamento)}
                className="btn-secondary text-green-600 hover:bg-green-50"
                disabled={treinamento.status === 'concluido'}
              >
                Marcar como concluido
              </button>
              <button
                onClick={() => handleEdit(treinamento)}
                className="flex-1 btn-secondary flex items-center justify-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </button>
              <button
                className="btn-secondary p-2 text-red-600 hover:bg-red-50"
                onClick={() => handleDelete(treinamento.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {treinamentos.length === 0 && (
        <div className="text-center py-12">
          <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum treinamento encontrado</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || Object.values(filters).some((value) => value)
              ? 'Tente ajustar os filtros de busca.'
              : 'Comece criando um novo treinamento.'}
          </p>
        </div>
      )}

      {/* Modal de Cadastro/Edicao */}
      <FormModal
        isOpen={showModal}
        onClose={handleModalClose}
        title={selectedTreinamento ? 'Editar Treinamento' : 'Novo Treinamento'}
        showFooter={false}
        asForm={false}
      >
        <TreinamentoForm
          treinamento={selectedTreinamento}
          onSave={() => {
            loadTreinamentos();
            handleModalClose();
          }}
          onCancel={handleModalClose}
        />
      </FormModal>
    </div>
  );
};

export default Treinamentos;
