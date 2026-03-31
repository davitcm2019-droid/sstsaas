import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarRange,
  CheckSquare,
  ClipboardCheck,
  FileText,
  Shield
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import MetricCard from '../components/ui/MetricCard';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import { empresasService, eventosService, incidentsService, tarefasService } from '../services/api';

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
    void loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [empresasRes, tarefasRes, eventosRes, incidentsRes] = await Promise.all([
        empresasService.getAll(),
        tarefasService.getAll(),
        eventosService.getAll(),
        incidentsService.getAll()
      ]);

      const empresas = empresasRes.data.data || [];
      const tarefas = tarefasRes.data.data || [];
      const eventos = eventosRes.data.data || [];
      const incidents = incidentsRes.data.data || [];

      const tarefasPendentes = tarefas.filter((tarefa) => tarefa.status === 'pendente').length;
      const empresasConformes = empresas.filter((empresa) => empresa.conformidade === 'em_dia').length;
      const empresasAtrasadas = empresas.filter((empresa) => empresa.conformidade === 'atrasado').length;
      const alertasAtivos = incidents.filter((incident) => incident.status !== 'concluido').length;

      const parseEventoData = (evento) => {
        if (!evento?.dataEvento) return Number.MAX_SAFE_INTEGER;
        const base = new Date(evento.dataEvento);

        if (!Number.isNaN(base.getTime()) && evento.horaEvento) {
          const [h = 0, m = 0] = String(evento.horaEvento).split(':');
          base.setHours(Number(h) || 0, Number(m) || 0, 0, 0);
        }

        return base.getTime();
      };

      setEmpresasComPendencias(empresas.filter((empresa) => empresa.conformidade === 'atrasado').slice(0, 5));
      setTarefasRecentes(tarefas.slice(0, 6));
      setEventosProximos([...eventos].sort((a, b) => parseEventoData(a) - parseEventoData(b)).slice(0, 5));

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

  const complianceData = useMemo(() => {
    const emAjuste = Math.max(stats.totalEmpresas - stats.empresasConformes - stats.empresasAtrasadas, 0);

    return [
      { name: 'Em dia', total: stats.empresasConformes },
      { name: 'Atrasadas', total: stats.empresasAtrasadas },
      { name: 'Em ajuste', total: emAjuste }
    ];
  }, [stats.empresasAtrasadas, stats.empresasConformes, stats.totalEmpresas]);

  const cadenceData = useMemo(
    () => [
      { name: 'Tarefas', total: stats.tarefasPendentes },
      { name: 'Alertas', total: stats.totalAlertas },
      { name: 'Eventos', total: stats.totalEventos }
    ],
    [stats.tarefasPendentes, stats.totalAlertas, stats.totalEventos]
  );

  const formatDate = (value) => {
    if (!value) return 'Sem data';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sem data';
    return date.toLocaleDateString('pt-BR');
  };

  const quickActions = [
    {
      label: 'Abrir carteira de empresas',
      description: 'Estrutura clientes, unidades e responsables por contexto.',
      href: '/empresas',
      icon: Building2
    },
    {
      label: 'Entrar no levantamento',
      description: 'Cadeia completa de atividade, perigo e risco.',
      href: '/levantamento-riscos',
      icon: AlertTriangle
    },
    {
      label: 'Revisar acoes',
      description: 'Prioridades, prazos e rastreio de evidencias.',
      href: '/acoes',
      icon: ClipboardCheck
    }
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-300 border-t-lime-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Centro de comando"
        title="Visao executiva com leitura operacional."
        description="Acompanhe a carteira, detecte atraso documental e distribua a proxima decisao sem mudar de contexto."
        actions={
          <>
            <Link to="/empresas" className="btn-secondary">
              Carteira de empresas
            </Link>
            <Link to="/levantamento-riscos" className="btn-primary">
              Abrir levantamento
            </Link>
          </>
        }
      >
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                to={action.href}
                className="rounded-3xl border border-white/10 bg-white/5 p-4 transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <Icon className="h-5 w-5 text-lime-300" />
                </div>
                <h2 className="text-base text-white">{action.label}</h2>
                <p className="mt-2 text-sm text-slate-300">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </PageHeader>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Building2}
          label="Empresas monitoradas"
          value={stats.totalEmpresas}
          meta={`${stats.empresasConformes} em dia`}
          tone="blue"
        />
        <MetricCard
          icon={CheckSquare}
          label="Fila operacional"
          value={stats.tarefasPendentes}
          meta={`${stats.totalTarefas} tarefas cadastradas`}
          tone="amber"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Alertas em aberto"
          value={stats.totalAlertas}
          meta="Incidentes e ocorrencias ativas"
          tone="rose"
        />
        <MetricCard
          icon={CalendarRange}
          label="Agenda programada"
          value={stats.totalEventos}
          meta="Compromissos e renovacoes mapeados"
          tone="lime"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="panel-surface p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Carteira</p>
              <h2 className="mt-1 text-xl text-slate-900">Mapa de conformidade</h2>
            </div>
            <span className="status-badge status-info">Leitura rapida</span>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/80 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Distribuicao</h3>
                <span className="text-sm text-slate-500">{stats.totalEmpresas} empresas</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={complianceData} barSize={34}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#dbe4ee" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(140, 240, 69, 0.08)' }} />
                    <Bar dataKey="total" radius={[12, 12, 0, 0]} fill="#8cf045" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-950 p-4 text-white">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-400">Cadencia</h3>
                <span className="text-sm text-slate-400">Demandas imediatas</span>
              </div>
              <div className="space-y-3">
                {cadenceData.map((item) => (
                  <div key={item.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">{item.name}</span>
                      <strong className="text-2xl text-white">{item.total}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="panel-surface p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Prioridade</p>
              <h2 className="mt-1 text-xl text-slate-900">Empresas com maior tensao</h2>
            </div>
            <Link to="/empresas" className="btn-ghost">
              Ver carteira
            </Link>
          </div>

          <div className="space-y-3">
            {empresasComPendencias.length > 0 ? (
              empresasComPendencias.map((empresa) => (
                <Link
                  key={empresa.id}
                  to={`/empresas/${empresa.id}`}
                  className="flex items-center justify-between rounded-[1.35rem] border border-slate-200/80 bg-white/80 px-4 py-4 transition-transform duration-200 hover:-translate-y-1"
                >
                  <div>
                    <p className="text-base font-semibold text-slate-900">{empresa.nome}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {empresa.pendencias || 1} pendencia(s) e conformidade em atraso
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                </Link>
              ))
            ) : (
              <EmptyState
                icon={Shield}
                title="Carteira estabilizada"
                description="Nenhuma empresa esta marcada com atraso neste momento."
              />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="panel-surface p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Execucao</p>
              <h2 className="mt-1 text-xl text-slate-900">Fila recente de tarefas</h2>
            </div>
            <Link to="/tarefas" className="btn-secondary">
              Abrir tarefas
            </Link>
          </div>

          <div className="space-y-3">
            {tarefasRecentes.length > 0 ? (
              tarefasRecentes.map((tarefa) => (
                <div key={tarefa.id} className="rounded-[1.35rem] border border-slate-200/80 bg-white/86 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{tarefa.titulo}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {tarefa.status === 'concluida'
                          ? 'Concluida'
                          : tarefa.dataVencimento
                            ? `Vencimento em ${formatDate(tarefa.dataVencimento)}`
                            : 'Sem data definida'}
                      </p>
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
                      {String(tarefa.prioridade || 'normal').toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={CheckSquare}
                title="Sem fila recente"
                description="Nenhuma tarefa foi registrada ainda para a operacao atual."
              />
            )}
          </div>
        </div>

        <div className="panel-surface p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Agenda</p>
              <h2 className="mt-1 text-xl text-slate-900">Proximos eventos</h2>
            </div>
            <Link to="/agenda" className="btn-ghost">
              Abrir agenda
            </Link>
          </div>

          <div className="space-y-3">
            {eventosProximos.length > 0 ? (
              eventosProximos.map((evento) => (
                <div key={evento.id || evento.titulo} className="rounded-[1.35rem] border border-slate-200/80 bg-slate-950 px-4 py-4 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{evento.titulo}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {formatDate(evento.dataEvento)}
                        {evento.horaEvento ? ` as ${evento.horaEvento}` : ''}
                      </p>
                    </div>
                    <span className="status-badge status-info">
                      {String(evento.prioridade || 'info').toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={CalendarRange}
                title="Nenhum evento programado"
                description="A agenda ainda nao possui compromissos ou renovacoes registradas."
              />
            )}
          </div>

          <div className="mt-5 rounded-[1.35rem] border border-slate-200/80 bg-white/80 p-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-100 text-lime-700">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Leitura documental</p>
                <p className="text-sm text-slate-500">
                  Combine agenda, tarefas e inventario para preparar revisoes de PGR, LTCAT e PPP.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
