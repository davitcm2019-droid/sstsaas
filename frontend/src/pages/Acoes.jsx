import { useState, useEffect } from 'react';
import {
  Target,
  Search,
  Plus,
  Edit,
  Trash2,
  Calendar
} from 'lucide-react';
import FormModal from '../components/FormModal';
import AcaoForm from '../components/forms/AcaoForm';
import { acoesService } from '../services/api';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const Acoes = () => {
  const [acoes, setAcoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    tipo: '',
    prioridade: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [selectedAcao, setSelectedAcao] = useState(null);

  useEffect(() => {
    loadAcoes();
  }, [searchTerm, filters]);

  const loadAcoes = async () => {
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
      if (filters.prioridade) {
        params.prioridade = filters.prioridade;
      }
      const response = await acoesService.getAll(params);
      setAcoes(response.data?.data || []);
    } catch (error) {
      console.error('Erro ao carregar acoes:', error);
      setAcoes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedAcao(null);
    setShowModal(true);
  };

  const handleEdit = (acao) => {
    setSelectedAcao(acao);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta acao?')) {
      try {
        await acoesService.delete(id);
        loadAcoes();
      } catch (error) {
        console.error('Erro ao excluir acao:', error);
      }
    }
  };

  const handleCompleteAcao = async (acao) => {
    try {
      await acoesService.update(acao.id, {
        ...acao,
        status: 'concluida'
      });
      loadAcoes();
    } catch (error) {
      console.error('Erro ao atualizar acao:', error);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedAcao(null);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pendente':
        return <span className="status-badge status-warning">Pendente</span>;
      case 'em_andamento':
        return <span className="status-badge status-info">Em andamento</span>;
      case 'concluida':
        return <span className="status-badge status-success">Concluida</span>;
      case 'cancelada':
        return <span className="status-badge status-danger">Cancelada</span>;
      case 'suspensa':
        return <span className="status-badge status-warning">Suspensa</span>;
      default:
        return <span className="status-badge status-info">{status}</span>;
    }
  };

  const getPrioridadeBadge = (prioridade) => {
    switch (prioridade) {
      case 'baixa':
        return <span className="status-badge status-success">Baixa</span>;
      case 'media':
        return <span className="status-badge status-warning">Media</span>;
      case 'alta':
        return <span className="status-badge status-danger">Alta</span>;
      case 'critica':
        return <span className="status-badge status-danger bg-red-600 text-white">Critica</span>;
      default:
        return <span className="status-badge status-info">{prioridade}</span>;
    }
  };

  const getTipoBadge = (tipo) => {
    switch (tipo) {
      case 'preventiva':
        return <span className="status-badge status-info">Preventiva</span>;
      case 'corretiva':
        return <span className="status-badge status-danger">Corretiva</span>;
      case 'melhoria':
        return <span className="status-badge status-success">Melhoria</span>;
      case 'emergencia':
        return <span className="status-badge status-danger">Emergencia</span>;
      case 'manutencao':
        return <span className="status-badge status-warning">Manutencao</span>;
      case 'treinamento':
        return <span className="status-badge status-info">Treinamento</span>;
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
          <h1 className="text-2xl font-bold text-gray-900">Acoes de Seguranca</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie as acoes preventivas, corretivas e de melhoria
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova acao
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
                placeholder="Buscar por titulo, empresa ou responsavel..."
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
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluida">Concluida</option>
              <option value="cancelada">Cancelada</option>
              <option value="suspensa">Suspensa</option>
            </select>
            <select
              className="input-field"
              value={filters.tipo}
              onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
            >
              <option value="">Todos os tipos</option>
              <option value="preventiva">Preventiva</option>
              <option value="corretiva">Corretiva</option>
              <option value="melhoria">Melhoria</option>
              <option value="emergencia">Emergencia</option>
              <option value="manutencao">Manutencao</option>
              <option value="treinamento">Treinamento</option>
            </select>
            <select
              className="input-field"
              value={filters.prioridade}
              onChange={(e) => setFilters({ ...filters, prioridade: e.target.value })}
            >
              <option value="">Todas as prioridades</option>
              <option value="baixa">Baixa</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Critica</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Acoes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {acoes.map((acao) => (
          <div key={acao.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-primary-500" />
                <div>
                  <h3 className="font-semibold text-gray-900">{acao.titulo}</h3>
                  <p className="text-sm text-gray-500">
                    {acao.empresaNome || acao.empresa}
                  </p>
                </div>
              </div>
              {getStatusBadge(acao.status)}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Responsavel:</span>
                <span className="font-medium">
                  {acao.responsavelNome || acao.responsavel}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Custo:</span>
                <span className="font-medium">
                  {currencyFormatter.format(acao.custo || 0)}
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{acao.dataInicio} - {acao.dataFim}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex space-x-2">
                {getTipoBadge(acao.tipo)}
                {getPrioridadeBadge(acao.prioridade)}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="btn-secondary text-green-600 hover:bg-green-50"
                disabled={acao.status === 'concluida'}
                onClick={() => handleCompleteAcao(acao)}
              >
                Concluir
              </button>
              <button
                onClick={() => handleEdit(acao)}
                className="flex-1 btn-secondary flex items-center justify-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </button>
              <button
                className="btn-secondary p-2 text-red-600 hover:bg-red-50"
                onClick={() => handleDelete(acao.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {acoes.length === 0 && (
        <div className="text-center py-12">
          <Target className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma acao encontrada</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || Object.values(filters).some((value) => value)
              ? 'Tente ajustar os filtros de busca.'
              : 'Comece criando uma nova acao.'}
          </p>
        </div>
      )}

      {/* Modal de Cadastro/Edicao */}
      <FormModal
        isOpen={showModal}
        onClose={handleModalClose}
        title={selectedAcao ? 'Editar acao' : 'Nova acao'}
        showFooter={false}
        asForm={false}
      >
        <AcaoForm
          acao={selectedAcao}
          onSave={() => {
            loadAcoes();
            handleModalClose();
          }}
          onCancel={handleModalClose}
        />
      </FormModal>
    </div>
  );
};

export default Acoes;
