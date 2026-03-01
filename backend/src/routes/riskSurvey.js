const express = require('express');
const mongoose = require('mongoose');

const { requirePermission } = require('../middleware/rbac');
const { requireFeatureFlag } = require('../middleware/featureFlags');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

const ENV_TYPES = ['area_aberta', 'galpao', 'sala_tecnica', 'laboratorio', 'campo', 'outro'];
const VENT_TYPES = ['natural', 'forcada', 'exaustao_localizada', 'inexistente'];
const LIGHT_TYPES = ['natural', 'artificial', 'mista'];
const TEMP_TYPES = ['normal', 'elevada', 'variavel'];
const FLOOR_TYPES = ['regular', 'irregular', 'escorregadio'];
const FREQ_TYPES = ['diaria', 'semanal', 'eventual', 'sazonal'];
const AGENT_TYPES = ['fisico', 'quimico', 'biologico', 'ergonomico', 'acidente', 'psicossocial'];
const CONDITION_TYPES = ['normal', 'anormal', 'emergencia'];
const CONFIDENCE_TYPES = ['alto', 'medio', 'baixo'];
const MEASUREMENT_TYPES = [
  'ruido',
  'calor_ibutg',
  'vibracao',
  'agente_quimico',
  'poeira',
  'radiacao_nao_ionizante',
  'outro'
];
const LEGACY_ACTIVITY_NAME = 'Atividade migrada - modelo anterior';

const DEFAULT_RANGES = {
  baixo: { min: 1, max: 4, label: 'Baixo' },
  medio: { min: 5, max: 9, label: 'Medio' },
  alto: { min: 10, max: 16, label: 'Alto' },
  critico: { min: 17, max: 25, label: 'Critico' }
};

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    url: { type: String, default: '' },
    type: { type: String, default: '' },
    size: { type: Number, default: 0 }
  },
  { _id: false }
);

