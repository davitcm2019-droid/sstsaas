const fs = require('fs');
const path = require('path');

const CHECKLISTS_DIR = path.join(__dirname, '../../../frontend/src/checklists');

const safeReadJson = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const buildCnaeSectionMap = () => {
  const map = new Map();

  const cnaeData = safeReadJson(path.join(CHECKLISTS_DIR, 'listacnae.json'));
  if (!cnaeData?.cnaes) return map;

  cnaeData.cnaes.forEach((secao) => {
    const secaoCodigo = secao.secao;
    if (!secaoCodigo) return;

    secao.divisoes?.forEach((divisao) => {
      divisao.grupos?.forEach((grupo) => {
        grupo.classes?.forEach((classe) => {
          if (!classe?.codigo_classe) return;
          map.set(String(classe.codigo_classe), String(secaoCodigo));
        });
      });
    });
  });

  return map;
};

const buildNrByCnaeSectionMap = () => {
  const map = new Map();

  const mappingData = safeReadJson(path.join(CHECKLISTS_DIR, 'mapeamento_CNAE_NR.json'));
  if (!Array.isArray(mappingData?.mapping)) return map;

  mappingData.mapping.forEach((entry) => {
    if (!entry?.cnae_secao || !Array.isArray(entry?.nrs_relacionadas)) return;
    map.set(String(entry.cnae_secao), entry.nrs_relacionadas.map((nr) => String(nr)));
  });

  return map;
};

const cnaeSectionByCode = buildCnaeSectionMap();
const nrCodesByCnaeSection = buildNrByCnaeSectionMap();

const normalizeCnaeCode = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  if (raw === '') return '';
  return raw.split('/')[0];
};

const getCnaeSection = (cnae) => {
  const normalized = normalizeCnaeCode(cnae);
  if (!normalized) return null;
  return cnaeSectionByCode.get(normalized) || null;
};

const getApplicableNrCodes = (cnae) => {
  const secao = getCnaeSection(cnae);
  if (!secao) return [];
  return nrCodesByCnaeSection.get(secao) || [];
};

const buildInspectionChecklists = () => {
  try {
    if (!fs.existsSync(CHECKLISTS_DIR)) return [];

    const files = fs
      .readdirSync(CHECKLISTS_DIR)
      .filter((file) => /^checklist_NR\d{2}\.json$/i.test(file))
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

    const templates = [];
    let nextId = 1;

    files.forEach((file) => {
      const data = safeReadJson(path.join(CHECKLISTS_DIR, file));
      if (!data?.nr || !Array.isArray(data?.checklist_questions)) return;

      const version = data.version?.date || data.metadata?.generated_at || '1.0';

      templates.push({
        id: nextId++,
        nr: String(data.nr),
        name: String(data.title || data.nr),
        description: String(data.nr),
        category: String(data.nr),
        version: String(version),
        active: true,
        items: data.checklist_questions
          .filter((question) => question?.id && question?.question)
          .map((question) => ({
            id: String(question.id),
            question: String(question.question),
            type: 'boolean',
            required: true,
            weight: 1,
            options: [
              { value: true, label: 'Sim', score: 1 },
              { value: false, label: 'Não', score: 0 }
            ],
            observations: ''
          }))
      });
    });

    return templates;
  } catch (error) {
    return [];
  }
};

const inspectionChecklists = buildInspectionChecklists();

// Inspeções realizadas (em memória; sem persistência).
const inspections = [];

const getChecklistsForCnae = (cnae) => {
  const applicableNrs = new Set(getApplicableNrCodes(cnae));
  if (!applicableNrs.size) return [];
  return inspectionChecklists.filter((checklist) => applicableNrs.has(checklist.nr));
};

const calculateScore = (items) => {
  let totalScore = 0;
  let maxScore = 0;

  items.forEach((item) => {
    const checklistItem = inspectionChecklists
      .flatMap((checklist) => checklist.items)
      .find((ci) => ci.id === item.itemId);

    if (checklistItem) {
      maxScore += checklistItem.weight;
      totalScore += item.score || 0;
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
  getApplicableNrCodes,
  getCnaeSection,
  getChecklistsForCnae,
  calculateScore,
  createInspection,
  getInspectionsByEmpresa,
  getInspectionsByInspector
};

