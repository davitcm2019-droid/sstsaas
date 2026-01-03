import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { empresasService } from '../../services/api';
import Cleave from 'cleave.js/react';
import 'cleave.js/dist/addons/cleave-phone.br';
import { cnpj } from 'cpf-cnpj-validator';
import cnaeData from '../../checklists/listacnae.json';

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

const EmpresaForm = ({ empresa, onSave, onCancel }) => {
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lookupError, setLookupError] = useState(null);
  const [cnpjValid, setCnpjValid] = useState(true);
  const [selectedCnae, setSelectedCnae] = useState(null);
  const [lockedFields, setLockedFields] = useState(() => new Set());
  const [manualEdit, setManualEdit] = useState(false);
  const [lastLookupCnpj, setLastLookupCnpj] = useState('');

  const cnaeOptions = useMemo(() => {
    const options = [];
    cnaeData.cnaes.forEach((secao) => {
      const secaoDescricao = secao.descricao_secao;
      secao.divisoes.forEach((divisao) => {
        divisao.grupos.forEach((grupo) => {
          grupo.classes.forEach((classe) => {
            options.push({
              value: classe.codigo_classe,
              label: `${classe.codigo_classe} - ${classe.descricao_classe}`,
              secaoDescricao,
              classeDescricao: classe.descricao_classe
            });
          });
        });
      });
    });
    return options;
  }, []);

  useEffect(() => {
    if (empresa) {
      const merged = { ...DEFAULT_FORM, ...empresa };
      const match = cnaeOptions.find(option => option.value === merged.cnae);
      if (match && !merged.ramo) {
        merged.ramo = match.classeDescricao;
      }
      setFormData(merged);
      setSelectedCnae(match || null);
    } else {
      setFormData({ ...DEFAULT_FORM });
      setSelectedCnae(null);
    }

    setLockedFields(new Set());
    setManualEdit(false);
    setLookupError(null);
    setLastLookupCnpj('');
  }, [empresa, cnaeOptions]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCnpjChange = (e) => {
    const rawValue = e.target.rawValue;
    setFormData(prev => ({ ...prev, cnpj: rawValue }));
    setLookupError(null);

    if (lastLookupCnpj && rawValue !== lastLookupCnpj) {
      setLockedFields(new Set());
      setManualEdit(false);
    }

    if (rawValue.length === 14) {
      setCnpjValid(cnpj.isValid(rawValue));
    } else {
      setCnpjValid(true);
    }
  };

  const handleCnaeChange = (option) => {
    setSelectedCnae(option);
    setError(null);
    setFormData(prev => ({
      ...prev,
      cnae: option?.value || '',
      ramo: option?.classeDescricao || ''
    }));
  };

  const isFieldLocked = (fieldName) => lockedFields.has(fieldName) && !manualEdit;

  const applyLookupData = (lookupData) => {
    const fieldsToLock = new Set();
    const nextData = {};

    Object.entries(lookupData || {}).forEach(([key, value]) => {
      if (typeof value !== 'string') return;
      const trimmed = value.trim();
      if (!trimmed) return;
      nextData[key] = trimmed;
      if (key !== 'cnpj') {
        fieldsToLock.add(key);
      }
    });

    setFormData(prev => ({ ...prev, ...nextData }));

    if (nextData.cnae) {
      const match = cnaeOptions.find(option => option.value === nextData.cnae);
      setSelectedCnae(match || null);
      if (match && !nextData.ramo) {
        setFormData(prev => ({ ...prev, ramo: match.classeDescricao }));
      }
    }

    setLockedFields(fieldsToLock);
    setManualEdit(false);
  };

  const canLookupCnpj = (cnpjDigits) => cnpjDigits?.length === 14 && cnpj.isValid(cnpjDigits);

  const runCnpjLookup = async (cnpjDigits) => {
    setLookupLoading(true);
    setLookupError(null);

    try {
      const response = await empresasService.lookupCnpj(cnpjDigits);
      applyLookupData(response.data.data);
      setLastLookupCnpj(cnpjDigits);
    } catch (err) {
      setLookupError(err.response?.data?.message || err.response?.data?.error || 'Erro ao consultar CNPJ');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCnpjBlur = () => {
    if (!canLookupCnpj(formData.cnpj)) return;
    if (formData.cnpj === lastLookupCnpj) return;
    void runCnpjLookup(formData.cnpj);
  };

  const handleCnpjLookupClick = () => {
    if (!canLookupCnpj(formData.cnpj)) {
      setLookupError('Informe um CNPJ vǭlido para buscar os dados.');
      return;
    }

    void runCnpjLookup(formData.cnpj);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.cnae) {
      setError('Selecione um CNAE válido.');
      setLoading(false);
      return;
    }

    try {
      if (empresa) {
        await empresasService.update(empresa.id, formData);
      } else {
        await empresasService.create(formData);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar empresa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome da Empresa *
          </label>
          <input
            type="text"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            required
            readOnly={isFieldLocked('nome')}
            className={`input-field ${isFieldLocked('nome') ? 'bg-gray-100' : ''}`}
            placeholder="Digite o nome da empresa"
          />
        </div>

        {/* CNPJ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CNPJ *
          </label>
          <Cleave
            options={{ delimiters: ['.', '.', '/', '-'], blocks: [2, 3, 3, 4, 2], numericOnly: true }}
            name="cnpj"
            value={formData.cnpj}
            onChange={handleCnpjChange}
            onBlur={handleCnpjBlur}
            required
            className={`input-field ${!cnpjValid ? 'border-red-500' : ''}`}
            placeholder="00.000.000/0000-00"
          />
          {!cnpjValid && (
            <p className="text-red-500 text-xs mt-1">CNPJ inválido</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCnpjLookupClick}
              disabled={lookupLoading || !canLookupCnpj(formData.cnpj)}
              className="btn-secondary text-sm"
            >
              {lookupLoading ? 'Buscando...' : 'Buscar dados'}
            </button>

            {lockedFields.size > 0 && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={manualEdit}
                  onChange={(e) => setManualEdit(e.target.checked)}
                />
                Editar manualmente
              </label>
            )}
          </div>

          {lookupError && <p className="text-red-500 text-xs mt-1">{lookupError}</p>}
        </div>

        {/* CNAE */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CNAE Principal *
          </label>
          <Select
            options={cnaeOptions}
            value={selectedCnae}
            onChange={handleCnaeChange}
            placeholder="Selecione o CNAE principal"
            isClearable
            classNamePrefix="cnae-select"
            noOptionsMessage={() => 'Nenhum CNAE encontrado'}
            styles={selectStyles}
            isDisabled={isFieldLocked('cnae')}
          />
        </div>

        {/* Tipo de atividade */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Atividade
          </label>
          <input
            type="text"
            value={formData.ramo}
            readOnly
            className="input-field bg-gray-100"
            placeholder="Selecione um CNAE para preencher automaticamente"
          />
        </div>

        {/* Endere�o */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Endereço *
          </label>
          <input
            type="text"
            name="endereco"
            value={formData.endereco}
            onChange={handleChange}
            required
            readOnly={isFieldLocked('endereco')}
            className={`input-field ${isFieldLocked('endereco') ? 'bg-gray-100' : ''}`}
            placeholder="Rua, número, bairro"
          />
        </div>

        {/* Cidade */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cidade *
          </label>
          <input
            type="text"
            name="cidade"
            value={formData.cidade}
            onChange={handleChange}
            required
            readOnly={isFieldLocked('cidade')}
            className={`input-field ${isFieldLocked('cidade') ? 'bg-gray-100' : ''}`}
            placeholder="Nome da cidade"
          />
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado *
          </label>
          <select
            name="estado"
            value={formData.estado}
            onChange={handleChange}
            required
            disabled={isFieldLocked('estado')}
            className={`input-field ${isFieldLocked('estado') ? 'bg-gray-100' : ''}`}
          >
            <option value="">Selecione o estado</option>
            {[
              'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
              'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
              'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
            ].map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>

        {/* CEP */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CEP
          </label>
          <Cleave
            options={{ delimiters: ['-'], blocks: [5, 3], numericOnly: true }}
            name="cep"
            value={formData.cep}
            onChange={handleChange}
            readOnly={isFieldLocked('cep')}
            className={`input-field ${isFieldLocked('cep') ? 'bg-gray-100' : ''}`}
            placeholder="00000-000"
          />
        </div>

        {/* Telefone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefone
          </label>
          <Cleave
            options={{ phone: true, phoneRegionCode: 'BR' }}
            name="telefone"
            value={formData.telefone}
            onChange={handleChange}
            readOnly={isFieldLocked('telefone')}
            className={`input-field ${isFieldLocked('telefone') ? 'bg-gray-100' : ''}`}
            placeholder="(00) 00000-0000"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            readOnly={isFieldLocked('email')}
            className={`input-field ${isFieldLocked('email') ? 'bg-gray-100' : ''}`}
            placeholder="empresa@exemplo.com"
          />
        </div>

        {/* Respons�vel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Responsável
          </label>
          <input
            type="text"
            name="responsavel"
            value={formData.responsavel}
            onChange={handleChange}
            readOnly={isFieldLocked('responsavel')}
            className={`input-field ${isFieldLocked('responsavel') ? 'bg-gray-100' : ''}`}
            placeholder="Nome do responsável"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="input-field"
          >
            <option value="ativa">Ativa</option>
            <option value="inativa">Inativa</option>
            <option value="suspensa">Suspensa</option>
          </select>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}

      <div className="flex justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !cnpjValid}
          className="btn-primary"
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
};

export default EmpresaForm;
