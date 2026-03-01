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
import FormModal from '../components/FormModal';
import UsuarioForm from '../components/forms/UsuarioForm';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    perfil: '',
    status: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState(null);

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

  const handleCreate = () => {
    setSelectedUsuario(null);
    setShowModal(true);
  };

  const handleEdit = (usuario) => {
    setSelectedUsuario(usuario);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedUsuario(null);
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
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Usuários</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie pessoas, perfis e acessos dentro do SST SaaS.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="btn-primary bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-300 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Usuário
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-12 py-3 text-sm font-medium text-gray-700 shadow-sm focus:border-primary-400 focus:bg-white focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <select
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm focus:border-primary-400 focus:outline-none"
              value={filters.perfil}
              onChange={(e) => setFilters({ ...filters, perfil: e.target.value })}
            >
              <option value="">Todos os perfis</option>
              <option value="administrador">Administrador</option>
              <option value="auditor">Auditor</option>
              <option value="tecnico_seguranca">Técnico de Segurança</option>
              <option value="visualizador">Visualizador</option>
            </select>
            <select
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm focus:border-primary-400 focus:outline-none"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {usuarios.map((usuario) => (
          <div
            key={usuario.id}
            className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 transition hover:shadow-lg"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-50 text-primary-600">
                  {getPerfilIcon(usuario.perfil)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{usuario.nome}</h3>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-right">
                {getPerfilBadge(usuario.perfil)}
                {getStatusBadge(usuario.status)}
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-600">
              {getPerfilDescription(usuario.perfil)}
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Cadastrado em {formatDate(usuario.dataCadastro)}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="btn-secondary flex-1 min-w-[120px] rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                onClick={() => handleEdit(usuario)}
              >
                <Edit className="h-4 w-4 mr-2 inline-block" />
                Editar
              </button>
              <button
                className={`rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold transition ${
                  usuario.status === 'ativo'
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-emerald-600 hover:bg-emerald-50'
                }`}
                onClick={() => handleToggleStatus(usuario.id, usuario.status)}
                title={usuario.status === 'ativo' ? 'Desativar usuário' : 'Ativar usuário'}
              >
                {usuario.status === 'ativo' ? (
                  <UserX className="h-4 w-4" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
              </button>
              <button
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition"
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
            {searchTerm || Object.values(filters).some((f) => f)
              ? 'Tente ajustar os filtros de busca.'
              : 'Comece criando um novo usuário.'}
          </p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
          <div className="text-3xl font-semibold text-gray-900">{usuarios.length}</div>
          <p className="text-sm text-gray-500 mt-1">Total de Usuários</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
          <div className="text-3xl font-semibold text-emerald-600">
            {usuarios.filter((u) => u.status === 'ativo').length}
          </div>
          <p className="text-sm text-gray-500 mt-1">Usuários Ativos</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
          <div className="text-3xl font-semibold text-red-600">
            {usuarios.filter((u) => u.perfil === 'administrador').length}
          </div>
          <p className="text-sm text-gray-500 mt-1">Administradores</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
          <div className="text-3xl font-semibold text-blue-600">
            {usuarios.filter((u) => u.perfil === 'tecnico_seguranca').length}
          </div>
          <p className="text-sm text-gray-500 mt-1">Técnicos</p>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-5">Informações sobre Perfis</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-red-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/70 shadow">
                <Shield className="h-4 w-4 text-red-500" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900">Administrador</h4>
            </div>
            <p className="text-sm text-gray-600">
              Acesso total ao sistema, pode gerenciar usuários, empresas, tarefas e configurações.
            </p>
          </div>
          <div className="rounded-2xl bg-yellow-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/70 shadow">
                <UserCheck className="h-4 w-4 text-yellow-500" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900">Técnico de Segurança</h4>
            </div>
            <p className="text-sm text-gray-600">
              Pode criar e gerenciar tarefas, riscos, relatórios e visualizar dados das empresas.
            </p>
          </div>
          <div className="rounded-2xl bg-blue-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/70 shadow">
                <Eye className="h-4 w-4 text-blue-500" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900">Visualizador</h4>
            </div>
            <p className="text-sm text-gray-600">
              Apenas visualização de dados e relatórios, sem permissões de edição ou criação.
            </p>
          </div>
        </div>
      </div>

      <FormModal
        isOpen={showModal}
        onClose={handleModalClose}
        title={selectedUsuario ? 'Editar Usuário' : 'Novo Usuário'}
        showFooter={false}
        asForm={false}
      >
        <UsuarioForm
          usuario={selectedUsuario}
          onSave={() => {
            loadUsuarios();
            handleModalClose();
          }}
          onCancel={handleModalClose}
        />
      </FormModal>
    </div>
  );
};

export default Usuarios;