const environmentSchema = new mongoose.Schema(
  {
    empresaId: { type: String, required: true, index: true },
    unidade: { type: String, required: true },
    setor: { type: String, required: true },
    nome: { type: String, required: true },
    tipo: { type: String, enum: ENV_TYPES, required: true },
    areaAproximadaM2: { type: Number, default: null },
    peDireitoAproximado: { type: Number, default: null },
    condicoesFisicas: {
      ventilacao: { type: String, enum: VENT_TYPES, default: 'natural' },
      iluminacao: { type: String, enum: LIGHT_TYPES, default: 'mista' },
      temperaturaPercebida: { type: String, enum: TEMP_TYPES, default: 'normal' },
      ruidoPerceptivel: { type: Boolean, default: false },
      poeiraVisivel: { type: Boolean, default: false },
      umidadeExcessiva: { type: Boolean, default: false },
      piso: { type: String, enum: FLOOR_TYPES, default: 'regular' },
      desniveis: { type: Boolean, default: false }
    },
    infraestruturaSeguranca: {
      epcExistentes: { type: String, default: '' },
      sinalizacao: { type: Boolean, default: false },
      chuveiroLavaOlhos: { type: Boolean, default: false },
      extintores: { type: Boolean, default: false },
      baciasContencao: { type: Boolean, default: false },
      sistemaCombateIncendio: { type: Boolean, default: false }
    },
    elementosEstruturais: {
      maquinasInstaladas: { type: String, default: '' },
      tanques: { type: String, default: '' },
      armazenamentoInflamaveis: { type: Boolean, default: false },
      circulacaoVeiculos: { type: Boolean, default: false },
      trabalhoAlturaPresente: { type: Boolean, default: false }
    },
    anexos: { type: [attachmentSchema], default: [] },
    surveyStatus: { type: String, enum: ['draft', 'finalized'], default: 'draft', index: true },
    finalizedAt: { type: Date, default: null },
    finalizedBy: {
      id: { type: String, default: null },
      nome: { type: String, default: '' },
      email: { type: String, default: '' },
      perfil: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

const cargoSchema = new mongoose.Schema(
  {
    environmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyEnvironment', required: true, index: true },
    empresaId: { type: String, required: true, index: true },
    unidade: { type: String, required: true },
    setor: { type: String, required: true },
    nome: { type: String, required: true },
    descricao: { type: String, default: '' },
    ativo: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const activitySchema = new mongoose.Schema(
  {
    environmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyEnvironment', required: true, index: true },
    cargoId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyCargo', required: true, index: true },
    empresaId: { type: String, required: true, index: true },
    nome: { type: String, required: true },
    funcaoCargo: { type: String, default: '' },
    processoMacro: { type: String, required: true },
    descricaoTecnica: { type: String, required: true },
    descricaoTarefa: { type: String, required: true },
    etapasTarefa: { type: [String], default: [] },
    frequencia: { type: String, enum: FREQ_TYPES, required: true },
    duracaoMediaMin: { type: Number, default: null },
    trabalhadoresEnvolvidos: { type: Number, default: 1 },
    trabalhoIsolado: { type: Boolean, default: false },
    atividadeComTerceiros: { type: Boolean, default: false },
    recursosUtilizados: {
      maquinasEquipamentos: { type: [String], default: [] },
      ferramentasManuais: { type: [String], default: [] },
      produtosQuimicos: { type: [String], default: [] },
      materiaisUtilizados: { type: [String], default: [] }
    },
    anexos: { type: [attachmentSchema], default: [] }
  },
  { timestamps: true }
);

const riskItemSchema = new mongoose.Schema(
  {
    activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyActivity', required: true, index: true },
    environmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyEnvironment', required: true, index: true },
    riskLibraryId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskLibrary', default: null, index: true },
    empresaId: { type: String, required: true, index: true },
    perigo: { type: String, required: true },
    eventoPerigoso: { type: String, required: true },
    danoPotencial: { type: String, required: true },
    riskType: { type: String, enum: AGENT_TYPES, required: true },
    categoriaAgente: { type: String, enum: AGENT_TYPES, required: true },
    condicao: { type: String, enum: CONDITION_TYPES, required: true },
    numeroExpostos: { type: Number, default: 1 },
    grupoHomogeneo: { type: Boolean, default: false },
    controlesExistentes: { type: String, default: '' },
    legacyMigrated: { type: Boolean, default: false, index: true },
    isCustomRisk: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const assessmentSchema = new mongoose.Schema(
  {
    riskItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyItem', required: true, unique: true, index: true },
    activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyActivity', required: true, index: true },
    probabilidade: { type: Number, min: 1, max: 5, required: true },
    severidade: { type: Number, min: 1, max: 5, required: true },
    score: { type: Number, min: 1, max: 25, required: true },
    classificacao: { type: String, required: true },
    justificativaTecnica: { type: String, default: '' },
    nivelConfianca: { type: String, enum: CONFIDENCE_TYPES, required: true }
  },
  { timestamps: true }
);

const measurementSchema = new mongoose.Schema(
  {
    riskItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyItem', required: true, index: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'MeasurementDevice', required: true, index: true },
    tipo: { type: String, enum: MEASUREMENT_TYPES, required: true },
    valorMedido: { type: Number, required: true },
    unidade: { type: String, required: true },
    tempoExposicao: { type: String, default: '' },
    metodoObservacao: { type: String, default: '' },
    dataMedicao: { type: Date, required: true },
    instrumentoUtilizado: { type: String, default: '' },
    comparacao: {
      type: String,
      enum: ['abaixo_referencia', 'proximo_limite', 'acima_referencia', 'sem_referencia'],
      required: true
    },
    referenciaAplicada: {
      valor: { type: Number, default: null },
      unidade: { type: String, default: '' },
      proximidadePercentual: { type: Number, default: 10 }
    }
  },
  { timestamps: true }
);

const riskLibrarySchema = new mongoose.Schema(
  {
    tipo: { type: String, enum: AGENT_TYPES, required: true, index: true },
    titulo: { type: String, required: true },
    perigo: { type: String, required: true },
    eventoPerigoso: { type: String, required: true },
    danoPotencial: { type: String, required: true },
    permiteQuantitativa: { type: Boolean, default: true },
    origem: { type: String, enum: ['biblioteca', 'personalizado'], default: 'biblioteca' },
    ativo: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const measurementDeviceSchema = new mongoose.Schema(
  {
    serialNumber: { type: String, required: true, unique: true, index: true },
    marca: { type: String, required: true },
    modelo: { type: String, required: true },
    dataUltimaCalibracao: { type: Date, required: true },
    observacao: { type: String, default: '' },
    ativo: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const referenceSchema = new mongoose.Schema(
  {
    tipo: { type: String, enum: MEASUREMENT_TYPES, required: true, unique: true, index: true },
    valorReferencia: { type: Number, required: true },
    unidade: { type: String, required: true },
    proximidadePercentual: { type: Number, default: 10 },
    ativo: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const configSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

const auditSchema = new mongoose.Schema(
  {
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    actor: {
      id: { type: String, default: null },
      nome: { type: String, default: '' },
      email: { type: String, default: '' },
      perfil: { type: String, default: '' }
    },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    changes: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

const snapshotSchema = new mongoose.Schema(
  {
    environmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyEnvironment', required: true, index: true },
    finalizedAt: { type: Date, required: true },
    finalizedBy: {
      id: { type: String, default: null },
      nome: { type: String, default: '' },
      email: { type: String, default: '' },
      perfil: { type: String, default: '' }
    },
    payload: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

environmentSchema.index({ empresaId: 1, unidade: 1, setor: 1, nome: 1 });
cargoSchema.index({ environmentId: 1, nome: 1 }, { unique: true });
activitySchema.index({ environmentId: 1, nome: 1 });
riskItemSchema.index({ activityId: 1, riskType: 1 });
measurementSchema.index({ riskItemId: 1, dataMedicao: -1 });
assessmentSchema.index({ activityId: 1 });
riskLibrarySchema.index({ tipo: 1, titulo: 1 }, { unique: true });
snapshotSchema.index({ environmentId: 1, createdAt: -1 });

const RiskSurveyEnvironment =
  mongoose.models.RiskSurveyEnvironment || mongoose.model('RiskSurveyEnvironment', environmentSchema);
const RiskSurveyCargo = mongoose.models.RiskSurveyCargo || mongoose.model('RiskSurveyCargo', cargoSchema);
const RiskSurveyActivity = mongoose.models.RiskSurveyActivity || mongoose.model('RiskSurveyActivity', activitySchema);
const RiskSurveyItem = mongoose.models.RiskSurveyItem || mongoose.model('RiskSurveyItem', riskItemSchema);
const RiskAssessment = mongoose.models.RiskAssessment || mongoose.model('RiskAssessment', assessmentSchema);
const RiskMeasurement = mongoose.models.RiskMeasurement || mongoose.model('RiskMeasurement', measurementSchema);
const RiskReference = mongoose.models.RiskReference || mongoose.model('RiskReference', referenceSchema);
const RiskLibrary = mongoose.models.RiskLibrary || mongoose.model('RiskLibrary', riskLibrarySchema);
const MeasurementDevice =
  mongoose.models.MeasurementDevice || mongoose.model('MeasurementDevice', measurementDeviceSchema);
const RiskSurveyConfig = mongoose.models.RiskSurveyConfig || mongoose.model('RiskSurveyConfig', configSchema);
const RiskSurveyAudit = mongoose.models.RiskSurveyAudit || mongoose.model('RiskSurveyAudit', auditSchema);
const RiskSurveySnapshot = mongoose.models.RiskSurveySnapshot || mongoose.model('RiskSurveySnapshot', snapshotSchema);

const toText = (value, fallback = '') => (value === undefined || value === null ? fallback : String(value).trim());
const toNumber = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};
const toId = (value, field) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    const error = new Error(`${field} invalido`);
    error.status = 400;
    error.code = 'INVALID_ID';
    throw error;
  }
  return value;
};
const isEnum = (list, value) => list.includes(value);
const normalizeRiskType = (value) => (isEnum(AGENT_TYPES, toText(value)) ? toText(value) : 'acidente');

const toActor = (user = {}) => ({
  id: user?.id ? String(user.id) : null,
  nome: toText(user?.nome),
  email: toText(user?.email),
  perfil: toText(user?.perfil)
});

const mapEnvironment = (doc) => {
  if (!doc) return null;
  return {
    id: doc._id?.toString(),
    empresaId: doc.empresaId,
    unidade: doc.unidade,
    setor: doc.setor,
    nome: doc.nome,
    tipo: doc.tipo,
    areaAproximadaM2: doc.areaAproximadaM2,
    peDireitoAproximado: doc.peDireitoAproximado,
    condicoesFisicas: doc.condicoesFisicas || {},
    infraestruturaSeguranca: doc.infraestruturaSeguranca || {},
    elementosEstruturais: doc.elementosEstruturais || {},
    anexos: Array.isArray(doc.anexos) ? doc.anexos : [],
    surveyStatus: doc.surveyStatus,
    finalizedAt: doc.finalizedAt,
    finalizedBy: doc.finalizedBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const mapCargo = (doc) => {
  if (!doc) return null;
  return {
    id: doc._id?.toString(),
    environmentId: doc.environmentId?.toString(),
    empresaId: doc.empresaId,
    unidade: doc.unidade,
    setor: doc.setor,
    nome: doc.nome,
    descricao: doc.descricao || '',
    ativo: Boolean(doc.ativo),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const mapActivity = (doc) => {
  if (!doc) return null;
  return {
    id: doc._id?.toString(),
    environmentId: doc.environmentId?.toString(),
    cargoId: doc.cargoId?.toString(),
    empresaId: doc.empresaId,
    nome: doc.nome,
    funcaoCargo: doc.funcaoCargo,
    processoMacro: doc.processoMacro,
    descricaoTecnica: doc.descricaoTecnica,
    descricaoTarefa: doc.descricaoTarefa,
    etapasTarefa: Array.isArray(doc.etapasTarefa) ? doc.etapasTarefa : [],
    frequencia: doc.frequencia,
    duracaoMediaMin: doc.duracaoMediaMin,
    trabalhadoresEnvolvidos: doc.trabalhadoresEnvolvidos,
    trabalhoIsolado: Boolean(doc.trabalhoIsolado),
    atividadeComTerceiros: Boolean(doc.atividadeComTerceiros),
    recursosUtilizados: doc.recursosUtilizados || {},
    anexos: Array.isArray(doc.anexos) ? doc.anexos : [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const mapRisk = (doc) => {
  if (!doc) return null;
  return {
    id: doc._id?.toString(),
    activityId: doc.activityId?.toString(),
    environmentId: doc.environmentId?.toString(),
    riskLibraryId: doc.riskLibraryId?.toString() || null,
    empresaId: doc.empresaId,
    perigo: doc.perigo,
    eventoPerigoso: doc.eventoPerigoso,
    danoPotencial: doc.danoPotencial,
    riskType: doc.riskType,
    categoriaAgente: doc.categoriaAgente,
    condicao: doc.condicao,
    numeroExpostos: doc.numeroExpostos,
    grupoHomogeneo: Boolean(doc.grupoHomogeneo),
    controlesExistentes: doc.controlesExistentes,
    legacyMigrated: Boolean(doc.legacyMigrated),
    isCustomRisk: Boolean(doc.isCustomRisk),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const mapAssessment = (doc) => {
  if (!doc) return null;
  return {
    id: doc._id?.toString(),
    riskItemId: doc.riskItemId?.toString(),
    activityId: doc.activityId?.toString(),
    probabilidade: doc.probabilidade,
    severidade: doc.severidade,
    score: doc.score,
    classificacao: doc.classificacao,
    justificativaTecnica: doc.justificativaTecnica,
    nivelConfianca: doc.nivelConfianca,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const mapMeasurement = (doc) => {
  if (!doc) return null;
  return {
    id: doc._id?.toString(),
    riskItemId: doc.riskItemId?.toString(),
    deviceId: doc.deviceId?.toString(),
    tipo: doc.tipo,
    valorMedido: doc.valorMedido,
    unidade: doc.unidade,
    tempoExposicao: doc.tempoExposicao,
    metodoObservacao: doc.metodoObservacao,
    dataMedicao: doc.dataMedicao,
    instrumentoUtilizado: doc.instrumentoUtilizado,
    comparacao: doc.comparacao,
    referenciaAplicada: doc.referenciaAplicada,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const mapRiskLibrary = (doc) => {
  if (!doc) return null;
  return {
    id: doc._id?.toString(),
    tipo: doc.tipo,
    titulo: doc.titulo,
    perigo: doc.perigo,
    eventoPerigoso: doc.eventoPerigoso,
    danoPotencial: doc.danoPotencial,
    permiteQuantitativa: Boolean(doc.permiteQuantitativa),
    origem: doc.origem,
    ativo: Boolean(doc.ativo),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const mapMeasurementDevice = (doc) => {
  if (!doc) return null;
  return {
    id: doc._id?.toString(),
    serialNumber: doc.serialNumber,
    marca: doc.marca,
    modelo: doc.modelo,
    dataUltimaCalibracao: doc.dataUltimaCalibracao,
    observacao: doc.observacao || '',
    ativo: Boolean(doc.ativo),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const mapReference = (doc) => {
  if (!doc) return null;
  return {
    id: doc._id?.toString(),
    tipo: doc.tipo,
    valorReferencia: doc.valorReferencia,
    unidade: doc.unidade,
    proximidadePercentual: doc.proximidadePercentual,
    ativo: Boolean(doc.ativo),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const diff = (before, after) => {
  if (!before && !after) return null;
  if (!before) return { created: after };
  if (!after) return { removed: before };
  const changes = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes[key] = { before: before[key], after: after[key] };
    }
  }
  return Object.keys(changes).length ? changes : null;
};

const logAudit = async ({ entityType, entityId, action, actor, before, after }) => {
  await RiskSurveyAudit.create({
    entityType,
    entityId: String(entityId),
    action,
    actor: toActor(actor),
    before: before || null,
    after: after || null,
    changes: diff(before, after)
  });
};

const classifyScore = (score, ranges) => {
  const entries = ['baixo', 'medio', 'alto', 'critico'];
  for (const key of entries) {
    const cfg = ranges?.[key];
    if (cfg && score >= Number(cfg.min) && score <= Number(cfg.max)) {
      return key;
    }
  }
  return 'critico';
};

const getRanges = async () => {
  const cfg = await RiskSurveyConfig.findOne({ key: 'assessment_ranges' }).lean();
  return cfg?.value || DEFAULT_RANGES;
};

const ensureEditableEnvironment = (environment) => {
  if (!environment) {
    const error = new Error('Ambiente nao encontrado');
    error.status = 404;
    error.code = 'ENVIRONMENT_NOT_FOUND';
    throw error;
  }
  if (environment.surveyStatus === 'finalized') {
    const error = new Error('Levantamento finalizado. Edicao bloqueada.');
    error.status = 409;
    error.code = 'SURVEY_FINALIZED';
    throw error;
  }
};

const ensureAssessmentExists = async (riskId) => {
  const assessment = await RiskAssessment.findOne({ riskItemId: riskId }).lean();
  if (!assessment) {
    const error = new Error('Avaliacao qualitativa obrigatoria antes da quantitativa');
    error.status = 409;
    error.code = 'QUALITATIVE_REQUIRED';
    throw error;
  }
  return assessment;
};

const ensureRiskSupportsQuantitative = async (risk) => {
  if (!risk?.riskLibraryId) {
    const error = new Error('Risco sem biblioteca vinculada. Nao permite avaliacao quantitativa.');
    error.status = 409;
    error.code = 'LIBRARY_REQUIRED';
    throw error;
  }

  const library = await RiskLibrary.findById(risk.riskLibraryId).lean();
  if (!library || !library.permiteQuantitativa) {
    const error = new Error('Risco selecionado nao permite avaliacao quantitativa');
    error.status = 409;
    error.code = 'QUANTITATIVE_NOT_ALLOWED';
    throw error;
  }

  return library;
};

const ensureMeasurementDevice = async (deviceId) => {
  const device = await MeasurementDevice.findById(deviceId).lean();
  if (!device || !device.ativo) {
    const error = new Error('Dispositivo de medicao invalido');
    error.status = 400;
    error.code = 'INVALID_DEVICE';
    throw error;
  }
  return device;
};

const buildLegacyLibraryKey = (risk) =>
  `${normalizeRiskType(risk?.categoriaAgente || risk?.riskType)}|${toText(risk?.perigo)}|${toText(
    risk?.eventoPerigoso
  )}`;

const runLegacyMigration = async (actor = null) => {
  const migrated = {
    migratedRisks: 0,
    createdEnvironments: 0,
    createdCargos: 0,
    createdActivities: 0,
    linkedLibrary: 0,
    linkedDevices: 0
  };

  const riskItems = await RiskSurveyItem.find({}).lean();
  const environmentCache = new Map();
  const cargoCache = new Map();
  const activityCache = new Map();
  const libraryCache = new Map();

  for (const risk of riskItems) {
    let shouldSaveRisk = false;
    let environment = null;

    if (risk.environmentId && mongoose.Types.ObjectId.isValid(risk.environmentId)) {
      environment = await RiskSurveyEnvironment.findById(risk.environmentId);
    }

    if (!environment) {
      const empresaId = toText(risk.empresaId, 'legacy');
      const unidade = toText(risk.unidade, 'Unidade migrada');
      const setor = toText(risk.setor, 'Setor migrado');
      const envKey = `${empresaId}|${unidade}|${setor}`;
      environment = environmentCache.get(envKey);
      if (!environment) {
        environment = await RiskSurveyEnvironment.findOne({
          empresaId,
          unidade,
          setor,
          nome: 'Ambiente migrado'
        });
      }

      if (!environment) {
        environment = await RiskSurveyEnvironment.create({
          empresaId,
          unidade,
          setor,
          nome: 'Ambiente migrado',
          tipo: 'outro',
          condicoesFisicas: {
            ventilacao: 'natural',
            iluminacao: 'mista',
            temperaturaPercebida: 'normal',
            ruidoPerceptivel: false,
            poeiraVisivel: false,
            umidadeExcessiva: false,
            piso: 'regular',
            desniveis: false
          }
        });
        migrated.createdEnvironments += 1;
      }
      environmentCache.set(envKey, environment);
    }

    let cargo = null;
    if (risk.activityId && mongoose.Types.ObjectId.isValid(risk.activityId)) {
      const existingActivity = await RiskSurveyActivity.findById(risk.activityId).lean();
      if (existingActivity?.cargoId && mongoose.Types.ObjectId.isValid(existingActivity.cargoId)) {
        cargo = await RiskSurveyCargo.findById(existingActivity.cargoId);
      }
    }

    if (!cargo) {
      const cargoName = toText(risk.funcaoCargo || risk.cargo, 'Cargo migrado');
      const cargoKey = `${environment._id.toString()}|${cargoName}`;
      cargo = cargoCache.get(cargoKey);
      if (!cargo) {
        cargo = await RiskSurveyCargo.findOne({ environmentId: environment._id, nome: cargoName });
      }
      if (!cargo) {
        cargo = await RiskSurveyCargo.create({
          environmentId: environment._id,
          empresaId: environment.empresaId,
          unidade: environment.unidade,
          setor: environment.setor,
          nome: cargoName,
          descricao: 'Cargo migrado do modelo anterior'
        });
        migrated.createdCargos += 1;
      }
      cargoCache.set(cargoKey, cargo);
    }

    let activity = null;
    if (risk.activityId && mongoose.Types.ObjectId.isValid(risk.activityId)) {
      activity = await RiskSurveyActivity.findById(risk.activityId);
    }
    if (!activity) {
      const activityKey = `${cargo._id.toString()}|${LEGACY_ACTIVITY_NAME}`;
      activity = activityCache.get(activityKey);
      if (!activity) {
        activity = await RiskSurveyActivity.findOne({ cargoId: cargo._id, nome: LEGACY_ACTIVITY_NAME });
      }
      if (!activity) {
        activity = await RiskSurveyActivity.create({
          environmentId: environment._id,
          cargoId: cargo._id,
          empresaId: environment.empresaId,
          nome: LEGACY_ACTIVITY_NAME,
          funcaoCargo: cargo.nome,
          processoMacro: 'migracao',
          descricaoTecnica: 'Atividade gerada automaticamente durante migracao de legado',
          descricaoTarefa: 'Registro migrado do modelo anterior',
          frequencia: 'eventual'
        });
        migrated.createdActivities += 1;
      }
      activityCache.set(activityKey, activity);
      shouldSaveRisk = true;
    }

    let libraryId = risk.riskLibraryId;
    if (!libraryId || !mongoose.Types.ObjectId.isValid(libraryId)) {
      const key = buildLegacyLibraryKey(risk);
      let library = libraryCache.get(key);
      if (!library) {
        library = await RiskLibrary.findOne({
          tipo: normalizeRiskType(risk.categoriaAgente || risk.riskType),
          titulo: toText(risk.perigo || 'Risco migrado'),
          perigo: toText(risk.perigo),
          eventoPerigoso: toText(risk.eventoPerigoso)
        });
      }
      if (!library) {
        library = await RiskLibrary.create({
          tipo: normalizeRiskType(risk.categoriaAgente || risk.riskType),
          titulo: toText(risk.perigo || 'Risco migrado'),
          perigo: toText(risk.perigo || 'Risco migrado'),
          eventoPerigoso: toText(risk.eventoPerigoso || 'Evento migrado'),
          danoPotencial: toText(risk.danoPotencial || 'Dano migrado'),
          permiteQuantitativa: true,
          origem: 'personalizado'
        });
      }
      libraryCache.set(key, library);
      libraryId = library._id;
      migrated.linkedLibrary += 1;
      shouldSaveRisk = true;
    }

    if (shouldSaveRisk || !risk.activityId || !risk.environmentId || !risk.legacyMigrated) {
      await RiskSurveyItem.updateOne(
        { _id: risk._id },
        {
          $set: {
            environmentId: environment._id,
            empresaId: environment.empresaId,
            activityId: activity._id,
            riskLibraryId: libraryId,
            riskType: normalizeRiskType(risk.riskType || risk.categoriaAgente),
            categoriaAgente: normalizeRiskType(risk.categoriaAgente || risk.riskType),
            legacyMigrated: true,
            isCustomRisk: true
          }
        }
      );

      await RiskAssessment.updateMany({ riskItemId: risk._id }, { $set: { activityId: activity._id } });

      const measurements = await RiskMeasurement.find({ riskItemId: risk._id }).lean();
      for (const measurement of measurements) {
        if (!measurement.deviceId || !mongoose.Types.ObjectId.isValid(measurement.deviceId)) {
          const serial = `LEGACY-${measurement._id.toString().slice(-8)}`;
          let device = await MeasurementDevice.findOne({ serialNumber: serial });
          if (!device) {
            device = await MeasurementDevice.create({
              serialNumber: serial,
              marca: 'Nao informado',
              modelo: 'Legado',
              dataUltimaCalibracao: new Date(),
              observacao: 'Criado automaticamente pela migracao'
            });
          }
          await RiskMeasurement.updateOne({ _id: measurement._id }, { $set: { deviceId: device._id } });
          migrated.linkedDevices += 1;
        }
      }

      migrated.migratedRisks += 1;
    }
  }

  if (actor) {
    await logAudit({
      entityType: 'risk_migration',
      entityId: 'legacy',
      action: 'execute',
      actor,
      before: null,
      after: migrated
    });
  }

  return migrated;
};

router.use(requireFeatureFlag('structured_risk_survey'));

router.get('/metadata', requirePermission('riskSurvey:read'), (req, res) => {
  return sendSuccess(res, {
    data: {
      hierarchy: ['empresa', 'unidade', 'setor', 'ambiente', 'cargo', 'atividade', 'risco'],
      environmentTypes: ENV_TYPES,
      ventilationTypes: VENT_TYPES,
      lightingTypes: LIGHT_TYPES,
      temperatureTypes: TEMP_TYPES,
      floorTypes: FLOOR_TYPES,
      activityFrequencyTypes: FREQ_TYPES,
      riskTypes: AGENT_TYPES,
      riskAgentCategories: AGENT_TYPES,
      riskConditionTypes: CONDITION_TYPES,
      confidenceLevels: CONFIDENCE_TYPES,
      measurementTypes: MEASUREMENT_TYPES,
      assessmentRanges: DEFAULT_RANGES
    }
  });
});

router.get('/config/assessment', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const ranges = await getRanges();
    return sendSuccess(res, { data: ranges });
  } catch (error) {
    return sendError(res, { message: 'Erro ao carregar configuracao', meta: { details: error.message } }, 500);
  }
});

router.put('/config/assessment', requirePermission('riskSurvey:configure'), async (req, res) => {
  try {
    const ranges = req.body || {};
    for (const key of ['baixo', 'medio', 'alto', 'critico']) {
      const row = ranges[key];
      if (!row || Number.isNaN(Number(row.min)) || Number.isNaN(Number(row.max))) {
        return sendError(res, { message: 'Faixas invalidas' }, 400);
      }
    }

    const updated = await RiskSurveyConfig.findOneAndUpdate(
      { key: 'assessment_ranges' },
      { key: 'assessment_ranges', value: ranges },
      { upsert: true, new: true }
    ).lean();

    await logAudit({
      entityType: 'risk_assessment_config',
      entityId: 'assessment_ranges',
      action: 'update',
      actor: req.user,
      before: null,
      after: updated?.value || ranges
    });

    return sendSuccess(res, { data: updated?.value || ranges, message: 'Configuracao atualizada' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao salvar configuracao', meta: { details: error.message } }, 500);
  }
});

router.get('/references', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const includeInactive = String(req.query?.includeInactive || 'false').toLowerCase() === 'true';
    const filter = includeInactive ? {} : { ativo: true };
    const refs = await RiskReference.find(filter).sort({ tipo: 1 }).lean();
    return sendSuccess(res, { data: refs.map(mapReference), meta: { total: refs.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao carregar referencias', meta: { details: error.message } }, 500);
  }
});

router.put('/references/:tipo', requirePermission('riskSurvey:configure'), async (req, res) => {
  try {
    const tipo = toText(req.params.tipo);
    if (!isEnum(MEASUREMENT_TYPES, tipo)) {
      return sendError(res, { message: 'Tipo invalido' }, 400);
    }

    const valorReferencia = Number(req.body?.valorReferencia);
    const unidade = toText(req.body?.unidade);
    const proximidadePercentual = Number(req.body?.proximidadePercentual ?? 10);
    const ativo = req.body?.ativo !== undefined ? Boolean(req.body.ativo) : true;

    if (Number.isNaN(valorReferencia) || valorReferencia < 0) {
      return sendError(res, { message: 'Valor de referencia invalido' }, 400);
    }
    if (!unidade) {
      return sendError(res, { message: 'Unidade e obrigatoria' }, 400);
    }

    const previous = await RiskReference.findOne({ tipo }).lean();
    const updated = await RiskReference.findOneAndUpdate(
      { tipo },
      { tipo, valorReferencia, unidade, proximidadePercentual, ativo },
      { upsert: true, new: true }
    ).lean();

    await logAudit({
      entityType: 'risk_measurement_reference',
      entityId: tipo,
      action: 'upsert',
      actor: req.user,
      before: previous,
      after: updated
    });

    return sendSuccess(res, { data: mapReference(updated), message: 'Referencia atualizada' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar referencia', meta: { details: error.message } }, 500);
  }
});

router.post('/maintenance/migrate-legacy', requirePermission('riskSurvey:configure'), async (req, res) => {
  try {
    const result = await runLegacyMigration(req.user);
    return sendSuccess(res, { data: result, message: 'Migracao de legado executada com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao executar migracao de legado', meta: { details: error.message } }, 500);
  }
});

router.get('/library', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const filters = {};
    if (req.query?.tipo && isEnum(AGENT_TYPES, toText(req.query.tipo))) {
      filters.tipo = toText(req.query.tipo);
    }
    if (req.query?.ativo !== undefined) {
      filters.ativo = String(req.query.ativo).toLowerCase() === 'true';
    }
    if (req.query?.origem) {
      filters.origem = toText(req.query.origem);
    }
    if (req.query?.search) {
      const term = new RegExp(toText(req.query.search), 'i');
      filters.$or = [{ titulo: term }, { perigo: term }, { eventoPerigoso: term }, { danoPotencial: term }];
    }

    const rows = await RiskLibrary.find(filters).sort({ tipo: 1, titulo: 1 }).lean();
    return sendSuccess(res, { data: rows.map(mapRiskLibrary), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar biblioteca de riscos', meta: { details: error.message } }, 500);
  }
});

router.post('/library', requirePermission('riskSurvey:configure'), async (req, res) => {
  try {
    const payload = {
      tipo: normalizeRiskType(req.body?.tipo),
      titulo: toText(req.body?.titulo),
      perigo: toText(req.body?.perigo),
      eventoPerigoso: toText(req.body?.eventoPerigoso),
      danoPotencial: toText(req.body?.danoPotencial),
      permiteQuantitativa: req.body?.permiteQuantitativa !== undefined ? Boolean(req.body.permiteQuantitativa) : true,
      origem: toText(req.body?.origem, 'biblioteca'),
      ativo: req.body?.ativo !== undefined ? Boolean(req.body.ativo) : true
    };

    if (!payload.titulo || !payload.perigo || !payload.eventoPerigoso || !payload.danoPotencial) {
      return sendError(res, { message: 'Campos obrigatorios da biblioteca ausentes' }, 400);
    }
    if (!['biblioteca', 'personalizado'].includes(payload.origem)) {
      return sendError(res, { message: 'Origem invalida' }, 400);
    }

    const created = await RiskLibrary.create(payload);
    const mapped = mapRiskLibrary(created.toObject());
    await logAudit({ entityType: 'risk_library', entityId: mapped.id, action: 'create', actor: req.user, before: null, after: mapped });
    return sendSuccess(res, { data: mapped, message: 'Item da biblioteca criado com sucesso' }, 201);
  } catch (error) {
    if (error?.code === 11000) {
      return sendError(res, { message: 'Risco ja existe na biblioteca para este tipo' }, 409);
    }
    return sendError(res, { message: 'Erro ao criar item da biblioteca', meta: { details: error.message } }, 500);
  }
});

router.put('/library/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:configure'), async (req, res) => {
  try {
    const lib = await RiskLibrary.findById(req.params.id);
    if (!lib) return sendError(res, { message: 'Item da biblioteca nao encontrado' }, 404);
    const before = mapRiskLibrary(lib.toObject());

    if (req.body?.tipo !== undefined) lib.tipo = normalizeRiskType(req.body.tipo);
    if (req.body?.titulo !== undefined) lib.titulo = toText(req.body.titulo);
    if (req.body?.perigo !== undefined) lib.perigo = toText(req.body.perigo);
    if (req.body?.eventoPerigoso !== undefined) lib.eventoPerigoso = toText(req.body.eventoPerigoso);
    if (req.body?.danoPotencial !== undefined) lib.danoPotencial = toText(req.body.danoPotencial);
    if (req.body?.permiteQuantitativa !== undefined) lib.permiteQuantitativa = Boolean(req.body.permiteQuantitativa);
    if (req.body?.origem !== undefined && ['biblioteca', 'personalizado'].includes(toText(req.body.origem))) {
      lib.origem = toText(req.body.origem);
    }
    if (req.body?.ativo !== undefined) lib.ativo = Boolean(req.body.ativo);

    await lib.save();
    const after = mapRiskLibrary(lib.toObject());
    await logAudit({ entityType: 'risk_library', entityId: after.id, action: 'update', actor: req.user, before, after });
    return sendSuccess(res, { data: after, message: 'Biblioteca atualizada com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar biblioteca', meta: { details: error.message } }, 500);
  }
});

router.delete('/library/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:configure'), async (req, res) => {
  try {
    const lib = await RiskLibrary.findById(req.params.id);
    if (!lib) return sendError(res, { message: 'Item da biblioteca nao encontrado' }, 404);

    const linked = await RiskSurveyItem.countDocuments({ riskLibraryId: lib._id });
    if (linked > 0) {
      lib.ativo = false;
      await lib.save();
      return sendSuccess(res, {
        data: mapRiskLibrary(lib.toObject()),
        message: 'Item vinculado a riscos existentes. Marcado como inativo.'
      });
    }

    const before = mapRiskLibrary(lib.toObject());
    await RiskLibrary.deleteOne({ _id: lib._id });
    await logAudit({ entityType: 'risk_library', entityId: before.id, action: 'delete', actor: req.user, before, after: null });
    return sendSuccess(res, { data: null, message: 'Item removido da biblioteca' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao remover item da biblioteca', meta: { details: error.message } }, 500);
  }
});

router.get('/devices', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const filters = {};
    if (req.query?.ativo !== undefined) {
      filters.ativo = String(req.query.ativo).toLowerCase() === 'true';
    }
    if (req.query?.search) {
      const term = new RegExp(toText(req.query.search), 'i');
      filters.$or = [{ serialNumber: term }, { marca: term }, { modelo: term }];
    }
    const rows = await MeasurementDevice.find(filters).sort({ createdAt: -1 }).lean();
    return sendSuccess(res, { data: rows.map(mapMeasurementDevice), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar dispositivos', meta: { details: error.message } }, 500);
  }
});

router.post('/devices', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const payload = {
      serialNumber: toText(req.body?.serialNumber),
      marca: toText(req.body?.marca),
      modelo: toText(req.body?.modelo),
      dataUltimaCalibracao: req.body?.dataUltimaCalibracao ? new Date(req.body.dataUltimaCalibracao) : null,
      observacao: toText(req.body?.observacao),
      ativo: req.body?.ativo !== undefined ? Boolean(req.body.ativo) : true
    };
    if (!payload.serialNumber || !payload.marca || !payload.modelo || !payload.dataUltimaCalibracao) {
      return sendError(res, { message: 'serialNumber, marca, modelo e dataUltimaCalibracao sao obrigatorios' }, 400);
    }
    if (Number.isNaN(payload.dataUltimaCalibracao.getTime())) {
      return sendError(res, { message: 'Data de calibracao invalida' }, 400);
    }
    const created = await MeasurementDevice.create(payload);
    const mapped = mapMeasurementDevice(created.toObject());
    await logAudit({ entityType: 'measurement_device', entityId: mapped.id, action: 'create', actor: req.user, before: null, after: mapped });
    return sendSuccess(res, { data: mapped, message: 'Dispositivo cadastrado com sucesso' }, 201);
  } catch (error) {
    if (error?.code === 11000) {
      return sendError(res, { message: 'Serial number ja cadastrado' }, 409);
    }
    return sendError(res, { message: 'Erro ao cadastrar dispositivo', meta: { details: error.message } }, 500);
  }
});

router.put('/devices/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const device = await MeasurementDevice.findById(req.params.id);
    if (!device) return sendError(res, { message: 'Dispositivo nao encontrado' }, 404);
    const before = mapMeasurementDevice(device.toObject());

    if (req.body?.serialNumber !== undefined) device.serialNumber = toText(req.body.serialNumber);
    if (req.body?.marca !== undefined) device.marca = toText(req.body.marca);
    if (req.body?.modelo !== undefined) device.modelo = toText(req.body.modelo);
    if (req.body?.dataUltimaCalibracao !== undefined) device.dataUltimaCalibracao = new Date(req.body.dataUltimaCalibracao);
    if (req.body?.observacao !== undefined) device.observacao = toText(req.body.observacao);
    if (req.body?.ativo !== undefined) device.ativo = Boolean(req.body.ativo);

    await device.save();
    const after = mapMeasurementDevice(device.toObject());
    await logAudit({ entityType: 'measurement_device', entityId: after.id, action: 'update', actor: req.user, before, after });
    return sendSuccess(res, { data: after, message: 'Dispositivo atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar dispositivo', meta: { details: error.message } }, 500);
  }
});

router.delete('/devices/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const device = await MeasurementDevice.findById(req.params.id);
    if (!device) return sendError(res, { message: 'Dispositivo nao encontrado' }, 404);

    const linked = await RiskMeasurement.countDocuments({ deviceId: device._id });
    if (linked > 0) {
      device.ativo = false;
      await device.save();
      return sendSuccess(res, {
        data: mapMeasurementDevice(device.toObject()),
        message: 'Dispositivo em uso. Marcado como inativo.'
      });
    }

    const before = mapMeasurementDevice(device.toObject());
    await MeasurementDevice.deleteOne({ _id: device._id });
    await logAudit({ entityType: 'measurement_device', entityId: before.id, action: 'delete', actor: req.user, before, after: null });
    return sendSuccess(res, { data: null, message: 'Dispositivo removido com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao remover dispositivo', meta: { details: error.message } }, 500);
  }
});

router.get('/environments', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const filters = {};
    if (req.query?.empresaId) filters.empresaId = String(req.query.empresaId);
    if (req.query?.surveyStatus) filters.surveyStatus = String(req.query.surveyStatus);
    if (req.query?.search) {
      const term = new RegExp(toText(req.query.search), 'i');
      filters.$or = [{ nome: term }, { unidade: term }, { setor: term }];
    }

    const rows = await RiskSurveyEnvironment.find(filters).sort({ createdAt: -1 }).lean();
    return sendSuccess(res, { data: rows.map(mapEnvironment), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar ambientes', meta: { details: error.message } }, 500);
  }
});

router.post('/environments', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const payload = {
      empresaId: toText(req.body?.empresaId),
      unidade: toText(req.body?.unidade),
      setor: toText(req.body?.setor),
      nome: toText(req.body?.nome),
      tipo: toText(req.body?.tipo),
      areaAproximadaM2: toNumber(req.body?.areaAproximadaM2),
      peDireitoAproximado: toNumber(req.body?.peDireitoAproximado),
      condicoesFisicas: req.body?.condicoesFisicas || {},
      infraestruturaSeguranca: req.body?.infraestruturaSeguranca || {},
      elementosEstruturais: req.body?.elementosEstruturais || {},
      anexos: Array.isArray(req.body?.anexos) ? req.body.anexos : []
    };

    if (!payload.empresaId || !payload.unidade || !payload.setor || !payload.nome || !payload.tipo) {
      return sendError(res, { message: 'empresaId, unidade, setor, nome e tipo sao obrigatorios' }, 400);
    }
    if (!isEnum(ENV_TYPES, payload.tipo)) {
      return sendError(res, { message: 'Tipo de ambiente invalido' }, 400);
    }

    payload.condicoesFisicas = {
      ventilacao: toText(payload.condicoesFisicas.ventilacao, 'natural'),
      iluminacao: toText(payload.condicoesFisicas.iluminacao, 'mista'),
      temperaturaPercebida: toText(payload.condicoesFisicas.temperaturaPercebida, 'normal'),
      ruidoPerceptivel: Boolean(payload.condicoesFisicas.ruidoPerceptivel),
      poeiraVisivel: Boolean(payload.condicoesFisicas.poeiraVisivel),
      umidadeExcessiva: Boolean(payload.condicoesFisicas.umidadeExcessiva),
      piso: toText(payload.condicoesFisicas.piso, 'regular'),
      desniveis: Boolean(payload.condicoesFisicas.desniveis)
    };

    if (!isEnum(VENT_TYPES, payload.condicoesFisicas.ventilacao)) {
      return sendError(res, { message: 'Ventilacao invalida' }, 400);
    }
    if (!isEnum(LIGHT_TYPES, payload.condicoesFisicas.iluminacao)) {
      return sendError(res, { message: 'Iluminacao invalida' }, 400);
    }
    if (!isEnum(TEMP_TYPES, payload.condicoesFisicas.temperaturaPercebida)) {
      return sendError(res, { message: 'Temperatura percebida invalida' }, 400);
    }
    if (!isEnum(FLOOR_TYPES, payload.condicoesFisicas.piso)) {
      return sendError(res, { message: 'Piso invalido' }, 400);
    }

    const created = await RiskSurveyEnvironment.create(payload);
    const mapped = mapEnvironment(created.toObject());

    await logAudit({ entityType: 'environment', entityId: mapped.id, action: 'create', actor: req.user, before: null, after: mapped });

    return sendSuccess(res, { data: mapped, message: 'Ambiente criado com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar ambiente', meta: { details: error.message } }, 500);
  }
});

router.get('/environments/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const row = await RiskSurveyEnvironment.findById(req.params.id).lean();
    if (!row) return sendError(res, { message: 'Ambiente nao encontrado' }, 404);
    return sendSuccess(res, { data: mapEnvironment(row) });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar ambiente', meta: { details: error.message } }, 500);
  }
});

router.put('/environments/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const environment = await RiskSurveyEnvironment.findById(req.params.id);
    ensureEditableEnvironment(environment);

    const before = mapEnvironment(environment.toObject());

    if (req.body?.nome !== undefined) environment.nome = toText(req.body.nome);
    if (req.body?.unidade !== undefined) environment.unidade = toText(req.body.unidade);
    if (req.body?.setor !== undefined) environment.setor = toText(req.body.setor);
    if (req.body?.tipo !== undefined) {
      if (!isEnum(ENV_TYPES, toText(req.body.tipo))) return sendError(res, { message: 'Tipo invalido' }, 400);
      environment.tipo = toText(req.body.tipo);
    }

    if (req.body?.areaAproximadaM2 !== undefined) environment.areaAproximadaM2 = toNumber(req.body.areaAproximadaM2);
    if (req.body?.peDireitoAproximado !== undefined) {
      environment.peDireitoAproximado = toNumber(req.body.peDireitoAproximado);
    }
    if (req.body?.condicoesFisicas !== undefined) {
      const c = req.body.condicoesFisicas || {};
      const next = {
        ...environment.condicoesFisicas,
        ...c
      };
      if (!isEnum(VENT_TYPES, toText(next.ventilacao, 'natural'))) return sendError(res, { message: 'Ventilacao invalida' }, 400);
      if (!isEnum(LIGHT_TYPES, toText(next.iluminacao, 'mista'))) return sendError(res, { message: 'Iluminacao invalida' }, 400);
      if (!isEnum(TEMP_TYPES, toText(next.temperaturaPercebida, 'normal'))) return sendError(res, { message: 'Temperatura invalida' }, 400);
      if (!isEnum(FLOOR_TYPES, toText(next.piso, 'regular'))) return sendError(res, { message: 'Piso invalido' }, 400);
      environment.condicoesFisicas = next;
    }

    if (req.body?.infraestruturaSeguranca !== undefined) {
      environment.infraestruturaSeguranca = {
        ...environment.infraestruturaSeguranca,
        ...req.body.infraestruturaSeguranca
      };
    }

    if (req.body?.elementosEstruturais !== undefined) {
      environment.elementosEstruturais = {
        ...environment.elementosEstruturais,
        ...req.body.elementosEstruturais
      };
    }

    if (req.body?.anexos !== undefined) {
      environment.anexos = Array.isArray(req.body.anexos) ? req.body.anexos : [];
    }

    await environment.save();
    const after = mapEnvironment(environment.toObject());

    await logAudit({ entityType: 'environment', entityId: after.id, action: 'update', actor: req.user, before, after });

    return sendSuccess(res, { data: after, message: 'Ambiente atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao atualizar ambiente', meta: { code: error.code } }, error.status || 500);
  }
});

router.delete('/environments/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const environment = await RiskSurveyEnvironment.findById(req.params.id);
    ensureEditableEnvironment(environment);

    const cargoCount = await RiskSurveyCargo.countDocuments({ environmentId: environment._id });
    if (cargoCount > 0) {
      return sendError(res, { message: 'Nao e possivel excluir ambiente com cargos vinculados' }, 409);
    }

    const activityCount = await RiskSurveyActivity.countDocuments({ environmentId: environment._id });
    if (activityCount > 0) {
      return sendError(res, { message: 'Nao e possivel excluir ambiente com atividades vinculadas' }, 409);
    }

    const before = mapEnvironment(environment.toObject());
    await RiskSurveyEnvironment.deleteOne({ _id: environment._id });

    await logAudit({ entityType: 'environment', entityId: before.id, action: 'delete', actor: req.user, before, after: null });

    return sendSuccess(res, { data: null, message: 'Ambiente removido com sucesso' });
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao remover ambiente', meta: { code: error.code } }, error.status || 500);
  }
});

router.get('/environments/:id([a-fA-F0-9]{24})/cargos', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const rows = await RiskSurveyCargo.find({ environmentId: req.params.id }).sort({ nome: 1 }).lean();
    return sendSuccess(res, { data: rows.map(mapCargo), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar cargos', meta: { details: error.message } }, 500);
  }
});

router.post('/cargos', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const environmentId = toId(req.body?.environmentId, 'environmentId');
    const environment = await RiskSurveyEnvironment.findById(environmentId);
    ensureEditableEnvironment(environment);

    const payload = {
      environmentId: environment._id,
      empresaId: environment.empresaId,
      unidade: environment.unidade,
      setor: environment.setor,
      nome: toText(req.body?.nome),
      descricao: toText(req.body?.descricao),
      ativo: req.body?.ativo !== undefined ? Boolean(req.body.ativo) : true
    };

    if (!payload.nome) {
      return sendError(res, { message: 'Nome do cargo e obrigatorio' }, 400);
    }

    const created = await RiskSurveyCargo.create(payload);
    const mapped = mapCargo(created.toObject());
    await logAudit({ entityType: 'cargo', entityId: mapped.id, action: 'create', actor: req.user, before: null, after: mapped });
    return sendSuccess(res, { data: mapped, message: 'Cargo criado com sucesso' }, 201);
  } catch (error) {
    if (error?.code === 11000) {
      return sendError(res, { message: 'Cargo ja cadastrado neste ambiente' }, 409);
    }
    return sendError(res, { message: 'Erro ao criar cargo', meta: { details: error.message } }, 500);
  }
});

router.put('/cargos/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const cargo = await RiskSurveyCargo.findById(req.params.id);
    if (!cargo) return sendError(res, { message: 'Cargo nao encontrado' }, 404);

    const environment = await RiskSurveyEnvironment.findById(cargo.environmentId);
    ensureEditableEnvironment(environment);

    const before = mapCargo(cargo.toObject());
    if (req.body?.nome !== undefined) cargo.nome = toText(req.body.nome);
    if (req.body?.descricao !== undefined) cargo.descricao = toText(req.body.descricao);
    if (req.body?.ativo !== undefined) cargo.ativo = Boolean(req.body.ativo);
    await cargo.save();

    const after = mapCargo(cargo.toObject());
    await logAudit({ entityType: 'cargo', entityId: after.id, action: 'update', actor: req.user, before, after });
    return sendSuccess(res, { data: after, message: 'Cargo atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar cargo', meta: { details: error.message } }, 500);
  }
});

router.delete('/cargos/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const cargo = await RiskSurveyCargo.findById(req.params.id);
    if (!cargo) return sendError(res, { message: 'Cargo nao encontrado' }, 404);

    const environment = await RiskSurveyEnvironment.findById(cargo.environmentId);
    ensureEditableEnvironment(environment);

    const linked = await RiskSurveyActivity.countDocuments({ cargoId: cargo._id });
    if (linked > 0) {
      return sendError(res, { message: 'Nao e possivel excluir cargo com atividades vinculadas' }, 409);
    }

    const before = mapCargo(cargo.toObject());
    await RiskSurveyCargo.deleteOne({ _id: cargo._id });
    await logAudit({ entityType: 'cargo', entityId: before.id, action: 'delete', actor: req.user, before, after: null });
    return sendSuccess(res, { data: null, message: 'Cargo removido com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao remover cargo', meta: { details: error.message } }, 500);
  }
});

router.get('/cargos/:id([a-fA-F0-9]{24})/activities', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const rows = await RiskSurveyActivity.find({ cargoId: req.params.id }).sort({ createdAt: 1 }).lean();
    return sendSuccess(res, { data: rows.map(mapActivity), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar atividades do cargo', meta: { details: error.message } }, 500);
  }
});

router.get('/environments/:id([a-fA-F0-9]{24})/activities', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const filters = { environmentId: req.params.id };
    if (req.query?.cargoId && mongoose.Types.ObjectId.isValid(req.query.cargoId)) {
      filters.cargoId = req.query.cargoId;
    }
    const rows = await RiskSurveyActivity.find(filters).sort({ createdAt: 1 }).lean();
    return sendSuccess(res, { data: rows.map(mapActivity), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar atividades', meta: { details: error.message } }, 500);
  }
});

router.post('/activities', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const environmentId = toId(req.body?.environmentId, 'environmentId');
    const cargoId = toId(req.body?.cargoId, 'cargoId');
    const environment = await RiskSurveyEnvironment.findById(environmentId);
    ensureEditableEnvironment(environment);
    const cargo = await RiskSurveyCargo.findById(cargoId);
    if (!cargo) {
      return sendError(res, { message: 'Cargo nao encontrado' }, 404);
    }
    if (String(cargo.environmentId) !== String(environment._id)) {
      return sendError(res, { message: 'Cargo nao pertence ao ambiente informado' }, 400);
    }

    const payload = {
      environmentId,
      cargoId,
      empresaId: environment.empresaId,
      nome: toText(req.body?.nome),
      funcaoCargo: toText(req.body?.funcaoCargo || cargo.nome),
      processoMacro: toText(req.body?.processoMacro),
      descricaoTecnica: toText(req.body?.descricaoTecnica),
      descricaoTarefa: toText(req.body?.descricaoTarefa),
      etapasTarefa: Array.isArray(req.body?.etapasTarefa) ? req.body.etapasTarefa.map((x) => toText(x)).filter(Boolean) : [],
      frequencia: toText(req.body?.frequencia),
      duracaoMediaMin: toNumber(req.body?.duracaoMediaMin),
      trabalhadoresEnvolvidos: toNumber(req.body?.trabalhadoresEnvolvidos, 1),
      trabalhoIsolado: Boolean(req.body?.trabalhoIsolado),
      atividadeComTerceiros: Boolean(req.body?.atividadeComTerceiros),
      recursosUtilizados: req.body?.recursosUtilizados || {},
      anexos: Array.isArray(req.body?.anexos) ? req.body.anexos : []
    };

    if (!payload.nome || !payload.processoMacro || !payload.descricaoTecnica || !payload.descricaoTarefa) {
      return sendError(res, { message: 'Campos obrigatorios da atividade ausentes' }, 400);
    }
    if (!isEnum(FREQ_TYPES, payload.frequencia)) {
      return sendError(res, { message: 'Frequencia invalida' }, 400);
    }

    const created = await RiskSurveyActivity.create(payload);
    const mapped = mapActivity(created.toObject());

    await logAudit({ entityType: 'activity', entityId: mapped.id, action: 'create', actor: req.user, before: null, after: mapped });

    return sendSuccess(res, { data: mapped, message: 'Atividade criada com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao criar atividade', meta: { code: error.code } }, error.status || 500);
  }
});

router.get('/activities/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const row = await RiskSurveyActivity.findById(req.params.id).lean();
    if (!row) return sendError(res, { message: 'Atividade nao encontrada' }, 404);
    return sendSuccess(res, { data: mapActivity(row) });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar atividade', meta: { details: error.message } }, 500);
  }
});

router.put('/activities/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const activity = await RiskSurveyActivity.findById(req.params.id);
    if (!activity) return sendError(res, { message: 'Atividade nao encontrada' }, 404);

    const environment = await RiskSurveyEnvironment.findById(activity.environmentId);
    ensureEditableEnvironment(environment);

    const before = mapActivity(activity.toObject());

    if (req.body?.cargoId !== undefined) {
      const cargoId = toId(req.body.cargoId, 'cargoId');
      const cargo = await RiskSurveyCargo.findById(cargoId);
      if (!cargo) return sendError(res, { message: 'Cargo nao encontrado' }, 404);
      if (String(cargo.environmentId) !== String(environment._id)) {
        return sendError(res, { message: 'Cargo nao pertence ao ambiente da atividade' }, 400);
      }
      activity.cargoId = cargo._id;
      if (!activity.funcaoCargo) {
        activity.funcaoCargo = cargo.nome;
      }
    }

    if (req.body?.nome !== undefined) activity.nome = toText(req.body.nome);
    if (req.body?.funcaoCargo !== undefined) activity.funcaoCargo = toText(req.body.funcaoCargo);
    if (req.body?.processoMacro !== undefined) activity.processoMacro = toText(req.body.processoMacro);
    if (req.body?.descricaoTecnica !== undefined) activity.descricaoTecnica = toText(req.body.descricaoTecnica);
    if (req.body?.descricaoTarefa !== undefined) activity.descricaoTarefa = toText(req.body.descricaoTarefa);
    if (req.body?.etapasTarefa !== undefined) {
      activity.etapasTarefa = Array.isArray(req.body.etapasTarefa)
        ? req.body.etapasTarefa.map((x) => toText(x)).filter(Boolean)
        : [];
    }
    if (req.body?.frequencia !== undefined) {
      const freq = toText(req.body.frequencia);
      if (!isEnum(FREQ_TYPES, freq)) return sendError(res, { message: 'Frequencia invalida' }, 400);
      activity.frequencia = freq;
    }

    if (req.body?.duracaoMediaMin !== undefined) activity.duracaoMediaMin = toNumber(req.body.duracaoMediaMin);
    if (req.body?.trabalhadoresEnvolvidos !== undefined) {
      activity.trabalhadoresEnvolvidos = toNumber(req.body.trabalhadoresEnvolvidos, 1);
    }
    if (req.body?.trabalhoIsolado !== undefined) activity.trabalhoIsolado = Boolean(req.body.trabalhoIsolado);
    if (req.body?.atividadeComTerceiros !== undefined) {
      activity.atividadeComTerceiros = Boolean(req.body.atividadeComTerceiros);
    }
    if (req.body?.recursosUtilizados !== undefined) {
      activity.recursosUtilizados = {
        ...activity.recursosUtilizados,
        ...req.body.recursosUtilizados
      };
    }
    if (req.body?.anexos !== undefined) activity.anexos = Array.isArray(req.body.anexos) ? req.body.anexos : [];

    await activity.save();

    const after = mapActivity(activity.toObject());
    await logAudit({ entityType: 'activity', entityId: after.id, action: 'update', actor: req.user, before, after });

    return sendSuccess(res, { data: after, message: 'Atividade atualizada com sucesso' });
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao atualizar atividade', meta: { code: error.code } }, error.status || 500);
  }
});

router.delete('/activities/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const activity = await RiskSurveyActivity.findById(req.params.id);
    if (!activity) return sendError(res, { message: 'Atividade nao encontrada' }, 404);

    const environment = await RiskSurveyEnvironment.findById(activity.environmentId);
    ensureEditableEnvironment(environment);

    const riskCount = await RiskSurveyItem.countDocuments({ activityId: activity._id });
    if (riskCount > 0) {
      return sendError(res, { message: 'Nao e possivel excluir atividade com riscos vinculados' }, 409);
    }

    const before = mapActivity(activity.toObject());
    await RiskSurveyActivity.deleteOne({ _id: activity._id });

    await logAudit({ entityType: 'activity', entityId: before.id, action: 'delete', actor: req.user, before, after: null });

    return sendSuccess(res, { data: null, message: 'Atividade removida com sucesso' });
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao remover atividade', meta: { code: error.code } }, error.status || 500);
  }
});

router.get('/activities/:id([a-fA-F0-9]{24})/risks', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const rows = await RiskSurveyItem.find({ activityId: req.params.id }).sort({ createdAt: 1 }).lean();
    return sendSuccess(res, { data: rows.map(mapRisk), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar riscos', meta: { details: error.message } }, 500);
  }
});

router.post('/risks', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const activityId = toId(req.body?.activityId, 'activityId');
    const riskLibraryId = toId(req.body?.riskLibraryId, 'riskLibraryId');
    const activity = await RiskSurveyActivity.findById(activityId);
    if (!activity) return sendError(res, { message: 'Atividade nao encontrada' }, 404);

    const environment = await RiskSurveyEnvironment.findById(activity.environmentId);
    ensureEditableEnvironment(environment);
    const library = await RiskLibrary.findById(riskLibraryId).lean();
    if (!library || !library.ativo) {
      return sendError(res, { message: 'Risco da biblioteca nao encontrado ou inativo' }, 400);
    }

    const payload = {
      activityId: activity._id,
      environmentId: environment._id,
      riskLibraryId: library._id,
      empresaId: environment.empresaId,
      perigo: toText(req.body?.perigo || library.perigo),
      eventoPerigoso: toText(req.body?.eventoPerigoso || library.eventoPerigoso),
      danoPotencial: toText(req.body?.danoPotencial || library.danoPotencial),
      riskType: normalizeRiskType(req.body?.riskType || library.tipo),
      categoriaAgente: normalizeRiskType(req.body?.categoriaAgente || library.tipo),
      condicao: toText(req.body?.condicao, 'normal'),
      numeroExpostos: toNumber(req.body?.numeroExpostos, 1),
      grupoHomogeneo: Boolean(req.body?.grupoHomogeneo),
      controlesExistentes: toText(req.body?.controlesExistentes),
      legacyMigrated: false,
      isCustomRisk: library.origem === 'personalizado'
    };

    if (!payload.perigo || !payload.eventoPerigoso || !payload.danoPotencial) {
      return sendError(res, { message: 'Perigo, evento perigoso e dano potencial sao obrigatorios' }, 400);
    }
    if (!isEnum(AGENT_TYPES, payload.categoriaAgente) || !isEnum(AGENT_TYPES, payload.riskType)) {
      return sendError(res, { message: 'Categoria de agente invalida' }, 400);
    }
    if (!isEnum(CONDITION_TYPES, payload.condicao)) {
      return sendError(res, { message: 'Condicao invalida' }, 400);
    }

    const created = await RiskSurveyItem.create(payload);
    const mapped = mapRisk(created.toObject());

    await logAudit({ entityType: 'risk_item', entityId: mapped.id, action: 'create', actor: req.user, before: null, after: mapped });

    return sendSuccess(res, { data: mapped, message: 'Risco criado com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao criar risco', meta: { code: error.code } }, error.status || 500);
  }
});

router.get('/risks/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const risk = await RiskSurveyItem.findById(req.params.id).lean();
    if (!risk) return sendError(res, { message: 'Risco nao encontrado' }, 404);

    const [activity, environment, cargo, library, assessment, measurements] = await Promise.all([
      RiskSurveyActivity.findById(risk.activityId).lean(),
      RiskSurveyEnvironment.findById(risk.environmentId).lean(),
      RiskSurveyActivity.findById(risk.activityId).then((row) =>
        row?.cargoId ? RiskSurveyCargo.findById(row.cargoId).lean() : null
      ),
      risk.riskLibraryId ? RiskLibrary.findById(risk.riskLibraryId).lean() : null,
      RiskAssessment.findOne({ riskItemId: risk._id }).lean(),
      RiskMeasurement.find({ riskItemId: risk._id }).sort({ dataMedicao: -1 }).lean()
    ]);

    const deviceIds = measurements.filter((item) => item.deviceId).map((item) => item.deviceId);
    const devices = deviceIds.length
      ? await MeasurementDevice.find({ _id: { $in: deviceIds } }).lean()
      : [];
    const deviceMap = new Map(devices.map((device) => [String(device._id), mapMeasurementDevice(device)]));

    return sendSuccess(res, {
      data: {
        risk: mapRisk(risk),
        activity: mapActivity(activity),
        cargo: mapCargo(cargo),
        environment: mapEnvironment(environment),
        library: mapRiskLibrary(library),
        assessment: mapAssessment(assessment),
        measurements: measurements.map((measurement) => ({
          ...mapMeasurement(measurement),
          device: measurement.deviceId ? deviceMap.get(String(measurement.deviceId)) || null : null
        }))
      }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao detalhar risco', meta: { details: error.message } }, 500);
  }
});

router.put('/risks/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const risk = await RiskSurveyItem.findById(req.params.id);
    if (!risk) return sendError(res, { message: 'Risco nao encontrado' }, 404);

    const environment = await RiskSurveyEnvironment.findById(risk.environmentId);
    ensureEditableEnvironment(environment);

    const before = mapRisk(risk.toObject());

    if (req.body?.perigo !== undefined) risk.perigo = toText(req.body.perigo);
    if (req.body?.eventoPerigoso !== undefined) risk.eventoPerigoso = toText(req.body.eventoPerigoso);
    if (req.body?.danoPotencial !== undefined) risk.danoPotencial = toText(req.body.danoPotencial);
    if (req.body?.riskLibraryId !== undefined) {
      const libraryId = toId(req.body.riskLibraryId, 'riskLibraryId');
      const library = await RiskLibrary.findById(libraryId).lean();
      if (!library || !library.ativo) return sendError(res, { message: 'Risco de biblioteca invalido' }, 400);
      risk.riskLibraryId = libraryId;
      risk.riskType = normalizeRiskType(library.tipo);
      risk.categoriaAgente = normalizeRiskType(library.tipo);
      if (!req.body?.perigo) risk.perigo = library.perigo;
      if (!req.body?.eventoPerigoso) risk.eventoPerigoso = library.eventoPerigoso;
      if (!req.body?.danoPotencial) risk.danoPotencial = library.danoPotencial;
    }
    if (req.body?.categoriaAgente !== undefined) {
      const category = normalizeRiskType(req.body.categoriaAgente);
      if (!isEnum(AGENT_TYPES, category)) return sendError(res, { message: 'Categoria invalida' }, 400);
      risk.categoriaAgente = category;
      risk.riskType = category;
    }
    if (req.body?.condicao !== undefined) {
      const cond = toText(req.body.condicao);
      if (!isEnum(CONDITION_TYPES, cond)) return sendError(res, { message: 'Condicao invalida' }, 400);
      risk.condicao = cond;
    }
    if (req.body?.numeroExpostos !== undefined) risk.numeroExpostos = toNumber(req.body.numeroExpostos, 1);
    if (req.body?.grupoHomogeneo !== undefined) risk.grupoHomogeneo = Boolean(req.body.grupoHomogeneo);
    if (req.body?.controlesExistentes !== undefined) risk.controlesExistentes = toText(req.body.controlesExistentes);

    await risk.save();

    const after = mapRisk(risk.toObject());
    await logAudit({ entityType: 'risk_item', entityId: after.id, action: 'update', actor: req.user, before, after });

    return sendSuccess(res, { data: after, message: 'Risco atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao atualizar risco', meta: { code: error.code } }, error.status || 500);
  }
});

router.delete('/risks/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const risk = await RiskSurveyItem.findById(req.params.id);
    if (!risk) return sendError(res, { message: 'Risco nao encontrado' }, 404);

    const environment = await RiskSurveyEnvironment.findById(risk.environmentId);
    ensureEditableEnvironment(environment);

    const before = mapRisk(risk.toObject());

    await RiskAssessment.deleteOne({ riskItemId: risk._id });
    await RiskMeasurement.deleteMany({ riskItemId: risk._id });
    await RiskSurveyItem.deleteOne({ _id: risk._id });

    await logAudit({ entityType: 'risk_item', entityId: before.id, action: 'delete', actor: req.user, before, after: null });

    return sendSuccess(res, { data: null, message: 'Risco removido com sucesso' });
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao remover risco', meta: { code: error.code } }, error.status || 500);
  }
});

