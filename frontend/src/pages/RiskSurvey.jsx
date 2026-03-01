import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Save, Trash2 } from 'lucide-react';

import FormModal from '../components/FormModal';
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
  condicao: 'normal',
  numeroExpostos: 1,
  grupoHomogeneo: false,
  controlesExistentes: ''
};

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
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'administrador';
  const canWrite = user?.perfil === 'tecnico_seguranca' || isAdmin;
  const canFinalize = isAdmin;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [metadata, setMetadata] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [empresas, setEmpresas] = useState([]);
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
  const [assessmentForm, setAssessmentForm] = useState(EMPTY_ASSESSMENT);
  const [measurementForm, setMeasurementForm] = useState(EMPTY_MEASUREMENT);

  const selectedEnvironment = useMemo(
    () => environments.find((item) => String(item.id) === String(selectedEnvironmentId)) || null,
    [environments, selectedEnvironmentId]
  );

  const filteredLibrary = useMemo(
    () => libraryItems.filter((item) => item.tipo === riskForm.riskType && item.ativo),
    [libraryItems, riskForm.riskType]
  );

  const selectedLibraryItem = useMemo(
    () => filteredLibrary.find((item) => String(item.id) === String(riskForm.riskLibraryId)) || null,
    [filteredLibrary, riskForm.riskLibraryId]
  );

  const isEnvironmentFinalized = selectedEnvironment?.surveyStatus === 'finalized';
  const computedScore = Number(assessmentForm.probabilidade) * Number(assessmentForm.severidade);
  const computedClass = scoreLabel(computedScore || 1);

  const loadDashboard = async () => {
    const response = await riskSurveyService.getDashboard(empresaId ? { empresaId } : {});
    setDashboard(response.data.data || null);
  };

  const loadBase = async () => {
    const [metadataRes, companiesRes, libraryRes, devicesRes] = await Promise.all([
      riskSurveyService.getMetadata(),
      empresasService.getAll(),
      riskSurveyService.listLibrary({ ativo: true }),
      riskSurveyService.listDevices({ ativo: true })
    ]);

    setMetadata(metadataRes.data.data || null);
    setEmpresas(companiesRes.data.data || []);
    setLibraryItems(libraryRes.data.data || []);
    setDevices(devicesRes.data.data || []);
  };

  const loadEnvironments = async () => {
    const response = await riskSurveyService.listEnvironments(empresaId ? { empresaId } : {});
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
      setAssessmentForm(EMPTY_ASSESSMENT);
      setMeasurementForm(EMPTY_MEASUREMENT);
      return;
    }

    const response = await riskSurveyService.getRiskDetail(selectedRiskId);
    const detail = response.data.data || null;
    setRiskDetail(detail);

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
  };

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError('');
        await loadBase();
        await Promise.all([loadEnvironments(), loadDashboard()]);
      } catch (err) {
        setError(err?.response?.data?.message || 'Erro ao carregar módulo de riscos.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await Promise.all([loadEnvironments(), loadDashboard()]);
      } catch (err) {
        setError(err?.response?.data?.message || 'Erro ao atualizar filtros por empresa.');
      }
    })();
  }, [empresaId]);

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
      await riskSurveyService.createRisk({
        activityId: selectedActivityId,
        riskType: riskForm.riskType,
        riskLibraryId: riskForm.riskLibraryId,
        condicao: riskForm.condicao,
        numeroExpostos: riskForm.numeroExpostos,
        grupoHomogeneo: riskForm.grupoHomogeneo,
        controlesExistentes: riskForm.controlesExistentes
      });
      setRiskModalOpen(false);
      setRiskForm(EMPTY_RISK);
      await Promise.all([loadRisks(), loadDashboard()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao criar risco.');
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Levantamento de Riscos Ocupacionais</h1>
          <p className="text-sm text-gray-500">Fluxo obrigatório: Setor ? Ambiente ? Cargo ? Atividade ? Risco.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input-field min-w-[240px]" value={empresaId} onChange={(event) => setEmpresaId(event.target.value)}>
            <option value="">Todas as empresas</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>
            ))}
          </select>
          <Link className="btn-secondary" to="/levantamento-riscos/ambientes">Caracterização de Ambientes</Link>
          {isAdmin && (
            <button className="btn-secondary" onClick={() => riskSurveyService.runLegacyMigration().then(() => loadDashboard())}>
              Migrar legado
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

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
                <div className="text-xs text-gray-500">{item.nome} • {item.unidade}</div>
              </button>
            ))}
            {!environments.length && <div className="text-sm text-gray-500">Cadastre ambientes na tela de caracterização.</div>}
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
          {isEnvironmentFinalized && <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white">Snapshot read-only ativo</span>}
        </div>

        {!riskDetail?.risk && <div className="text-sm text-gray-500">Selecione um risco para visualizar detalhes.</div>}

        {riskDetail?.risk && tab === 'identificacao' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-700">
              <div><strong>Ambiente:</strong> {riskDetail.environment?.nome || '-'}</div>
              <div><strong>Cargo:</strong> {riskDetail.cargo?.nome || '-'}</div>
              <div><strong>Atividade:</strong> {riskDetail.activity?.nome || '-'}</div>
              <div><strong>Risco:</strong> {riskDetail.risk?.perigo}</div>
              <div><strong>Tipo:</strong> {riskDetail.risk?.riskType || riskDetail.risk?.categoriaAgente}</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-700">
              <div><strong>Evento perigoso:</strong> {riskDetail.risk?.eventoPerigoso}</div>
              <div><strong>Dano potencial:</strong> {riskDetail.risk?.danoPotencial}</div>
              <div><strong>Condição:</strong> {riskDetail.risk?.condicao}</div>
              <div><strong>Expostos:</strong> {riskDetail.risk?.numeroExpostos}</div>
              <div><strong>Legacy migrado:</strong> {riskDetail.risk?.legacyMigrated ? 'Sim' : 'Não'}</div>
            </div>
          </div>
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

      <FormModal isOpen={riskModalOpen} onClose={() => setRiskModalOpen(false)} title="Novo Risco (Biblioteca)" onSubmit={onCreateRisk}>
        <div className="grid grid-cols-1 gap-3">
          <select className="input-field" value={riskForm.riskType} onChange={(event) => setRiskForm((prev) => ({ ...prev, riskType: event.target.value, riskLibraryId: '' }))}>
            {metadata?.riskTypes?.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="input-field" value={riskForm.riskLibraryId} onChange={(event) => setRiskForm((prev) => ({ ...prev, riskLibraryId: event.target.value }))} required>
            <option value="">Selecione um risco da biblioteca</option>
            {filteredLibrary.map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}
          </select>
          {selectedLibraryItem && <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">{selectedLibraryItem.perigo} • {selectedLibraryItem.eventoPerigoso}</div>}
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

