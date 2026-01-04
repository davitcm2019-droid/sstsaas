import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  ClipboardCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Eye,
  Play
} from 'lucide-react';
import { checklistsService, empresasService } from '../services/api';
import FormModal from '../components/FormModal';
import ChecklistModal from '../components/ChecklistModal';
import { useAuth } from '../contexts/AuthContext';

const clampPercent = (value) => Math.max(0, Math.min(100, value));

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getSeverity = ({ hasInspection, nonConformities, pending, compliancePercent }) => {
  if (!hasInspection) return 'no_data';
  if (pending > 0) return 'pending';
  if (nonConformities === 0 && compliancePercent === 100) return 'ok';
  if (compliancePercent >= 80) return 'warning';
  return 'danger';
};

const SeverityBadge = ({ severity }) => {
  switch (severity) {
    case 'ok':
      return <span className="status-badge status-success">Em dia</span>;
    case 'warning':
      return <span className="status-badge status-warning">Atenção</span>;
    case 'danger':
      return <span className="status-badge status-danger">Crítico</span>;
    case 'pending':
      return <span className="status-badge status-warning">Pendente</span>;
    case 'no_data':
    default:
      return <span className="status-badge status-info">Sem inspeção</span>;
  }
};

const StackedBar = ({ okPercent, nonPercent, pendingPercent, unknownPercent }) => {
  const segments = [
    { percent: okPercent, className: 'bg-green-500' },
    { percent: nonPercent, className: 'bg-red-500' },
    { percent: pendingPercent, className: 'bg-yellow-400' },
    { percent: unknownPercent, className: 'bg-gray-300' }
  ].filter((segment) => segment.percent > 0);

  return (
    <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden flex">
      {segments.map((segment, index) => (
        <div
          key={`${segment.className}-${index}`}
          className={segment.className}
          style={{ width: `${segment.percent}%` }}
        />
      ))}
    </div>
  );
};

