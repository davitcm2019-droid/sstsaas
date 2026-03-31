import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Clock,
  FileText,
  Mail,
  MapPin,
  Phone,
  Shield,
  User
} from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import { alertasService, empresasService, riscosService, tarefasService } from '../services/api';

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
      void loadEmpresaData();
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
      setTarefas(tarefasRes.data.data || []);
      setRiscos(riscosRes.data.data || []);
      setAlertas(alertasRes.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados da empresa:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Visao geral', icon: Building2 },
    { id: 'tarefas', name: 'Tarefas', icon: FileText },
    { id: 'riscos', name: 'Riscos', icon: AlertTriangle },
    { id: 'alertas', name: 'Alertas', icon: Clock }
  ];

  const summary = useMemo(
    () => ({
      tarefas: tarefas.length,
      riscos: riscos.length,
      alertas: alertas.length,
      pendencias: Number(empresa?.pendencias || 0)
    }),
    [alertas.length, empresa?.pendencias, riscos.length, tarefas.length]
  );

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'em_dia':
      case 'concluida':
        return <span className="status-badge status-success">Em dia</span>;
      case 'atrasado':
        return <span className="status-badge status-danger">Atrasado</span>;
      case 'pendente':
        return <span className="status-badge status-warning">Pendente</span>;
      default:
        return <span className="status-badge status-info">{status || 'Info'}</span>;
    }
  };

  const getPriorityBadge = (prioridade) => {
    switch (prioridade) {
      case 'alta':
        return <span className="status-badge status-danger">Alta</span>;
      case 'media':
        return <span className="status-badge status-warning">Media</span>;
      case 'baixa':
        return <span className="status-badge status-success">Baixa</span>;
      default:
        return <span className="status-badge status-info">{prioridade || 'Normal'}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-300 border-t-lime-500" />
      </div>
    );
  }

  if (!empresa) {
    return (
      <EmptyState
        icon={Building2}
        title="Empresa nao encontrada"
        description="O registro solicitado nao esta disponivel nesta base."
        action={
          <Link to="/empresas" className="btn-primary">
            Voltar para empresas
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Detalhe empresarial"
        title={empresa.nome}
        description="Leitura consolidada de cadastro, fila operacional e criticidade para a empresa selecionada."
        actions={
          <>
            <Link to="/empresas" className="btn-secondary">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
            <Link to={`/empresas/${empresa.id}/sst`} className="btn-primary">
              <Shield className="h-4 w-4" />
              Dashboard SST
            </Link>
          </>
        }
      >
        <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-slate-200">
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 text-lime-300" />
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">Endereco</p>
                  <p className="mt-2 text-sm text-white">{empresa.endereco || 'Nao informado'}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-slate-200">
              <div className="flex items-start gap-3">
                <Phone className="mt-1 h-5 w-5 text-lime-300" />
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">Contato</p>
                  <p className="mt-2 text-sm text-white">{empresa.telefone || 'Nao informado'}</p>
                  <p className="mt-1 text-sm text-slate-300">{empresa.email || 'Email nao informado'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-slate-200">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">Conformidade</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {getStatusBadge(empresa.conformidade)}
              <span className="status-badge status-warning">{summary.pendencias} pendencias</span>
              <span className="status-badge status-info">{summary.alertas} alertas</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-400">CNPJ</p>
                <p className="mt-1 text-base text-white">{empresa.cnpj || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Responsavel</p>
                <p className="mt-1 text-base text-white">{empresa.responsavel || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </PageHeader>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Building2} label="Status cadastral" value={empresa.status || '-'} meta={`Atualizado em ${formatDate(empresa.updatedAt)}`} tone="blue" />
        <MetricCard icon={FileText} label="Tarefas vinculadas" value={summary.tarefas} meta="Fila operacional da empresa" tone="amber" />
        <MetricCard icon={AlertTriangle} label="Riscos registrados" value={summary.riscos} meta="Mapeamento associado" tone="rose" />
        <MetricCard icon={Clock} label="Alertas ativos" value={summary.alertas} meta="Acompanhamento continuo" tone="lime" />
      </section>

      <section className="panel-surface p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Estrutura</p>
            <h2 className="mt-1 text-xl text-slate-900">Contexto tecnico da empresa</h2>
          </div>

          <div className="segmented-tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={activeTab === tab.id ? 'is-active' : ''}
                >
                  <Icon className="h-4 w-4" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'overview' ? (
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr_0.9fr]">
            <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/88 p-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Cadastro base</p>
              <div className="mt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-1 h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Email</p>
                    <p className="text-sm text-slate-500">{empresa.email || 'Nao informado'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="mt-1 h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Responsavel</p>
                    <p className="text-sm text-slate-500">{empresa.responsavel || 'Nao informado'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Endereco</p>
                    <p className="text-sm text-slate-500">{empresa.endereco || 'Nao informado'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/88 p-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Enquadramento</p>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">CNAE</span>
                  <strong className="text-slate-900">{empresa.cnae || '-'}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">Ramo</span>
                  <strong className="text-right text-slate-900">{empresa.ramo || '-'}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">Data de cadastro</span>
                  <strong className="text-slate-900">{formatDate(empresa.dataCadastro)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">Atualizado</span>
                  <strong className="text-slate-900">{formatDate(empresa.updatedAt)}</strong>
                </div>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-950 p-5 text-white">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">Pulso operacional</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="text-sm text-slate-400">Pendencias</span>
                  <p className="mt-2 text-3xl font-semibold text-white">{summary.pendencias}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="text-sm text-slate-400">Tarefas abertas</span>
                  <p className="mt-2 text-3xl font-semibold text-white">{summary.tarefas}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="text-sm text-slate-400">Riscos mapeados</span>
                  <p className="mt-2 text-3xl font-semibold text-white">{summary.riscos}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'tarefas' ? (
          tarefas.length > 0 ? (
            <div className="space-y-3">
              {tarefas.map((tarefa) => (
                <div key={tarefa.id} className="rounded-[1.4rem] border border-slate-200/80 bg-white/88 px-5 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{tarefa.titulo}</p>
                      <p className="mt-2 text-sm text-slate-500">{tarefa.descricao || 'Sem descricao complementar.'}</p>
                      <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                        <span>Vencimento: {formatDate(tarefa.dataVencimento)}</span>
                        <span>Responsavel: {tarefa.responsavel || '-'}</span>
                        <span>Categoria: {tarefa.categoria || '-'}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getPriorityBadge(tarefa.prioridade)}
                      {getStatusBadge(tarefa.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="Sem tarefas vinculadas"
              description="Esta empresa ainda nao possui tarefas operacionais registradas."
            />
          )
        ) : null}

        {activeTab === 'riscos' ? (
          riscos.length > 0 ? (
            <div className="space-y-3">
              {riscos.map((risco) => (
                <div key={risco.id} className="rounded-[1.4rem] border border-slate-200/80 bg-white/88 px-5 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{risco.descricao}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        Tipo {risco.tipo || '-'} | Probabilidade {risco.probabilidade || '-'} | Consequencia{' '}
                        {risco.consequencia || '-'}
                      </p>
                      <p className="mt-3 text-sm text-slate-600">
                        <strong>Medidas preventivas:</strong> {risco.medidasPreventivas || 'Nao informadas.'}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                        <span>Identificado em {formatDate(risco.dataIdentificacao)}</span>
                        <span>Responsavel: {risco.responsavel || '-'}</span>
                      </div>
                    </div>
                    {getPriorityBadge(risco.classificacao)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={AlertTriangle}
              title="Sem riscos cadastrados"
              description="Nenhum risco foi associado a esta empresa ate o momento."
            />
          )
        ) : null}

        {activeTab === 'alertas' ? (
          alertas.length > 0 ? (
            <div className="space-y-3">
              {alertas.map((alerta) => (
                <div key={alerta.id} className="rounded-[1.4rem] border border-slate-200/80 bg-white/88 px-5 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{alerta.titulo}</p>
                      <p className="mt-2 text-sm text-slate-500">{alerta.descricao || 'Sem descricao complementar.'}</p>
                      <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                        <span>Criado em {formatDate(alerta.dataCriacao)}</span>
                        <span>Tipo: {alerta.tipo || '-'}</span>
                      </div>
                    </div>
                    {getPriorityBadge(alerta.prioridade)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Clock}
              title="Sem alertas ativos"
              description="A empresa nao possui alertas ativos nesta leitura."
            />
          )
        ) : null}
      </section>
    </div>
  );
};

export default EmpresaDetalhes;
