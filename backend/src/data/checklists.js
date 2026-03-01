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

const CNAE_SECTION_CATALOG = [
  { code: 'A', divisionRange: '01 .. 03', description: 'AGRICULTURA, PECUARIA, PRODUCAO FLORESTAL, PESCA E AQUICULTURA' },
  { code: 'B', divisionRange: '05 .. 09', description: 'INDUSTRIAS EXTRATIVAS' },
  { code: 'C', divisionRange: '10 .. 33', description: 'INDUSTRIAS DE TRANSFORMACAO' },
  { code: 'D', divisionRange: '35 .. 35', description: 'ELETRICIDADE E GAS' },
  { code: 'E', divisionRange: '36 .. 39', description: 'AGUA, ESGOTO, ATIVIDADES DE GESTAO DE RESIDUOS E DESCONTAMINACAO' },
  { code: 'F', divisionRange: '41 .. 43', description: 'CONSTRUCAO' },
  { code: 'G', divisionRange: '45 .. 47', description: 'COMERCIO; REPARACAO DE VEICULOS AUTOMOTORES E MOTOCICLETAS' },
  { code: 'H', divisionRange: '49 .. 53', description: 'TRANSPORTE, ARMAZENAGEM E CORREIO' },
  { code: 'I', divisionRange: '55 .. 56', description: 'ALOJAMENTO E ALIMENTACAO' },
  { code: 'J', divisionRange: '58 .. 63', description: 'INFORMACAO E COMUNICACAO' },
  { code: 'K', divisionRange: '64 .. 66', description: 'ATIVIDADES FINANCEIRAS, DE SEGUROS E SERVICOS RELACIONADOS' },
  { code: 'L', divisionRange: '68 .. 68', description: 'ATIVIDADES IMOBILIARIAS' },
  { code: 'M', divisionRange: '69 .. 75', description: 'ATIVIDADES PROFISSIONAIS, CIENTIFICAS E TECNICAS' },
  { code: 'N', divisionRange: '77 .. 82', description: 'ATIVIDADES ADMINISTRATIVAS E SERVICOS COMPLEMENTARES' },
  { code: 'O', divisionRange: '84 .. 84', description: 'ADMINISTRACAO PUBLICA, DEFESA E SEGURIDADE SOCIAL' },
  { code: 'P', divisionRange: '85 .. 85', description: 'EDUCACAO' },
  { code: 'Q', divisionRange: '86 .. 88', description: 'SAUDE HUMANA E SERVICOS SOCIAIS' },
  { code: 'R', divisionRange: '90 .. 93', description: 'ARTES, CULTURA, ESPORTE E RECREACAO' },
  { code: 'S', divisionRange: '94 .. 96', description: 'OUTRAS ATIVIDADES DE SERVICOS' },
  { code: 'T', divisionRange: '97 .. 97', description: 'SERVICOS DOMESTICOS' },
  { code: 'U', divisionRange: '99 .. 99', description: 'ORGANISMOS INTERNACIONAIS E OUTRAS INSTITUICOES EXTRATERRITORIAIS' }
];

const buildCnaeCatalog = () =>
  [...CNAE_SECTION_CATALOG].sort((a, b) => a.code.localeCompare(b.code, 'pt-BR'));

const cnaeSectionByCode = buildCnaeSectionMap();
const nrCodesByCnaeSection = buildNrByCnaeSectionMap();
const cnaeCatalog = buildCnaeCatalog();

const normalizeCnaeCode = (value) => {
  if (!value) return '';
  const raw = String(value).trim().toUpperCase();
  if (raw === '') return '';
  const sectionMatch = raw.match(/^([A-U])(?:\b|[\s\-|])/);
  if (sectionMatch) return sectionMatch[1];
  if (/^[A-U]$/.test(raw)) return raw;
  return raw.split('/')[0];
};

const getCnaeSection = (cnae) => {
  const normalized = normalizeCnaeCode(cnae);
  if (!normalized) return null;
  if (nrCodesByCnaeSection.has(normalized)) return normalized;
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
      const haystack = `${item.code} ${item.divisionRange} ${item.description}`.toLowerCase();
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