router.put('/risks/:id([a-fA-F0-9]{24})/assessment', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const risk = await RiskSurveyItem.findById(req.params.id);
    if (!risk) return sendError(res, { message: 'Risco nao encontrado' }, 404);
    if (!risk.activityId) {
      return sendError(res, { message: 'Nao e possivel avaliar risco sem atividade vinculada' }, 409);
    }

    const environment = await RiskSurveyEnvironment.findById(risk.environmentId);
    ensureEditableEnvironment(environment);

    const probabilidade = Number(req.body?.probabilidade);
    const severidade = Number(req.body?.severidade);
    const nivelConfianca = toText(req.body?.nivelConfianca);
    const justificativaTecnica = toText(req.body?.justificativaTecnica);

    if (!Number.isInteger(probabilidade) || probabilidade < 1 || probabilidade > 5) {
      return sendError(res, { message: 'Probabilidade deve estar entre 1 e 5' }, 400);
    }
    if (!Number.isInteger(severidade) || severidade < 1 || severidade > 5) {
      return sendError(res, { message: 'Severidade deve estar entre 1 e 5' }, 400);
    }
    if (!isEnum(CONFIDENCE_TYPES, nivelConfianca)) {
      return sendError(res, { message: 'Nivel de confianca invalido' }, 400);
    }

    const score = probabilidade * severidade;
    const ranges = await getRanges();
    const classificacao = classifyScore(score, ranges);

    if ((classificacao === 'alto' || classificacao === 'critico') && !justificativaTecnica) {
      return sendError(res, { message: 'Justificativa tecnica obrigatoria para risco Alto ou Critico' }, 400);
    }

    const previous = await RiskAssessment.findOne({ riskItemId: risk._id }).lean();
    const updated = await RiskAssessment.findOneAndUpdate(
      { riskItemId: risk._id },
      {
        riskItemId: risk._id,
        activityId: risk.activityId,
        probabilidade,
        severidade,
        score,
        classificacao,
        justificativaTecnica,
        nivelConfianca
      },
      { upsert: true, new: true }
    ).lean();

    const mapped = mapAssessment(updated);
    await logAudit({
      entityType: 'risk_assessment',
      entityId: mapped.id,
      action: previous ? 'update' : 'create',
      actor: req.user,
      before: mapAssessment(previous),
      after: mapped
    });

    return sendSuccess(res, { data: mapped, message: 'Avaliacao salva com sucesso' });
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao salvar avaliacao', meta: { code: error.code } }, error.status || 500);
  }
});

