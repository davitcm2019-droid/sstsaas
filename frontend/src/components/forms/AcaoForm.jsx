import React, { useState, useEffect } from 'react';
import { empresasService, usuariosService, acoesService } from '../../services/api';

const DEFAULT_FORM = {
  titulo: '',
  descricao: '',
  empresaId: '',
  responsavelId: '',
  tipo: 'preventiva',
  prioridade: 'media',
  status: 'pendente',
  dataInicio: '',
  dataFim: '',
  custo: '',
  observacoes: ''
};

const AcaoForm = ({ acao, onSave, onCancel }) => {
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  const [empresas, setEmpresas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (acao) {
      setFormData({
        ...DEFAULT_FORM,
        ...acao,
        empresaId: acao.empresaId ? String(acao.empresaId) : '',
        responsavelId: acao.responsavelId ? String(acao.responsavelId) : '',
        custo: acao.custo !== undefined && acao.custo !== null ? String(acao.custo) : ''
      });
    } else {
      setFormData({ ...DEFAULT_FORM });
    }
  }, [acao]);

  const loadData = async () => {
    setError(null);
    try {
      const [empresasRes, usuariosRes] = await Promise.all([
        empresasService.getAll(),
        usuariosService.getAll()
      ]);
      setEmpresas(empresasRes.data.data || []);
      setUsuarios(usuariosRes.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar empresas ou usuarios');
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
        responsavelId: formData.responsavelId ? parseInt(formData.responsavelId, 10) : null,
        custo: formData.custo ? parseFloat(formData.custo) : 0
      };

      if (payload.empresaId) {
        const empresaSelecionada = empresas.find((empresa) => empresa.id === payload.empresaId);
        if (empresaSelecionada) {
          payload.empresaNome = empresaSelecionada.nome;
        }
      }

      if (payload.responsavelId) {
        const responsavelSelecionado = usuarios.find((usuario) => usuario.id === payload.responsavelId);
        if (responsavelSelecionado) {
          payload.responsavelNome = responsavelSelecionado.nome;
        }
      }

      if (acao?.id) {
        await acoesService.update(acao.id, payload);
      } else {
        await acoesService.create(payload);
      }

      onSave();
    } catch (err) {
      console.error('Erro ao salvar acao:', err);
      setError(err.response?.data?.error || 'Erro ao salvar acao');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Titulo da acao *
          </label>
          <input
            type="text"
            name="titulo"
            value={formData.titulo}
            onChange={handleChange}
            required
            className="input-field"
            placeholder="Ex: Implementacao de EPIs para soldadores"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descricao *
          </label>
          <textarea
            name="descricao"
            value={formData.descricao}
            onChange={handleChange}
            required
            rows={3}
            className="input-field"
            placeholder="Descreva detalhadamente a acao"
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
            Responsavel *
          </label>
          <select
            name="responsavelId"
            value={formData.responsavelId}
            onChange={handleChange}
            required
            className="input-field"
          >
            <option value="">Selecione o responsavel</option>
            {usuarios.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de acao *
          </label>
          <select
            name="tipo"
            value={formData.tipo}
            onChange={handleChange}
            required
            className="input-field"
          >
            <option value="preventiva">Preventiva</option>
            <option value="corretiva">Corretiva</option>
            <option value="melhoria">Melhoria</option>
            <option value="emergencia">Emergencia</option>
            <option value="manutencao">Manutencao</option>
            <option value="treinamento">Treinamento</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prioridade *
          </label>
          <select
            name="prioridade"
            value={formData.prioridade}
            onChange={handleChange}
            required
            className="input-field"
          >
            <option value="baixa">Baixa</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="critica">Critica</option>
          </select>
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
            <option value="pendente">Pendente</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluida">Concluida</option>
            <option value="cancelada">Cancelada</option>
            <option value="suspensa">Suspensa</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data de inicio
          </label>
          <input
            type="date"
            name="dataInicio"
            value={formData.dataInicio}
            onChange={handleChange}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data de fim
          </label>
          <input
            type="date"
            name="dataFim"
            value={formData.dataFim}
            onChange={handleChange}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custo estimado (R$)
          </label>
          <input
            type="number"
            name="custo"
            value={formData.custo}
            onChange={handleChange}
            min="0"
            step="0.01"
            className="input-field"
            placeholder="0.00"
          />
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
          placeholder="Observacoes adicionais sobre a acao"
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

export default AcaoForm;
