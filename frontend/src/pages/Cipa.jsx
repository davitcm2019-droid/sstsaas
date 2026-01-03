import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2,
  Calendar,
  Building2
} from 'lucide-react';
import FormModal from '../components/FormModal';
import CipaForm from '../components/forms/CipaForm';
import { cipasService } from '../services/api';

const Cipa = () => {
  const [cipas, setCipas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    gestao: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [selectedCipa, setSelectedCipa] = useState(null);

  useEffect(() => {
    loadCipas();
  }, [searchTerm, filters]);

  const loadCipas = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) {
        params.search = searchTerm;
      }
      if (filters.status) {
        params.status = filters.status;
      }
      if (filters.gestao) {
        params.gestao = filters.gestao;
      }
      const response = await cipasService.getAll(params);
      setCipas(response.data?.data || []);
    } catch (error) {
      console.error('Erro ao carregar CIPAs:', error);
      setCipas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedCipa(null);
    setShowModal(true);
  };

  const handleEdit = (cipa) => {
    setSelectedCipa(cipa);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta CIPA?')) {
      try {
        await cipasService.delete(id);
        loadCipas();
      } catch (error) {
        console.error('Erro ao excluir CIPA:', error);
      }
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedCipa(null);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ativa':
        return <span className="status-badge status-success">Ativa</span>;
      case 'inativa':
        return <span className="status-badge status-warning">Inativa</span>;
      case 'suspensa':
        return <span className="status-badge status-danger">Suspensa</span>;
      default:
        return <span className="status-badge status-info">{status}</span>;
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
          <h1 className="text-2xl font-bold text-gray-900">Controle de CIPA</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie as Comissões Internas de Prevenção de Acidentes
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova CIPA
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
                placeholder="Buscar por empresa ou gestão..."
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
              <option value="ativa">Ativa</option>
              <option value="inativa">Inativa</option>
              <option value="suspensa">Suspensa</option>
            </select>
            <select
              className="input-field"
              value={filters.gestao}
              onChange={(e) => setFilters({...filters, gestao: e.target.value})}
            >
              <option value="">Todas as gestões</option>
              <option value="2024/2025">2024/2025</option>
              <option value="2023/2024">2023/2024</option>
              <option value="2022/2023">2022/2023</option>
            </select>
          </div>
        </div>
      </div>

      {/* CIPA List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cipas.map((cipa) => (
          <div key={cipa.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-primary-500" />
                <div>
                  <h3 className="font-semibold text-gray-900">{cipa.empresaNome || cipa.empresa}</h3>
                  <p className="text-sm text-gray-500">Gestão {cipa.gestao}</p>
                </div>
              </div>
              {getStatusBadge(cipa.status)}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Presidente:</span>
                <span className="font-medium">{cipa.presidente}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Vice-Presidente:</span>
                <span className="font-medium">{cipa.vicePresidente}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Secretário:</span>
                <span className="font-medium">{cipa.secretario}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Membros:</span>
                <span className="font-medium">{cipa.membros?.length ?? 0}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{cipa.dataInicio} - {cipa.dataFim}</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <button 
                onClick={() => handleEdit(cipa)}
                className="flex-1 btn-secondary flex items-center justify-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </button>
              <button 
                className="btn-secondary p-2 text-red-600 hover:bg-red-50"
                onClick={() => handleDelete(cipa.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {cipas.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma CIPA encontrada</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || Object.values(filters).some(f => f) 
              ? 'Tente ajustar os filtros de busca.' 
              : 'Comece criando uma nova CIPA.'
            }
          </p>
        </div>
      )}

      {/* Modal de Cadastro/Edição */}
      <FormModal
        isOpen={showModal}
        onClose={handleModalClose}
        title={selectedCipa ? 'Editar CIPA' : 'Nova CIPA'}
        showFooter={false}
        asForm={false}
      >
        <CipaForm
          cipa={selectedCipa}
          onSave={() => {
            loadCipas();
            handleModalClose();
          }}
          onCancel={handleModalClose}
        />
      </FormModal>
    </div>
  );
};

export default Cipa;
