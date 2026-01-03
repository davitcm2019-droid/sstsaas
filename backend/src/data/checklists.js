// Sistema de checklists/inspeções (inicia vazio, sem dados fictícios).
//
// Persistência real será implementada na Fase 15+ (PostgreSQL).

const inspectionChecklists = [];
const inspections = [];

const calculateScore = (items = []) => {
  const totalScore = items.reduce((sum, item) => sum + (Number(item?.score) || 0), 0);
  const maxScore = 0;
  return {
    score: totalScore,
    maxScore,
    percentage: 0
  };
};

const createInspection = (inspectionData) => {
  const scoreData = calculateScore(inspectionData?.items || []);
  const newInspection = {
    id: inspections.length + 1,
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
  createInspection,
  getInspectionsByEmpresa,
  getInspectionsByInspector,
  calculateScore
};

