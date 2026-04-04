import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layers3, Plus } from 'lucide-react';

import FormModal from '../components/FormModal';
import EmptyState from '../components/ui/EmptyState';
import { empresasService, riskSurveyService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ENV_FORM_DEFAULT = {
  cycleId: '',
  setor: '',
  nome: '',
  tipo: 'sala_tecnica'
};

const CARGO_FORM_DEFAULT = {
  nome: '',
  descricao: '',
  gheId: ''
};

const GHE_FORM_DEFAULT = {
  nomeTecnico: '',
  descricaoSimilaridade: '',
  headcount: 1,
  status: 'ativo'
};

const RiskSurveyEnvironments = () => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('riskSurvey:write');
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [environments, setEnvironments] = useState([]);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('');
  const [ghes, setGhes] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [envModalOpen, setEnvModalOpen] = useState(false);
  const [gheModalOpen, setGheModalOpen] = useState(false);
  const [cargoModalOpen, setCargoModalOpen] = useState(false);
  const [envForm, setEnvForm] = useState(ENV_FORM_DEFAULT);
  const [gheForm, setGheForm] = useState(GHE_FORM_DEFAULT);
  const [cargoForm, setCargoForm] = useState(CARGO_FORM_DEFAULT);

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

  const gheMap = useMemo(
    () => new Map(ghes.map((ghe) => [String(ghe.id), ghe])),
    [ghes]
  );

  const loadBase = async () => {
    try {
      setLoading(true);
      setError('');

      const [metadataRes, empresasRes, cyclesRes] = await Promise.all([
        riskSurveyService.getMetadata(),
        empresasService.getAll(),
        riskSurveyService.listCycles()
      ]);

      const cycleRows = cyclesRes.data.data || [];
      const requestedCycleId = searchParams.get('cycleId');
      const preferredCycle =
        cycleRows.find((item) => String(item.id) === String(requestedCycleId)) ||
        cycleRows.find((item) => item.status === 'draft' || item.status === 'in_review') ||
        cycleRows[0] ||
        null;

      setMetadata(metadataRes.data.data || null);
      setEmpresas(empresasRes.data.data || []);
      setCycles(cycleRows);
      setSelectedCycleId(preferredCycle?.id || '');
      setEnvForm((prev) => ({ ...prev, cycleId: preferredCycle?.id || '' }));
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao carregar base de ambientes.');
    } finally {
      setLoading(false);
    }
  };

  const loadEnvironments = async () => {
    if (!selectedCycleId) {
      setEnvironments([]);
      setSelectedEnvironmentId('');
      return;
    }

    try {
      const response = await riskSurveyService.listEnvironments({ cycleId: selectedCycleId });
      const rows = response.data.data || [];
      setEnvironments(rows);
      if (!rows.some((item) => String(item.id) === String(selectedEnvironmentId))) {
        setSelectedEnvironmentId(rows[0]?.id || '');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao carregar ambientes.');
    }
  };

  const loadCargos = async () => {
    if (!selectedEnvironmentId) {
      setCargos([]);
      return;
    }

    try {
      const response = await riskSurveyService.listCargosByEnvironment(selectedEnvironmentId);
      setCargos(response.data.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao carregar cargos.');
    }
  };

  const loadGhes = async () => {
    if (!selectedEnvironmentId) {
      setGhes([]);
      setCargoForm((prev) => ({ ...prev, gheId: '' }));
      return;
    }

    try {
      const response = await riskSurveyService.listGhesByEnvironment(selectedEnvironmentId);
      const rows = response.data.data || [];
      setGhes(rows);
      setCargoForm((prev) => ({
        ...prev,
        gheId: rows.some((item) => String(item.id) === String(prev.gheId)) ? prev.gheId : rows[0]?.id || ''
      }));
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao carregar GHEs.');
    }
  };

  useEffect(() => {
    void loadBase();
  }, []);

  useEffect(() => {
    if (!selectedCycleId) return;
    setSearchParams({ cycleId: selectedCycleId });
    setEnvForm((prev) => ({ ...prev, cycleId: selectedCycleId }));
    void loadEnvironments();
  }, [selectedCycleId]);

  useEffect(() => {
    void Promise.all([loadGhes(), loadCargos()]);
  }, [selectedEnvironmentId]);

  const createEnvironment = async (event) => {
    event.preventDefault();
    if (!canWrite || !selectedCycleId) return;

    try {
      await riskSurveyService.createEnvironment({
        cycleId: selectedCycleId,
        setor: envForm.setor,
        nome: envForm.nome,
        tipo: envForm.tipo
      });
      setEnvModalOpen(false);
      setEnvForm((prev) => ({ ...ENV_FORM_DEFAULT, cycleId: prev.cycleId }));
      await loadEnvironments();
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao criar ambiente.');
    }
  };

  const createCargo = async (event) => {
    event.preventDefault();
    if (!selectedEnvironmentId || !canWrite) return;

    try {
      await riskSurveyService.createCargo({
        environmentId: selectedEnvironmentId,
        ...cargoForm
      });
      setCargoModalOpen(false);
      setCargoForm(CARGO_FORM_DEFAULT);
      await loadCargos();
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao criar cargo.');
    }
  };

  const createGhe = async (event) => {
    event.preventDefault();
    if (!selectedEnvironmentId || !canWrite) return;

    try {
      await riskSurveyService.createGhe({
        cycleId: selectedCycleId,
        environmentId: selectedEnvironmentId,
        ...gheForm
      });
      setGheModalOpen(false);
      setGheForm(GHE_FORM_DEFAULT);
      await loadGhes();
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao criar GHE.');
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Caracterizacao de Ambientes</h1>
            <p className="text-sm text-gray-500">Crie um ciclo de levantamento antes de estruturar ambientes e cargos.</p>
          </div>
          <Link to="/levantamento-riscos" className="btn-secondary">
            Ciclos v2
          </Link>
        </div>

        <div className="card">
          <EmptyState
            icon={Layers3}
            title="Nenhum ciclo disponivel"
            description="A nova camada de ambientes depende de um ciclo ativo para manter escopo e rastreabilidade."
            action={
              <Link to="/levantamento-riscos" className="btn-primary">
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caracterizacao de Ambientes</h1>
          <p className="text-sm text-gray-500">Etapa 2: cadastre ambientes e cargos dentro de um ciclo controlado.</p>
        </div>
        <div className="flex gap-2">
          <button
            className={`btn-primary ${canWrite ? '' : 'opacity-60 cursor-not-allowed'}`}
            disabled={!canWrite || !selectedCycleId}
            onClick={() => setEnvModalOpen(true)}
          >
            <Plus className="mr-2 inline h-4 w-4" />
            Novo ambiente
          </button>
          <Link to="/levantamento-riscos" className="btn-secondary">
            Ciclos v2
          </Link>
          <Link to={selectedCycleId ? `/levantamento-riscos/execucao?cycleId=${selectedCycleId}` : '/levantamento-riscos/execucao'} className="btn-secondary">
            Ir para atividades e riscos
          </Link>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="card space-y-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(320px,380px)_1fr]">
          <div>
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Ciclo ativo</p>
            <select className="input-field" value={selectedCycleId} onChange={(event) => setSelectedCycleId(event.target.value)}>
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {(cycle.title || `Levantamento ${cycle.estabelecimento}`)} - v{cycle.version}
                </option>
              ))}
            </select>
          </div>

          {selectedCycle ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Escopo do ciclo</p>
              <div className="mt-2 text-sm font-semibold text-slate-900">
                {companyMap.get(String(selectedCycle.empresaId)) || 'Empresa vinculada'}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {selectedCycle.unidade} / {selectedCycle.estabelecimento}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Responsavel tecnico: {selectedCycle.responsibleTechnical?.nome || 'Nao informado'}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Ambientes do ciclo</h2>
          <div className="space-y-2">
            {environments.map((item) => (
              <button
                key={item.id}
                className={`w-full rounded-lg border p-3 text-left ${String(item.id) === String(selectedEnvironmentId) ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-white'}`}
                onClick={() => setSelectedEnvironmentId(item.id)}
              >
                <div className="text-sm font-semibold text-gray-900">{item.nome}</div>
                <div className="text-xs text-gray-500">
                  {item.unidade} / {item.estabelecimento || 'Estabelecimento'} / {item.setor}
                </div>
              </button>
            ))}
            {environments.length === 0 ? <div className="text-sm text-gray-500">Nenhum ambiente cadastrado para este ciclo.</div> : null}
          </div>
        </div>

        <div className="card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-700">GHEs e cargos no ambiente</h2>
            <div className="flex gap-2">
              <button
                className={`btn-secondary px-3 py-1 text-xs ${canWrite ? '' : 'opacity-60 cursor-not-allowed'}`}
                disabled={!selectedEnvironment || !canWrite}
                onClick={() => setGheModalOpen(true)}
              >
                <Plus className="mr-1 inline h-3 w-3" />
                Novo GHE
              </button>
              <button
                className={`btn-secondary px-3 py-1 text-xs ${canWrite ? '' : 'opacity-60 cursor-not-allowed'}`}
                disabled={!selectedEnvironment || !canWrite || !ghes.length}
                onClick={() => setCargoModalOpen(true)}
              >
                <Plus className="mr-1 inline h-3 w-3" />
                Novo cargo
              </button>
            </div>
          </div>
          {selectedEnvironment ? (
            <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
              Ambiente selecionado: <strong>{selectedEnvironment.nome}</strong>
            </div>
          ) : null}
          <div className="mb-4 space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Grupos homogêneos de exposição</p>
            {ghes.map((ghe) => (
              <div key={ghe.id} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{ghe.nomeTecnico}</div>
                    <div className="text-xs text-slate-500">{ghe.descricaoSimilaridade || 'Sem descrição de similaridade.'}</div>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                    {ghe.headcount || 1} exposto(s)
                  </span>
                </div>
              </div>
            ))}
            {!ghes.length ? <div className="text-sm text-gray-500">Cadastre ao menos um GHE ativo antes de criar cargos.</div> : null}
          </div>
          <div className="space-y-2">
            {cargos.map((cargo) => (
              <div key={cargo.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-gray-900">{cargo.nome}</div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    {gheMap.get(String(cargo.gheId))?.nomeTecnico || 'Sem GHE'}
                  </span>
                </div>
                <div className="text-xs text-gray-500">{cargo.descricao || 'Sem descricao'}</div>
              </div>
            ))}
            {!cargos.length ? <div className="text-sm text-gray-500">Nenhum cargo cadastrado para este ambiente.</div> : null}
          </div>
        </div>
      </div>

      <FormModal isOpen={envModalOpen} onClose={() => setEnvModalOpen(false)} title="Novo ambiente" onSubmit={createEnvironment}>
        <div className="grid grid-cols-1 gap-3">
          {selectedCycle ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
              <strong className="block text-slate-900">{companyMap.get(String(selectedCycle.empresaId)) || 'Empresa vinculada'}</strong>
              <span>{selectedCycle.unidade} / {selectedCycle.estabelecimento}</span>
            </div>
          ) : null}
          <input
            className="input-field"
            value={envForm.setor}
            onChange={(event) => setEnvForm((prev) => ({ ...prev, setor: event.target.value }))}
            placeholder="Setor"
            required
          />
          <input
            className="input-field"
            value={envForm.nome}
            onChange={(event) => setEnvForm((prev) => ({ ...prev, nome: event.target.value }))}
            placeholder="Nome do ambiente"
            required
          />
          <select className="input-field" value={envForm.tipo} onChange={(event) => setEnvForm((prev) => ({ ...prev, tipo: event.target.value }))}>
            {metadata?.environmentTypes?.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </FormModal>

      <FormModal isOpen={gheModalOpen} onClose={() => setGheModalOpen(false)} title="Novo GHE" onSubmit={createGhe}>
        <div className="grid grid-cols-1 gap-3">
          <input
            className="input-field"
            value={gheForm.nomeTecnico}
            onChange={(event) => setGheForm((prev) => ({ ...prev, nomeTecnico: event.target.value }))}
            placeholder="Nome técnico do GHE"
            required
          />
          <textarea
            className="input-field"
            value={gheForm.descricaoSimilaridade}
            onChange={(event) => setGheForm((prev) => ({ ...prev, descricaoSimilaridade: event.target.value }))}
            placeholder="Descrição da similaridade de exposição"
          />
          <input
            type="number"
            min="1"
            className="input-field"
            value={gheForm.headcount}
            onChange={(event) => setGheForm((prev) => ({ ...prev, headcount: Number(event.target.value) || 1 }))}
            placeholder="Quantidade exposta"
          />
          <select className="input-field" value={gheForm.status} onChange={(event) => setGheForm((prev) => ({ ...prev, status: event.target.value }))}>
            {metadata?.gheStatusTypes?.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </FormModal>

      <FormModal isOpen={cargoModalOpen} onClose={() => setCargoModalOpen(false)} title="Novo cargo" onSubmit={createCargo}>
        <div className="grid grid-cols-1 gap-3">
          <select className="input-field" value={cargoForm.gheId} onChange={(event) => setCargoForm((prev) => ({ ...prev, gheId: event.target.value }))} required>
            <option value="">Selecione o GHE</option>
            {ghes.map((ghe) => (
              <option key={ghe.id} value={ghe.id}>
                {ghe.nomeTecnico}
              </option>
            ))}
          </select>
          <input
            className="input-field"
            value={cargoForm.nome}
            onChange={(event) => setCargoForm((prev) => ({ ...prev, nome: event.target.value }))}
            placeholder="Nome do cargo"
            required
          />
          <textarea
            className="input-field"
            value={cargoForm.descricao}
            onChange={(event) => setCargoForm((prev) => ({ ...prev, descricao: event.target.value }))}
            placeholder="Descricao"
          />
        </div>
      </FormModal>
    </div>
  );
};

export default RiskSurveyEnvironments;