router.post('/risks/:id([a-fA-F0-9]{24})/measurements', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const risk = await RiskSurveyItem.findById(req.params.id);
    if (!risk) return sendError(res, { message: 'Risco nao encontrado' }, 404);
    if (!risk.activityId) {
      return sendError(res, { message: 'Nao e possivel registrar quantitativa sem atividade vinculada' }, 409);
    }

    const environment = await RiskSurveyEnvironment.findById(risk.environmentId);
    ensureEditableEnvironment(environment);
    await ensureAssessmentExists(risk._id);
    await ensureRiskSupportsQuantitative(risk);

    const tipo = toText(req.body?.tipo);
    const deviceId = toId(req.body?.deviceId, 'deviceId');
    const valorMedido = Number(req.body?.valorMedido);
    const unidade = toText(req.body?.unidade);
    const tempoExposicao = toText(req.body?.tempoExposicao);
    const metodoObservacao = toText(req.body?.metodoObservacao);
    const dataMedicao = req.body?.dataMedicao ? new Date(req.body.dataMedicao) : null;
    const device = await ensureMeasurementDevice(deviceId);

    if (!isEnum(MEASUREMENT_TYPES, tipo)) return sendError(res, { message: 'Tipo de medicao invalido' }, 400);
    if (Number.isNaN(valorMedido)) return sendError(res, { message: 'Valor medido invalido' }, 400);
    if (!unidade) return sendError(res, { message: 'Unidade e obrigatoria' }, 400);
    if (!dataMedicao || Number.isNaN(dataMedicao.getTime())) return sendError(res, { message: 'Data invalida' }, 400);

    const reference = await RiskReference.findOne({ tipo, ativo: true }).lean();
    let comparacao = 'sem_referencia';
    let referenciaAplicada = { valor: null, unidade: '', proximidadePercentual: 10 };

    if (reference) {
      const limit = Number(reference.valorReferencia);
      const near = limit - limit * (Number(reference.proximidadePercentual || 10) / 100);
      if (valorMedido > limit) comparacao = 'acima_referencia';
      else if (valorMedido >= near) comparacao = 'proximo_limite';
      else comparacao = 'abaixo_referencia';

      referenciaAplicada = {
        valor: limit,
        unidade: reference.unidade,
        proximidadePercentual: Number(reference.proximidadePercentual || 10)
      };
    }

    const created = await RiskMeasurement.create({
      riskItemId: risk._id,
      deviceId,
      tipo,
      valorMedido,
      unidade,
      tempoExposicao,
      metodoObservacao,
      instrumentoUtilizado: `${device.marca} ${device.modelo} (${device.serialNumber})`,
      dataMedicao,
      comparacao,
      referenciaAplicada
    });

    const mapped = mapMeasurement(created.toObject());
    await logAudit({ entityType: 'risk_measurement', entityId: mapped.id, action: 'create', actor: req.user, before: null, after: mapped });

    return sendSuccess(res, { data: mapped, message: 'Medicao registrada com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao registrar medicao', meta: { code: error.code } }, error.status || 500);
  }
});

