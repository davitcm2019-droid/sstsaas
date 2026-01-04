import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Building2, 
  ArrowLeft, 
  Edit, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  FileText,
  Shield
} from 'lucide-react';
import { empresasService, tarefasService, riscosService, alertasService } from '../services/api';

const EmpresaDetalhes = () => {
  const { id } = useParams();
  const [empresa, setEmpresa] = useState(null);
  const [tarefas, setTarefas] = useState([]);
  const [riscos, setRiscos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      loadEmpresaData();
    }
  }, [id]);

  const loadEmpresaData = async () => {
    try {
      setLoading(true);
      
      const [empresaRes, tarefasRes, riscosRes, alertasRes] = await Promise.all([
        empresasService.getById(id),
        tarefasService.getAll({ empresaId: id }),
        riscosService.getAll({ empresaId: id }),
        alertasService.getAll({ empresaId: id })
      ]);

      setEmpresa(empresaRes.data.data);
      setTarefas(tarefasRes.data.data);
      setRiscos(riscosRes.data.data);
      setAlertas(alertasRes.data.data);
    } catch (error) {
      console.error('Erro ao carregar dados da empresa:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'em_dia':
        return <span className="status-badge status-success">Em dia</span>;
      case 'atrasado':
        return <span className="status-badge status-danger">Atrasado</span>;
      case 'pendente':
        return <span className="status-badge status-warning">Pendente</span>;
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

  if (!empresa) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Empresa não encontrada</h3>
        <p className="mt-1 text-sm text-gray-500">
          A empresa que você está procurando não existe.
        </p>
        <div className="mt-6">
          <Link to="/empresas" className="btn-primary">
            Voltar para Empresas
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Visão Geral', icon: Building2 },
    { id: 'tarefas', name: 'Tarefas', icon: FileText },
    { id: 'riscos', name: 'Riscos', icon: AlertTriangle },
    { id: 'alertas', name: 'Alertas', icon: Clock }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link
            to="/empresas"
            className="mr-4 p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{empresa.nome}</h1>
            <p className="mt-1 text-sm text-gray-500">{empresa.cnpj}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Link
            to={`/empresas/${empresa.id}/sst`}
            className="btn-secondary flex items-center justify-center w-full sm:w-auto"
          >
            <Shield className="h-4 w-4 mr-2" />
            Dashboard SST
          </Link>
          <button className="btn-primary flex items-center justify-center w-full sm:w-auto">
            <Edit className="h-4 w-4 mr-2" />
            Editar Empresa
          </button>
        </div>
      </div>

      {/* Company Info Card */}
      <div className="card">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Endereço</p>
                  <p className="text-sm text-gray-500">{empresa.endereco}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Telefone</p>
                  <p className="text-sm text-gray-500">{empresa.telefone}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-500">{empresa.email}</p>
                </div>
              </div>
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Responsável</p>
                  <p className="text-sm text-gray-500">{empresa.responsavel}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Status de Conformidade</p>
              <div className="mt-2">
                {getStatusBadge(empresa.conformidade)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-red-600">{empresa.pendencias}</p>
                <p className="text-sm text-gray-500">Pendências</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{empresa.alertas}</p>
                <p className="text-sm text-gray-500">Alertas</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informações do CNAE</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">CNAE:</span>
                  <span className="font-medium">{empresa.cnae}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ramo:</span>
                  <span className="font-medium">{empresa.ramo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Data de Cadastro:</span>
                  <span className="font-medium">{formatDate(empresa.dataCadastro)}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Auditorias</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Última Auditoria:</span>
                  <span className="font-medium">{formatDate(empresa.ultimaAuditoria)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Próxima Auditoria:</span>
                  <span className="font-medium">{formatDate(empresa.proximaAuditoria)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tarefas' && (
          <div className="space-y-4">
            {tarefas.map((tarefa) => (
              <div key={tarefa.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900">{tarefa.titulo}</h4>
                    <p className="text-sm text-gray-500 mt-1">{tarefa.descricao}</p>
                    <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                      <span>Vence em: {formatDate(tarefa.dataVencimento)}</span>
                      <span>Responsável: {tarefa.responsavel}</span>
                      <span>Categoria: {tarefa.categoria}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {getPriorityBadge(tarefa.prioridade)}
                    {getStatusBadge(tarefa.status)}
                  </div>
                </div>
              </div>
            ))}
            {tarefas.length === 0 && (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma tarefa encontrada</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Esta empresa não possui tarefas cadastradas.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'riscos' && (
          <div className="space-y-4">
            {riscos.map((risco) => (
              <div key={risco.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900">{risco.descricao}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      <strong>Tipo:</strong> {risco.tipo} | 
                      <strong> Probabilidade:</strong> {risco.probabilidade} | 
                      <strong> Consequência:</strong> {risco.consequencia}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Medidas Preventivas:</strong> {risco.medidasPreventivas}
                    </p>
                    <div className="flex items-center mt-2 text-sm text-gray-500">
                      <span>Identificado em: {formatDate(risco.dataIdentificacao)}</span>
                      <span className="ml-4">Responsável: {risco.responsavel}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    {getPriorityBadge(risco.classificacao)}
                  </div>
                </div>
              </div>
            ))}
            {riscos.length === 0 && (
              <div className="text-center py-8">
                <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum risco identificado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Esta empresa não possui riscos cadastrados.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'alertas' && (
          <div className="space-y-4">
            {alertas.map((alerta) => (
              <div key={alerta.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900">{alerta.titulo}</h4>
                    <p className="text-sm text-gray-500 mt-1">{alerta.descricao}</p>
                    <div className="flex items-center mt-2 text-sm text-gray-500">
                      <span>Criado em: {formatDate(alerta.dataCriacao)}</span>
                      <span className="ml-4">Tipo: {alerta.tipo}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    {getPriorityBadge(alerta.prioridade)}
                  </div>
                </div>
              </div>
            ))}
            {alertas.length === 0 && (
              <div className="text-center py-8">
                <Clock className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum alerta ativo</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Esta empresa não possui alertas ativos.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmpresaDetalhes;
