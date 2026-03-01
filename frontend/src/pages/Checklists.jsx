import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Search, Plus, Eye, Play, Clock, Building2, User } from 'lucide-react';
import { checklistsService, empresasService } from '../services/api';
import ChecklistModal from '../components/ChecklistModal';
import FormModal from '../components/FormModal';

const Checklists = () => {
  const [checklists, setChecklists] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    active: ''
  });
  const [categories, setCategories] = useState([]);

  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);

  const [empresas, setEmpresas] = useState([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState('');

  const [previewChecklist, setPreviewChecklist] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [newChecklistOpen, setNewChecklistOpen] = useState(false);
  const [newChecklistEmpresaId, setNewChecklistEmpresaId] = useState('');
  const [newChecklistTemplateId, setNewChecklistTemplateId] = useState('');
  const [newChecklistTemplates, setNewChecklistTemplates] = useState([]);
  const [newChecklistLoading, setNewChecklistLoading] = useState(false);
  const [newChecklistError, setNewChecklistError] = useState(null);
  const [inspectionEmpresa, setInspectionEmpresa] = useState(null);

  const selectedEmpresa = useMemo(() => {
    if (!selectedEmpresaId) return null;
    return empresas.find((empresa) => String(empresa.id) === String(selectedEmpresaId)) || null;
  }, [empresas, selectedEmpresaId]);

  const checklistNameById = useMemo(() => {
    return new Map(checklists.map((checklist) => [checklist.id, checklist.name]));
  }, [checklists]);

  const visibleChecklists = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return checklists;

    return checklists.filter((checklist) => {
      const name = String(checklist.name || '').toLowerCase();
      const description = String(checklist.description || '').toLowerCase();
      const category = String(checklist.category || '').toLowerCase();
      return name.includes(term) || description.includes(term) || category.includes(term);
    });
  }, [checklists, searchTerm]);

  useEffect(() => {
    void loadEmpresas();
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [selectedEmpresa?.cnae]);

  useEffect(() => {
    void loadData();
  }, [filters.category, filters.active, selectedEmpresa?.cnae]);

  const loadEmpresas = async () => {
    try {
      const response = await empresasService.getAll();
      setEmpresas(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      setEmpresas([]);
    }
  };

  const loadCategories = async () => {
    try {
      const params = {};
      if (selectedEmpresa?.cnae) {
        params.cnae = selectedEmpresa.cnae;
      }

      const response = await checklistsService.getCategories(params);
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      setCategories([]);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const checklistParams = { ...filters };
      if (selectedEmpresa?.cnae) {
        checklistParams.cnae = selectedEmpresa.cnae;
      }

      const [checklistsRes, inspectionsRes] = await Promise.all([
        checklistsService.getAll(checklistParams),
        checklistsService.getInspections()
      ]);

      setChecklists(checklistsRes.data.data || []);
      setInspections(inspectionsRes.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChecklistTemplatesForEmpresa = async (empresaId) => {
    const empresa = empresas.find((item) => String(item.id) === String(empresaId)) || null;

    try {
      setNewChecklistLoading(true);
      setNewChecklistError(null);

      const params = {};
      if (empresa?.cnae) {
        params.cnae = empresa.cnae;
      }

      const response = await checklistsService.getAll(params);
      const templates = response.data.data || [];

      setNewChecklistTemplates(templates);
      setNewChecklistTemplateId((current) =>
        current && templates.some((template) => String(template.id) === String(current)) ? current : ''
      );
    } catch (error) {
      console.error('Erro ao carregar checklists:', error);
      setNewChecklistTemplates([]);
      setNewChecklistTemplateId('');
      setNewChecklistError('Não foi possível carregar os checklists para esta empresa.');
    } finally {
      setNewChecklistLoading(false);
    }
  };

  const openNewChecklistModal = (preferredTemplateId = '') => {
    const initialEmpresaId = selectedEmpresaId || '';

    setNewChecklistError(null);
    setNewChecklistEmpresaId(initialEmpresaId);
    setNewChecklistTemplateId(preferredTemplateId ? String(preferredTemplateId) : '');
    setNewChecklistTemplates([]);
    setNewChecklistOpen(true);

    if (initialEmpresaId) {
      void loadChecklistTemplatesForEmpresa(initialEmpresaId);
    }
  };

  const handleStartInspection = (checklist) => {
    if (!selectedEmpresa) {
      openNewChecklistModal(checklist?.id);
      return;
    }

    setInspectionEmpresa(selectedEmpresa);
    setSelectedChecklist(checklist);
    setInspectionModalOpen(true);
  };

  const handlePreviewChecklist = (checklist) => {
    setPreviewChecklist(checklist);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewChecklist(null);
  };

  const handleSubmitNewChecklist = (event) => {
    event.preventDefault();

    if (!newChecklistEmpresaId) {
      setNewChecklistError('Selecione a empresa.');
      return;
    }

    if (!newChecklistTemplateId) {
      setNewChecklistError('Selecione o checklist (NR).');
      return;
    }

    const template = newChecklistTemplates.find(
      (item) => String(item.id) === String(newChecklistTemplateId)
    );
    const empresa = empresas.find((item) => String(item.id) === String(newChecklistEmpresaId));

    if (!template) {
      setNewChecklistError('Checklist selecionado não encontrado.');
      return;
    }

    if (!empresa) {
      setNewChecklistError('Empresa selecionada nao encontrada.');
      return;
    }

    setSelectedEmpresaId(String(newChecklistEmpresaId));
    setInspectionEmpresa(empresa);
    setSelectedChecklist(template);
    setNewChecklistOpen(false);
    setInspectionModalOpen(true);
  };

  const getChecklistName = (checklistId) => {
    const id = parseInt(checklistId, 10);
    return checklistNameById.get(id) || `Checklist #${checklistId}`;
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600 bg-green-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getInspectionPercent = (inspection) => {
    const score = Number(inspection?.score) || 0;
    const maxScore = Number(inspection?.maxScore) || 0;
    if (maxScore <= 0) return 0;
    return Math.round((score / maxScore) * 100);
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
          <p className="mt-1 text-sm text-gray-500">Gerencie checklists e realize inspeções de segurança</p>
        </div>
        <button className="btn-primary flex items-center" onClick={() => openNewChecklistModal()}>
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
                placeholder="Buscar por nome, NR ou descrição..."
                className="input-field pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="input-field"
              value={selectedEmpresaId}
              onChange={(e) => setSelectedEmpresaId(e.target.value)}
            >
              <option value="">Selecione a empresa</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nome}
                </option>
              ))}
            </select>

            <select
              className="input-field"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="">Todas as NRs</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              className="input-field"
              value={filters.active}
              onChange={(e) => setFilters({ ...filters, active: e.target.value })}
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
        {visibleChecklists.length === 0 ? (
          <div className="card col-span-full text-center py-10">
            <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum checklist encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">Ajuste os filtros ou selecione uma empresa.</p>
            <p className="mt-3 text-sm text-gray-500">
              Para iniciar uma inspeção, cadastre uma empresa em{' '}
              <Link className="text-primary-600 hover:underline" to="/empresas">
                Empresas
              </Link>
              .
            </p>
          </div>
        ) : (
          visibleChecklists.map((checklist) => (
            <div key={checklist.id} className="card hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <ClipboardCheck className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">{checklist.name}</h3>
                    <p className="text-sm text-gray-500">{checklist.category}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    checklist.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {checklist.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">{checklist.description}</p>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="font-medium">Itens:</span>
                  <span className="ml-1">{checklist.items?.length ?? 0}</span>
                  <span className="mx-2">•</span>
                  <span>Versão {checklist.version}</span>
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
                <button className="btn-secondary p-2" onClick={() => handlePreviewChecklist(checklist)}>
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
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
                  <h4 className="text-sm font-medium text-gray-900">{getChecklistName(inspection.checklistId)}</h4>
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
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(
                    getInspectionPercent(inspection)
                  )}`}
                >
                  {getInspectionPercent(inspection)}%
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
              {inspections.filter((inspection) => inspection.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-500">Concluídas</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {inspections.filter((inspection) => inspection.status === 'in_progress').length}
            </div>
            <div className="text-sm text-gray-500">Em Andamento</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(
                inspections.reduce((sum, inspection) => sum + getInspectionPercent(inspection), 0) /
                  Math.max(inspections.length, 1)
              )}
              %
            </div>
            <div className="text-sm text-gray-500">Pontuação Média</div>
          </div>
        </div>
      )}

      {/* Inspection Modal */}
      <ChecklistModal
        isOpen={inspectionModalOpen}
        onClose={() => {
          setInspectionModalOpen(false);
          setSelectedChecklist(null);
          setInspectionEmpresa(null);
          void loadData();
        }}
        checklistId={selectedChecklist?.id}
        empresaId={inspectionEmpresa?.id ?? selectedEmpresa?.id}
        empresaNome={inspectionEmpresa?.nome ?? selectedEmpresa?.nome}
      />

      {/* Preview Modal */}
      <FormModal isOpen={previewOpen} onClose={closePreview} title={previewChecklist?.name || 'Checklist'} showFooter={false} asForm={false}>
        <div className="space-y-4">
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              <span className="font-medium">NR:</span> {previewChecklist?.category || '-'}
            </div>
            <div>
              <span className="font-medium">Versão:</span> {previewChecklist?.version || '-'}
            </div>
            <div>
              <span className="font-medium">Itens:</span> {previewChecklist?.items?.length ?? 0}
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
            {(previewChecklist?.items || []).map((item, index) => (
              <div key={item.id} className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                <span className="font-medium">{index + 1}.</span> {item.question}
              </div>
            ))}
            {(previewChecklist?.items || []).length === 0 && (
              <div className="text-sm text-gray-500">Nenhuma pergunta encontrada.</div>
            )}
          </div>
        </div>
      </FormModal>

      {/* New Checklist Modal */}
      <FormModal
        isOpen={newChecklistOpen}
        onClose={() => setNewChecklistOpen(false)}
        title="Novo Checklist"
        onSubmit={handleSubmitNewChecklist}
        submitText="Iniciar inspeção"
        loading={newChecklistLoading}
        error={newChecklistError}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa *</label>
            <select
              className="input-field"
              value={newChecklistEmpresaId}
              onChange={(e) => {
                const value = e.target.value;
                setNewChecklistEmpresaId(value);
                if (value) {
                  void loadChecklistTemplatesForEmpresa(value);
                } else {
                  setNewChecklistTemplates([]);
                  setNewChecklistTemplateId('');
                }
              }}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Checklist (NR) *</label>
            <select
              className="input-field"
              value={newChecklistTemplateId}
              onChange={(e) => setNewChecklistTemplateId(e.target.value)}
              disabled={!newChecklistEmpresaId || newChecklistLoading}
            >
              <option value="">
                {newChecklistEmpresaId ? 'Selecione o checklist' : 'Selecione a empresa primeiro'}
              </option>
              {newChecklistTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.category} - {template.name}
                </option>
              ))}
            </select>

            {!newChecklistEmpresaId && (
              <p className="mt-1 text-xs text-gray-500">
                Cadastre uma empresa em{' '}
                <Link
                  className="text-primary-600 hover:underline"
                  to="/empresas"
                  onClick={() => setNewChecklistOpen(false)}
                >
                  Empresas
                </Link>{' '}
                para iniciar uma inspeção.
              </p>
            )}
          </div>
        </div>
      </FormModal>
    </div>
  );
};

export default Checklists;
