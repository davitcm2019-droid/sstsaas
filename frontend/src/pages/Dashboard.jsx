import { useState, useEffect } from 'react';
import {
  Building2,
  CheckSquare,
  AlertTriangle,
  Shield,
  Clock,
  FileText
} from 'lucide-react';
import { empresasService, tarefasService, alertasService, eventosService, incidentsService } from '../services/api';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmpresas: 0,
    totalTarefas: 0,
    totalAlertas: 0,
    tarefasPendentes: 0,
    empresasConformes: 0,
    empresasAtrasadas: 0,
    totalEventos: 0
  });
  const [empresasComPendencias, setEmpresasComPendencias] = useState([]);
  const [tarefasRecentes, setTarefasRecentes] = useState([]);
  const [eventosProximos, setEventosProximos] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [empresasRes, tarefasRes, alertasRes, eventosRes, incidentsRes] = await Promise.all([
        empresasService.getAll(),
        tarefasService.getAll(),
        alertasService.getActive(),
        eventosService.getAll(),
        incidentsService.getAll()
      ]);

      const empresas = empresasRes.data.data || [];
      const tarefas = tarefasRes.data.data || [];
      const alertas = alertasRes.data.data || [];
      const eventos = eventosRes.data.data || [];
      const incidents = incidentsRes.data.data || [];

      const tarefasPendentes = tarefas.filter(t => t.status === 'pendente').length;
      const empresasConformes = empresas.filter(e => e.conformidade === 'em_dia').length;
      const empresasAtrasadas = empresas.filter(e => e.conformidade === 'atrasado').length;
      const alertasAtivos = incidents.filter(incident => incident.status !== 'concluido').length;

      const empresasPendentesList = empresas
        .filter(e => e.conformidade === 'atrasado')
        .slice(0, 5);

      const tarefasRecentesList = tarefas.slice(0, 5);

      const parseEventoData = (evento) => {
        if (!evento?.dataEvento) return Number.MAX_SAFE_INTEGER;
        const base = new Date(evento.dataEvento);
        if (!Number.isNaN(base.getTime()) && evento.horaEvento) {
          const [h = 0, m = 0] = evento.horaEvento.split(':');
          base.setHours(Number(h) || 0, Number(m) || 0, 0, 0);
        }
        return base.getTime();
      };

      const eventosOrdenados = [...eventos]
        .sort((a, b) => parseEventoData(a) - parseEventoData(b))
        .slice(0, 5);

      setEmpresasComPendencias(empresasPendentesList);
      setTarefasRecentes(tarefasRecentesList);
      setEventosProximos(eventosOrdenados);

      setStats({
        totalEmpresas: empresas.length,
        totalTarefas: tarefas.length,
        totalAlertas: alertasAtivos,
        tarefasPendentes,
        empresasConformes,
        empresasAtrasadas,
        totalEventos: eventos.length
      });
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      name: 'Total de Empresas',
      value: stats.totalEmpresas,
      icon: Building2,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive'
    },
    {
      name: 'Tarefas Pendentes',
      value: stats.tarefasPendentes,
      icon: CheckSquare,
      color: 'bg-yellow-500',
      change: '+5%',
      changeType: 'negative'
    },
    {
      name: 'Alertas Ativos',
      value: stats.totalAlertas,
      icon: AlertTriangle,
      color: 'bg-red-500',
      change: '-2%',
      changeType: 'positive'
    },
    {
      name: 'Empresas Conformes',
      value: stats.empresasConformes,
      icon: Shield,
      color: 'bg-green-500',
      change: '+8%',
      changeType: 'positive'
    },
    {
      name: 'Eventos Programados',
      value: stats.totalEventos,
      icon: Clock,
      color: 'bg-purple-500',
      change: '+3%',
      changeType: 'positive'
    }
  ];

  const quickActions = [
    {
      name: 'Nova Empresa',
      description: 'Cadastrar nova empresa',
      icon: Building2,
      href: '/empresas',
      color: 'bg-primary-500'
    },
    {
      name: 'Nova Tarefa',
      description: 'Criar nova tarefa',
      icon: CheckSquare,
      href: '/tarefas',
      color: 'bg-blue-500'
    },
    {
      name: 'Novo Incidente',
      description: 'Registrar ocorrência',
      icon: AlertTriangle,
      href: '/incidentes',
      color: 'bg-red-500'
    },
    {
      name: 'Relatórios',
      description: 'Gerar relatórios',
      icon: FileText,
      href: '/relatorios',
      color: 'bg-gray-600'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>
        <p className="mt-1 text-sm text-gray-500">Acompanhe os principais indicadores da operação.</p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                      <div
                        className={`ml-2 flex items-baseline text-sm font-semibold ${
                          stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {stat.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ações Rápidas */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <a
                key={action.name}
                href={action.href}
                className="card hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${action.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900">
                      {action.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {action.description}
                    </p>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Empresas e Tarefas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Empresas com Pendências</h3>
          <div className="space-y-3">
            {empresasComPendencias.length > 0 ? (
              empresasComPendencias.map((empresa) => (
                <div
                  key={empresa.id}
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{empresa.nome}</p>
                      <p className="text-xs text-gray-500">
                        {empresa.pendencias || 1} pendência(s)
                      </p>
                    </div>
                  </div>
                  <span className="status-badge status-warning">Atrasado</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Nenhuma empresa com pendências no momento.</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tarefas Recentes</h3>
          <div className="space-y-3">
            {tarefasRecentes.length > 0 ? (
              tarefasRecentes.map((tarefa) => (
                <div
                  key={tarefa.id}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <CheckSquare className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tarefa.titulo}</p>
                      <p className="text-xs text-gray-500">
                        {tarefa.status === 'concluida'
                          ? 'Concluída'
                          : tarefa.dataVencimento
                            ? `Vence em: ${new Date(tarefa.dataVencimento).toLocaleDateString('pt-BR')}`
                            : 'Sem data'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`status-badge ${
                      tarefa.prioridade === 'alta'
                        ? 'status-danger'
                        : tarefa.prioridade === 'media'
                          ? 'status-warning'
                          : 'status-info'
                    }`}
                  >
                    {tarefa.prioridade?.toUpperCase()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Nenhuma tarefa recente encontrada.</p>
            )}
          </div>
        </div>
      </div>

      {/* Eventos */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Próximos Eventos</h3>
        <div className="space-y-3">
          {eventosProximos.length > 0 ? (
            eventosProximos.map((evento) => (
              <div
                key={evento.id || evento.titulo}
                className="flex items-center justify-between p-3 bg-purple-50 rounded-lg"
              >
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-purple-500 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{evento.titulo}</p>
                    <p className="text-xs text-gray-500">
                      {evento.dataEvento
                        ? new Date(evento.dataEvento).toLocaleDateString('pt-BR')
                        : 'Sem data'}
                      {evento.horaEvento && ` às ${evento.horaEvento}`}
                    </p>
                  </div>
                </div>
                <span className="status-badge status-info">
                  {evento.prioridade?.toUpperCase() || 'INFO'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">Nenhum evento programado.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
