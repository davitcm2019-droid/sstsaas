import React, { useState, useEffect } from 'react';
import { tarefasService, empresasService, usuariosService } from '../../services/api';
import { X } from 'lucide-react';

const ModalTarefaForm = ({ tarefa, isOpen, onSave, onCancel }) => {
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
    if (isOpen) {
      loadData();
      if (tarefa) {
        setFormData(tarefa);
      } else {
        // Reset form quando abrir para nova tarefa
        setFormData({
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
      }
    }
  }, [isOpen, tarefa]);

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
      setError('Erro ao carregar dados das empresas e usuários');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {tarefa ? 'Editar Tarefa' : 'Nova Tarefa'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Conteúdo do Formulário */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Título */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  placeholder="Digite o título da tarefa"
                />
              </div>

              {/* Descrição */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 resize-vertical"
                  placeholder="Descreva a tarefa em detalhes..."
                />
              </div>

              {/* Empresa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empresa *
                </label>
                <select
                  name="empresaId"
                  value={formData.empresaId}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white"
                >
                  <option value="">Selecione a empresa</option>
                  {empresas.map(empresa => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Responsável */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Responsável *
                </label>
                <select
                  name="responsavelId"
                  value={formData.responsavelId}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white"
                >
                  <option value="">Selecione o responsável</option>
                  {usuarios.map(usuario => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prioridade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridade *
                </label>
                <select
                  name="prioridade"
                  value={formData.prioridade}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white"
                >
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluida">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>

              {/* Data de Início */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Início
                </label>
                <input
                  type="date"
                  name="dataInicio"
                  value={formData.dataInicio}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                />
              </div>

              {/* Data de Fim */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Fim
                </label>
                <input
                  type="date"
                  name="dataFim"
                  value={formData.dataFim}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                />
              </div>

              {/* Tipo de Tarefa */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Tarefa
                </label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white"
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

            {/* Mensagem de Erro */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : (tarefa ? 'Atualizar Tarefa' : 'Criar Tarefa')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ModalTarefaForm;