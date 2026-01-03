import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { empresasService } from '../services/api';
import FormModal from '../components/FormModal';
import EmpresaForm from '../components/forms/EmpresaForm';

const formatCnpj = (value) => {
  if (!value) return '-';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 14) return value;
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

const Empresas = () => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    conformidade: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);

  useEffect(() => {
    loadEmpresas();
  }, [searchTerm, filters]);

  const loadEmpresas = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchTerm,
        ...filters
      };
      const response = await empresasService.getAll(params);
      setEmpresas(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedEmpresa(null);
    setShowModal(true);
  };

  const handleEdit = (empresa) => {
    setSelectedEmpresa(empresa);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta empresa?')) {
      try {
        await empresasService.delete(id);
        loadEmpresas();
      } catch (error) {
        console.error('Erro ao excluir empresa:', error);
      }
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedEmpresa(null);
  };

  const getStatusBadge = (conformidade) => {
    switch (conformidade) {
      case 'em_dia':
        return <span className="status-badge status-success">Em dia</span>;
      case 'atrasado':
        return <span className="status-badge status-danger">Atrasado</span>;
      default:
        return <span className="status-badge status-warning">Pendente</span>;
    }
  };

  const getStatusIcon = (conformidade) => {
    switch (conformidade) {
      case 'em_dia':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'atrasado':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
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
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie as empresas cadastradas no sistema
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Empresa
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
                placeholder="Buscar por nome, CNPJ ou ramo..."
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
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
            <select
              className="input-field"
              value={filters.conformidade}
              onChange={(e) => setFilters({...filters, conformidade: e.target.value})}
            >
              <option value="">Todas as conformidades</option>
              <option value="em_dia">Em dia</option>
              <option value="atrasado">Atrasado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {empresas.map((empresa) => (
          <div key={empresa.id} className="card hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    {empresa.nome}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatCnpj(empresa.cnpj)}
                  </p>
                </div>
              </div>
              {getStatusIcon(empresa.conformidade)}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">CNAE:</span>
                <span className="font-medium">{empresa.cnae}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ramo:</span>
                <span className="font-medium">{empresa.ramo}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Responsável:</span>
                <span className="font-medium">{empresa.responsavel}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex space-x-4 text-sm">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-red-600 font-medium">{empresa.pendencias}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-yellow-500 mr-1" />
                  <span className="text-yellow-600 font-medium">{empresa.alertas}</span>
                </div>
              </div>
              {getStatusBadge(empresa.conformidade)}
            </div>

            <div className="flex space-x-2">
              <Link
                to={`/empresas/${empresa.id}`}
                className="flex-1 btn-secondary flex items-center justify-center"
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalhes
              </Link>
              <button 
                onClick={() => handleEdit(empresa)}
                className="btn-secondary p-2"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button 
                className="btn-secondary p-2 text-red-600 hover:bg-red-50"
                onClick={() => handleDelete(empresa.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {empresas.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma empresa encontrada</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || Object.values(filters).some(f => f) 
              ? 'Tente ajustar os filtros de busca.' 
              : 'Comece criando uma nova empresa.'
            }
          </p>
        </div>
      )}

      {/* Modal de Cadastro/Edição */}
      <FormModal
        isOpen={showModal}
        onClose={handleModalClose}
        title={selectedEmpresa ? 'Editar Empresa' : 'Nova Empresa'}
        showFooter={false}
        asForm={false}
      >
        <EmpresaForm
          empresa={selectedEmpresa}
          onSave={() => {
            loadEmpresas();
            handleModalClose();
          }}
          onCancel={handleModalClose}
        />
      </FormModal>
    </div>
  );
};

export default Empresas;