router.put('/measurements/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const measurement = await RiskMeasurement.findById(req.params.id);
    if (!measurement) return sendError(res, { message: 'Medicao nao encontrada' }, 404);

    const risk = await RiskSurveyItem.findById(measurement.riskItemId);
    const environment = await RiskSurveyEnvironment.findById(risk?.environmentId);
    ensureEditableEnvironment(environment);
    await ensureAssessmentExists(risk._id);
    await ensureRiskSupportsQuantitative(risk);

    const before = mapMeasurement(measurement.toObject());

    const tipo = req.body?.tipo !== undefined ? toText(req.body.tipo) : measurement.tipo;
    const deviceId = req.body?.deviceId !== undefined ? toId(req.body.deviceId, 'deviceId') : measurement.deviceId;
    const valorMedido = req.body?.valorMedido !== undefined ? Number(req.body.valorMedido) : measurement.valorMedido;
    const unidade = req.body?.unidade !== undefined ? toText(req.body.unidade) : measurement.unidade;
    const dataMedicao = req.body?.dataMedicao ? new Date(req.body.dataMedicao) : measurement.dataMedicao;
    const device = await ensureMeasurementDevice(deviceId);

    if (!isEnum(MEASUREMENT_TYPES, tipo)) return sendError(res, { message: 'Tipo invalido' }, 400);
    if (Number.isNaN(valorMedido)) return sendError(res, { message: 'Valor medido invalido' }, 400);
    if (!unidade) return sendError(res, { message: 'Unidade e obrigatoria' }, 400);
    if (!dataMedicao || Number.isNaN(new Date(dataMedicao).getTime())) return sendError(res, { message: 'Data invalida' }, 400);

    const reference = await RiskReference.findOne({ tipo, ativo: true }).lean();
    let comparacao = 'sem_referencia';
    let referenciaAplicada = { valor: null, unidade: '', proximidadePercentual: 10 };
    if (reference) {
      const limit = Number(reference.valorReferencia);
      const near = limit - limit * (Number(reference.proximidadePercentual || 10) / 100);
      if (valorMedido > limit) comparacao = 'acima_referencia';
      else if (valorMedido >= near) comparacao = 'proximo_limite';
      else comparacao = 'abaixo_referencia';
      referenciaAplicada = {
        valor: limit,
        unidade: reference.unidade,
        proximidadePercentual: Number(reference.proximidadePercentual || 10)
      };
    }

    measurement.tipo = tipo;
    measurement.deviceId = deviceId;
    measurement.valorMedido = valorMedido;
    measurement.unidade = unidade;
    measurement.tempoExposicao = req.body?.tempoExposicao !== undefined ? toText(req.body.tempoExposicao) : measurement.tempoExposicao;
    measurement.metodoObservacao = req.body?.metodoObservacao !== undefined ? toText(req.body.metodoObservacao) : measurement.metodoObservacao;
    measurement.instrumentoUtilizado = `${device.marca} ${device.modelo} (${device.serialNumber})`;
    measurement.dataMedicao = dataMedicao;
    measurement.comparacao = comparacao;
    measurement.referenciaAplicada = referenciaAplicada;

    await measurement.save();
    const after = mapMeasurement(measurement.toObject());

    await logAudit({ entityType: 'risk_measurement', entityId: after.id, action: 'update', actor: req.user, before, after });

    return sendSuccess(res, { data: after, message: 'Medicao atualizada com sucesso' });
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao atualizar medicao', meta: { code: error.code } }, error.status || 500);
  }
});

