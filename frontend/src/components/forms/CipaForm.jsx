import React, { useState, useEffect } from 'react';
import { empresasService, cipasService } from '../../services/api';

const DEFAULT_FORM = {
  empresaId: '',
  gestao: '',
  dataInicio: '',
  dataFim: '',
  presidente: '',
  vicePresidente: '',
  secretario: '',
  membros: [],
  status: 'ativa',
  observacoes: ''
};

const CipaForm = ({ cipa, onSave, onCancel }) => {
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });

  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEmpresas();
  }, []);

  useEffect(() => {
    if (cipa) {
      setFormData({
        ...DEFAULT_FORM,
        ...cipa,
        empresaId: cipa.empresaId ? String(cipa.empresaId) : '',
        membros: Array.isArray(cipa.membros)
          ? cipa.membros.map(membro => ({ ...membro }))
          : [],
        observacoes: cipa.observacoes || ''
      });
    } else {
      setFormData({ ...DEFAULT_FORM });
    }
  }, [cipa]);

  const loadEmpresas = async () => {
    try {
      const response = await empresasService.getAll();
      setEmpresas(response.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
      setError('Erro ao carregar empresas');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMembroChange = (index, field, value) => {
    const novosMembros = [...formData.membros];
    novosMembros[index] = {
      ...novosMembros[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      membros: novosMembros
    }));
  };

  const addMembro = () => {
    setFormData(prev => ({
      ...prev,
      membros: [...prev.membros, { nome: '', cargo: '', setor: '' }]
    }));
  };

  const removeMembro = (index) => {
    setFormData(prev => ({
      ...prev,
      membros: prev.membros.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        empresaId: formData.empresaId ? parseInt(formData.empresaId, 10) : null,
        membros: Array.isArray(formData.membros)
          ? formData.membros.map(membro => ({
              nome: membro.nome || '',
              cargo: membro.cargo || '',
              setor: membro.setor || ''
            }))
          : [],
      };

      if (payload.empresaId) {
        const empresaSelecionada = empresas.find(emp => emp.id === payload.empresaId);
        if (empresaSelecionada) {
          payload.empresaNome = empresaSelecionada.nome;
        }
      }

      if (cipa?.id) {
        await cipasService.update(cipa.id, payload);
      } else {
        await cipasService.create(payload);
      }

      onSave();
    } catch (err) {
      console.error('Erro ao salvar CIPA:', err);
      setError(err.response?.data?.error || 'Erro ao salvar CIPA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Empresa *
          </label>
          <select
            name="empresaId"
            value={formData.empresaId}
            onChange={handleChange}
            required
            className="input-field"
          >
            <option value="">Selecione a empresa</option>
            {empresas.map(empresa => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gestão *
          </label>
          <input
            type="text"
            name="gestao"
            value={formData.gestao}
            onChange={handleChange}
            required
            className="input-field"
            placeholder="Ex: 2024/2025"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data de Início *
          </label>
          <input
            type="date"
            name="dataInicio"
            value={formData.dataInicio}
            onChange={handleChange}
            required
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data de Fim *
          </label>
          <input
            type="date"
            name="dataFim"
            value={formData.dataFim}
            onChange={handleChange}
            required
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Presidente *
          </label>
          <input
            type="text"
            name="presidente"
            value={formData.presidente}
            onChange={handleChange}
            required
            className="input-field"
            placeholder="Nome do presidente"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vice-Presidente
          </label>
          <input
            type="text"
            name="vicePresidente"
            value={formData.vicePresidente}
            onChange={handleChange}
            className="input-field"
            placeholder="Nome do vice-presidente"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Secretário
          </label>
          <input
            type="text"
            name="secretario"
            value={formData.secretario}
            onChange={handleChange}
            className="input-field"
            placeholder="Nome do secretário"
          />
        </div>

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

      {/* Membros da CIPA */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Membros da CIPA
          </label>
          <button
            type="button"
            onClick={addMembro}
            className="btn-primary text-sm py-1 px-3"
          >
            Adicionar Membro
          </button>
        </div>

        {formData.membros.map((membro, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 p-3 border border-gray-200 rounded-lg">
            <input
              type="text"
              placeholder="Nome do membro"
              value={membro.nome}
              onChange={(e) => handleMembroChange(index, 'nome', e.target.value)}
              className="input-field text-sm"
            />
            <input
              type="text"
              placeholder="Cargo"
              value={membro.cargo}
              onChange={(e) => handleMembroChange(index, 'cargo', e.target.value)}
              className="input-field text-sm"
            />
            <input
              type="text"
              placeholder="Setor"
              value={membro.setor}
              onChange={(e) => handleMembroChange(index, 'setor', e.target.value)}
              className="input-field text-sm"
            />
            <button
              type="button"
              onClick={() => removeMembro(index)}
              className="btn-secondary text-sm py-1 px-3"
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observações
        </label>
        <textarea
          name="observacoes"
          value={formData.observacoes}
          onChange={handleChange}
          rows={3}
          className="input-field"
          placeholder="Observações adicionais"
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm mt-2">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
};

export default CipaForm;
