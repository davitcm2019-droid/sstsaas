const DEFAULT_RANGES = {
  baixo: { min: 1, max: 4 },
  medio: { min: 5, max: 9 },
  alto: { min: 10, max: 16 },
  critico: { min: 17, max: 25 }
};

const classifyScore = (score, ranges = DEFAULT_RANGES) => {
  const safeScore = Number(score);
  if (Number.isNaN(safeScore) || safeScore < 1) return 'baixo';

  if (safeScore >= ranges.baixo.min && safeScore <= ranges.baixo.max) return 'baixo';
  if (safeScore >= ranges.medio.min && safeScore <= ranges.medio.max) return 'medio';
  if (safeScore >= ranges.alto.min && safeScore <= ranges.alto.max) return 'alto';
  return 'critico';
};

const requiresTechnicalJustification = (score, ranges = DEFAULT_RANGES) => {
  const classification = classifyScore(score, ranges);
  return classification === 'alto' || classification === 'critico';
};

const ensureRiskCanBeCreated = ({ activityId }) => {
  if (!activityId) {
    const error = new Error('Nao permitir risco sem activity');
    error.code = 'ACTIVITY_REQUIRED';
    throw error;
  }
  return true;
};

const ensureQuantitativeAllowed = ({ hasQualitative, allowsQuantitative }) => {
  if (!hasQualitative) {
    const error = new Error('Nao permitir quantitativa sem qualitativa');
    error.code = 'QUALITATIVE_REQUIRED';
    throw error;
  }
  if (!allowsQuantitative) {
    const error = new Error('Risco nao permite quantitativa');
    error.code = 'QUANTITATIVE_NOT_ALLOWED';
    throw error;
  }
  return true;
};

const migrateLegacyRiskRecord = (legacyRisk = {}) => {
  const empresaId = String(legacyRisk.empresaId || 'legacy');
  const unidade = String(legacyRisk.unidade || 'Unidade migrada');
  const setor = String(legacyRisk.setor || 'Setor migrado');
  const cargoNome = String(legacyRisk.cargo || legacyRisk.funcaoCargo || 'Cargo migrado');

  return {
    environment: {
      empresaId,
      unidade,
      setor,
      nome: 'Ambiente migrado'
    },
    cargo: {
      nome: cargoNome
    },
    activity: {
      nome: 'Atividade migrada - modelo anterior',
      processoMacro: 'migracao'
    },
    risk: {
      legacyMigrated: true,
      riskType: legacyRisk.riskType || legacyRisk.categoriaAgente || 'acidente',
      perigo: legacyRisk.perigo || 'Risco migrado',
      eventoPerigoso: legacyRisk.eventoPerigoso || 'Evento migrado',
      danoPotencial: legacyRisk.danoPotencial || 'Dano migrado'
    }
  };
};

module.exports = {
  DEFAULT_RANGES,
  classifyScore,
  requiresTechnicalJustification,
  ensureRiskCanBeCreated,
  ensureQuantitativeAllowed,
  migrateLegacyRiskRecord
};
