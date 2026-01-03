import React, { useState, useEffect } from 'react';
import { incidentsService, empresasService } from '../../services/api';

const defaultForm = {
  titulo: '',
  descricao: '',
  empresaId: '',
  local: '',
  tipo: 'quase_acidente',
  severidade: 'baixa',
  status: 'registrado',
  dataOcorrencia: '',
  responsavelRegistro: '',
  custosDiretos: '',
  custosIndiretos: '',
  tempoPerdido: '',
  afastamentos: '',
  causas: '',
  acoesCorretivas: ''
};

const IncidentForm = ({ incident, onSave, onCancel }) => {
  const [formData, setFormData] = useState(defaultForm);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEmpresas();
  }, []);

  useEffect(() => {
    if (incident) {
      setFormData({
        ...defaultForm,
        ...incident,
        empresaId: incident.empresaId ? String(incident.empresaId) : '',
        dataOcorrencia: incident.dataOcorrencia
          ? new Date(incident.dataOcorrencia).toISOString().slice(0, 16)
          : '',
        custosDiretos: incident.custos?.diretos ?? '',
        custosIndiretos: incident.custos?.indiretos ?? '',
        causas: incident.causas ? incident.causas.join('\n') : '',
        acoesCorretivas: incident.acoesCorretivas ? incident.acoesCorretivas.join('\n') : ''
      });
    } else {
      setFormData(defaultForm);
    }
  }, [incident]);

  const loadEmpresas = async () => {
    try {
      const response = await empresasService.getAll();
      setEmpresas(response.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const selectedEmpresa = empresas.find(emp => String(emp.id) === formData.empresaId);
    const custosDiretos = Number(formData.custosDiretos) || 0;
    const custosIndiretos = Number(formData.custosIndiretos) || 0;

    const payload = {
      titulo: formData.titulo,
      descricao: formData.descricao,
      empresaId: formData.empresaId ? parseInt(formData.empresaId) : undefined,
      empresaNome: selectedEmpresa?.nome,
      local: formData.local,
      tipo: formData.tipo,
      severidade: formData.severidade,
      status: formData.status,
      dataOcorrencia: formData.dataOcorrencia
        ? new Date(formData.dataOcorrencia).toISOString()
        : new Date().toISOString(),
      responsavelRegistro: formData.responsavelRegistro,
      custos: {
        diretos: custosDiretos,
        indiretos: custosIndiretos,
        total: custosDiretos + custosIndiretos
      },
      tempoPerdido: Number(formData.tempoPerdido) || 0,
      afastamentos: Number(formData.afastamentos) || 0,
      causas: formData.causas
        ? formData.causas.split('\n').map(item => item.trim()).filter(Boolean)
        : [],
      acoesCorretivas: formData.acoesCorretivas
        ? formData.acoesCorretivas.split('\n').map(item => item.trim()).filter(Boolean)
        : []
    };

    try {
      if (incident?.id) {
        await incidentsService.update(incident.id, payload);
      } else {
        await incidentsService.create(payload);
      }
      onSave?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar incidente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
          <input
            type="text"
            name="titulo"
            value={formData.titulo}
            onChange={handleChange}
            required
            className="input-field"
            placeholder="Descreva o incidente"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Empresa *</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
          <select
            name="tipo"
            value={formData.tipo}
            onChange={handleChange}
            className="input-field"
          >
            <option value="quase_acidente">Quase Acidente</option>
            <option value="acidente_leve">Acidente Leve</option>
            <option value="acidente_moderado">Acidente Moderado</option>
            <option value="acidente_grave">Acidente Grave</option>
            <option value="acidente_fatal">Acidente Fatal</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Severidade *</label>
          <select
            name="severidade"
            value={formData.severidade}
            onChange={handleChange}
            className="input-field"
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="input-field"
          >
            <option value="registrado">Registrado</option>
            <option value="investigando">Investigando</option>
            <option value="analisando">Analisando</option>
            <option value="implementando">Implementando</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Local *</label>
          <input
            type="text"
            name="local"
            value={formData.local}
            onChange={handleChange}
            required
            className="input-field"
            placeholder="Setor ou unidade"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data da Ocorrência *</label>
          <input
            type="datetime-local"
            name="dataOcorrencia"
            value={formData.dataOcorrencia}
            onChange={handleChange}
            required
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Responsável pelo Registro *
          </label>
          <input
            type="text"
            name="responsavelRegistro"
            value={formData.responsavelRegistro}
            onChange={handleChange}
            required
            className="input-field"
            placeholder="Nome do responsável"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
        <textarea
          name="descricao"
          value={formData.descricao}
          onChange={handleChange}
          rows={3}
          className="input-field"
          required
          placeholder="Descreva o que aconteceu"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custos Diretos (R$)
          </label>
          <input
            type="number"
            name="custosDiretos"
            min="0"
            step="0.01"
            value={formData.custosDiretos}
            onChange={handleChange}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custos Indiretos (R$)
          </label>
          <input
            type="number"
            name="custosIndiretos"
            min="0"
            step="0.01"
            value={formData.custosIndiretos}
            onChange={handleChange}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tempo Perdido (h)</label>
          <input
            type="number"
            name="tempoPerdido"
            min="0"
            step="0.5"
            value={formData.tempoPerdido}
            onChange={handleChange}
            className="input-field"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Afastamentos (dias)
          </label>
          <input
            type="number"
            name="afastamentos"
            min="0"
            value={formData.afastamentos}
            onChange={handleChange}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Causas (uma por linha)
          </label>
          <textarea
            name="causas"
            value={formData.causas}
            onChange={handleChange}
            rows={3}
            className="input-field"
            placeholder="Liste as causas identificadas"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ações Corretivas (uma por linha)
          </label>
          <textarea
            name="acoesCorretivas"
            value={formData.acoesCorretivas}
            onChange={handleChange}
            rows={3}
            className="input-field"
            placeholder="Liste as ações corretivas planejadas"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Salvando...' : incident ? 'Salvar alterações' : 'Registrar incidente'}
        </button>
      </div>
    </form>
  );
};

export default IncidentForm;
