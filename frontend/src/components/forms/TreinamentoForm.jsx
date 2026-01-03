import React, { useState, useEffect } from 'react';
import { empresasService, treinamentosService } from '../../services/api';

const DEFAULT_FORM = {
  titulo: '',
  descricao: '',
  empresaId: '',
  tipo: 'obrigatorio',
  duracao: '',
  instrutor: '',
  dataInicio: '',
  dataFim: '',
  local: '',
  maxParticipantes: '',
  participantes: 0,
  status: 'agendado',
  observacoes: ''
};

const TreinamentoForm = ({ treinamento, onSave, onCancel }) => {
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEmpresas();
  }, []);

  useEffect(() => {
    if (treinamento) {
      setFormData({
        ...DEFAULT_FORM,
        ...treinamento,
        empresaId: treinamento.empresaId ? String(treinamento.empresaId) : '',
        duracao: treinamento.duracao !== undefined ? String(treinamento.duracao) : '',
        maxParticipantes:
          treinamento.maxParticipantes !== undefined ? String(treinamento.maxParticipantes) : '',
        participantes: treinamento.participantes ?? 0,
      });
    } else {
      setFormData({ ...DEFAULT_FORM });
    }
  }, [treinamento]);

  const loadEmpresas = async () => {
    setError(null);
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
    setFormData((prev) => ({
      ...prev,
      [name]: value
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
        duracao: formData.duracao ? parseInt(formData.duracao, 10) : 0,
        maxParticipantes: formData.maxParticipantes ? parseInt(formData.maxParticipantes, 10) : 0,
        participantes: formData.participantes ? parseInt(formData.participantes, 10) : 0
      };

      if (payload.empresaId) {
        const empresaSelecionada = empresas.find((empresa) => empresa.id === payload.empresaId);
        if (empresaSelecionada) {
          payload.empresaNome = empresaSelecionada.nome;
        }
      }

      if (treinamento?.id) {
        await treinamentosService.update(treinamento.id, payload);
      } else {
        await treinamentosService.create(payload);
      }

      onSave();
    } catch (err) {
      console.error('Erro ao salvar treinamento:', err);
      setError(err.response?.data?.error || 'Erro ao salvar treinamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Titulo do treinamento *
          </label>
          <input
            type="text"
            name="titulo"
            value={formData.titulo}
            onChange={handleChange}
            required
            className="input-field"
            placeholder="Ex: Treinamento de Seguranca do Trabalho"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descricao
          </label>
          <textarea
            name="descricao"
            value={formData.descricao}
            onChange={handleChange}
            rows={3}
            className="input-field"
            placeholder="Descreva o conteudo do treinamento"
          />
        </div>

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
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de treinamento *
          </label>
          <select
            name="tipo"
            value={formData.tipo}
            onChange={handleChange}
            required
            className="input-field"
          >
            <option value="obrigatorio">Obrigatorio</option>
            <option value="complementar">Complementar</option>
            <option value="reciclagem">Reciclagem</option>
            <option value="especifico">Especifico</option>
            <option value="emergencia">Emergencia</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duracao (horas) *
          </label>
          <input
            type="number"
            name="duracao"
            value={formData.duracao}
            onChange={handleChange}
            required
            min="1"
            className="input-field"
            placeholder="Ex: 8"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Instrutor *
          </label>
          <input
            type="text"
            name="instrutor"
            value={formData.instrutor}
            onChange={handleChange}
            required
            className="input-field"
            placeholder="Nome do instrutor"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data de inicio *
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
            Data de fim *
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
            Local *
          </label>
          <input
            type="text"
            name="local"
            value={formData.local}
            onChange={handleChange}
            required
            className="input-field"
            placeholder="Local do treinamento"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Maximo de participantes
          </label>
          <input
            type="number"
            name="maxParticipantes"
            value={formData.maxParticipantes}
            onChange={handleChange}
            min="1"
            className="input-field"
            placeholder="Ex: 20"
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
            <option value="agendado">Agendado</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluido</option>
            <option value="cancelado">Cancelado</option>
            <option value="adiado">Adiado</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observacoes
        </label>
        <textarea
          name="observacoes"
          value={formData.observacoes}
          onChange={handleChange}
          rows={3}
          className="input-field"
          placeholder="Observacoes adicionais sobre o treinamento"
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

export default TreinamentoForm;