router.delete('/measurements/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const measurement = await RiskMeasurement.findById(req.params.id);
    if (!measurement) return sendError(res, { message: 'Medicao nao encontrada' }, 404);

    const risk = await RiskSurveyItem.findById(measurement.riskItemId);
    const environment = await RiskSurveyEnvironment.findById(risk?.environmentId);
    ensureEditableEnvironment(environment);

    const before = mapMeasurement(measurement.toObject());
    await RiskMeasurement.deleteOne({ _id: measurement._id });

    await logAudit({ entityType: 'risk_measurement', entityId: before.id, action: 'delete', actor: req.user, before, after: null });

    return sendSuccess(res, { data: null, message: 'Medicao removida com sucesso' });
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao remover medicao', meta: { code: error.code } }, error.status || 500);
  }
});

router.post('/environments/:id([a-fA-F0-9]{24})/finalize', requirePermission('riskSurvey:finalize'), async (req, res) => {
  try {
    const environment = await RiskSurveyEnvironment.findById(req.params.id);
    ensureEditableEnvironment(environment);

    const [cargos, activities, risks] = await Promise.all([
      RiskSurveyCargo.find({ environmentId: environment._id }).lean(),
      RiskSurveyActivity.find({ environmentId: environment._id }).lean(),
      RiskSurveyItem.find({ environmentId: environment._id }).lean()
    ]);

    const riskIds = risks.map((risk) => risk._id);
    const [assessments, measurements] = await Promise.all([
      riskIds.length ? RiskAssessment.find({ riskItemId: { $in: riskIds } }).lean() : [],
      riskIds.length ? RiskMeasurement.find({ riskItemId: { $in: riskIds } }).lean() : []
    ]);

    const assessmentMap = new Map(assessments.map((item) => [item.riskItemId.toString(), item]));
    const measurementMap = new Map();
    for (const measurement of measurements) {
      const key = measurement.riskItemId.toString();
      if (!measurementMap.has(key)) measurementMap.set(key, []);
      measurementMap.get(key).push(measurement);
    }

    const risksByActivity = new Map();
    for (const risk of risks) {
      const key = risk.activityId.toString();
      if (!risksByActivity.has(key)) risksByActivity.set(key, []);
      risksByActivity.get(key).push({
        ...mapRisk(risk),
        assessment: mapAssessment(assessmentMap.get(risk._id.toString())),
        measurements: (measurementMap.get(risk._id.toString()) || []).map(mapMeasurement)
      });
    }

    const activitiesByCargo = new Map();
    for (const activity of activities) {
      const key = activity.cargoId ? activity.cargoId.toString() : 'sem_cargo';
      if (!activitiesByCargo.has(key)) activitiesByCargo.set(key, []);
      activitiesByCargo.get(key).push({
        ...mapActivity(activity),
        risks: risksByActivity.get(activity._id.toString()) || []
      });
    }

    const snapshotPayload = {
      environment: mapEnvironment(environment.toObject()),
      cargos: cargos.map((cargo) => ({
        ...mapCargo(cargo),
        activities: activitiesByCargo.get(cargo._id.toString()) || []
      })),
      activitiesSemCargo: activitiesByCargo.get('sem_cargo') || []
    };

    const snapshot = await RiskSurveySnapshot.create({
      environmentId: environment._id,
      finalizedAt: new Date(),
      finalizedBy: toActor(req.user),
      payload: snapshotPayload
    });

    const before = mapEnvironment(environment.toObject());
    environment.surveyStatus = 'finalized';
    environment.finalizedAt = new Date();
    environment.finalizedBy = toActor(req.user);
    await environment.save();
    const after = mapEnvironment(environment.toObject());

    await logAudit({ entityType: 'environment', entityId: after.id, action: 'finalize', actor: req.user, before, after });

    return sendSuccess(res, {
      data: {
        environment: after,
        snapshotId: snapshot._id.toString()
      },
      message: 'Levantamento finalizado com sucesso'
    });
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao finalizar levantamento', meta: { code: error.code } }, error.status || 500);
  }
});

