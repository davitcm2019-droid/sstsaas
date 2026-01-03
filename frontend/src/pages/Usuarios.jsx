import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2,
  Shield,
  UserCheck,
  Eye,
  UserX
} from 'lucide-react';
import { usuariosService } from '../services/api';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    perfil: '',
    status: ''
  });

  useEffect(() => {
    loadUsuarios();
  }, [searchTerm, filters]);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchTerm,
        ...filters
      };
      const response = await usuariosService.getAll(params);
      setUsuarios(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPerfilBadge = (perfil) => {
    switch (perfil) {
      case 'administrador':
        return <span className="status-badge status-danger">Administrador</span>;
      case 'tecnico_seguranca':
        return <span className="status-badge status-warning">Técnico de Segurança</span>;
      case 'visualizador':
        return <span className="status-badge status-info">Visualizador</span>;
      default:
        return <span className="status-badge status-info">{perfil}</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ativo':
        return <span className="status-badge status-success">Ativo</span>;
      case 'inativo':
        return <span className="status-badge status-danger">Inativo</span>;
      default:
        return <span className="status-badge status-info">{status}</span>;
    }
  };

  const getPerfilIcon = (perfil) => {
    switch (perfil) {
      case 'administrador':
        return <Shield className="h-5 w-5 text-red-500" />;
      case 'tecnico_seguranca':
        return <UserCheck className="h-5 w-5 text-yellow-500" />;
      case 'visualizador':
        return <Eye className="h-5 w-5 text-blue-500" />;
      default:
        return <Users className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPerfilDescription = (perfil) => {
    switch (perfil) {
      case 'administrador':
        return 'Acesso total ao sistema, pode gerenciar usuários e configurações';
      case 'tecnico_seguranca':
        return 'Pode criar e gerenciar tarefas, riscos e relatórios';
      case 'visualizador':
        return 'Apenas visualização de dados, sem permissões de edição';
      default:
        return 'Perfil não definido';
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await usuariosService.delete(id);
        loadUsuarios();
      } catch (error) {
        console.error('Erro ao excluir usuário:', error);
      }
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
      await usuariosService.update(id, { status: newStatus });
      loadUsuarios();
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
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
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie os usuários e permissões do sistema
          </p>
        </div>
        <button className="btn-primary flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
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
                placeholder="Buscar por nome ou email..."
                className="input-field pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="input-field"
              value={filters.perfil}
              onChange={(e) => setFilters({...filters, perfil: e.target.value})}
            >
              <option value="">Todos os perfis</option>
              <option value="administrador">Administrador</option>
              <option value="tecnico_seguranca">Técnico de Segurança</option>
              <option value="visualizador">Visualizador</option>
            </select>
            <select
              className="input-field"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {usuarios.map((usuario) => (
          <div key={usuario.id} className="card hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-primary-100 rounded-lg">
                  {getPerfilIcon(usuario.perfil)}
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    {usuario.nome}
                  </h3>
                  <p className="text-sm text-gray-500">{usuario.email}</p>
                </div>
              </div>
              <div className="flex space-x-1">
                {getPerfilBadge(usuario.perfil)}
                {getStatusBadge(usuario.status)}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-sm text-gray-600">
                <strong>Perfil:</strong> {usuario.perfil.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
              <div className="text-sm text-gray-600">
                <strong>Descrição:</strong> {getPerfilDescription(usuario.perfil)}
              </div>
              <div className="text-sm text-gray-500">
                <strong>Cadastrado em:</strong> {formatDate(usuario.dataCadastro)}
              </div>
            </div>

            <div className="flex space-x-2">
              <button className="flex-1 btn-secondary flex items-center justify-center">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </button>
              <button 
                className={`btn-secondary p-2 ${
                  usuario.status === 'ativo' 
                    ? 'text-red-600 hover:bg-red-50' 
                    : 'text-green-600 hover:bg-green-50'
                }`}
                onClick={() => handleToggleStatus(usuario.id, usuario.status)}
                title={usuario.status === 'ativo' ? 'Desativar usuário' : 'Ativar usuário'}
              >
                {usuario.status === 'ativo' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
              </button>
              <button 
                className="btn-secondary p-2 text-red-600 hover:bg-red-50"
                onClick={() => handleDelete(usuario.id)}
                title="Excluir usuário"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {usuarios.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum usuário encontrado</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || Object.values(filters).some(f => f) 
              ? 'Tente ajustar os filtros de busca.' 
              : 'Comece criando um novo usuário.'
            }
          </p>
        </div>
      )}

      {/* Summary Stats */}
      {usuarios.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="text-2xl font-bold text-gray-900">{usuarios.length}</div>
            <div className="text-sm text-gray-500">Total de Usuários</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600">
              {usuarios.filter(u => u.status === 'ativo').length}
            </div>
            <div className="text-sm text-gray-500">Usuários Ativos</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-red-600">
              {usuarios.filter(u => u.perfil === 'administrador').length}
            </div>
            <div className="text-sm text-gray-500">Administradores</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-600">
              {usuarios.filter(u => u.perfil === 'tecnico_seguranca').length}
            </div>
            <div className="text-sm text-gray-500">Técnicos</div>
          </div>
        </div>
      )}

      {/* Profile Information */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Informações sobre Perfis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="flex items-center mb-2">
              <Shield className="h-5 w-5 text-red-500 mr-2" />
              <h4 className="font-medium text-gray-900">Administrador</h4>
            </div>
            <p className="text-sm text-gray-600">
              Acesso total ao sistema, pode gerenciar usuários, empresas, tarefas e configurações.
            </p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-center mb-2">
              <UserCheck className="h-5 w-5 text-yellow-500 mr-2" />
              <h4 className="font-medium text-gray-900">Técnico de Segurança</h4>
            </div>
            <p className="text-sm text-gray-600">
              Pode criar e gerenciar tarefas, riscos, relatórios e visualizar dados das empresas.
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center mb-2">
              <Eye className="h-5 w-5 text-blue-500 mr-2" />
              <h4 className="font-medium text-gray-900">Visualizador</h4>
            </div>
            <p className="text-sm text-gray-600">
              Apenas visualização de dados e relatórios, sem permissões de edição ou criação.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Usuarios;
