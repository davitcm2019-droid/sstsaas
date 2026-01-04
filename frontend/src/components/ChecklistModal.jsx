import { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle, 
  AlertCircle, 
  Save, 
  Send,
  Clock,
  User,
  Building2
} from 'lucide-react';
import { checklistsService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ChecklistModal = ({ isOpen, onClose, checklistId, empresaId, empresaNome }) => {
  const { user } = useAuth();
  const [checklist, setChecklist] = useState(null);
  const [inspection, setInspection] = useState({
    empresaId,
    empresaNome,
    checklistId,
    status: 'in_progress',
    items: [],
    observations: '',
    inspectorId: user?.id ?? null,
    inspectorName: user?.nome ?? ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setInspection({
      empresaId,
      empresaNome,
      checklistId,
      status: 'in_progress',
      items: [],
      observations: '',
      inspectorId: user?.id ?? null,
      inspectorName: user?.nome ?? ''
    });
  }, [isOpen, checklistId, empresaId, empresaNome, user]);

  useEffect(() => {
    if (isOpen && checklistId) {
      loadChecklist();
    }
  }, [isOpen, checklistId]);

  const loadChecklist = async () => {
    try {
      setLoading(true);
      const response = await checklistsService.getById(checklistId);
      setChecklist(response.data.data);
      
      // Inicializar itens da inspeção
      const initialItems = response.data.data.items.map(item => ({
        itemId: item.id,
        answer: null,
        score: 0,
        observations: ''
      }));
      setInspection(prev => ({ ...prev, items: initialItems }));
    } catch (error) {
      console.error('Erro ao carregar checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (itemId, answer) => {
    setInspection(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.itemId === itemId) {
          const checklistItem = checklist.items.find(ci => ci.id === itemId);
          let score = 0;
          
          if (checklistItem) {
            const option = checklistItem.options.find(opt => opt.value === answer);
            score = option ? option.score : 0;
          }
          
          return { ...item, answer, score };
        }
        return item;
      })
    }));
  };

  const handleObservationsChange = (itemId, observations) => {
    setInspection(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.itemId === itemId 
          ? { ...item, observations }
          : item
      )
    }));
  };

  const calculateScore = () => {
    const totalScore = inspection.items.reduce((sum, item) => sum + item.score, 0);
    const maxScore = checklist ? checklist.items.reduce((sum, item) => sum + item.weight, 0) : 0;
    return { score: totalScore, maxScore, percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0 };
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const scoreData = calculateScore();
      
      const inspectionData = {
        ...inspection,
        score: scoreData.score,
        maxScore: scoreData.maxScore,
        status: 'completed'
      };

      await checklistsService.createInspection(checklistId, inspectionData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar inspeção:', error);
    } finally {
      setSaving(false);
    }
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600 bg-green-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (!isOpen) return null;

  const scoreData = calculateScore();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
      
      <div className="relative mx-auto mt-16 flex h-[80vh] w-full max-w-4xl flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {checklist?.name || 'Checklist de Inspeção'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {empresaNome} • {checklist?.description}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(scoreData.percentage)}`}>
              {scoreData.percentage}% ({scoreData.score}/{scoreData.maxScore})
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {checklist?.items.map((item, index) => {
                const inspectionItem = inspection.items.find(i => i.itemId === item.id);
                
                return (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {index + 1}. {item.question}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {item.observations}
                        </p>
                        <div className="flex items-center mt-2 text-sm text-gray-500">
                          <span className="font-medium">Peso:</span>
                          <span className="ml-1">{item.weight} pontos</span>
                          {item.required && (
                            <span className="ml-2 text-red-600">• Obrigatório</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Answer Options */}
                    <div className="space-y-2">
                      {item.type === 'boolean' ? (
                        <div className="flex space-x-4">
                          {item.options.map((option) => (
                            <label
                              key={option.value}
                              className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                inspectionItem?.answer === option.value
                                  ? 'border-primary-500 bg-primary-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`item_${item.id}`}
                                value={option.value}
                                checked={inspectionItem?.answer === option.value}
                                onChange={(e) => handleAnswerChange(item.id, e.target.value === 'true')}
                                className="sr-only"
                              />
                              <div className="flex items-center">
                                <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                                  inspectionItem?.answer === option.value
                                    ? 'border-primary-500 bg-primary-500'
                                    : 'border-gray-300'
                                }`}>
                                  {inspectionItem?.answer === option.value && (
                                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                                  )}
                                </div>
                                <span className="font-medium">{option.label}</span>
                                <span className="ml-2 text-sm text-gray-500">
                                  ({option.score} pts)
                                </span>
                              </div>
                            </label>
                          ))}
                        </div>
                      ) : item.type === 'scale' ? (
                        <div className="space-y-2">
                          {item.options.map((option) => (
                            <label
                              key={option.value}
                              className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                inspectionItem?.answer === option.value
                                  ? 'border-primary-500 bg-primary-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`item_${item.id}`}
                                value={option.value}
                                checked={inspectionItem?.answer === option.value}
                                onChange={(e) => handleAnswerChange(item.id, parseInt(e.target.value))}
                                className="sr-only"
                              />
                              <div className="flex items-center">
                                <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                                  inspectionItem?.answer === option.value
                                    ? 'border-primary-500 bg-primary-500'
                                    : 'border-gray-300'
                                }`}>
                                  {inspectionItem?.answer === option.value && (
                                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                                  )}
                                </div>
                                <span className="font-medium">{option.label}</span>
                                <span className="ml-2 text-sm text-gray-500">
                                  ({option.score} pts)
                                </span>
                              </div>
                            </label>
                          ))}
                        </div>
                      ) : null}

                      {/* Observations */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Observações
                        </label>
                        <textarea
                          value={inspectionItem?.observations || ''}
                          onChange={(e) => handleObservationsChange(item.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          rows={2}
                          placeholder="Adicione observações sobre este item..."
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                Inspetor: {inspection.inspectorName}
              </div>
              <div className="flex items-center mt-1">
                <Building2 className="h-4 w-4 mr-1" />
                Empresa: {inspection.empresaNome}
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex items-center"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Salvando...' : 'Salvar Inspeção'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChecklistModal;
