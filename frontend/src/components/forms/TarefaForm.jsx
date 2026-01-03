import React, { useState, useEffect } from 'react';
import { tarefasService, empresasService, usuariosService } from '../../services/api';

const TarefaForm = ({ tarefa, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    empresaId: '',
    responsavelId: '',
    prioridade: 'media',
    status: 'pendente',
    dataInicio: '',
    dataFim: '',
    tipo: 'geral'
  });

  const [empresas, setEmpresas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
    if (tarefa) {
      setFormData(tarefa);
    }
  }, [tarefa]);

  const loadData = async () => {
    try {
      const [empresasRes, usuariosRes] = await Promise.all([
        empresasService.getAll(),
        usuariosService.getAll()
      ]);
      setEmpresas(empresasRes.data.data || []);
      setUsuarios(usuariosRes.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
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

    try {
      if (tarefa) {
        await tarefasService.update(tarefa.id, formData);
      } else {
        await tarefasService.create(formData);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar tarefa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título *
          </label>
          <input
            type="text"
            name="titulo"
            value={formData.titulo}
            onChange={handleChange}
            required
            className="input-field"
            placeholder="Digite o título da tarefa"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descrição
          </label>
          <textarea
            name="descricao"
            value={formData.descricao}
            onChange={handleChange}
            rows={3}
            className="input-field"
            placeholder="Descreva a tarefa"
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
            {empresas.map(empresa => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Responsável *
          </label>
          <select
            name="responsavelId"
            value={formData.responsavelId}
            onChange={handleChange}
            required
            className="input-field"
          >
            <option value="">Selecione o responsável</option>
            {usuarios.map(usuario => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nome}
              </option>
            ))}
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
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
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
            <option value="em_andamento">Em Andamento</option>
            <option value="concluida">Concluída</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data de Início
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
            Data de Fim
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
            Tipo de Tarefa
          </label>
          <select
            name="tipo"
            value={formData.tipo}
            onChange={handleChange}
            className="input-field"
          >
            <option value="geral">Geral</option>
            <option value="inspecao">Inspeção</option>
            <option value="treinamento">Treinamento</option>
            <option value="manutencao">Manutenção</option>
            <option value="auditoria">Auditoria</option>
            <option value="emergencia">Emergência</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm mt-2">
          {error}
        </div>
      )}
    </form>
  );
};

export default TarefaForm;
