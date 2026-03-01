import { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';

import FormModal from '../components/FormModal';
import { empresasService, riskSurveyService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const EMPTY_ENV = {
  empresaId: '',
  unidade: '',
  setor: '',
  nome: '',
  tipo: 'sala_tecnica'
};

const EMPTY_ACTIVITY = {
  nome: '',
  funcaoCargo: '',
  processoMacro: '',
  descricaoTecnica: '',
  descricaoTarefa: '',
  frequencia: 'diaria'
};

const EMPTY_RISK = {
  perigo: '',
  eventoPerigoso: '',
  danoPotencial: '',
  categoriaAgente: 'fisico',
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
  valorMedido: '',
  unidade: '',
  tempoExposicao: '',
  metodoObservacao: '',
  instrumentoUtilizado: '',
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
  const canWrite = user?.perfil === 'tecnico_seguranca' || user?.perfil === 'administrador';
  const canFinalize = user?.perfil === 'administrador';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [metadata, setMetadata] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [empresas, setEmpresas] = useState([]);

  const [empresaId, setEmpresaId] = useState('');

  const [environments, setEnvironments] = useState([]);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('');

  const [activities, setActivities] = useState([]);
  const [selectedActivityId, setSelectedActivityId] = useState('');

  const [risks, setRisks] = useState([]);
  const [selectedRiskId, setSelectedRiskId] = useState('');
  const [riskDetail, setRiskDetail] = useState(null);

  const [tab, setTab] = useState('identificacao');

  const [envModalOpen, setEnvModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [riskModalOpen, setRiskModalOpen] = useState(false);

  const [envForm, setEnvForm] = useState(EMPTY_ENV);
  const [activityForm, setActivityForm] = useState(EMPTY_ACTIVITY);
  const [riskForm, setRiskForm] = useState(EMPTY_RISK);

  const [assessmentForm, setAssessmentForm] = useState(EMPTY_ASSESSMENT);
  const [measurementForm, setMeasurementForm] = useState(EMPTY_MEASUREMENT);

  const selectedEnvironment = useMemo(
    () => environments.find((item) => String(item.id) === String(selectedEnvironmentId)) || null,
    [environments, selectedEnvironmentId]
  );

  const isEnvironmentFinalized = selectedEnvironment?.surveyStatus === 'finalized';

  const computedScore = Number(assessmentForm.probabilidade) * Number(assessmentForm.severidade);
  const computedClass = scoreLabel(computedScore || 1);

  const refreshDashboard = async () => {
    const response = await riskSurveyService.getDashboard(empresaId ? { empresaId } : {});
    setDashboard(response.data.data || null);
  };

  const loadInitial = async () => {
    try {
      setLoading(true);
      setError(null);
      const [metadataRes, companiesRes] = await Promise.all([
        riskSurveyService.getMetadata(),
        empresasService.getAll()
      ]);

      setMetadata(metadataRes.data.data || null);
      setEmpresas(companiesRes.data.data || []);
    } catch (err) {
      const message = err?.response?.data?.message || 'Nao foi possivel carregar o modulo.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadEnvironments = async () => {
    const response = await riskSurveyService.listEnvironments(empresaId ? { empresaId } : {});
    const rows = response.data.data || [];
    setEnvironments(rows);

    if (!rows.some((row) => String(row.id) === String(selectedEnvironmentId))) {
      setSelectedEnvironmentId(rows[0]?.id || '');
    }
  };

  const loadActivities = async () => {
    if (!selectedEnvironmentId) {
      setActivities([]);
      setSelectedActivityId('');
      return;
    }
    const response = await riskSurveyService.listActivitiesByEnvironment(selectedEnvironmentId);
    const rows = response.data.data || [];
    setActivities(rows);

    if (!rows.some((row) => String(row.id) === String(selectedActivityId))) {
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

    if (!rows.some((row) => String(row.id) === String(selectedRiskId))) {
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
  };

  useEffect(() => {
    void loadInitial();
  }, []);

  useEffect(() => {
    if (!metadata) return;
    void (async () => {
      try {
        await Promise.all([loadEnvironments(), refreshDashboard()]);
      } catch (err) {
        setError(err?.response?.data?.message || 'Erro ao carregar ambientes.');
      }
    })();
  }, [metadata, empresaId]);

  useEffect(() => {
    void (async () => {
      try {
        await loadActivities();
      } catch (err) {
        setError(err?.response?.data?.message || 'Erro ao carregar atividades.');
      }
    })();
  }, [selectedEnvironmentId]);

  useEffect(() => {
    void (async () => {
      try {
        await loadRisks();
      } catch (err) {
        setError(err?.response?.data?.message || 'Erro ao carregar riscos.');
      }
    })();
  }, [selectedActivityId]);

  useEffect(() => {
    void (async () => {
      try {
        await loadRiskDetail();
      } catch (err) {
        setError(err?.response?.data?.message || 'Erro ao carregar detalhe do risco.');
      }
    })();
  }, [selectedRiskId]);

  const onCreateEnvironment = async (event) => {
    event.preventDefault();
    try {
      await riskSurveyService.createEnvironment(envForm);
      setEnvModalOpen(false);
      setEnvForm({ ...EMPTY_ENV, empresaId: empresaId || '' });
      await Promise.all([loadEnvironments(), refreshDashboard()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao criar ambiente.');
    }
  };

  const onCreateActivity = async (event) => {
    event.preventDefault();
    if (!selectedEnvironmentId) return;

    try {
      await riskSurveyService.createActivity({ ...activityForm, environmentId: selectedEnvironmentId });
      setActivityModalOpen(false);
      setActivityForm(EMPTY_ACTIVITY);
      await Promise.all([loadActivities(), refreshDashboard()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao criar atividade.');
    }
  };

  const onCreateRisk = async (event) => {
    event.preventDefault();
    if (!selectedActivityId) return;

    try {
      await riskSurveyService.createRisk({ ...riskForm, activityId: selectedActivityId });
      setRiskModalOpen(false);
      setRiskForm(EMPTY_RISK);
      await Promise.all([loadRisks(), refreshDashboard()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao criar risco.');
    }
  };

  const onSaveAssessment = async (event) => {
    event.preventDefault();
    if (!riskDetail?.risk?.id) return;

    try {
      await riskSurveyService.upsertAssessment(riskDetail.risk.id, assessmentForm);
      await Promise.all([loadRiskDetail(), refreshDashboard()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao salvar avaliacao.');
    }
  };

  const onCreateMeasurement = async (event) => {
    event.preventDefault();
    if (!riskDetail?.risk?.id) return;

    try {
      await riskSurveyService.createMeasurement(riskDetail.risk.id, measurementForm);
      setMeasurementForm(EMPTY_MEASUREMENT);
      await Promise.all([loadRiskDetail(), refreshDashboard()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao registrar medicao.');
    }
  };

  const onFinalize = async () => {
    if (!selectedEnvironmentId) return;
    try {
      await riskSurveyService.finalizeEnvironment(selectedEnvironmentId);
      await Promise.all([loadEnvironments(), refreshDashboard(), loadRiskDetail()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao finalizar levantamento.');
    }
  };

  const onDeleteMeasurement = async (id) => {
    try {
      await riskSurveyService.deleteMeasurement(id);
      await Promise.all([loadRiskDetail(), refreshDashboard()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao remover medicao.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" />
      </div>
    );
  }

  if (error && !metadata) {
    return <div className="card text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Levantamento de Riscos Ocupacionais</h1>
          <p className="text-sm text-gray-500">
            Fluxo estruturado por Ambiente, Atividade e Risco (qualitativo e quantitativo).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select className="input-field min-w-[280px]" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
            <option value="">Todas as empresas</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome}
              </option>
            ))}
          </select>
          {canWrite && (
            <button
              className="btn-primary flex items-center"
              onClick={() => {
                setEnvForm((prev) => ({ ...prev, empresaId: empresaId || prev.empresaId }));
                setEnvModalOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Ambiente
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="card py-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{dashboard?.counts?.ambientes || 0}</div>
          <div className="text-xs text-gray-500">Ambientes</div>
        </div>
        <div className="card py-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{dashboard?.counts?.atividades || 0}</div>
          <div className="text-xs text-gray-500">Atividades</div>
        </div>
        <div className="card py-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{dashboard?.counts?.riscos || 0}</div>
          <div className="text-xs text-gray-500">Riscos</div>
        </div>
        <div className="card py-4 text-center">
          <div className="text-2xl font-bold text-red-600">{dashboard?.counts?.acoesNecessarias || 0}</div>
          <div className="text-xs text-gray-500">Acoes Necessarias</div>
        </div>
        <div className="card py-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{dashboard?.counts?.avaliacoes || 0}</div>
          <div className="text-xs text-gray-500">Avaliacoes</div>
        </div>
        <div className="card py-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{dashboard?.counts?.medicoes || 0}</div>
          <div className="text-xs text-gray-500">Medicoes</div>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Classificacao por Score</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {['baixo', 'medio', 'alto', 'critico', 'sem_avaliacao'].map((key) => (
            <div key={key} className="rounded-lg border border-gray-200 p-3">
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
                <span>{key.replace('_', ' ')}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeByClass[key]}`}>{dashboard?.classificacao?.[key] || 0}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div
                  className={`h-2 rounded-full ${key === 'baixo' ? 'bg-emerald-500' : key === 'medio' ? 'bg-yellow-500' : key === 'alto' ? 'bg-orange-500' : key === 'critico' ? 'bg-red-500' : 'bg-gray-500'}`}
                  style={{
                    width: `${Math.min(((dashboard?.classificacao?.[key] || 0) / Math.max(dashboard?.counts?.riscos || 1, 1)) * 100, 100)}%`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Ambientes</h3>
            {selectedEnvironment && canFinalize && !isEnvironmentFinalized && (
              <button className="btn-secondary px-3 py-1 text-xs" onClick={onFinalize}>
                Finalizar
              </button>
            )}
          </div>
          <div className="space-y-2">
            {environments.map((item) => (
              <button
                key={item.id}
                className={`w-full rounded-lg border p-3 text-left ${String(item.id) === String(selectedEnvironmentId) ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-white'}`}
                onClick={() => setSelectedEnvironmentId(item.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">{item.nome}</div>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${item.surveyStatus === 'finalized' ? 'bg-gray-800 text-white' : 'bg-blue-100 text-blue-700'}`}>
                    {item.surveyStatus === 'finalized' ? 'Finalizado' : 'Rascunho'}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-500">{item.unidade} / {item.setor}</div>
              </button>
            ))}
            {environments.length === 0 && <div className="text-sm text-gray-500">Nenhum ambiente cadastrado.</div>}
          </div>
          {canWrite && (
            <button className="mt-3 w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600" onClick={() => setEnvModalOpen(true)}>
              + Novo ambiente
            </button>
          )}
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Atividades</h3>
            {canWrite && (
              <button
                className="btn-secondary px-3 py-1 text-xs"
                disabled={!selectedEnvironmentId || isEnvironmentFinalized}
                onClick={() => setActivityModalOpen(true)}
              >
                <Plus className="mr-1 inline h-3 w-3" /> Nova
              </button>
            )}
          </div>
          <div className="space-y-2">
            {activities.map((item) => (
              <button
                key={item.id}
                className={`w-full rounded-lg border p-3 text-left ${String(item.id) === String(selectedActivityId) ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-white'}`}
                onClick={() => setSelectedActivityId(item.id)}
              >
                <div className="text-sm font-semibold text-gray-900">{item.nome}</div>
                <div className="mt-1 text-xs text-gray-500">{item.funcaoCargo} • {item.frequencia}</div>
              </button>
            ))}
            {activities.length === 0 && <div className="text-sm text-gray-500">Nenhuma atividade neste ambiente.</div>}
          </div>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Riscos</h3>
            {canWrite && (
              <button
                className="btn-secondary px-3 py-1 text-xs"
                disabled={!selectedActivityId || isEnvironmentFinalized}
                onClick={() => setRiskModalOpen(true)}
              >
                <Plus className="mr-1 inline h-3 w-3" /> Novo
              </button>
            )}
          </div>
          <div className="space-y-2">
            {risks.map((item) => (
              <button
                key={item.id}
                className={`w-full rounded-lg border p-3 text-left ${String(item.id) === String(selectedRiskId) ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-white'}`}
                onClick={() => setSelectedRiskId(item.id)}
              >
                <div className="text-sm font-semibold text-gray-900">{item.perigo}</div>
                <div className="mt-1 text-xs text-gray-500">{item.categoriaAgente} • expostos: {item.numeroExpostos}</div>
              </button>
            ))}
            {risks.length === 0 && <div className="text-sm text-gray-500">Nenhum risco nesta atividade.</div>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
          <button className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'identificacao' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`} onClick={() => setTab('identificacao')}>Identificacao</button>
          <button className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'avaliacao' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`} onClick={() => setTab('avaliacao')}>Avaliacao</button>
          <button className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'medicoes' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`} onClick={() => setTab('medicoes')}>Medicoes</button>
          {isEnvironmentFinalized && <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white">Levantamento finalizado (somente leitura)</span>}
        </div>

        {!riskDetail?.risk && <div className="text-sm text-gray-500">Selecione um risco para visualizar os detalhes.</div>}

        {riskDetail?.risk && tab === 'identificacao' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="mb-2 text-sm font-semibold text-gray-900">Risco</h4>
              <div className="space-y-1 text-sm text-gray-700">
                <div><span className="font-medium">Perigo:</span> {riskDetail.risk.perigo}</div>
                <div><span className="font-medium">Evento perigoso:</span> {riskDetail.risk.eventoPerigoso}</div>
                <div><span className="font-medium">Dano potencial:</span> {riskDetail.risk.danoPotencial}</div>
                <div><span className="font-medium">Categoria:</span> {riskDetail.risk.categoriaAgente}</div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="mb-2 text-sm font-semibold text-gray-900">Contexto</h4>
              <div className="space-y-1 text-sm text-gray-700">
                <div><span className="font-medium">Ambiente:</span> {riskDetail.environment?.nome || '-'}</div>
                <div><span className="font-medium">Atividade:</span> {riskDetail.activity?.nome || '-'}</div>
                <div><span className="font-medium">Condicao:</span> {riskDetail.risk.condicao}</div>
                <div><span className="font-medium">Numero de expostos:</span> {riskDetail.risk.numeroExpostos}</div>
              </div>
            </div>
          </div>
        )}

        {riskDetail?.risk && tab === 'avaliacao' && (
          <form className="space-y-4" onSubmit={onSaveAssessment}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Probabilidade (1-5)</label>
                <input type="number" min="1" max="5" className="input-field" value={assessmentForm.probabilidade} disabled={!canWrite || isEnvironmentFinalized} onChange={(e) => setAssessmentForm((prev) => ({ ...prev, probabilidade: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Severidade (1-5)</label>
                <input type="number" min="1" max="5" className="input-field" value={assessmentForm.severidade} disabled={!canWrite || isEnvironmentFinalized} onChange={(e) => setAssessmentForm((prev) => ({ ...prev, severidade: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Confianca</label>
                <select className="input-field" value={assessmentForm.nivelConfianca} disabled={!canWrite || isEnvironmentFinalized} onChange={(e) => setAssessmentForm((prev) => ({ ...prev, nivelConfianca: e.target.value }))}>
                  {metadata?.confidenceLevels?.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Score</label>
                <div className="input-field flex items-center justify-between bg-gray-50">
                  <span>{computedScore}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${badgeByClass[computedClass]}`}>{computedClass}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Justificativa tecnica</label>
              <textarea className="input-field min-h-[100px]" value={assessmentForm.justificativaTecnica} disabled={!canWrite || isEnvironmentFinalized} onChange={(e) => setAssessmentForm((prev) => ({ ...prev, justificativaTecnica: e.target.value }))} />
            </div>

            {canWrite && !isEnvironmentFinalized && (
              <button className="btn-primary flex items-center" type="submit">
                <Save className="mr-2 h-4 w-4" /> Salvar avaliacao
              </button>
            )}
          </form>
        )}

        {riskDetail?.risk && tab === 'medicoes' && (
          <div className="space-y-4">
            {canWrite && !isEnvironmentFinalized && (
              <form className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-3" onSubmit={onCreateMeasurement}>
                <select className="input-field" value={measurementForm.tipo} onChange={(e) => setMeasurementForm((prev) => ({ ...prev, tipo: e.target.value }))}>
                  {metadata?.measurementTypes?.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <input className="input-field" placeholder="Valor medido" type="number" step="any" value={measurementForm.valorMedido} onChange={(e) => setMeasurementForm((prev) => ({ ...prev, valorMedido: e.target.value }))} />
                <input className="input-field" placeholder="Unidade" value={measurementForm.unidade} onChange={(e) => setMeasurementForm((prev) => ({ ...prev, unidade: e.target.value }))} />
                <input className="input-field" placeholder="Tempo de exposicao" value={measurementForm.tempoExposicao} onChange={(e) => setMeasurementForm((prev) => ({ ...prev, tempoExposicao: e.target.value }))} />
                <input className="input-field" placeholder="Instrumento" value={measurementForm.instrumentoUtilizado} onChange={(e) => setMeasurementForm((prev) => ({ ...prev, instrumentoUtilizado: e.target.value }))} />
                <input className="input-field" type="date" value={measurementForm.dataMedicao} onChange={(e) => setMeasurementForm((prev) => ({ ...prev, dataMedicao: e.target.value }))} />
                <textarea className="input-field md:col-span-3" placeholder="Metodo / observacao" value={measurementForm.metodoObservacao} onChange={(e) => setMeasurementForm((prev) => ({ ...prev, metodoObservacao: e.target.value }))} />
                <div className="md:col-span-3">
                  <button className="btn-primary" type="submit">Registrar medicao</button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {riskDetail.measurements?.map((item) => (
                <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{item.tipo} • {item.valorMedido} {item.unidade}</div>
                    <div className="text-xs text-gray-500">{new Date(item.dataMedicao).toLocaleDateString('pt-BR')} • {item.instrumentoUtilizado || 'Sem instrumento informado'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs ${item.comparacao === 'acima_referencia' ? 'bg-red-100 text-red-700' : item.comparacao === 'proximo_limite' ? 'bg-yellow-100 text-yellow-700' : item.comparacao === 'abaixo_referencia' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                      {item.comparacao}
                    </span>
                    {canWrite && !isEnvironmentFinalized && (
                      <button className="rounded-md border border-red-200 p-1 text-red-600" type="button" onClick={() => onDeleteMeasurement(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!riskDetail.measurements?.length && <div className="text-sm text-gray-500">Nenhuma medicao registrada.</div>}
            </div>
          </div>
        )}
      </div>

      <FormModal isOpen={envModalOpen} onClose={() => setEnvModalOpen(false)} title="Novo Ambiente" onSubmit={onCreateEnvironment}>
        <div className="grid grid-cols-1 gap-3">
          <select className="input-field" value={envForm.empresaId} onChange={(e) => setEnvForm((prev) => ({ ...prev, empresaId: e.target.value }))} required>
            <option value="">Selecione a empresa</option>
            {empresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>)}
          </select>
          <input className="input-field" placeholder="Unidade" value={envForm.unidade} onChange={(e) => setEnvForm((prev) => ({ ...prev, unidade: e.target.value }))} required />
          <input className="input-field" placeholder="Setor" value={envForm.setor} onChange={(e) => setEnvForm((prev) => ({ ...prev, setor: e.target.value }))} required />
          <input className="input-field" placeholder="Nome do ambiente" value={envForm.nome} onChange={(e) => setEnvForm((prev) => ({ ...prev, nome: e.target.value }))} required />
          <select className="input-field" value={envForm.tipo} onChange={(e) => setEnvForm((prev) => ({ ...prev, tipo: e.target.value }))}>
            {metadata?.environmentTypes?.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </FormModal>

      <FormModal isOpen={activityModalOpen} onClose={() => setActivityModalOpen(false)} title="Nova Atividade" onSubmit={onCreateActivity}>
        <div className="grid grid-cols-1 gap-3">
          <input className="input-field" placeholder="Nome da atividade" value={activityForm.nome} onChange={(e) => setActivityForm((prev) => ({ ...prev, nome: e.target.value }))} required />
          <input className="input-field" placeholder="Funcao / Cargo" value={activityForm.funcaoCargo} onChange={(e) => setActivityForm((prev) => ({ ...prev, funcaoCargo: e.target.value }))} required />
          <input className="input-field" placeholder="Processo macro" value={activityForm.processoMacro} onChange={(e) => setActivityForm((prev) => ({ ...prev, processoMacro: e.target.value }))} required />
          <textarea className="input-field" placeholder="Descricao tecnica" value={activityForm.descricaoTecnica} onChange={(e) => setActivityForm((prev) => ({ ...prev, descricaoTecnica: e.target.value }))} required />
          <textarea className="input-field" placeholder="Descricao detalhada da tarefa" value={activityForm.descricaoTarefa} onChange={(e) => setActivityForm((prev) => ({ ...prev, descricaoTarefa: e.target.value }))} required />
          <select className="input-field" value={activityForm.frequencia} onChange={(e) => setActivityForm((prev) => ({ ...prev, frequencia: e.target.value }))}>
            {metadata?.activityFrequencyTypes?.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </FormModal>

      <FormModal isOpen={riskModalOpen} onClose={() => setRiskModalOpen(false)} title="Novo Risco" onSubmit={onCreateRisk}>
        <div className="grid grid-cols-1 gap-3">
          <input className="input-field" placeholder="Perigo" value={riskForm.perigo} onChange={(e) => setRiskForm((prev) => ({ ...prev, perigo: e.target.value }))} required />
          <input className="input-field" placeholder="Evento perigoso" value={riskForm.eventoPerigoso} onChange={(e) => setRiskForm((prev) => ({ ...prev, eventoPerigoso: e.target.value }))} required />
          <input className="input-field" placeholder="Dano potencial" value={riskForm.danoPotencial} onChange={(e) => setRiskForm((prev) => ({ ...prev, danoPotencial: e.target.value }))} required />
          <select className="input-field" value={riskForm.categoriaAgente} onChange={(e) => setRiskForm((prev) => ({ ...prev, categoriaAgente: e.target.value }))}>
            {metadata?.riskAgentCategories?.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="input-field" value={riskForm.condicao} onChange={(e) => setRiskForm((prev) => ({ ...prev, condicao: e.target.value }))}>
            {metadata?.riskConditionTypes?.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input type="number" min="1" className="input-field" placeholder="Numero de expostos" value={riskForm.numeroExpostos} onChange={(e) => setRiskForm((prev) => ({ ...prev, numeroExpostos: Number(e.target.value) }))} />
          <textarea className="input-field" placeholder="Controles existentes" value={riskForm.controlesExistentes} onChange={(e) => setRiskForm((prev) => ({ ...prev, controlesExistentes: e.target.value }))} />
        </div>
      </FormModal>
    </div>
  );
};

export default RiskSurvey;