const EmpresaSstDashboard = () => {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const canInspect = hasPermission('tecnico_seguranca');

  const [empresa, setEmpresa] = useState(null);
  const [checklists, setChecklists] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsChecklist, setDetailsChecklist] = useState(null);
  const [onlyIssues, setOnlyIssues] = useState(false);

  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [inspectionChecklist, setInspectionChecklist] = useState(null);

  useEffect(() => {
    if (!id) return;
    void loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empresaRes, checklistsRes, inspectionsRes] = await Promise.all([
        empresasService.getById(id),
        checklistsService.getAll({ empresaId: id }),
        checklistsService.getInspections({ empresaId: id })
      ]);

      setEmpresa(empresaRes.data.data);
      setChecklists(checklistsRes.data.data || []);
      setInspections(inspectionsRes.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar dashboard SST da empresa:', error);
      setEmpresa(null);
      setChecklists([]);
      setInspections([]);
    } finally {
      setLoading(false);
    }
  };

  const latestInspectionByChecklistId = useMemo(() => {
    const map = new Map();
    inspections.forEach((inspection) => {
      const checklistId = inspection.checklistId;
      if (checklistId === undefined || checklistId === null) return;

      const previous = map.get(checklistId);
      const currentDate = new Date(inspection.date);
      const previousDate = previous ? new Date(previous.date) : null;
      const isCurrentValid = !Number.isNaN(currentDate.getTime());
      const isPreviousValid = previousDate && !Number.isNaN(previousDate.getTime());

      if (!previous) {
        map.set(checklistId, inspection);
        return;
      }

      if (isCurrentValid && (!isPreviousValid || currentDate > previousDate)) {
        map.set(checklistId, inspection);
      }
    });
    return map;
  }, [inspections]);

  const metricsByChecklist = useMemo(() => {
    return checklists.map((checklist) => {
      const inspection = latestInspectionByChecklistId.get(checklist.id) || null;
      const hasInspection = Boolean(inspection);

      const total = checklist.items?.length ?? 0;
      const itemsById = new Map((inspection?.items || []).map((item) => [String(item.itemId), item]));

      let ok = 0;
      let nonConformities = 0;
      let pending = 0;
      const unknown = !hasInspection ? total : 0;

      if (hasInspection) {
        checklist.items?.forEach((item) => {
          const answer = itemsById.get(String(item.id))?.answer;
          if (answer === true) ok += 1;
          else if (answer === false) nonConformities += 1;
          else pending += 1;
        });
      }

      const okPercent = total > 0 ? clampPercent((ok / total) * 100) : 0;
      const nonPercent = total > 0 ? clampPercent((nonConformities / total) * 100) : 0;
      const pendingPercent = total > 0 ? clampPercent((pending / total) * 100) : 0;
      const unknownPercent = total > 0 ? clampPercent((unknown / total) * 100) : 0;
      const compliancePercent = Math.round(okPercent);

      const severity = getSeverity({ hasInspection, nonConformities, pending, compliancePercent });

      return {
        checklist,
        inspection,
        hasInspection,
        total,
        ok,
        nonConformities,
        pending,
        unknown,
        okPercent,
        nonPercent,
        pendingPercent,
        unknownPercent,
        compliancePercent,
        actionsNeeded: nonConformities + pending + (hasInspection ? 0 : 1),
        severity
      };
    });
  }, [checklists, latestInspectionByChecklistId]);

  const summary = useMemo(() => {
    const applicable = metricsByChecklist.length;
    const inspected = metricsByChecklist.filter((item) => item.hasInspection).length;
    const noInspection = applicable - inspected;

    const totals = metricsByChecklist.reduce(
      (acc, item) => {
        if (!item.hasInspection) {
          acc.noInspection += 1;
          return acc;
        }
        acc.totalQuestions += item.total;
        acc.ok += item.ok;
        acc.nonConformities += item.nonConformities;
        acc.pending += item.pending;
        return acc;
      },
      { totalQuestions: 0, ok: 0, nonConformities: 0, pending: 0, noInspection: 0 }
    );

    const compliancePercent =
      totals.totalQuestions > 0 ? Math.round((totals.ok / totals.totalQuestions) * 100) : 0;
    const coveragePercent = applicable > 0 ? Math.round((inspected / applicable) * 100) : 0;

    const actionsNeeded = totals.nonConformities + totals.pending + noInspection;

    return {
      applicable,
      inspected,
      noInspection,
      compliancePercent,
      coveragePercent,
      nonConformities: totals.nonConformities,
      pending: totals.pending,
      actionsNeeded
    };
  }, [metricsByChecklist]);

  const priorityList = useMemo(() => {
    const list = [...metricsByChecklist];
    list.sort((a, b) => {
      if (b.actionsNeeded !== a.actionsNeeded) return b.actionsNeeded - a.actionsNeeded;
      return a.compliancePercent - b.compliancePercent;
    });
    return list.slice(0, 8);
  }, [metricsByChecklist]);

  const visibleMetrics = useMemo(() => {
    if (!onlyIssues) return metricsByChecklist;
    return metricsByChecklist.filter((item) => item.actionsNeeded > 0);
  }, [metricsByChecklist, onlyIssues]);

  const openDetails = (metric) => {
    setDetailsChecklist(metric);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setDetailsChecklist(null);
  };

  const openInspection = (metric) => {
    if (!canInspect) {
      window.alert('Você não tem permissão para iniciar inspeções.');
      return;
    }
    setInspectionChecklist(metric);
    setInspectionModalOpen(true);
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
        <p className="mt-1 text-sm text-gray-500">Não foi possível carregar os dados desta empresa.</p>
        <div className="mt-6">
          <Link to="/empresas" className="btn-primary">
            Voltar para Empresas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link to={`/empresas/${empresa.id}`} className="mr-4 p-2 text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard SST</h1>
            <p className="mt-1 text-sm text-gray-500">
              {empresa.nome} • CNAE {empresa.cnae || '-'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            className={`btn-secondary ${onlyIssues ? 'bg-yellow-50' : ''}`}
            onClick={() => setOnlyIssues((value) => !value)}
          >
            {onlyIssues ? 'Mostrar tudo' : 'Mostrar apenas pendências'}
          </button>
          {canInspect ? (
            <Link to="/checklists" className="btn-primary flex items-center justify-center">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Realizar inspeção
            </Link>
          ) : (
            <button className="btn-primary flex items-center justify-center opacity-60 cursor-not-allowed" disabled>
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Realizar inspeção
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Conformidade</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{summary.compliancePercent}%</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <ShieldCheck className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${summary.compliancePercent}%` }} />
            </div>
            <p className="mt-2 text-xs text-gray-500">Baseado nas últimas inspeções realizadas</p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Cobertura</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{summary.coveragePercent}%</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${summary.coveragePercent}%` }} />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {summary.inspected}/{summary.applicable} NRs com inspeção
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Não conformidades</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{summary.nonConformities}</p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">Respostas "Não" nas inspeções</p>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Pendências</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{summary.pending + summary.noInspection}</p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Itens sem resposta + {summary.noInspection} NR(s) sem inspeção
          </p>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Ações necessárias</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{summary.actionsNeeded}</p>
            </div>
            <div className="p-2 bg-primary-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-primary-600" />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">Correções + pendências + realizar inspeção</p>
        </div>
      </div>

      {/* Priority */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Prioridades</h2>
          <div className="space-y-3">
            {priorityList.map((item) => (
              <button
                key={item.checklist.id}
                onClick={() => openDetails(item)}
                className="w-full text-left rounded-lg border border-gray-200 p-3 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{item.checklist.category}</span>
                    <SeverityBadge severity={item.severity} />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{item.actionsNeeded}</span>
                </div>
                <div className="mt-2">
                  <StackedBar
                    okPercent={item.okPercent}
                    nonPercent={item.nonPercent}
                    pendingPercent={item.pendingPercent}
                    unknownPercent={item.unknownPercent}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {item.hasInspection ? `Última inspeção: ${formatDateTime(item.inspection?.date)}` : 'Sem inspeção'}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Atendimento por NR</h2>
              <p className="mt-1 text-sm text-gray-500">
                Barras representam: <span className="font-medium text-green-600">Sim</span>,{' '}
                <span className="font-medium text-red-600">Não</span>,{' '}
                <span className="font-medium text-yellow-600">Pendente</span>,{' '}
                <span className="font-medium text-gray-500">Sem inspeção</span>
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {visibleMetrics.map((metric) => (
              <div
                key={metric.checklist.id}
                className="rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{metric.checklist.category}</span>
                      <SeverityBadge severity={metric.severity} />
                      <span className="text-xs text-gray-500">• {metric.total} itens</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{metric.checklist.name}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="btn-secondary flex items-center" onClick={() => openDetails(metric)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Detalhes
                    </button>
                    <button
                      className={`btn-primary flex items-center ${
                        canInspect ? '' : 'opacity-60 cursor-not-allowed'
                      }`}
                      onClick={() => openInspection(metric)}
                      disabled={!canInspect}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Inspecionar
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <StackedBar
                    okPercent={metric.okPercent}
                    nonPercent={metric.nonPercent}
                    pendingPercent={metric.pendingPercent}
                    unknownPercent={metric.unknownPercent}
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <div className="text-sm">
                    <p className="text-gray-500">Conformidade</p>
                    <p className="font-semibold text-gray-900">{metric.compliancePercent}%</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-500">Sim</p>
                    <p className="font-semibold text-green-700">{metric.ok}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-500">Não</p>
                    <p className="font-semibold text-red-700">{metric.nonConformities}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-500">Pendentes</p>
                    <p className="font-semibold text-yellow-700">{metric.pending}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-500">Última</p>
                    <p className="font-semibold text-gray-900">{metric.hasInspection ? formatDateTime(metric.inspection?.date) : '-'}</p>
                  </div>
                </div>

                {metric.nonConformities > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{metric.nonConformities} não conformidade(s) exigem ação corretiva</span>
                  </div>
                )}

                {!metric.hasInspection && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>NR aplicável, mas ainda sem inspeção registrada para esta empresa.</span>
                  </div>
                )}
              </div>
            ))}

            {visibleMetrics.length === 0 && (
              <div className="text-center py-10">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Sem itens para mostrar</h3>
                <p className="mt-1 text-sm text-gray-500">Não há pendências no filtro atual.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details modal */}
      <FormModal
        isOpen={detailsOpen}
        onClose={closeDetails}
        title={detailsChecklist ? `${detailsChecklist.checklist.category} — Detalhes` : 'Detalhes'}
        showFooter={false}
        asForm={false}
      >
        {detailsChecklist && (
          <div className="space-y-5">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">{detailsChecklist.checklist.name}</p>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
                <div>
                  <p className="text-gray-500">Última inspeção</p>
                  <p className="font-semibold text-gray-900">
                    {detailsChecklist.hasInspection ? formatDateTime(detailsChecklist.inspection?.date) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Conformidade</p>
                  <p className="font-semibold text-gray-900">{detailsChecklist.compliancePercent}%</p>
                </div>
                <div>
                  <p className="text-gray-500">Não</p>
                  <p className="font-semibold text-red-700">{detailsChecklist.nonConformities}</p>
                </div>
                <div>
                  <p className="text-gray-500">Pendentes</p>
                  <p className="font-semibold text-yellow-700">{detailsChecklist.pending}</p>
                </div>
              </div>
              <div className="mt-3">
                <StackedBar
                  okPercent={detailsChecklist.okPercent}
                  nonPercent={detailsChecklist.nonPercent}
                  pendingPercent={detailsChecklist.pendingPercent}
                  unknownPercent={detailsChecklist.unknownPercent}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <SeverityBadge severity={detailsChecklist.severity} />
              <button
                className={`btn-primary flex items-center ${canInspect ? '' : 'opacity-60 cursor-not-allowed'}`}
                onClick={() => openInspection(detailsChecklist)}
                disabled={!canInspect}
              >
                <Play className="h-4 w-4 mr-2" />
                Inspecionar
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto space-y-3 pr-1">
              {detailsChecklist.checklist.items?.map((item, index) => {
                const answersById = new Map(
                  (detailsChecklist.inspection?.items || []).map((answer) => [String(answer.itemId), answer])
                );
                const answer = answersById.get(String(item.id))?.answer;

                const status =
                  answer === true ? 'ok' : answer === false ? 'non' : detailsChecklist.hasInspection ? 'pending' : 'unknown';

                if (onlyIssues && status === 'ok') return null;

                return (
                  <div key={item.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-900">
                        <span className="font-semibold">{index + 1}.</span> {item.question}
                      </p>
                      {status === 'ok' && (
                        <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                          Sim
                        </span>
                      )}
                      {status === 'non' && (
                        <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-1 rounded-full">
                          Não
                        </span>
                      )}
                      {status === 'pending' && (
                        <span className="text-xs font-semibold text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">
                          Pendente
                        </span>
                      )}
                      {status === 'unknown' && (
                        <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-full">
                          Sem inspeção
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </FormModal>

      {/* Inspection modal (reuse existing flow) */}
      <ChecklistModal
        isOpen={inspectionModalOpen}
        onClose={() => setInspectionModalOpen(false)}
        checklistId={inspectionChecklist?.checklist?.id ?? inspectionChecklist?.checklistId ?? inspectionChecklist?.id}
        empresaId={empresa.id}
        empresaNome={empresa.nome}
      />
    </div>
  );
};

export default EmpresaSstDashboard;
