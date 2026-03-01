import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import FormModal from '../components/FormModal';
import { empresasService, riskSurveyService } from '../services/api';

const ENV_FORM_DEFAULT = {
  empresaId: '',
  unidade: '',
  setor: '',
  nome: '',
  tipo: 'sala_tecnica'
};

const CARGO_FORM_DEFAULT = {
  nome: '',
  descricao: ''
};

const RiskSurveyEnvironments = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('');
  const [cargos, setCargos] = useState([]);
  const [envModalOpen, setEnvModalOpen] = useState(false);
  const [cargoModalOpen, setCargoModalOpen] = useState(false);
  const [envForm, setEnvForm] = useState(ENV_FORM_DEFAULT);
  const [cargoForm, setCargoForm] = useState(CARGO_FORM_DEFAULT);

  const selectedEnvironment = useMemo(
    () => environments.find((item) => String(item.id) === String(selectedEnvironmentId)) || null,
    [environments, selectedEnvironmentId]
  );

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [metadataRes, empresasRes, envRes] = await Promise.all([
        riskSurveyService.getMetadata(),
        empresasService.getAll(),
        riskSurveyService.listEnvironments()
      ]);

      const envRows = envRes.data.data || [];
      setMetadata(metadataRes.data.data || null);
      setEmpresas(empresasRes.data.data || []);
      setEnvironments(envRows);
      if (!envRows.some((item) => String(item.id) === String(selectedEnvironmentId))) {
        setSelectedEnvironmentId(envRows[0]?.id || '');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao carregar ambientes.');
    } finally {
      setLoading(false);
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

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    void loadCargos();
  }, [selectedEnvironmentId]);

  const createEnvironment = async (event) => {
    event.preventDefault();
    try {
      await riskSurveyService.createEnvironment(envForm);
      setEnvModalOpen(false);
      setEnvForm(ENV_FORM_DEFAULT);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao criar ambiente.');
    }
  };

  const createCargo = async (event) => {
    event.preventDefault();
    if (!selectedEnvironmentId) return;
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caracterização de Ambientes</h1>
          <p className="text-sm text-gray-500">Etapa 2: cadastre Ambiente antes de criar atividades e riscos.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => setEnvModalOpen(true)}>
            <Plus className="mr-2 inline h-4 w-4" />
            Novo ambiente
          </button>
          <Link to="/levantamento-riscos" className="btn-secondary">
            Ir para atividades e riscos
          </Link>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Ambientes</h2>
          <div className="space-y-2">
            {environments.map((item) => (
              <button
                key={item.id}
                className={`w-full rounded-lg border p-3 text-left ${String(item.id) === String(selectedEnvironmentId) ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-white'}`}
                onClick={() => setSelectedEnvironmentId(item.id)}
              >
                <div className="text-sm font-semibold text-gray-900">{item.nome}</div>
                <div className="text-xs text-gray-500">
                  {item.unidade} / {item.setor}
                </div>
              </button>
            ))}
            {environments.length === 0 && <div className="text-sm text-gray-500">Nenhum ambiente cadastrado.</div>}
          </div>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Cargos no Ambiente</h2>
            <button className="btn-secondary px-3 py-1 text-xs" disabled={!selectedEnvironment} onClick={() => setCargoModalOpen(true)}>
              <Plus className="mr-1 inline h-3 w-3" />
              Novo cargo
            </button>
          </div>
          {selectedEnvironment && (
            <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
              Ambiente selecionado: <strong>{selectedEnvironment.nome}</strong>
            </div>
          )}
          <div className="space-y-2">
            {cargos.map((cargo) => (
              <div key={cargo.id} className="rounded-lg border border-gray-200 p-3">
                <div className="text-sm font-semibold text-gray-900">{cargo.nome}</div>
                <div className="text-xs text-gray-500">{cargo.descricao || 'Sem descrição'}</div>
              </div>
            ))}
            {!cargos.length && <div className="text-sm text-gray-500">Nenhum cargo cadastrado para este ambiente.</div>}
          </div>
        </div>
      </div>

      <FormModal isOpen={envModalOpen} onClose={() => setEnvModalOpen(false)} title="Novo Ambiente" onSubmit={createEnvironment}>
        <div className="grid grid-cols-1 gap-3">
          <select className="input-field" value={envForm.empresaId} onChange={(event) => setEnvForm((prev) => ({ ...prev, empresaId: event.target.value }))} required>
            <option value="">Selecione a empresa</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome}
              </option>
            ))}
          </select>
          <input className="input-field" value={envForm.unidade} onChange={(event) => setEnvForm((prev) => ({ ...prev, unidade: event.target.value }))} placeholder="Unidade" required />
          <input className="input-field" value={envForm.setor} onChange={(event) => setEnvForm((prev) => ({ ...prev, setor: event.target.value }))} placeholder="Setor" required />
          <input className="input-field" value={envForm.nome} onChange={(event) => setEnvForm((prev) => ({ ...prev, nome: event.target.value }))} placeholder="Nome do ambiente" required />
          <select className="input-field" value={envForm.tipo} onChange={(event) => setEnvForm((prev) => ({ ...prev, tipo: event.target.value }))}>
            {metadata?.environmentTypes?.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </FormModal>

      <FormModal isOpen={cargoModalOpen} onClose={() => setCargoModalOpen(false)} title="Novo Cargo" onSubmit={createCargo}>
        <div className="grid grid-cols-1 gap-3">
          <input className="input-field" value={cargoForm.nome} onChange={(event) => setCargoForm((prev) => ({ ...prev, nome: event.target.value }))} placeholder="Nome do cargo" required />
          <textarea className="input-field" value={cargoForm.descricao} onChange={(event) => setCargoForm((prev) => ({ ...prev, descricao: event.target.value }))} placeholder="Descrição" />
        </div>
      </FormModal>
    </div>
  );
};

export default RiskSurveyEnvironments;
