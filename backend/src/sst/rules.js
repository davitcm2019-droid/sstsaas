const ASSESSMENT_STATUS = ['draft', 'in_review', 'published', 'superseded'];
const RISK_LEVELS = ['toleravel', 'moderado', 'alto', 'critico'];

const createRuleError = (message, code, status = 400) => {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
};

const normalizeText = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback;
  return value.trim();
};

const computeRiskLevel = (probability, severity) => {
  const score = Number(probability || 0) * Number(severity || 0);
  if (score <= 4) return 'toleravel';
  if (score <= 9) return 'moderado';
  if (score <= 16) return 'alto';
  return 'critico';
};

const ensureRoleCanCreateAssessment = ({ roleId }) => {
  if (!roleId) {
    throw createRuleError('Cargo obrigatorio para abrir avaliacao', 'ROLE_REQUIRED');
  }
};

const ensureAssessmentRiskCanExist = ({ assessmentId }) => {
  if (!assessmentId) {
    throw createRuleError('Risco da avaliacao exige avaliacao vinculada', 'ASSESSMENT_REQUIRED');
  }
};

const ensureAssessmentCanPublish = ({ risks = [], conclusion = null } = {}) => {
  if (!Array.isArray(risks) || risks.length === 0) {
    throw createRuleError('Avaliacao sem riscos nao pode ser publicada', 'ASSESSMENT_RISKS_REQUIRED', 409);
  }

  if (!conclusion) {
    throw createRuleError('Conclusao tecnica obrigatoria para publicar avaliacao', 'ASSESSMENT_CONCLUSION_REQUIRED', 409);
  }

  if (normalizeText(conclusion.status) !== 'signed') {
    throw createRuleError('Conclusao tecnica precisa estar assinada para publicar avaliacao', 'ASSESSMENT_CONCLUSION_NOT_SIGNED', 409);
  }

  for (const risk of risks) {
    const probability = Number(risk.probability || 0);
    const severity = Number(risk.severity || 0);
    const level = normalizeText(risk.level) || computeRiskLevel(probability, severity);
    const actions = Array.isArray(risk.actionPlanItems) ? risk.actionPlanItems : [];
    const justification = normalizeText(risk.highRiskJustification);

    if (!normalizeText(risk.hazard) || !normalizeText(risk.factor) || !normalizeText(risk.damage)) {
      throw createRuleError('Todos os riscos precisam de perigo, fator e dano', 'ASSESSMENT_RISK_INCOMPLETE', 409);
    }

    if ((level === 'alto' || level === 'critico') && actions.length === 0 && !justification) {
      throw createRuleError(
        'Risco alto ou critico exige plano de acao ou justificativa tecnica',
        'ASSESSMENT_HIGH_RISK_ACTION_REQUIRED',
        409
      );
    }
  }
};

const buildLegacyExportManifest = ({ generatedAt, collections = {}, totals = {} }) => ({
  generatedAt,
  totals,
  collections
});

module.exports = {
  ASSESSMENT_STATUS,
  RISK_LEVELS,
  createRuleError,
  normalizeText,
  computeRiskLevel,
  ensureRoleCanCreateAssessment,
  ensureAssessmentRiskCanExist,
  ensureAssessmentCanPublish,
  buildLegacyExportManifest
};
