import { useEffect, useMemo, useState } from 'react';
import { Building2, Save, User, X } from 'lucide-react';
import { checklistsService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const emptyInspection = ({ empresaId, empresaNome, checklistId, user }) => ({
  empresaId,
  empresaNome,
  checklistId,
  status: 'in_progress',
  items: [],
  observations: '',
  inspectorId: user?.id ?? null,
  inspectorName: user?.nome ?? ''
});

const ChecklistModal = ({ isOpen, onClose, checklistId, empresaId, empresaNome }) => {
  const { user } = useAuth();
  const [checklist, setChecklist] = useState(null);
  const [inspection, setInspection] = useState(
    emptyInspection({ empresaId, empresaNome, checklistId, user })
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setChecklist(null);
    setError('');
    setSubmitAttempted(false);
    setLoading(true);
    setInspection(emptyInspection({ empresaId, empresaNome, checklistId, user }));
  }, [isOpen, checklistId, empresaId, empresaNome, user]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow || '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !checklistId) return;
    void loadChecklist();
  }, [isOpen, checklistId]);

  const loadChecklist = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await checklistsService.getById(checklistId);
      const payload = response.data?.data;
      if (!payload?.items) {
        throw new Error('Checklist sem itens para inspecao.');
      }

      setChecklist(payload);
      const initialItems = payload.items.map((item) => ({
        itemId: item.id,
        answer: null,
        score: 0,
        observations: ''
      }));
      setInspection((prev) => ({ ...prev, items: initialItems }));
    } catch (loadError) {
      console.error('Erro ao carregar checklist:', loadError);
      setChecklist(null);
      setError('Nao foi possivel carregar o checklist. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const answersByItemId = useMemo(
    () => new Map((inspection.items || []).map((item) => [String(item.itemId), item])),
    [inspection.items]
  );

  const requiredItems = useMemo(
    () => (checklist?.items || []).filter((item) => item.required !== false),
    [checklist?.items]
  );

  const answeredRequiredCount = useMemo(
    () =>
      requiredItems.filter((item) => {
        const answer = answersByItemId.get(String(item.id))?.answer;
        return answer !== null && answer !== undefined;
      }).length,
    [requiredItems, answersByItemId]
  );

  const scoreData = useMemo(() => {
    const totalScore = (inspection.items || []).reduce((sum, item) => sum + (Number(item.score) || 0), 0);
    const maxScore = (checklist?.items || []).reduce((sum, item) => sum + (Number(item.weight) || 1), 0);
    return {
      score: totalScore,
      maxScore,
      percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
    };
  }, [inspection.items, checklist?.items]);

  const getScoreColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600 bg-green-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const isRequiredItemAnswered = (itemId) => {
    const answer = answersByItemId.get(String(itemId))?.answer;
    return answer !== null && answer !== undefined;
  };

  const handleAnswerChange = (itemId, answer) => {
    setError('');
    setInspection((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (String(item.itemId) !== String(itemId)) return item;

        const checklistItem = (checklist?.items || []).find((ci) => String(ci.id) === String(itemId));
        const option = checklistItem?.options?.find((opt) => opt.value === answer);
        const score = option ? Number(option.score) || 0 : 0;

        return { ...item, answer, score };
      })
    }));
  };

  const handleObservationsChange = (itemId, observations) => {
    setInspection((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        String(item.itemId) === String(itemId) ? { ...item, observations } : item
      )
    }));
  };

  const handleSave = async () => {
    if (!checklistId || !empresaId) {
      setError('Selecione empresa e checklist antes de salvar.');
      return;
    }

    const missingRequired = requiredItems.some((item) => !isRequiredItemAnswered(item.id));
    if (missingRequired) {
      setSubmitAttempted(true);
      setError('Responda todos os itens obrigatorios antes de finalizar.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const inspectionData = {
        ...inspection,
        empresaId,
        empresaNome,
        checklistId,
        score: scoreData.score,
        maxScore: scoreData.maxScore,
        status: 'completed'
      };

      await checklistsService.createInspection(checklistId, inspectionData);
      onClose();
    } catch (saveError) {
      console.error('Erro ao salvar inspecao:', saveError);
      setError(saveError?.response?.data?.message || 'Falha ao salvar a inspecao.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-gray-900/60" onClick={onClose} />

      <div className="relative z-10 flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl sm:max-h-[92vh]">
        <div className="shrink-0 border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">
                {checklist?.name || 'Checklist de Inspecao'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {empresaNome || '-'} | {checklist?.description || 'Sem descricao'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Itens obrigatorios respondidos: {answeredRequiredCount}/{requiredItems.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`rounded-full px-3 py-1 text-sm font-medium ${getScoreColor(scoreData.percentage)}`}>
                {scoreData.percentage}% ({scoreData.score}/{scoreData.maxScore})
              </div>
              <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-500"></div>
            </div>
          ) : !checklist ? (
            <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
              Nao foi possivel exibir o checklist.
            </div>
          ) : (
            <div className="space-y-5">
              {(checklist.items || []).map((item, index) => {
                const inspectionItem = answersByItemId.get(String(item.id));
                const requiredMissing = submitAttempted && item.required !== false && !isRequiredItemAnswered(item.id);
                const options = Array.isArray(item.options) ? item.options : [];

                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-4 ${
                      requiredMissing ? 'border-red-300 bg-red-50/30' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="mb-3">
                      <h3 className="text-base font-medium text-gray-900">
                        {index + 1}. {item.question}
                      </h3>
                      {!!item.observations && <p className="mt-1 text-sm text-gray-600">{item.observations}</p>}
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <span>Peso: {Number(item.weight) || 1}</span>
                        {item.required !== false && <span className="rounded bg-red-100 px-2 py-0.5 text-red-700">Obrigatorio</span>}
                      </div>
                    </div>

                    {item.type === 'boolean' || item.type === 'scale' ? (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {options.map((option) => (
                          <label
                            key={String(option.value)}
                            className={`flex cursor-pointer items-center rounded-lg border-2 p-3 transition-colors ${
                              inspectionItem?.answer === option.value
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`item_${item.id}`}
                              checked={inspectionItem?.answer === option.value}
                              onChange={() => handleAnswerChange(item.id, option.value)}
                              className="sr-only"
                            />
                            <div className="flex items-center">
                              <div
                                className={`mr-3 h-4 w-4 rounded-full border-2 ${
                                  inspectionItem?.answer === option.value
                                    ? 'border-primary-500 bg-primary-500'
                                    : 'border-gray-300'
                                }`}
                              >
                                {inspectionItem?.answer === option.value && (
                                  <div className="mx-auto mt-0.5 h-2 w-2 rounded-full bg-white"></div>
                                )}
                              </div>
                              <span className="font-medium text-gray-800">{option.label}</span>
                              <span className="ml-2 text-xs text-gray-500">({Number(option.score) || 0} pts)</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-4">
                      <label className="mb-1 block text-sm font-medium text-gray-700">Observacoes</label>
                      <textarea
                        value={inspectionItem?.observations || ''}
                        onChange={(event) => handleObservationsChange(item.id, event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                        rows={2}
                        placeholder="Adicione observacoes sobre este item..."
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-500">
              <div className="flex items-center">
                <User className="mr-1 h-4 w-4" />
                Inspetor: {inspection.inspectorName || '-'}
              </div>
              <div className="mt-1 flex items-center">
                <Building2 className="mr-1 h-4 w-4" />
                Empresa: {inspection.empresaNome || '-'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="btn-secondary">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || loading || !checklist}
                className="btn-primary flex items-center"
              >
                {saving ? (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {saving ? 'Salvando...' : 'Salvar inspecao'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChecklistModal;
