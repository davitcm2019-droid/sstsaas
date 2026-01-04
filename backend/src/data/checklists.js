// Sistema de checklists e inspeções em memória (sem dados fictícios).

const inspectionChecklists = [];
const inspections = [];

const calculateScore = (items) => {
  let totalScore = 0;
  let maxScore = 0;

  items.forEach((item) => {
    totalScore += item.score || 0;

    const checklistItem = inspectionChecklists
      .flatMap((checklist) => checklist.items)
      .find((ci) => ci.id === item.itemId);

    if (checklistItem) {
      maxScore += checklistItem.weight;
    }
  });

  return {
    score: totalScore,
    maxScore,
    percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
  };
};

const createInspection = (inspectionData) => {
  const newInspection = {
    id: inspections.length + 1,
    date: new Date().toISOString(),
    status: 'in_progress',
    ...inspectionData
  };

  const scoreData = calculateScore(inspectionData.items || []);
  newInspection.score = scoreData.score;
  newInspection.maxScore = scoreData.maxScore;

  inspections.push(newInspection);
  return newInspection;
};

const getInspectionsByEmpresa = (empresaId) => {
  return inspections
    .filter((inspection) => inspection.empresaId === parseInt(empresaId, 10))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

const getInspectionsByInspector = (inspectorId) => {
  return inspections
    .filter((inspection) => inspection.inspectorId === parseInt(inspectorId, 10))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

module.exports = {
  inspectionChecklists,
  inspections,
  calculateScore,
  createInspection,
  getInspectionsByEmpresa,
  getInspectionsByInspector
};

