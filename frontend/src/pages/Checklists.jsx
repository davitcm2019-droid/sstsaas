import { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Play,
  CheckCircle,
  Clock,
  Building2,
  User
} from 'lucide-react';
import { checklistsService } from '../services/api';
import ChecklistModal from '../components/ChecklistModal';
import CreateChecklistModal from '../components/CreateChecklistModal';

const Checklists = () => {
  const [checklists, setChecklists] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    active: ''
  });
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [searchTerm, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [checklistsRes, inspectionsRes] = await Promise.all([
        checklistsService.getAll(filters),
        checklistsService.getInspections()
      ]);
      setChecklists(checklistsRes.data.data);
      setInspections(inspectionsRes.data.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartInspection = (checklist) => {
    setSelectedChecklist(checklist);
    setModalOpen(true);
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600 bg-green-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="status-badge status-success">Concluída</span>;
      case 'in_progress':
        return <span className="status-badge status-warning">Em Andamento</span>;
      default:
        return <span className="status-badge status-info">{status}</span>;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklists de Inspeção</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie checklists e realize inspeções de segurança
          </p>
        </div>
        <button className="btn-primary flex items-center" onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Checklist
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou descrição..."
                className="input-field pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="input-field"
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
            >
              <option value="">Todas as categorias</option>
              <option value="geral">Geral</option>
              <option value="epi">EPI</option>
              <option value="maquinas">Máquinas</option>
              <option value="construcao">Construção</option>
            </select>
            <select
              className="input-field"
              value={filters.active}
              onChange={(e) => setFilters({...filters, active: e.target.value})}
            >
              <option value="">Todos os status</option>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Checklists Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {checklists.map((checklist) => (
          <div key={checklist.id} className="card hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <ClipboardCheck className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    {checklist.name}
                  </h3>
                  <p className="text-sm text-gray-500">{checklist.category}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                checklist.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {checklist.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600">{checklist.description}</p>
              <div className="flex items-center text-sm text-gray-500">
                <span className="font-medium">Itens:</span>
                <span className="ml-1">{checklist.items.length}</span>
                <span className="ml-2">•</span>
                <span className="ml-2">Versão {checklist.version}</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <button 
                className="flex-1 btn-primary flex items-center justify-center"
                onClick={() => handleStartInspection(checklist)}
              >
                <Play className="h-4 w-4 mr-2" />
                Iniciar Inspeção
              </button>
              <button className="btn-secondary p-2">
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Inspections */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Inspeções Recentes</h3>
        <div className="space-y-4">
          {inspections.slice(0, 5).map((inspection) => (
            <div key={inspection.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ClipboardCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {inspection.checklistId === 1 && 'Checklist de Segurança Geral'}
                    {inspection.checklistId === 2 && 'Checklist de EPIs'}
                    {inspection.checklistId === 3 && 'Checklist de Máquinas e Equipamentos'}
                  </h4>
                  <div className="flex items-center mt-1 text-sm text-gray-500">
                    <Building2 className="h-4 w-4 mr-1" />
                    {inspection.empresaNome}
                    <span className="mx-2">•</span>
                    <User className="h-4 w-4 mr-1" />
                    {inspection.inspectorName}
                    <span className="mx-2">•</span>
                    <Clock className="h-4 w-4 mr-1" />
                    {formatDate(inspection.date)}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(
                  Math.round((inspection.score / inspection.maxScore) * 100)
                )}`}>
                  {Math.round((inspection.score / inspection.maxScore) * 100)}%
                </div>
                {getStatusBadge(inspection.status)}
              </div>
            </div>
          ))}
          {inspections.length === 0 && (
            <div className="text-center py-8">
              <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma inspeção realizada</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comece realizando uma inspeção usando um dos checklists disponíveis.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      {inspections.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="text-2xl font-bold text-gray-900">{inspections.length}</div>
            <div className="text-sm text-gray-500">Total de Inspeções</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600">
              {inspections.filter(i => i.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-500">Concluídas</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {inspections.filter(i => i.status === 'in_progress').length}
            </div>
            <div className="text-sm text-gray-500">Em Andamento</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(
                inspections.reduce((sum, i) => sum + (i.score / i.maxScore) * 100, 0) / inspections.length
              )}%
            </div>
            <div className="text-sm text-gray-500">Pontuação Média</div>
          </div>
        </div>
      )}

      {/* Checklist Modal */}
      <ChecklistModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        checklistId={selectedChecklist?.id}
        empresaId={1} // Mock empresa ID
        empresaNome="Indústria Metalúrgica ABC Ltda" // Mock empresa nome
      />

      <CreateChecklistModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={loadData}
      />
    </div>
  );
};

export default Checklists;
