const fs = require('fs');
const path = require('path');

const CHECKLISTS_DIR = path.join(__dirname, '../checklists');

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

const buildCnaeCatalog = () => {
  const list = [];
  const cnaeData = safeReadJson(path.join(CHECKLISTS_DIR, 'listacnae.json'));
  if (!Array.isArray(cnaeData?.cnaes)) return list;

  cnaeData.cnaes.forEach((secao) => {
    secao?.divisoes?.forEach((divisao) => {
      divisao?.grupos?.forEach((grupo) => {
        grupo?.classes?.forEach((classe) => {
          if (!classe?.codigo_classe || !classe?.descricao_classe) return;
          list.push({
            code: String(classe.codigo_classe),
            description: String(classe.descricao_classe),
            section: String(secao?.secao || ''),
            sectionDescription: String(secao?.descricao_secao || '')
          });
        });
      });
    });
  });

  return list.sort((a, b) => a.code.localeCompare(b.code, 'pt-BR'));
};

const cnaeSectionByCode = buildCnaeSectionMap();
const nrCodesByCnaeSection = buildNrByCnaeSectionMap();
const cnaeCatalog = buildCnaeCatalog();

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

const calculateScore = (items, checklistId = null) => {
  const safeItems = Array.isArray(items) ? items : [];
  let totalScore = 0;
  let maxScore = 0;

  const checklist =
    checklistId !== null
      ? inspectionChecklists.find((entry) => entry.id === Number.parseInt(checklistId, 10)) || null
      : null;

  if (checklist) {
    const itemIds = new Set(safeItems.map((item) => String(item.itemId)));
    maxScore = (checklist.items || []).reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
    totalScore = safeItems.reduce((sum, item) => {
      if (!itemIds.has(String(item.itemId))) return sum;
      return sum + (Number(item.score) || 0);
    }, 0);
  } else {
    safeItems.forEach((item) => {
      const checklistItem = inspectionChecklists
        .flatMap((entry) => entry.items)
        .find((entry) => String(entry.id) === String(item.itemId));

      if (checklistItem) {
        maxScore += Number(checklistItem.weight) || 0;
        totalScore += Number(item.score) || 0;
      }
    });
  }

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

  const scoreData = calculateScore(inspectionData.items || [], inspectionData.checklistId);
  newInspection.score = scoreData.score;
  newInspection.maxScore = scoreData.maxScore;

  inspections.push(newInspection);
  return newInspection;
};

const getInspectionsByEmpresa = (empresaId) => {
  const normalizedId = String(empresaId);
  return inspections
    .filter((inspection) => String(inspection.empresaId) === normalizedId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

const getInspectionsByInspector = (inspectorId) => {
  const normalizedId = String(inspectorId);
  return inspections
    .filter((inspection) => String(inspection.inspectorId) === normalizedId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

const getCnaeCatalog = ({ search = '', limit } = {}) => {
  let result = cnaeCatalog;
  const term = String(search || '').trim().toLowerCase();

  if (term) {
    result = result.filter((item) => {
      const haystack = `${item.code} ${item.description} ${item.sectionDescription}`.toLowerCase();
      return haystack.includes(term);
    });
  }

  const parsedLimit = Number.parseInt(limit, 10);
  if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
    return result.slice(0, parsedLimit);
  }

  return result;
};

module.exports = {
  inspectionChecklists,
  inspections,
  getCnaeCatalog,
  getApplicableNrCodes,
  getCnaeSection,
  getChecklistsForCnae,
  calculateScore,
  createInspection,
  getInspectionsByEmpresa,
  getInspectionsByInspector
};
