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
  const [error, setError] = useState(null);
  const [cnpjValid, setCnpjValid] = useState(true);
  const [selectedCnae, setSelectedCnae] = useState(null);

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
              secaoDescricao
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
      if (match) {
        merged.ramo = match.secaoDescricao;
      }
      setFormData(merged);
      setSelectedCnae(match || null);
    } else {
      setFormData({ ...DEFAULT_FORM });
      setSelectedCnae(null);
    }
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
      ramo: option?.secaoDescricao || ''
    }));
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
            className="input-field"
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
            required
            className={`input-field ${!cnpjValid ? 'border-red-500' : ''}`}
            placeholder="00.000.000/0000-00"
          />
          {!cnpjValid && (
            <p className="text-red-500 text-xs mt-1">CNPJ inválido</p>
          )}
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
            className="input-field"
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
            className="input-field"
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
            className="input-field"
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
            className="input-field"
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
            className="input-field"
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
            className="input-field"
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
            className="input-field"
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
