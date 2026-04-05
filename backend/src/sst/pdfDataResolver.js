const empresasRepository = require('../repositories/empresasRepository');
const {
  models: { SstRiskAssessment }
} = require('./models');
const { buildDocumentSections } = require('./documentSectionBuilder');

const FALLBACK = {
  naoInformado: 'Nao informado',
  semDados: 'Sem dados disponiveis',
  semAvaliacoes: 'Sem avaliacoes disponiveis',
  semRiscos: 'Nenhum risco publicado neste escopo.',
  semControles: 'Sem controles registrados',
  semAcoes: 'Sem acoes vinculadas',
  semAnexos: 'Sem anexos disponiveis',
  semResumo: 'Sem resumo editavel.',
  semNotas: 'Sem notas adicionais.',
  semRessalvas: 'Sem ressalvas registradas.'
};

const DOCUMENT_TYPE_LABELS = {
  inventario: 'Inventario de Riscos',
  pgr: 'Programa de Gerenciamento de Riscos (PGR)',
  ltcat: 'LTCAT - Laudo Tecnico das Condicoes Ambientais do Trabalho',
  laudo_insalubridade: 'Laudo de Insalubridade',
  laudo_periculosidade: 'Laudo de Periculosidade',
  laudo_tecnico: 'Laudo Tecnico'
};

const safeText = (value, fallback = FALLBACK.naoInformado) => {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized : fallback;
};

const buildSectionsPlan = (documentType = '', options = {}) =>
  buildDocumentSections(documentType, { includeAnnexes: Boolean(options.includeAnnexes) });

const ensureAnnexSection = (sectionsPlan, annexes = []) => {
  if (!Array.isArray(annexes) || annexes.length === 0) return sectionsPlan;
  if (sectionsPlan.some((section) => section.key === 'anexos')) return sectionsPlan;
  return [...sectionsPlan, { key: 'anexos', title: `${sectionsPlan.length + 1} - ANEXOS` }];
};

const collectMissingData = ({ empresa, assessments = [], assessmentContexts = new Map(), documentType }) => {
  const missing = [];

  const empresaChecks = [
    ['Nome da empresa', empresa?.nome],
    ['CNPJ da empresa', empresa?.cnpj],
    ['CNAE da empresa', empresa?.cnae],
    ['Endereco da empresa', empresa?.endereco],
    ['Cidade da empresa', empresa?.cidade],
    ['Estado da empresa', empresa?.estado]
  ];

  empresaChecks.forEach(([label, value]) => {
    if (!String(value ?? '').trim()) {
      missing.push(label);
    }
  });

  if (!assessments.length) {
    missing.push('Avaliacoes publicadas');
  }

  const hasRt = assessments.every((assessment) => String(assessment?.fixed?.assessment?.responsibleTechnical?.nome || '').trim());
  if (!hasRt) missing.push('Responsavel tecnico');

  const hasRegistro = assessments.every((assessment) => String(assessment?.fixed?.assessment?.responsibleTechnical?.registro || '').trim());
  if (!hasRegistro) missing.push('Registro profissional do RT');

  const hasContext = [...assessmentContexts.values()].some((assessment) => String(assessment?.context?.processoPrincipal || '').trim());
  if (!hasContext && ['pgr', 'ltcat'].includes(documentType)) {
    missing.push('Metodologia / processo principal');
  }

  return [...new Set(missing)];
};

const buildResumoExecutivo = ({ documentType, assessments = [] }) => {
  const riskCount = assessments.reduce((total, assessment) => total + (assessment?.dynamic?.summary?.totalRisks || 0), 0);
  const actionCount = assessments.reduce((total, assessment) => total + (assessment?.dynamic?.summary?.actionItems || 0), 0);
  const label = DOCUMENT_TYPE_LABELS[documentType] || 'Documento Tecnico';
  return `${label} consolidado a partir de ${assessments.length} avaliacao(oes) publicada(s), totalizando ${riskCount} risco(s) e ${actionCount} acao(oes) vinculada(s).`;
};

const normalizeEmpresa = (empresa = null) => ({
  nome: safeText(empresa?.nome),
  cnpj: safeText(empresa?.cnpj),
  cnae: safeText(empresa?.cnae),
  ramo: safeText(empresa?.ramo, FALLBACK.semDados),
  endereco: safeText(empresa?.endereco),
  cidade: safeText(empresa?.cidade),
  estado: safeText(empresa?.estado),
  cep: safeText(empresa?.cep),
  telefone: safeText(empresa?.telefone),
  email: safeText(empresa?.email),
  responsavel: safeText(empresa?.responsavel)
});

const resolveIssuedDocumentPdfData = async ({ document, version, deps = {} }) => {
  const empresaRepo = deps.empresaRepo || empresasRepository;
  const assessmentRepo = deps.assessmentRepo || SstRiskAssessment;
  const empresaId = String(document?.empresaId || '').trim();
  const empresa = empresaId ? await empresaRepo.findById(empresaId) : null;
  const content = version?.content || {};
  const assessments = Array.isArray(content.assessments) ? content.assessments : [];
  const documentType = String(document?.documentType || '').trim();
  const sectionsPlan = ensureAnnexSection(buildSectionsPlan(documentType, { includeAnnexes: false }), content?.annexes || []);
  const sourceAssessmentIds = Array.isArray(version?.sourceAssessmentIds) ? version.sourceAssessmentIds.filter(Boolean) : [];
  const assessmentRows =
    sourceAssessmentIds.length && typeof assessmentRepo?.find === 'function'
      ? await assessmentRepo.find({ _id: { $in: sourceAssessmentIds } }).lean()
      : [];
  const assessmentContexts = new Map(assessmentRows.map((row) => [String(row._id), row]));
  const missingData = collectMissingData({ empresa, assessments, assessmentContexts, documentType });
  const canonicalMissingData = Array.isArray(content?.canonical?.readiness?.missingFields)
    ? content.canonical.readiness.missingFields
    : [];

  return {
    fallback: FALLBACK,
    labels: {
      documentTypeLabel: DOCUMENT_TYPE_LABELS[documentType] || safeText(documentType, 'Documento Tecnico')
    },
    empresa: normalizeEmpresa(empresa),
    sectionsPlan,
    missingData: canonicalMissingData.length ? canonicalMissingData : missingData,
    assessmentContexts,
    summary: {
      overview: buildResumoExecutivo({ documentType, assessments }),
      assessmentsCount: assessments.length,
      risksCount: assessments.reduce((total, assessment) => total + (assessment?.dynamic?.summary?.totalRisks || 0), 0),
      actionItemsCount: assessments.reduce((total, assessment) => total + (assessment?.dynamic?.summary?.actionItems || 0), 0)
    },
    raw: { document, version, content }
  };
};

module.exports = {
  FALLBACK,
  DOCUMENT_TYPE_LABELS,
  buildSectionsPlan,
  ensureAnnexSection,
  resolveIssuedDocumentPdfData
};
