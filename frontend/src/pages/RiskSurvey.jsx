import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Save, Trash2 } from 'lucide-react';

import FormModal from '../components/FormModal';
import EmptyState from '../components/ui/EmptyState';
import { empresasService, riskSurveyService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const EMPTY_ACTIVITY = {
  nome: '',
  processoMacro: '',
  descricaoTecnica: '',
  descricaoTarefa: '',
  frequencia: 'diaria'
};

const EMPTY_RISK = {
  riskType: 'fisico',
  riskLibraryId: '',
  tituloRisco: '',
  perigo: '',
  fonteGeradora: '',
  eventoPerigoso: '',
  danoPotencial: '',
  descricaoExposicao: '',
  frequenciaExposicao: 'frequente',
  habitualidade: 'habitual_intermitente',
  duracaoExposicao: '',
  viaExposicao: '',
  condicao: 'normal',
  numeroExpostos: 1,
  grupoHomogeneo: false,
  controlesExistentes: '',
  controlesEstruturados: {
    epc: [],
    epi: [],
    administrativos: [],
    organizacionais: [],
    emergencia: [],
    observacoes: '',
    eficacia: 'nao_avaliada'
  }
};

const EMPTY_ACTION_PLAN = {
  titulo: '',
  descricao: '',
  tipo: 'corretiva',
  prioridade: 'media',
  status: 'pendente',
  responsavel: '',
  prazo: '',
  criterioAceite: '',
  evidenciaEsperada: ''
};

const listToText = (items = []) => (Array.isArray(items) ? items.join('\n') : '');
const textToList = (value = '') =>
  String(value)
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const EMPTY_ASSESSMENT = {
  probabilidade: 1,
  severidade: 1,
  nivelConfianca: 'medio',
  justificativaTecnica: ''
};

const EMPTY_MEASUREMENT = {
  tipo: 'ruido',
  deviceId: '',
  valorMedido: '',
  unidade: '',
  tempoExposicao: '',
  metodoObservacao: '',
  dataMedicao: ''
};

const scoreLabel = (score) => {
  if (score <= 4) return 'baixo';
  if (score <= 9) return 'medio';
  if (score <= 16) return 'alto';
  return 'critico';
};

const badgeByClass = {
  baixo: 'bg-emerald-100 text-emerald-700',
  medio: 'bg-yellow-100 text-yellow-700',
  alto: 'bg-orange-100 text-orange-700',
  critico: 'bg-red-100 text-red-700',
  sem_avaliacao: 'bg-gray-100 text-gray-700'
};

const RiskSurvey = () => {
  const { hasPermission } = useAuth();
  const canConfigure = hasPermission('riskSurvey:configure');
  const canWrite = hasPermission('riskSurvey:write');
  const canFinalize = hasPermission('riskSurvey:finalize');
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [metadata, setMetadata] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [libraryItems, setLibraryItems] = useState([]);
  const [devices, setDevices] = useState([]);

  const [empresaId, setEmpresaId] = useState('');
  const [environments, setEnvironments] = useState([]);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('');
  const [cargos, setCargos] = useState([]);
  const [selectedCargoId, setSelectedCargoId] = useState('');

  const [activities, setActivities] = useState([]);
  const [selectedActivityId, setSelectedActivityId] = useState('');

  const [risks, setRisks] = useState([]);
  const [selectedRiskId, setSelectedRiskId] = useState('');
  const [riskDetail, setRiskDetail] = useState(null);
  const [tab, setTab] = useState('identificacao');

  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [riskModalOpen, setRiskModalOpen] = useState(false);

  const [activityForm, setActivityForm] = useState(EMPTY_ACTIVITY);
  const [riskForm, setRiskForm] = useState(EMPTY_RISK);
  const [riskEditForm, setRiskEditForm] = useState(EMPTY_RISK);
  const [assessmentForm, setAssessmentForm] = useState(EMPTY_ASSESSMENT);
  const [measurementForm, setMeasurementForm] = useState(EMPTY_MEASUREMENT);
  const [actionPlanForm, setActionPlanForm] = useState(EMPTY_ACTION_PLAN);

  const selectedEnvironment = useMemo(
    () => environments.find((item) => String(item.id) === String(selectedEnvironmentId)) || null,
    [environments, selectedEnvironmentId]
  );

  const selectedCycle = useMemo(
    () => cycles.find((item) => String(item.id) === String(selectedCycleId)) || null,
    [cycles, selectedCycleId]
  );

  const companyMap = useMemo(
    () => new Map(empresas.map((empresa) => [String(empresa.id), empresa.nome])),
    [empresas]
  );

  const filteredLibrary = useMemo(
    () => libraryItems.filter((item) => item.tipo === riskForm.riskType && item.ativo),
    [libraryItems, riskForm.riskType]
  );

  const selectedLibraryItem = useMemo(
    () => filteredLibrary.find((item) => String(item.id) === String(riskForm.riskLibraryId)) || null,
    [filteredLibrary, riskForm.riskLibraryId]
  );
  const isManualRisk = !riskForm.riskLibraryId;

  const isEnvironmentFinalized = selectedEnvironment?.surveyStatus === 'finalized';
  const computedScore = Number(assessmentForm.probabilidade) * Number(assessmentForm.severidade);
  const computedClass = scoreLabel(computedScore || 1);

  const loadDashboard = async () => {
    const response = await riskSurveyService.getDashboard(
      selectedCycleId ? { cycleId: selectedCycleId } : empresaId ? { empresaId } : {}
    );
    setDashboard(response.data.data || null);
  };

  const loadBase = async () => {
    const [metadataRes, companiesRes, cyclesRes, libraryRes, devicesRes] = await Promise.all([
      riskSurveyService.getMetadata(),
      empresasService.getAll(),
      riskSurveyService.listCycles(),
      riskSurveyService.listLibrary({ ativo: true }),
      riskSurveyService.listDevices({ ativo: true })
    ]);

    const cycleRows = cyclesRes.data.data || [];
    const requestedCycleId = searchParams.get('cycleId');
    const preferredCycle =
      cycleRows.find((item) => String(item.id) === String(requestedCycleId)) ||
      cycleRows.find((item) => item.status === 'draft' || item.status === 'in_review') ||
      cycleRows[0] ||
      null;

    setMetadata(metadataRes.data.data || null);
    setEmpresas(companiesRes.data.data || []);
    setCycles(cycleRows);
    setSelectedCycleId(preferredCycle?.id || '');
    setEmpresaId(preferredCycle?.empresaId || '');
    setLibraryItems(libraryRes.data.data || []);
    setDevices(devicesRes.data.data || []);
  };

  const loadEnvironments = async () => {
    if (!selectedCycleId) {
      setEnvironments([]);
      setSelectedEnvironmentId('');
      return;
    }

    const response = await riskSurveyService.listEnvironments({ cycleId: selectedCycleId });
    const rows = response.data.data || [];
    setEnvironments(rows);
    if (!rows.some((item) => String(item.id) === String(selectedEnvironmentId))) {
      setSelectedEnvironmentId(rows[0]?.id || '');
    }
  };

  const loadCargos = async () => {
    if (!selectedEnvironmentId) {
      setCargos([]);
      setSelectedCargoId('');
      return;
    }
    const response = await riskSurveyService.listCargosByEnvironment(selectedEnvironmentId);
    const rows = response.data.data || [];
    setCargos(rows);
    if (!rows.some((item) => String(item.id) === String(selectedCargoId))) {
      setSelectedCargoId(rows[0]?.id || '');
    }
  };

  const loadActivities = async () => {
    if (!selectedCargoId) {
      setActivities([]);
      setSelectedActivityId('');
      return;
    }
    const response = await riskSurveyService.listActivitiesByCargo(selectedCargoId);
    const rows = response.data.data || [];
    setActivities(rows);
    if (!rows.some((item) => String(item.id) === String(selectedActivityId))) {
      setSelectedActivityId(rows[0]?.id || '');
    }
  };

  const loadRisks = async () => {
    if (!selectedActivityId) {
      setRisks([]);
      setSelectedRiskId('');
      return;
    }
    const response = await riskSurveyService.listRisksByActivity(selectedActivityId);
    const rows = response.data.data || [];
    setRisks(rows);
    if (!rows.some((item) => String(item.id) === String(selectedRiskId))) {
      setSelectedRiskId(rows[0]?.id || '');
    }
  };

  const loadRiskDetail = async () => {
    if (!selectedRiskId) {
      setRiskDetail(null);
      setRiskEditForm(EMPTY_RISK);
      setAssessmentForm(EMPTY_ASSESSMENT);
      setMeasurementForm(EMPTY_MEASUREMENT);
      setActionPlanForm(EMPTY_ACTION_PLAN);
      return;
    }

    const response = await riskSurveyService.getRiskDetail(selectedRiskId);
    const detail = response.data.data || null;
    setRiskDetail(detail);

    if (detail?.risk) {
      setRiskEditForm({
        riskType: detail.risk.riskType || detail.risk.categoriaAgente || 'fisico',
        riskLibraryId: detail.risk.riskLibraryId || '',
        tituloRisco: detail.risk.titulo || '',
        perigo: detail.risk.perigo || '',
        fonteGeradora: detail.risk.fonteGeradora || '',
        eventoPerigoso: detail.risk.eventoPerigoso || '',
        danoPotencial: detail.risk.danoPotencial || '',
        descricaoExposicao: detail.risk.descricaoExposicao || '',
        frequenciaExposicao: detail.risk.frequenciaExposicao || 'frequente',
        habitualidade: detail.risk.habitualidade || 'habitual_intermitente',
        duracaoExposicao: detail.risk.duracaoExposicao || '',
        viaExposicao: detail.risk.viaExposicao || '',
        condicao: detail.risk.condicao || 'normal',
        numeroExpostos: detail.risk.numeroExpostos || 1,
        grupoHomogeneo: Boolean(detail.risk.grupoHomogeneo),
        controlesExistentes: detail.risk.controlesExistentes || '',
        controlesEstruturados: {
          epc: detail.risk.controlesEstruturados?.epc || [],
          epi: detail.risk.controlesEstruturados?.epi || [],
          administrativos: detail.risk.controlesEstruturados?.administrativos || [],
          organizacionais: detail.risk.controlesEstruturados?.organizacionais || [],
          emergencia: detail.risk.controlesEstruturados?.emergencia || [],
          observacoes: detail.risk.controlesEstruturados?.observacoes || '',
          eficacia: detail.risk.controlesEstruturados?.eficacia || 'nao_avaliada'
        }
      });
    } else {
      setRiskEditForm(EMPTY_RISK);
    }

    if (detail?.assessment) {
      setAssessmentForm({
        probabilidade: detail.assessment.probabilidade,
        severidade: detail.assessment.severidade,
        nivelConfianca: detail.assessment.nivelConfianca,
        justificativaTecnica: detail.assessment.justificativaTecnica || ''
      });
    } else {
      setAssessmentForm(EMPTY_ASSESSMENT);
    }

    setMeasurementForm((prev) => ({
      ...prev,
      deviceId: detail?.measurements?.[0]?.deviceId || prev.deviceId || ''
    }));
    setActionPlanForm((prev) => ({ ...prev, responsavel: prev.responsavel || selectedCycle?.responsibleTechnical?.nome || '' }));
  };

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError('');
        await loadBase();
      } catch (err) {
        setError(err?.response?.data?.message || 'Erro ao carregar módulo de riscos.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedCycleId) {
      setDashboard(null);
      setEnvironments([]);
      setSelectedEnvironmentId('');
      return;
    }

    if (selectedCycle?.empresaId) {
      setEmpresaId(selectedCycle.empresaId);
    }
    setSearchParams({ cycleId: selectedCycleId });
    void (async () => {
      try {
        await Promise.all([loadEnvironments(), loadDashboard()]);
      } catch (err) {
        setError(err?.response?.data?.message || 'Erro ao atualizar o ciclo selecionado.');
      }
    })();
  }, [selectedCycleId]);

  useEffect(() => {
    void loadCargos();
  }, [selectedEnvironmentId]);

  useEffect(() => {
    void loadActivities();
  }, [selectedCargoId]);

  useEffect(() => {
    void loadRisks();
  }, [selectedActivityId]);

  useEffect(() => {
    void loadRiskDetail();
  }, [selectedRiskId]);

  const onCreateActivity = async (event) => {
    event.preventDefault();
    if (!selectedEnvironmentId || !selectedCargoId) return;

    try {
      await riskSurveyService.createActivity({
        environmentId: selectedEnvironmentId,
        cargoId: selectedCargoId,
        ...activityForm
      });
      setActivityModalOpen(false);
      setActivityForm(EMPTY_ACTIVITY);
      await Promise.all([loadActivities(), loadDashboard()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao criar atividade.');
    }
  };

  const onCreateRisk = async (event) => {
    event.preventDefault();
    if (!selectedActivityId) return;

    try {
      if (
        isManualRisk &&
        (!riskForm.tituloRisco || !riskForm.perigo || !riskForm.fonteGeradora || !riskForm.eventoPerigoso || !riskForm.danoPotencial || !riskForm.descricaoExposicao)
      ) {
        setError('Preencha título, perigo, fonte geradora, evento perigoso, dano potencial e exposição para cadastrar um novo risco.');
        return;
      }

      await riskSurveyService.createRisk({
        activityId: selectedActivityId,
        riskType: riskForm.riskType,
        riskLibraryId: riskForm.riskLibraryId,
        tituloRisco: riskForm.tituloRisco,
        perigo: riskForm.perigo,
        fonteGeradora: riskForm.fonteGeradora,
        eventoPerigoso: riskForm.eventoPerigoso,
        danoPotencial: riskForm.danoPotencial,
        descricaoExposicao: riskForm.descricaoExposicao,
        frequenciaExposicao: riskForm.frequenciaExposicao,
        habitualidade: riskForm.habitualidade,
        duracaoExposicao: riskForm.duracaoExposicao,
        viaExposicao: riskForm.viaExposicao,
        condicao: riskForm.condicao,
        numeroExpostos: riskForm.numeroExpostos,
        grupoHomogeneo: riskForm.grupoHomogeneo,
        controlesExistentes: riskForm.controlesExistentes,
        controlesEstruturados: riskForm.controlesEstruturados
      });
      setRiskModalOpen(false);
      setRiskForm(EMPTY_RISK);
      await Promise.all([loadRisks(), loadDashboard()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao criar risco.');
    }
  };

  const onSaveRiskProfile = async (event) => {
    event.preventDefault();
    if (!riskDetail?.risk?.id) return;

    try {
      await riskSurveyService.updateRisk(riskDetail.risk.id, {
        titulo: riskEditForm.tituloRisco,
        perigo: riskEditForm.perigo,
        fonteGeradora: riskEditForm.fonteGeradora,
        eventoPerigoso: riskEditForm.eventoPerigoso,
        danoPotencial: riskEditForm.danoPotencial,
        descricaoExposicao: riskEditForm.descricaoExposicao,
        frequenciaExposicao: riskEditForm.frequenciaExposicao,
        habitualidade: riskEditForm.habitualidade,
        duracaoExposicao: riskEditForm.duracaoExposicao,
        viaExposicao: riskEditForm.viaExposicao,
        categoriaAgente: riskEditForm.riskType,
        condicao: riskEditForm.condicao,
        numeroExpostos: riskEditForm.numeroExpostos,
        grupoHomogeneo: riskEditForm.grupoHomogeneo,
        controlesExistentes: riskEditForm.controlesExistentes
      });
      await Promise.all([loadRiskDetail(), loadRisks(), loadDashboard()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao atualizar identificação do risco.');
    }
  };

  const onSaveControls = async (event) => {
    event.preventDefault();
    if (!riskDetail?.risk?.id) return;

    try {
      await riskSurveyService.updateRiskControls(riskDetail.risk.id, {
        epc: riskEditForm.controlesEstruturados.epc,
        epi: riskEditForm.controlesEstruturados.epi,
        administrativos: riskEditForm.controlesEstruturados.administrativos,
        organizacionais: riskEditForm.controlesEstruturados.organizacionais,
        emergencia: riskEditForm.controlesEstruturados.emergencia,
        observacoes: riskEditForm.controlesEstruturados.observacoes,
        eficacia: riskEditForm.controlesEstruturados.eficacia,
        controlesExistentes: riskEditForm.controlesExistentes
      });
      await Promise.all([loadRiskDetail(), loadDashboard()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao atualizar controles do risco.');
    }
  };

  const onCreateActionPlanItem = async (event) => {
    event.preventDefault();
    if (!riskDetail?.risk?.id) return;

    try {
      await riskSurveyService.createRiskActionPlanItem(riskDetail.risk.id, actionPlanForm);
      setActionPlanForm((prev) => ({ ...EMPTY_ACTION_PLAN, responsavel: prev.responsavel || selectedCycle?.responsibleTechnical?.nome || '' }));
      await Promise.all([loadRiskDetail(), loadDashboard()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao criar plano de ação para o risco.');
    }
  };

  const onDeleteActionPlanItem = async (itemId) => {
    try {
      await riskSurveyService.deleteRiskActionPlanItem(itemId);
      await Promise.all([loadRiskDetail(), loadDashboard()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao remover plano de ação do risco.');
    }
  };

  const onSaveAssessment = async (event) => {
    event.preventDefault();
    if (!riskDetail?.risk?.id) return;

    try {
      await riskSurveyService.upsertAssessment(riskDetail.risk.id, assessmentForm);
      await Promise.all([loadRiskDetail(), loadDashboard()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao salvar avaliação qualitativa.');
    }
  };

  const onCreateMeasurement = async (event) => {
    event.preventDefault();
    if (!riskDetail?.risk?.id) return;

    try {
      await riskSurveyService.createMeasurement(riskDetail.risk.id, measurementForm);
      setMeasurementForm((prev) => ({ ...EMPTY_MEASUREMENT, deviceId: prev.deviceId }));
      await Promise.all([loadRiskDetail(), loadDashboard()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao registrar avaliação quantitativa.');
    }
  };

  const onDeleteMeasurement = async (measurementId) => {
    try {
      await riskSurveyService.deleteMeasurement(measurementId);
      await Promise.all([loadRiskDetail(), loadDashboard()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao remover medição.');
    }
  };

  const onFinalizeEnvironment = async () => {
    if (!selectedEnvironmentId) return;
    try {
      await riskSurveyService.finalizeEnvironment(selectedEnvironmentId);
      await Promise.all([loadEnvironments(), loadRiskDetail(), loadDashboard()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao finalizar levantamento.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!cycles.length) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Levantamento de Riscos Ocupacionais</h1>
            <p className="text-sm text-gray-500">A execução do fluxo agora depende de um ciclo ativo.</p>
          </div>
          <Link className="btn-secondary" to="/levantamento-riscos">
            Ciclos v2
          </Link>
        </div>

        <div className="card">
          <EmptyState
            icon={Plus}
            title="Nenhum ciclo disponivel"
            description="Crie um ciclo de levantamento para estruturar ambientes, atividades e riscos dentro de um escopo controlado."
            action={
              <Link className="btn-primary" to="/levantamento-riscos">
                Criar ciclo
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Levantamento de Riscos Ocupacionais</h1>
          <p className="text-sm text-gray-500">Fluxo obrigatório: Ciclo ? Ambiente ? Cargo ? Atividade ? Risco.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input-field min-w-[280px]" value={selectedCycleId} onChange={(event) => setSelectedCycleId(event.target.value)}>
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {(cycle.title || `Levantamento ${cycle.estabelecimento}`)} • v{cycle.version}
              </option>
            ))}
          </select>
          <Link className="btn-secondary" to="/levantamento-riscos">Ciclos v2</Link>
          <Link className="btn-secondary" to={selectedCycleId ? `/levantamento-riscos/ambientes?cycleId=${selectedCycleId}` : '/levantamento-riscos/ambientes'}>Caracterização de Ambientes</Link>
          {canConfigure && (
            <button className="btn-secondary" onClick={() => riskSurveyService.runLegacyMigration().then(() => loadDashboard())}>
              Migrar legado
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {selectedCycle ? (
        <div className="card flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Ciclo em execucao</div>
            <div className="mt-2 text-lg font-semibold text-slate-900">{selectedCycle.title || `Levantamento ${selectedCycle.estabelecimento}`}</div>
            <div className="mt-1 text-sm text-slate-600">
              {companyMap.get(String(selectedCycle.empresaId)) || 'Empresa vinculada'} • {selectedCycle.unidade} / {selectedCycle.estabelecimento}
            </div>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
            Responsável técnico: {selectedCycle.responsibleTechnical?.nome || 'Não informado'}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <div className="card py-4 text-center"><div className="text-xl font-bold">{dashboard?.counts?.ambientes || 0}</div><div className="text-xs text-gray-500">Ambientes</div></div>
        <div className="card py-4 text-center"><div className="text-xl font-bold">{dashboard?.counts?.cargos || 0}</div><div className="text-xs text-gray-500">Cargos</div></div>
        <div className="card py-4 text-center"><div className="text-xl font-bold">{dashboard?.counts?.atividades || 0}</div><div className="text-xs text-gray-500">Atividades</div></div>
        <div className="card py-4 text-center"><div className="text-xl font-bold">{dashboard?.counts?.riscos || 0}</div><div className="text-xs text-gray-500">Riscos</div></div>
        <div className="card py-4 text-center"><div className="text-xl font-bold text-red-600">{dashboard?.counts?.acoesNecessarias || 0}</div><div className="text-xs text-gray-500">Ações</div></div>
        <div className="card py-4 text-center"><div className="text-xl font-bold">{dashboard?.counts?.avaliacoes || 0}</div><div className="text-xs text-gray-500">Qualitativas</div></div>
        <div className="card py-4 text-center"><div className="text-xl font-bold">{dashboard?.counts?.medicoes || 0}</div><div className="text-xs text-gray-500">Quantitativas</div></div>
        <div className="card py-4 text-center"><div className="text-xl font-bold">{dashboard?.counts?.riscosMigrados || 0}</div><div className="text-xs text-gray-500">Migrados</div></div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="card">
          <div className="mb-2 text-sm font-semibold text-gray-700">Etapa 1/2: Setor e Ambiente</div>
          <div className="space-y-2">
            {environments.map((item) => (
              <button key={item.id} className={`w-full rounded-lg border p-3 text-left ${String(item.id) === String(selectedEnvironmentId) ? 'border-primary-400 bg-primary-50' : 'border-gray-200'}`} onClick={() => setSelectedEnvironmentId(item.id)}>
                <div className="text-sm font-semibold">{item.setor}</div>
                <div className="text-xs text-gray-500">{item.nome} • {item.unidade} • {item.estabelecimento || 'Estabelecimento'}</div>
              </button>
            ))}
            {!environments.length && <div className="text-sm text-gray-500">Cadastre ambientes na tela de caracterização para este ciclo.</div>}
          </div>
          {selectedEnvironment && canFinalize && !isEnvironmentFinalized && (
            <button className="btn-secondary mt-3 w-full" onClick={onFinalizeEnvironment}>Finalizar levantamento</button>
          )}
        </div>

        <div className="card">
          <div className="mb-2 text-sm font-semibold text-gray-700">Etapa 3: Cargo</div>
          <div className="space-y-2">
            {cargos.map((cargo) => (
              <button key={cargo.id} className={`w-full rounded-lg border p-3 text-left ${String(cargo.id) === String(selectedCargoId) ? 'border-primary-400 bg-primary-50' : 'border-gray-200'}`} onClick={() => setSelectedCargoId(cargo.id)}>
                <div className="text-sm font-semibold">{cargo.nome}</div>
                <div className="text-xs text-gray-500">{cargo.descricao || 'Sem descrição'}</div>
              </button>
            ))}
            {!cargos.length && <div className="text-sm text-gray-500">Nenhum cargo para o ambiente selecionado.</div>}
          </div>
        </div>

        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-700">Etapa 4: Atividade</div>
            {canWrite && <button className="btn-secondary px-2 py-1 text-xs" disabled={!selectedCargoId || isEnvironmentFinalized} onClick={() => setActivityModalOpen(true)}><Plus className="mr-1 inline h-3 w-3" />Nova</button>}
          </div>
          <div className="space-y-2">
            {activities.map((activity) => (
              <button key={activity.id} className={`w-full rounded-lg border p-3 text-left ${String(activity.id) === String(selectedActivityId) ? 'border-primary-400 bg-primary-50' : 'border-gray-200'}`} onClick={() => setSelectedActivityId(activity.id)}>
                <div className="text-sm font-semibold">{activity.nome}</div>
                <div className="text-xs text-gray-500">{activity.processoMacro}</div>
              </button>
            ))}
            {!activities.length && <div className="text-sm text-gray-500">Nenhuma atividade cadastrada para o cargo.</div>}
          </div>
        </div>

        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-700">Etapa 5: Risco</div>
            {canWrite && <button className="btn-secondary px-2 py-1 text-xs" disabled={!selectedActivityId || isEnvironmentFinalized} onClick={() => setRiskModalOpen(true)}><Plus className="mr-1 inline h-3 w-3" />Novo</button>}
          </div>
          <div className="space-y-2">
            {risks.map((risk) => (
              <button key={risk.id} className={`w-full rounded-lg border p-3 text-left ${String(risk.id) === String(selectedRiskId) ? 'border-primary-400 bg-primary-50' : 'border-gray-200'}`} onClick={() => setSelectedRiskId(risk.id)}>
                <div className="text-sm font-semibold">{risk.perigo}</div>
                <div className="text-xs text-gray-500">{risk.riskType || risk.categoriaAgente}</div>
              </button>
            ))}
            {!risks.length && <div className="text-sm text-gray-500">Nenhum risco cadastrado para a atividade.</div>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
          <button className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'identificacao' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`} onClick={() => setTab('identificacao')}>Identificação</button>
          <button className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'avaliacao' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`} onClick={() => setTab('avaliacao')}>Avaliação Qualitativa</button>
          <button className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'medicoes' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`} onClick={() => setTab('medicoes')}>Avaliação Quantitativa</button>
          <button className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'controles' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`} onClick={() => setTab('controles')}>Controles</button>
          <button className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'plano' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`} onClick={() => setTab('plano')}>Plano de Ação</button>
          {isEnvironmentFinalized && <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white">Snapshot read-only ativo</span>}
        </div>

        {!riskDetail?.risk && <div className="text-sm text-gray-500">Selecione um risco para visualizar detalhes.</div>}

        {riskDetail?.risk && tab === 'identificacao' && (
          <form className="space-y-4" onSubmit={onSaveRiskProfile}>
            <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4 md:grid-cols-3">
              <div><span className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Ambiente</span><div className="mt-1 text-sm font-semibold text-gray-900">{riskDetail.environment?.nome || '-'}</div></div>
              <div><span className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Cargo</span><div className="mt-1 text-sm font-semibold text-gray-900">{riskDetail.cargo?.nome || '-'}</div></div>
              <div><span className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Atividade</span><div className="mt-1 text-sm font-semibold text-gray-900">{riskDetail.activity?.nome || '-'}</div></div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input className="input-field" placeholder="Título do risco" value={riskEditForm.tituloRisco} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, tituloRisco: event.target.value }))} />
              <select className="input-field" value={riskEditForm.riskType} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, riskType: event.target.value }))}>
                {metadata?.riskTypes?.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <textarea className="input-field md:col-span-2" placeholder="Perigo" value={riskEditForm.perigo} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, perigo: event.target.value }))} />
              <textarea className="input-field" placeholder="Fonte geradora" value={riskEditForm.fonteGeradora} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, fonteGeradora: event.target.value }))} />
              <textarea className="input-field" placeholder="Evento perigoso" value={riskEditForm.eventoPerigoso} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, eventoPerigoso: event.target.value }))} />
              <textarea className="input-field md:col-span-2" placeholder="Dano potencial" value={riskEditForm.danoPotencial} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, danoPotencial: event.target.value }))} />
              <textarea className="input-field md:col-span-2" placeholder="Descrição da exposição" value={riskEditForm.descricaoExposicao} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, descricaoExposicao: event.target.value }))} />
              <select className="input-field" value={riskEditForm.frequenciaExposicao} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, frequenciaExposicao: event.target.value }))}>
                {metadata?.exposureFrequencyTypes?.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select className="input-field" value={riskEditForm.habitualidade} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, habitualidade: event.target.value }))}>
                {metadata?.exposureHabitualityTypes?.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <input className="input-field" placeholder="Duração da exposição" value={riskEditForm.duracaoExposicao} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, duracaoExposicao: event.target.value }))} />
              <input className="input-field" placeholder="Via de exposição" value={riskEditForm.viaExposicao} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, viaExposicao: event.target.value }))} />
              <select className="input-field" value={riskEditForm.condicao} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, condicao: event.target.value }))}>
                {metadata?.riskConditionTypes?.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <input type="number" min="1" className="input-field" value={riskEditForm.numeroExpostos} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, numeroExpostos: Number(event.target.value) || 1 }))} />
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 md:col-span-2">
                <input type="checkbox" checked={riskEditForm.grupoHomogeneo} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, grupoHomogeneo: event.target.checked }))} />
                Grupo homogêneo de exposição
              </label>
            </div>
            {canWrite && !isEnvironmentFinalized && <button className="btn-primary" type="submit"><Save className="mr-2 inline h-4 w-4" />Salvar identificação</button>}
          </form>
        )}

        {riskDetail?.risk && tab === 'avaliacao' && (
          <form className="space-y-4" onSubmit={onSaveAssessment}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <input type="number" min="1" max="5" className="input-field" value={assessmentForm.probabilidade} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setAssessmentForm((prev) => ({ ...prev, probabilidade: Number(event.target.value) }))} />
              <input type="number" min="1" max="5" className="input-field" value={assessmentForm.severidade} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setAssessmentForm((prev) => ({ ...prev, severidade: Number(event.target.value) }))} />
              <select className="input-field" value={assessmentForm.nivelConfianca} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setAssessmentForm((prev) => ({ ...prev, nivelConfianca: event.target.value }))}>
                {metadata?.confidenceLevels?.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <div className="input-field flex items-center justify-between bg-gray-50"><span>Score {computedScore}</span><span className={`rounded-full px-2 py-0.5 text-xs ${badgeByClass[computedClass]}`}>{computedClass}</span></div>
            </div>
            <textarea className="input-field min-h-[100px]" value={assessmentForm.justificativaTecnica} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setAssessmentForm((prev) => ({ ...prev, justificativaTecnica: event.target.value }))} placeholder="Justificativa técnica (obrigatória para alto/crítico)" />
            {canWrite && !isEnvironmentFinalized && <button className="btn-primary" type="submit"><Save className="mr-2 inline h-4 w-4" />Salvar qualitativa</button>}
          </form>
        )}

        {riskDetail?.risk && tab === 'medicoes' && (
          <div className="space-y-4">
            {canWrite && !isEnvironmentFinalized && (
              <form className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-3" onSubmit={onCreateMeasurement}>
                <select className="input-field" value={measurementForm.tipo} onChange={(event) => setMeasurementForm((prev) => ({ ...prev, tipo: event.target.value }))}>
                  {metadata?.measurementTypes?.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select className="input-field" value={measurementForm.deviceId} onChange={(event) => setMeasurementForm((prev) => ({ ...prev, deviceId: event.target.value }))} required>
                  <option value="">Selecione o dispositivo</option>
                  {devices.map((device) => <option key={device.id} value={device.id}>{device.serialNumber} • {device.marca} {device.modelo}</option>)}
                </select>
                <input className="input-field" type="number" step="any" placeholder="Valor medido" value={measurementForm.valorMedido} onChange={(event) => setMeasurementForm((prev) => ({ ...prev, valorMedido: event.target.value }))} required />
                <input className="input-field" placeholder="Unidade" value={measurementForm.unidade} onChange={(event) => setMeasurementForm((prev) => ({ ...prev, unidade: event.target.value }))} required />
                <input className="input-field" placeholder="Tempo de exposição" value={measurementForm.tempoExposicao} onChange={(event) => setMeasurementForm((prev) => ({ ...prev, tempoExposicao: event.target.value }))} />
                <input className="input-field" type="date" value={measurementForm.dataMedicao} onChange={(event) => setMeasurementForm((prev) => ({ ...prev, dataMedicao: event.target.value }))} required />
                <textarea className="input-field md:col-span-3" placeholder="Método / observação" value={measurementForm.metodoObservacao} onChange={(event) => setMeasurementForm((prev) => ({ ...prev, metodoObservacao: event.target.value }))} />
                <div className="md:col-span-3"><button className="btn-primary" type="submit">Registrar quantitativa</button></div>
              </form>
            )}

            <div className="space-y-2">
              {riskDetail.measurements?.map((measurement) => (
                <div key={measurement.id} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{measurement.tipo} • {measurement.valorMedido} {measurement.unidade}</div>
                    <div className="text-xs text-gray-500">{new Date(measurement.dataMedicao).toLocaleDateString('pt-BR')} • {measurement.device?.serialNumber || 'Sem dispositivo'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs ${measurement.comparacao === 'acima_referencia' ? 'bg-red-100 text-red-700' : measurement.comparacao === 'proximo_limite' ? 'bg-yellow-100 text-yellow-700' : measurement.comparacao === 'abaixo_referencia' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>{measurement.comparacao}</span>
                    {canWrite && !isEnvironmentFinalized && (
                      <button type="button" className="rounded-md border border-red-200 p-1 text-red-600" onClick={() => onDeleteMeasurement(measurement.id)}><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                </div>
              ))}
              {!riskDetail.measurements?.length && <div className="text-sm text-gray-500">Nenhuma avaliação quantitativa registrada.</div>}
            </div>
          </div>
        )}

        {riskDetail?.risk && tab === 'controles' && (
          <form className="space-y-4" onSubmit={onSaveControls}>
            <textarea className="input-field min-h-[100px]" placeholder="Controles existentes (resumo livre)" value={riskEditForm.controlesExistentes} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, controlesExistentes: event.target.value }))} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <textarea className="input-field min-h-[120px]" placeholder="EPCs, um por linha" value={listToText(riskEditForm.controlesEstruturados.epc)} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, controlesEstruturados: { ...prev.controlesEstruturados, epc: textToList(event.target.value) } }))} />
              <textarea className="input-field min-h-[120px]" placeholder="EPIs, um por linha" value={listToText(riskEditForm.controlesEstruturados.epi)} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, controlesEstruturados: { ...prev.controlesEstruturados, epi: textToList(event.target.value) } }))} />
              <textarea className="input-field min-h-[120px]" placeholder="Medidas administrativas, uma por linha" value={listToText(riskEditForm.controlesEstruturados.administrativos)} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, controlesEstruturados: { ...prev.controlesEstruturados, administrativos: textToList(event.target.value) } }))} />
              <textarea className="input-field min-h-[120px]" placeholder="Medidas organizacionais, uma por linha" value={listToText(riskEditForm.controlesEstruturados.organizacionais)} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, controlesEstruturados: { ...prev.controlesEstruturados, organizacionais: textToList(event.target.value) } }))} />
              <textarea className="input-field min-h-[120px] md:col-span-2" placeholder="Ações de emergência e sinalização, uma por linha" value={listToText(riskEditForm.controlesEstruturados.emergencia)} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, controlesEstruturados: { ...prev.controlesEstruturados, emergencia: textToList(event.target.value) } }))} />
              <select className="input-field" value={riskEditForm.controlesEstruturados.eficacia} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, controlesEstruturados: { ...prev.controlesEstruturados, eficacia: event.target.value } }))}>
                {metadata?.controlEffectivenessTypes?.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <textarea className="input-field md:col-span-2" placeholder="Observações sobre eficácia, limitações e lacunas" value={riskEditForm.controlesEstruturados.observacoes} disabled={!canWrite || isEnvironmentFinalized} onChange={(event) => setRiskEditForm((prev) => ({ ...prev, controlesEstruturados: { ...prev.controlesEstruturados, observacoes: event.target.value } }))} />
            </div>
            {canWrite && !isEnvironmentFinalized && <button className="btn-primary" type="submit"><Save className="mr-2 inline h-4 w-4" />Salvar controles</button>}
          </form>
        )}

        {riskDetail?.risk && tab === 'plano' && (
          <div className="space-y-4">
            {canWrite && !isEnvironmentFinalized && (
              <form className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-2" onSubmit={onCreateActionPlanItem}>
                <input className="input-field md:col-span-2" placeholder="Título da ação" value={actionPlanForm.titulo} onChange={(event) => setActionPlanForm((prev) => ({ ...prev, titulo: event.target.value }))} required />
                <textarea className="input-field md:col-span-2" placeholder="Descrição da ação" value={actionPlanForm.descricao} onChange={(event) => setActionPlanForm((prev) => ({ ...prev, descricao: event.target.value }))} />
                <select className="input-field" value={actionPlanForm.tipo} onChange={(event) => setActionPlanForm((prev) => ({ ...prev, tipo: event.target.value }))}>
                  {metadata?.actionPlanTypeTypes?.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select className="input-field" value={actionPlanForm.prioridade} onChange={(event) => setActionPlanForm((prev) => ({ ...prev, prioridade: event.target.value }))}>
                  {metadata?.actionPlanPriorityTypes?.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select className="input-field" value={actionPlanForm.status} onChange={(event) => setActionPlanForm((prev) => ({ ...prev, status: event.target.value }))}>
                  {metadata?.actionPlanStatusTypes?.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <input className="input-field" placeholder="Responsável" value={actionPlanForm.responsavel} onChange={(event) => setActionPlanForm((prev) => ({ ...prev, responsavel: event.target.value }))} required />
                <input className="input-field" type="date" value={actionPlanForm.prazo} onChange={(event) => setActionPlanForm((prev) => ({ ...prev, prazo: event.target.value }))} />
                <input className="input-field md:col-span-2" placeholder="Critério de aceite" value={actionPlanForm.criterioAceite} onChange={(event) => setActionPlanForm((prev) => ({ ...prev, criterioAceite: event.target.value }))} />
                <textarea className="input-field md:col-span-2" placeholder="Evidência esperada" value={actionPlanForm.evidenciaEsperada} onChange={(event) => setActionPlanForm((prev) => ({ ...prev, evidenciaEsperada: event.target.value }))} />
                <div className="md:col-span-2"><button className="btn-primary" type="submit"><Plus className="mr-2 inline h-4 w-4" />Vincular ação ao risco</button></div>
              </form>
            )}

            <div className="space-y-2">
              {riskDetail.actionPlanItems?.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-900">{item.titulo}</div>
                    <div className="text-xs text-gray-500">{item.tipo} • {item.prioridade} • {item.status}</div>
                    <div className="text-sm text-gray-600">{item.descricao || 'Sem descrição detalhada.'}</div>
                    <div className="text-xs text-gray-500">Responsável: {item.responsavel || '-'} {item.prazo ? `• Prazo: ${new Date(item.prazo).toLocaleDateString('pt-BR')}` : ''}</div>
                    {item.criterioAceite ? <div className="text-xs text-gray-500">Critério de aceite: {item.criterioAceite}</div> : null}
                    {item.evidenciaEsperada ? <div className="text-xs text-gray-500">Evidência esperada: {item.evidenciaEsperada}</div> : null}
                  </div>
                  {canWrite && !isEnvironmentFinalized ? (
                    <button type="button" className="rounded-md border border-red-200 p-2 text-red-600" onClick={() => onDeleteActionPlanItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ))}
              {!riskDetail.actionPlanItems?.length && <div className="text-sm text-gray-500">Nenhum plano de ação vinculado a este risco.</div>}
            </div>
          </div>
        )}
      </div>

      <FormModal isOpen={activityModalOpen} onClose={() => setActivityModalOpen(false)} title="Nova Atividade" onSubmit={onCreateActivity}>
        <div className="grid grid-cols-1 gap-3">
          <input className="input-field" placeholder="Nome da atividade" value={activityForm.nome} onChange={(event) => setActivityForm((prev) => ({ ...prev, nome: event.target.value }))} required />
          <input className="input-field" placeholder="Processo macro" value={activityForm.processoMacro} onChange={(event) => setActivityForm((prev) => ({ ...prev, processoMacro: event.target.value }))} required />
          <textarea className="input-field" placeholder="Descrição técnica" value={activityForm.descricaoTecnica} onChange={(event) => setActivityForm((prev) => ({ ...prev, descricaoTecnica: event.target.value }))} required />
          <textarea className="input-field" placeholder="Descrição detalhada da tarefa" value={activityForm.descricaoTarefa} onChange={(event) => setActivityForm((prev) => ({ ...prev, descricaoTarefa: event.target.value }))} required />
          <select className="input-field" value={activityForm.frequencia} onChange={(event) => setActivityForm((prev) => ({ ...prev, frequencia: event.target.value }))}>
            {metadata?.activityFrequencyTypes?.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </FormModal>

      <FormModal isOpen={riskModalOpen} onClose={() => setRiskModalOpen(false)} title="Novo Risco" onSubmit={onCreateRisk}>
        <div className="grid grid-cols-1 gap-3">
          <select className="input-field" value={riskForm.riskType} onChange={(event) => setRiskForm((prev) => ({ ...prev, riskType: event.target.value, riskLibraryId: '' }))}>
            {metadata?.riskTypes?.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="input-field" value={riskForm.riskLibraryId} onChange={(event) => setRiskForm((prev) => ({ ...prev, riskLibraryId: event.target.value }))}>
            <option value="">Selecione um risco da biblioteca</option>
            {filteredLibrary.map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}
          </select>
          <p className="text-xs text-gray-500">Se não encontrar na biblioteca, preencha abaixo para cadastrar um novo risco.</p>
          {isManualRisk && (
            <>
              <input
                className="input-field"
                placeholder="Título do risco"
                value={riskForm.tituloRisco}
                onChange={(event) => setRiskForm((prev) => ({ ...prev, tituloRisco: event.target.value }))}
                required
              />
              <textarea
                className="input-field"
                placeholder="Perigo"
                value={riskForm.perigo}
                onChange={(event) => setRiskForm((prev) => ({ ...prev, perigo: event.target.value }))}
                required
              />
              <textarea
                className="input-field"
                placeholder="Evento perigoso"
                value={riskForm.eventoPerigoso}
                onChange={(event) => setRiskForm((prev) => ({ ...prev, eventoPerigoso: event.target.value }))}
                required
              />
              <textarea
                className="input-field"
                placeholder="Dano potencial"
                value={riskForm.danoPotencial}
                onChange={(event) => setRiskForm((prev) => ({ ...prev, danoPotencial: event.target.value }))}
                required
              />
            </>
          )}
          {selectedLibraryItem && <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">{selectedLibraryItem.perigo} • {selectedLibraryItem.eventoPerigoso}</div>}
          <textarea className="input-field" placeholder="Fonte geradora" value={riskForm.fonteGeradora} onChange={(event) => setRiskForm((prev) => ({ ...prev, fonteGeradora: event.target.value }))} required />
          <textarea className="input-field" placeholder="Descrição da exposição" value={riskForm.descricaoExposicao} onChange={(event) => setRiskForm((prev) => ({ ...prev, descricaoExposicao: event.target.value }))} required />
          <select className="input-field" value={riskForm.frequenciaExposicao} onChange={(event) => setRiskForm((prev) => ({ ...prev, frequenciaExposicao: event.target.value }))}>
            {metadata?.exposureFrequencyTypes?.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="input-field" value={riskForm.habitualidade} onChange={(event) => setRiskForm((prev) => ({ ...prev, habitualidade: event.target.value }))}>
            {metadata?.exposureHabitualityTypes?.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input className="input-field" placeholder="Duração da exposição" value={riskForm.duracaoExposicao} onChange={(event) => setRiskForm((prev) => ({ ...prev, duracaoExposicao: event.target.value }))} />
          <input className="input-field" placeholder="Via de exposição" value={riskForm.viaExposicao} onChange={(event) => setRiskForm((prev) => ({ ...prev, viaExposicao: event.target.value }))} />
          <select className="input-field" value={riskForm.condicao} onChange={(event) => setRiskForm((prev) => ({ ...prev, condicao: event.target.value }))}>
            {metadata?.riskConditionTypes?.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input type="number" className="input-field" min="1" value={riskForm.numeroExpostos} onChange={(event) => setRiskForm((prev) => ({ ...prev, numeroExpostos: Number(event.target.value) }))} />
          <textarea className="input-field" placeholder="Controles existentes" value={riskForm.controlesExistentes} onChange={(event) => setRiskForm((prev) => ({ ...prev, controlesExistentes: event.target.value }))} />
        </div>
      </FormModal>
    </div>
  );
};

export default RiskSurvey;

