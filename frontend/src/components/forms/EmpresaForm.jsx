import React, { useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import Cleave from 'cleave.js/react';
import 'cleave.js/dist/addons/cleave-phone.br';
import { cnpj } from 'cpf-cnpj-validator';
import { empresasService } from '../../services/api';

const DEFAULT_FORM = {
  nome: '',
  cnpj: '',
  cnae: '',
  ramo: '',
  endereco: '',
  cidade: '',
  estado: '',
  cep: '',
  telefone: '',
  email: '',
  responsavel: '',
  status: 'ativa'
};

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '2.5rem',
    borderRadius: '0.75rem',
    borderColor: state.isFocused ? '#6366f1' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px #6366f1' : 'none',
    '&:hover': {
      borderColor: '#6366f1'
    }
  }),
  menu: (base) => ({
    ...base,
    zIndex: 20
  })
};

const normalizeCnaeSection = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return '';
  const sectionMatch = raw.match(/^([A-U])(?:\b|[\s\-|])/);
  if (sectionMatch) return sectionMatch[1];
  if (/^[A-U]$/.test(raw)) return raw;
  return '';
};

const EmpresaForm = ({ empresa, onSave, onCancel }) => {
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cnpjValid, setCnpjValid] = useState(true);
  const [selectedCnae, setSelectedCnae] = useState(null);
  const [cnaeCatalog, setCnaeCatalog] = useState([]);
  const [loadingCnaeCatalog, setLoadingCnaeCatalog] = useState(false);

  const cnaeOptions = useMemo(
    () =>
      (cnaeCatalog || []).map((item) => ({
        value: String(item.code || '').toUpperCase(),
        label: `${String(item.code || '').toUpperCase()}${item.divisionRange ? ` (${item.divisionRange})` : ''} - ${item.description || ''}`,
        secaoDescricao: item.description || ''
      })),
    [cnaeCatalog]
  );

  const loadCnaeCatalog = async () => {
    try {
      setLoadingCnaeCatalog(true);
      const response = await empresasService.getCnaes();
      setCnaeCatalog(response.data?.data || []);
    } catch (catalogError) {
      console.error('Erro ao carregar secoes CNAE:', catalogError);
      setCnaeCatalog([]);
    } finally {
      setLoadingCnaeCatalog(false);
    }
  };

  useEffect(() => {
    void loadCnaeCatalog();
  }, []);

  useEffect(() => {
    const merged = empresa ? { ...DEFAULT_FORM, ...empresa } : { ...DEFAULT_FORM };
    const normalizedSection = normalizeCnaeSection(merged.cnae);
    const match = normalizedSection
      ? cnaeOptions.find((option) => option.value === normalizedSection)
      : null;

    if (match) {
      merged.cnae = match.value;
      merged.ramo = match.secaoDescricao;
      setSelectedCnae(match);
    } else {
      setSelectedCnae(
        merged.cnae
          ? {
              value: merged.cnae,
              label: `${merged.cnae} - Secao fora do catalogo atual`,
              secaoDescricao: merged.ramo || ''
            }
          : null
      );
    }

    setFormData(merged);
  }, [empresa, cnaeOptions]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCnpjChange = (event) => {
    const rawValue = event.target.rawValue;
    setFormData((prev) => ({ ...prev, cnpj: rawValue }));

    if (rawValue.length === 14) {
      setCnpjValid(cnpj.isValid(rawValue));
    } else {
      setCnpjValid(true);
    }
  };

  const handleCnaeChange = (option) => {
    setSelectedCnae(option);
    setError(null);
    setFormData((prev) => ({
      ...prev,
      cnae: option?.value || '',
      ramo: option?.secaoDescricao || ''
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedSection = normalizeCnaeSection(formData.cnae);
    if (!normalizedSection) {
      setError('Selecione uma secao CNAE valida (A-U).');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        cnae: normalizedSection
      };

      if (empresa) {
        await empresasService.update(empresa.id, payload);
      } else {
        await empresasService.create(payload);
      }
      onSave();
    } catch (submitError) {
      setError(submitError.response?.data?.error || submitError.response?.data?.message || 'Erro ao salvar empresa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nome da Empresa *</label>
          <input
            type="text"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            required
            className="input-field"
            placeholder="Digite o nome da empresa"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">CNPJ *</label>
          <Cleave
            options={{ delimiters: ['.', '.', '/', '-'], blocks: [2, 3, 3, 4, 2], numericOnly: true }}
            name="cnpj"
            value={formData.cnpj}
            onChange={handleCnpjChange}
            required
            className={`input-field ${!cnpjValid ? 'border-red-500' : ''}`}
            placeholder="00.000.000/0000-00"
          />
          {!cnpjValid && <p className="mt-1 text-xs text-red-500">CNPJ invalido</p>}
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Secao CNAE *</label>
          <Select
            options={cnaeOptions}
            value={selectedCnae}
            onChange={handleCnaeChange}
            placeholder={loadingCnaeCatalog ? 'Carregando secoes CNAE...' : 'Selecione a secao CNAE (A-U)'}
            isClearable
            isLoading={loadingCnaeCatalog}
            classNamePrefix="cnae-select"
            noOptionsMessage={() => 'Nenhuma secao CNAE encontrada'}
            styles={selectStyles}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de Atividade</label>
          <input
            type="text"
            value={formData.ramo}
            readOnly
            className="input-field bg-gray-100"
            placeholder="Selecione uma secao CNAE para preencher automaticamente"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Endereco *</label>
          <input
            type="text"
            name="endereco"
            value={formData.endereco}
            onChange={handleChange}
            required
            className="input-field"
            placeholder="Rua, numero, bairro"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Cidade *</label>
          <input
            type="text"
            name="cidade"
            value={formData.cidade}
            onChange={handleChange}
            required
            className="input-field"
            placeholder="Nome da cidade"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Estado *</label>
          <select name="estado" value={formData.estado} onChange={handleChange} required className="input-field">
            <option value="">Selecione o estado</option>
            {[
              'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
              'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
              'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
            ].map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">CEP</label>
          <Cleave
            options={{ delimiters: ['-'], blocks: [5, 3], numericOnly: true }}
            name="cep"
            value={formData.cep}
            onChange={handleChange}
            className="input-field"
            placeholder="00000-000"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Telefone</label>
          <Cleave
            options={{ phone: true, phoneRegionCode: 'BR' }}
            name="telefone"
            value={formData.telefone}
            onChange={handleChange}
            className="input-field"
            placeholder="(00) 00000-0000"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="input-field"
            placeholder="empresa@exemplo.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Responsavel</label>
          <input
            type="text"
            name="responsavel"
            value={formData.responsavel}
            onChange={handleChange}
            className="input-field"
            placeholder="Nome do responsavel"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
          <select name="status" value={formData.status} onChange={handleChange} className="input-field">
            <option value="ativa">Ativa</option>
            <option value="inativa">Inativa</option>
            <option value="suspensa">Suspensa</option>
          </select>
        </div>
      </div>

      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancelar
        </button>
        <button type="submit" disabled={loading || !cnpjValid} className="btn-primary">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
};

export default EmpresaForm;
