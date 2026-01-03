// In-memory stores for checklists and inspections (starts empty).
//
// Persistência real será implementada na Fase 15+ (PostgreSQL).

const inspectionChecklists = [];
const inspections = [];

const nextChecklistId = () => {
  if (!inspectionChecklists.length) return 1;
  return Math.max(...inspectionChecklists.map((checklist) => checklist.id)) + 1;
};

const nextInspectionId = () => {
  if (!inspections.length) return 1;
  return Math.max(...inspections.map((inspection) => inspection.id)) + 1;
};

const normalizeBoolean = (value, fallback = true) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
};

const createChecklist = (payload = {}) => {
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (!name) {
    const err = new Error('Nome do checklist é obrigatório');
    err.statusCode = 400;
    throw err;
  }

  const existing = inspectionChecklists.find((checklist) => checklist.name === name);
  if (existing) {
    return { checklist: existing, created: false };
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) {
    const err = new Error('Checklist deve conter itens');
    err.statusCode = 400;
    throw err;
  }

  const newChecklist = {
    id: nextChecklistId(),
    name,
    description: typeof payload.description === 'string' ? payload.description.trim() : '',
    category: typeof payload.category === 'string' ? payload.category.trim() : 'geral',
    version: typeof payload.version === 'string' ? payload.version.trim() : '1.0',
    active: normalizeBoolean(payload.active, true),
    items
  };

  inspectionChecklists.push(newChecklist);
  return { checklist: newChecklist, created: true };
};

const calculateScore = (items = [], checklistId) => {
  const totalScore = items.reduce((sum, item) => sum + (Number(item?.score) || 0), 0);

  if (!checklistId) {
    return {
      score: totalScore,
      maxScore: 0,
      percentage: 0
    };
  }

  const checklist = inspectionChecklists.find((c) => c.id === checklistId);
  const maxScore = checklist?.items?.reduce((sum, item) => sum + (Number(item?.weight) || 0), 0) || 0;

  return {
    score: totalScore,
    maxScore,
    percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
  };
};

const createInspection = (inspectionData) => {
  const checklistId = Number.parseInt(inspectionData?.checklistId, 10);
  const scoreData = calculateScore(inspectionData?.items || [], checklistId);

  const newInspection = {
    id: nextInspectionId(),
    date: new Date().toISOString(),
    status: 'in_progress',
    ...inspectionData,
    score: scoreData.score,
    maxScore: scoreData.maxScore
  };

  inspections.push(newInspection);
  return newInspection;
};

const getInspectionsByEmpresa = (empresaId) => {
  const parsed = parseInt(empresaId, 10);
  if (Number.isNaN(parsed)) return [];

  return inspections
    .filter((inspection) => inspection.empresaId === parsed)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

const getInspectionsByInspector = (inspectorId) => {
  const parsed = parseInt(inspectorId, 10);
  if (Number.isNaN(parsed)) return [];

  return inspections
    .filter((inspection) => inspection.inspectorId === parsed)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

module.exports = {
  inspectionChecklists,
  inspections,
  createChecklist,
  createInspection,
  getInspectionsByEmpresa,
  getInspectionsByInspector,
  calculateScore
};