router.get('/environments/:id([a-fA-F0-9]{24})/snapshot', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const snapshot = await RiskSurveySnapshot.findOne({ environmentId: req.params.id }).sort({ createdAt: -1 }).lean();
    if (!snapshot) return sendError(res, { message: 'Snapshot nao encontrado' }, 404);

    return sendSuccess(res, {
      data: {
        id: snapshot._id.toString(),
        environmentId: snapshot.environmentId.toString(),
        finalizedAt: snapshot.finalizedAt,
        finalizedBy: snapshot.finalizedBy,
        payload: snapshot.payload,
        createdAt: snapshot.createdAt
      }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao carregar snapshot', meta: { details: error.message } }, 500);
  }
});

router.get('/dashboard', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const riskFilter = {};
    const baseFilter = {};
    if (req.query?.empresaId) {
      const companyId = String(req.query.empresaId);
      riskFilter.empresaId = companyId;
      baseFilter.empresaId = companyId;
    }

    const [ambientes, cargos, atividades, riscos] = await Promise.all([
      RiskSurveyEnvironment.countDocuments(baseFilter),
      RiskSurveyCargo.countDocuments(baseFilter),
      RiskSurveyActivity.countDocuments(baseFilter),
      RiskSurveyItem.find(riskFilter).select({ _id: 1 }).lean()
    ]);

    const riskIds = riscos.map((risk) => risk._id);
    const [avaliacoes, medicoes] = await Promise.all([
      riskIds.length ? RiskAssessment.find({ riskItemId: { $in: riskIds } }).lean() : [],
      riskIds.length ? RiskMeasurement.countDocuments({ riskItemId: { $in: riskIds } }) : 0
    ]);
    const riskRows = riskIds.length
      ? await RiskSurveyItem.find({ _id: { $in: riskIds } }).select({ riskType: 1, legacyMigrated: 1 }).lean()
      : [];

    const classificacao = {
      baixo: 0,
      medio: 0,
      alto: 0,
      critico: 0,
      sem_avaliacao: Math.max(riskIds.length - avaliacoes.length, 0)
    };

    for (const item of avaliacoes) {
      const key = item.classificacao || 'sem_avaliacao';
      if (!Object.prototype.hasOwnProperty.call(classificacao, key)) {
        classificacao[key] = 0;
      }
      classificacao[key] += 1;
    }

    const byRiskType = {};
    let legacyCount = 0;
    for (const risk of riskRows) {
      const type = toText(risk.riskType, 'acidente');
      byRiskType[type] = (byRiskType[type] || 0) + 1;
      if (risk.legacyMigrated) legacyCount += 1;
    }

    return sendSuccess(res, {
      data: {
        counts: {
          ambientes,
          cargos,
          atividades,
          riscos: riskIds.length,
          avaliacoes: avaliacoes.length,
          medicoes,
          acoesNecessarias: classificacao.alto + classificacao.critico,
          riscosMigrados: legacyCount
        },
        classificacao,
        porTipo: byRiskType
      }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao carregar dashboard', meta: { details: error.message } }, 500);
  }
});

router.get('/audit', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const filters = {};
    if (req.query?.entityType) filters.entityType = String(req.query.entityType);
    if (req.query?.entityId) filters.entityId = String(req.query.entityId);
    const limit = Math.min(Math.max(Number(req.query?.limit || 100), 1), 500);

    const rows = await RiskSurveyAudit.find(filters).sort({ createdAt: -1 }).limit(limit).lean();
    return sendSuccess(res, {
      data: rows.map((row) => ({
        id: row._id.toString(),
        entityType: row.entityType,
        entityId: row.entityId,
        action: row.action,
        actor: row.actor,
        before: row.before,
        after: row.after,
        changes: row.changes,
        createdAt: row.createdAt
      })),
      meta: { total: rows.length }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar auditoria', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
module.exports.__internals = {
  runLegacyMigration,
  models: {
    RiskSurveyEnvironment,
    RiskSurveyCargo,
    RiskSurveyActivity,
    RiskSurveyItem,
    RiskAssessment,
    RiskMeasurement,
    RiskLibrary,
    MeasurementDevice
  },
  helpers: {
    classifyScore,
    normalizeRiskType,
    ensureAssessmentExists
  }
};
