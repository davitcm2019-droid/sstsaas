import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, CheckSquare, Download, Shield } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import EmptyState from '../components/ui/EmptyState';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import { alertasService, empresasService, riscosService, tarefasService } from '../services/api';

const REPORT_COLORS = {
  lime: '#8cf045',
  limeSoft: '#b9ff70',
  blue: '#0ea5e9',
  amber: '#f59e0b',
  rose: '#ef4444',
  emerald: '#22c55e',
  slate: '#64748b'
};

const isTaskDone = (status) => {
  const normalizedStatus = String(status || '').toLowerCase();
  return normalizedStatus === 'concluido' || normalizedStatus === 'concluida';
};

const formatDate = (value) => {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return date.toLocaleDateString('pt-BR');
};

const formatShare = (value, total) => (total > 0 ? `${Math.round((value / total) * 100)}%` : '0%');

const ReportChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="report-chart-tooltip">
      {label ? <p className="report-chart-tooltip__label">{label}</p> : null}
      <div className="mt-2 space-y-2">
        {payload.map((entry) => (
          <div
            key={`${entry.dataKey}-${entry.name}`}
            className="flex items-center justify-between gap-4 text-sm text-slate-600"
          >
            <div className="flex items-center gap-2">
              <span
                className="report-legend-dot"
                style={{
                  backgroundColor: entry.color,
                  boxShadow: `0 0 0 4px ${entry.color}1f`
                }}
              />
              <span>{entry.name}</span>
            </div>
            <strong className="text-slate-900">{entry.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReportChartCard = ({ eyebrow, title, meta, children }) => (
  <section className="panel-surface p-6">
    <div className="mb-5 flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
        <h2 className="mt-1 text-xl text-slate-900">{title}</h2>
      </div>
      {meta ? <span className="status-badge status-info">{meta}</span> : null}
    </div>
    {children}
  </section>
);

const Relatorios = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    empresas: [],
    tarefas: [],
    riscos: [],
    alertas: []
  });

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [empresasRes, tarefasRes, riscosRes, alertasRes] = await Promise.all([
        empresasService.getAll(),
        tarefasService.getAll(),
        riscosService.getAll(),
        alertasService.getAll()
      ]);

      setStats({
        empresas: empresasRes.data.data || [],
        tarefas: tarefasRes.data.data || [],
        riscos: riscosRes.data.data || [],
        alertas: alertasRes.data.data || []
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalEmpresas = stats.empresas.length;
  const totalTarefas = stats.tarefas.length;
  const totalRiscos = stats.riscos.length;
  const totalAlertas = stats.alertas.length;

  const tarefasVencidas = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    return stats.tarefas.filter((tarefa) => {
      const vencimento = new Date(tarefa.dataVencimento);
      return !Number.isNaN(vencimento.getTime()) && vencimento < hoje && !isTaskDone(tarefa.status);
    });
  }, [stats.tarefas]);

  const conformidadeData = useMemo(
    () => [
      {
        name: 'Em dia',
        value: stats.empresas.filter((empresa) => empresa.conformidade === 'em_dia').length,
        color: REPORT_COLORS.lime
      },
      {
        name: 'Atrasado',
        value: stats.empresas.filter((empresa) => empresa.conformidade === 'atrasado').length,
        color: REPORT_COLORS.rose
      },
      {
        name: 'Pendente',
        value: stats.empresas.filter((empresa) => empresa.conformidade === 'pendente').length,
        color: REPORT_COLORS.amber
      }
    ],
    [stats.empresas]
  );

  const tarefasStatusData = useMemo(
    () => [
      {
        name: 'Pendente',
        value: stats.tarefas.filter((tarefa) => tarefa.status === 'pendente').length,
        color: REPORT_COLORS.amber
      },
      {
        name: 'Em andamento',
        value: stats.tarefas.filter((tarefa) => tarefa.status === 'em_andamento').length,
        color: REPORT_COLORS.blue
      },
      {
        name: 'Concluidas',
        value: stats.tarefas.filter((tarefa) => isTaskDone(tarefa.status)).length,
        color: REPORT_COLORS.lime
      }
    ],
    [stats.tarefas]
  );

  const tarefasPrioridadeData = useMemo(
    () => [
      {
        name: 'Alta',
        value: stats.tarefas.filter((tarefa) => tarefa.prioridade === 'alta').length,
        color: REPORT_COLORS.rose
      },
      {
        name: 'Media',
        value: stats.tarefas.filter((tarefa) => tarefa.prioridade === 'media').length,
        color: REPORT_COLORS.amber
      },
      {
        name: 'Baixa',
        value: stats.tarefas.filter((tarefa) => tarefa.prioridade === 'baixa').length,
        color: REPORT_COLORS.blue
      }
    ],
    [stats.tarefas]
  );

  const riscosTipoData = useMemo(
    () => [
      {
        name: 'Fisico',
        value: stats.riscos.filter((risco) => risco.tipo === 'Fisico' || risco.tipo === 'Físico').length,
        color: REPORT_COLORS.blue
      },
      {
        name: 'Quimico',
        value: stats.riscos.filter((risco) => risco.tipo === 'Quimico' || risco.tipo === 'Químico').length,
        color: REPORT_COLORS.amber
      },
      {
        name: 'Biologico',
        value: stats.riscos.filter((risco) => risco.tipo === 'Biologico' || risco.tipo === 'Biológico').length,
        color: REPORT_COLORS.emerald
      },
      {
        name: 'Ergonomico',
        value: stats.riscos.filter((risco) => risco.tipo === 'Ergonomico' || risco.tipo === 'Ergonômico').length,
        color: REPORT_COLORS.limeSoft
      },
      {
        name: 'Acidente',
        value: stats.riscos.filter((risco) => risco.tipo === 'Acidente').length,
        color: REPORT_COLORS.rose
      }
    ],
    [stats.riscos]
  );

  const empresasComPendencias = useMemo(
    () =>
      [...stats.empresas]
        .filter((empresa) => Number(empresa.pendencias || 0) > 0)
        .sort((left, right) => Number(right.pendencias || 0) - Number(left.pendencias || 0))
        .slice(0, 5),
    [stats.empresas]
  );

  const empresasEmDia = conformidadeData.find((item) => item.name === 'Em dia')?.value || 0;
  const empresasAtrasadas = conformidadeData.find((item) => item.name === 'Atrasado')?.value || 0;

  const complianceOverview = [
    {
      label: 'Empresas em conformidade',
      value: empresasEmDia,
      meta: `${formatShare(empresasEmDia, totalEmpresas)} da carteira`,
      color: REPORT_COLORS.lime
    },
    {
      label: 'Empresas atrasadas',
      value: empresasAtrasadas,
      meta: `${formatShare(empresasAtrasadas, totalEmpresas)} da carteira`,
      color: REPORT_COLORS.amber
    },
    {
      label: 'Tarefas vencidas',
      value: tarefasVencidas.length,
      meta: `${formatShare(tarefasVencidas.length, totalTarefas)} do volume atual`,
      color: REPORT_COLORS.rose
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
        eyebrow="Analitico"
        title="Relatorios com leitura executiva e operacional."
        description="Acompanhe conformidade, tarefa, criticidade e gargalos da carteira com os mesmos sinais visuais do dashboard principal."
        actions={
          <button type="button" className="btn-primary">
            <Download className="h-4 w-4" />
            Exportar relatorio
          </button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Building2}
          label="Empresas monitoradas"
          value={totalEmpresas}
          meta={`${empresasEmDia} em dia`}
          tone="blue"
        />
        <MetricCard
          icon={CheckSquare}
          label="Volume de tarefas"
          value={totalTarefas}
          meta={`${tarefasVencidas.length} vencidas`}
          tone="lime"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Riscos mapeados"
          value={totalRiscos}
          meta={`${riscosTipoData.filter((item) => item.value > 0).length} categorias ativas`}
          tone="rose"
        />
        <MetricCard
          icon={Shield}
          label="Alertas ativos"
          value={totalAlertas}
          meta={totalAlertas > 0 ? 'Leituras que exigem atencao' : 'Nenhum alerta em aberto'}
          tone="amber"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ReportChartCard eyebrow="Carteira" title="Conformidade das empresas" meta={`${totalEmpresas} empresas`}>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
            <div className="report-chart-frame">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Distribuicao</h3>
                <span className="text-sm text-slate-500">Base atual</span>
              </div>

              {totalEmpresas > 0 ? (
                <div className="relative h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={conformidadeData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={74}
                        outerRadius={102}
                        paddingAngle={3}
                        startAngle={90}
                        endAngle={-270}
                        stroke="rgba(248, 250, 252, 0.96)"
                        strokeWidth={6}
                      >
                        {conformidadeData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ReportChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="report-chart-center">
                    <div className="report-chart-center__content">
                      <strong className="report-chart-center__value">{totalEmpresas}</strong>
                      <span className="report-chart-center__label">empresas</span>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={Building2}
                  title="Sem carteira carregada"
                  description="Cadastre empresas para ativar a leitura de conformidade."
                />
              )}
            </div>

            <div className="report-chart-aside">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-400">Resumo</p>
                <p className="mt-2 text-sm text-slate-300">
                  Veja a composicao da carteira e qual parte exige aceleracao documental.
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {conformidadeData.map((item) => (
                  <div key={item.name} className="report-chart-aside__item">
                    <div className="flex items-center gap-3">
                      <span
                        className="report-legend-dot"
                        style={{
                          backgroundColor: item.color,
                          boxShadow: `0 0 0 5px ${item.color}1f`
                        }}
                      />
                      <div>
                        <p className="text-sm font-semibold text-white">{item.name}</p>
                        <p className="text-xs text-slate-400">{formatShare(item.value, totalEmpresas)} da carteira</p>
                      </div>
                    </div>
                    <strong className="text-xl text-white">{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ReportChartCard>

        <ReportChartCard eyebrow="Execucao" title="Status das tarefas" meta={`${totalTarefas} registros`}>
          <div className="report-chart-frame">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Fila por status</h3>
              <span className="text-sm text-slate-500">Operacao atual</span>
            </div>

            {totalTarefas > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tarefasStatusData} barSize={38} margin={{ top: 12, right: 10, left: -18, bottom: 8 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#dbe4ee" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={12} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(140, 240, 69, 0.08)' }} content={<ReportChartTooltip />} />
                    <Bar dataKey="value" radius={[14, 14, 0, 0]}>
                      {tarefasStatusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={CheckSquare}
                title="Sem tarefas registradas"
                description="A fila operacional aparecera aqui assim que novas tarefas forem cadastradas."
              />
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {tarefasStatusData.map((item) => (
              <div key={item.name} className="report-chart-stat">
                <div className="flex items-center gap-2">
                  <span
                    className="report-legend-dot"
                    style={{
                      backgroundColor: item.color,
                      boxShadow: `0 0 0 5px ${item.color}1c`
                    }}
                  />
                  <span className="text-sm text-slate-500">{item.name}</span>
                </div>
                <strong className="mt-3 block text-2xl text-slate-900">{item.value}</strong>
              </div>
            ))}
          </div>
        </ReportChartCard>

        <ReportChartCard eyebrow="Criticidade" title="Prioridade das tarefas" meta="Foco de execucao">
          <div className="report-chart-frame">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Priorizacao</h3>
              <span className="text-sm text-slate-500">Recorte tecnico</span>
            </div>

            {totalTarefas > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={tarefasPrioridadeData}
                    barSize={38}
                    margin={{ top: 12, right: 10, left: -18, bottom: 8 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#dbe4ee" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={12} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(140, 240, 69, 0.08)' }} content={<ReportChartTooltip />} />
                    <Bar dataKey="value" radius={[14, 14, 0, 0]}>
                      {tarefasPrioridadeData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={AlertTriangle}
                title="Sem prioridades para ler"
                description="Quando a operacao receber tarefas, a distribuicao por prioridade sera exibida aqui."
              />
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {tarefasPrioridadeData.map((item) => (
              <div key={item.name} className="report-chart-stat">
                <p className="text-sm text-slate-500">{item.name}</p>
                <strong className="mt-2 block text-2xl text-slate-900">{item.value}</strong>
                <span className="mt-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <span
                    className="report-legend-dot"
                    style={{
                      backgroundColor: item.color,
                      boxShadow: `0 0 0 5px ${item.color}1c`
                    }}
                  />
                  {formatShare(item.value, totalTarefas)}
                </span>
              </div>
            ))}
          </div>
        </ReportChartCard>

        <ReportChartCard eyebrow="Riscos" title="Tipos de riscos identificados" meta={`${totalRiscos} registros`}>
          <div className="report-chart-frame">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Categorias</h3>
              <span className="text-sm text-slate-500">Leitura por agente</span>
            </div>

            {totalRiscos > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={riscosTipoData}
                    layout="vertical"
                    barSize={22}
                    margin={{ top: 12, right: 12, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#dbe4ee" />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={92}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                    />
                    <Tooltip cursor={{ fill: 'rgba(14, 165, 233, 0.08)' }} content={<ReportChartTooltip />} />
                    <Bar dataKey="value" radius={[0, 14, 14, 0]}>
                      {riscosTipoData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={Shield}
                title="Sem riscos cadastrados"
                description="As categorias tecnicas aparecerao aqui quando houver inventario registrado."
              />
            )}
          </div>
        </ReportChartCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="panel-surface p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Ranking</p>
              <h2 className="mt-1 text-xl text-slate-900">Empresas com mais pendencias</h2>
            </div>
            <span className="status-badge status-warning">{empresasComPendencias.length} em foco</span>
          </div>

          <div className="space-y-3">
            {empresasComPendencias.length > 0 ? (
              empresasComPendencias.map((empresa, index) => (
                <div
                  key={empresa.id}
                  className="flex items-center justify-between rounded-[1.35rem] border border-slate-200/80 bg-white/84 px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                      <span className="text-sm font-semibold">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900">{empresa.nome}</p>
                      <p className="mt-1 text-sm text-slate-500">{empresa.cnpj}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <strong className="text-2xl text-amber-700">{empresa.pendencias}</strong>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400">pendencias</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={Building2}
                title="Sem pendencias relevantes"
                description="Nenhuma empresa possui acumulado operacional neste momento."
              />
            )}
          </div>
        </section>

        <section className="panel-surface p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Urgencia</p>
              <h2 className="mt-1 text-xl text-slate-900">Tarefas vencidas</h2>
            </div>
            <span className="status-badge status-danger">{tarefasVencidas.length} criticas</span>
          </div>

          <div className="space-y-3">
            {tarefasVencidas.length > 0 ? (
              tarefasVencidas.map((tarefa) => (
                <div
                  key={tarefa.id}
                  className="flex items-center justify-between rounded-[1.35rem] border border-rose-100 bg-rose-50/90 px-4 py-4"
                >
                  <div>
                    <p className="text-base font-semibold text-slate-900">{tarefa.titulo}</p>
                    <p className="mt-1 text-sm text-slate-500">{tarefa.empresaNome || 'Empresa nao informada'}</p>
                  </div>

                  <div className="text-right">
                    <strong className="text-sm text-rose-700">{formatDate(tarefa.dataVencimento)}</strong>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400">vencimento</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={CheckSquare}
                title="Nenhuma tarefa vencida"
                description="A fila operacional esta sem atrasos no momento."
              />
            )}
          </div>
        </section>
      </section>

      <section className="panel-surface p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Sintese</p>
            <h2 className="mt-1 text-xl text-slate-900">Visao geral de conformidade</h2>
          </div>
          <span className="status-badge status-info">Leitura consolidada</span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {complianceOverview.map((item) => (
            <div key={item.label} className="report-chart-stat">
              <div className="flex items-center justify-between gap-3">
                <p className="max-w-[14rem] text-sm font-semibold text-slate-600">{item.label}</p>
                <span
                  className="report-legend-dot"
                  style={{
                    backgroundColor: item.color,
                    boxShadow: `0 0 0 6px ${item.color}18`
                  }}
                />
              </div>
              <strong className="mt-4 block text-3xl text-slate-900">{item.value}</strong>
              <p className="mt-2 text-sm text-slate-500">{item.meta}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Relatorios;
