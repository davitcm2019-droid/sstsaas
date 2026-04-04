const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');

const { requirePermission } = require('../middleware/rbac');
const { requireFeatureFlag } = require('../middleware/featureFlags');
const { createSearchRegex } = require('../utils/regex');
const { sendSuccess, sendError } = require('../utils/response');
const {
  DOCUMENT_TEMPLATE_CODES,
  GHE_STATUS_TYPES,
  TECHNICAL_CONCLUSION_STATUS_TYPES,
  models: { RiskSurveyGhe, RiskTechnicalConclusion, IssuedDocumentVersion, RTSignatureRecord }
} = require('../safety/models');

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
const EXPOSURE_FREQUENCY_TYPES = ['continua', 'frequente', 'intermitente', 'eventual'];
const EXPOSURE_HABITUALITY_TYPES = ['habitual_permanente', 'habitual_intermitente', 'eventual'];
const CONTROL_EFFECTIVENESS_TYPES = ['nao_avaliada', 'adequado', 'parcial', 'ineficaz'];
const ACTION_PLAN_STATUS_TYPES = ['pendente', 'em_andamento', 'concluida', 'cancelada'];
const ACTION_PLAN_PRIORITY_TYPES = ['baixa', 'media', 'alta', 'critica'];
const ACTION_PLAN_TYPE_TYPES = ['preventiva', 'corretiva', 'melhoria', 'administrativa', 'monitoramento'];
const MEASUREMENT_TYPES = [
  'ruido',
  'calor_ibutg',
  'vibracao',
  'agente_quimico',
  'poeira',
  'radiacao_nao_ionizante',
  'outro'
];
const SURVEY_CYCLE_STATUS = ['draft', 'in_review', 'approved', 'published', 'superseded'];
const SURVEY_CYCLE_OPEN_STATUS = ['draft', 'in_review', 'approved'];
const SURVEY_CYCLE_REVIEW_REASONS = [
  'implantacao_inicial',
  'revisao_periodica',
  'mudanca_processo',
  'incidente',
  'solicitacao_interna',
  'atualizacao_normativa',
  'outro'
];
const SURVEY_CYCLE_METHODOLOGIES = ['gro_pgr', 'gro_pgr_iso45001', 'customizada'];
const TECHNICAL_RESULT_TYPES = ['neutro', 'insalubre', 'periculoso', 'monitoramento', 'medida_imediata'];
const DOCUMENT_IMPACT_STATUS = ['sem_impacto', 'revisao_pendente', 'reemitido'];
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

const riskControlSchema = new mongoose.Schema(
  {
    epc: { type: [String], default: [] },
    epi: { type: [String], default: [] },
    administrativos: { type: [String], default: [] },
    organizacionais: { type: [String], default: [] },
    emergencia: { type: [String], default: [] },
    observacoes: { type: String, default: '' },
    eficacia: { type: String, enum: CONTROL_EFFECTIVENESS_TYPES, default: 'nao_avaliada' }
  },
  { _id: false }
);

const cycleContextSchema = new mongoose.Schema(
  {
    scopeSummary: { type: String, default: '' },
    operationDescription: { type: String, default: '' },
    workerParticipation: { type: String, default: '' },
    contractors: { type: String, default: '' },
    changesSinceLastReview: { type: String, default: '' },
    contextOfOrganization: { type: String, default: '' },
    reviewIntervalMonths: { type: Number, default: 12 },
    lastFieldVisitAt: { type: Date, default: null },
    nextReviewAt: { type: Date, default: null }
  },
  { _id: false }
);

const environmentSchema = new mongoose.Schema(
  {
    cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyCycle', default: null, index: true },
    empresaId: { type: String, required: true, index: true },
    unidade: { type: String, required: true },
    estabelecimento: { type: String, default: '' },
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
    cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyCycle', default: null, index: true },
    environmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyEnvironment', required: true, index: true },
    gheId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyGhe', default: null, index: true },
    empresaId: { type: String, required: true, index: true },
    unidade: { type: String, required: true },
    estabelecimento: { type: String, default: '' },
    setor: { type: String, required: true },
    nome: { type: String, required: true },
    descricao: { type: String, default: '' },
    ativo: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const activitySchema = new mongoose.Schema(
  {
    cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyCycle', default: null, index: true },
    environmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyEnvironment', required: true, index: true },
    cargoId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyCargo', required: true, index: true },
    gheId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyGhe', default: null, index: true },
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
    cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyCycle', default: null, index: true },
    activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyActivity', required: true, index: true },
    environmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyEnvironment', required: true, index: true },
    gheId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyGhe', default: null, index: true },
    riskLibraryId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskLibrary', default: null, index: true },
    empresaId: { type: String, required: true, index: true },
    titulo: { type: String, default: '' },
    perigo: { type: String, required: true },
    fonteGeradora: { type: String, default: '' },
    eventoPerigoso: { type: String, required: true },
    danoPotencial: { type: String, required: true },
    descricaoExposicao: { type: String, default: '' },
    frequenciaExposicao: { type: String, enum: EXPOSURE_FREQUENCY_TYPES, default: 'frequente' },
    habitualidade: { type: String, enum: EXPOSURE_HABITUALITY_TYPES, default: 'habitual_intermitente' },
    duracaoExposicao: { type: String, default: '' },
    viaExposicao: { type: String, default: '' },
    riskType: { type: String, enum: AGENT_TYPES, required: true },
    categoriaAgente: { type: String, enum: AGENT_TYPES, required: true },
    condicao: { type: String, enum: CONDITION_TYPES, required: true },
    numeroExpostos: { type: Number, default: 1 },
    grupoHomogeneo: { type: Boolean, default: false },
    controlesExistentes: { type: String, default: '' },
    controlesEstruturados: { type: riskControlSchema, default: () => ({}) },
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

const surveyCycleSchema = new mongoose.Schema(
  {
    empresaId: { type: String, required: true, index: true },
    unidade: { type: String, required: true },
    estabelecimento: { type: String, required: true },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    version: { type: Number, required: true, min: 1, default: 1 },
    status: { type: String, enum: SURVEY_CYCLE_STATUS, default: 'draft', index: true },
    reviewReason: { type: String, enum: SURVEY_CYCLE_REVIEW_REASONS, required: true },
    methodology: { type: String, enum: SURVEY_CYCLE_METHODOLOGIES, default: 'gro_pgr' },
    context: { type: cycleContextSchema, default: () => ({}) },
    responsibleTechnical: {
      nome: { type: String, required: true },
      email: { type: String, default: '' },
      registro: { type: String, default: '' }
    },
    clonedFromCycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyCycle', default: null, index: true },
    createdBy: {
      id: { type: String, default: null },
      nome: { type: String, default: '' },
      email: { type: String, default: '' },
      perfil: { type: String, default: '' }
    },
    updatedBy: {
      id: { type: String, default: null },
      nome: { type: String, default: '' },
      email: { type: String, default: '' },
      perfil: { type: String, default: '' }
    },
    publishedAt: { type: Date, default: null },
    publishedBy: {
      id: { type: String, default: null },
      nome: { type: String, default: '' },
      email: { type: String, default: '' },
      perfil: { type: String, default: '' }
    },
    approvedAt: { type: Date, default: null },
    approvedBy: {
      id: { type: String, default: null },
      nome: { type: String, default: '' },
      email: { type: String, default: '' },
      perfil: { type: String, default: '' }
    },
    signatureHash: { type: String, default: '' },
    documentImpactStatus: { type: String, enum: DOCUMENT_IMPACT_STATUS, default: 'sem_impacto' }
  },
  { timestamps: true }
);

const surveyCycleSnapshotSchema = new mongoose.Schema(
  {
    cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyCycle', required: true, index: true },
    version: { type: Number, required: true },
    publishedAt: { type: Date, required: true },
    publishedBy: {
      id: { type: String, default: null },
      nome: { type: String, default: '' },
      email: { type: String, default: '' },
      perfil: { type: String, default: '' }
    },
    payload: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

const actionPlanItemSchema = new mongoose.Schema(
  {
    cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyCycle', required: true, index: true },
    riskItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyItem', required: true, index: true },
    environmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyEnvironment', required: true, index: true },
    activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyActivity', required: true, index: true },
    empresaId: { type: String, required: true, index: true },
    titulo: { type: String, required: true },
    descricao: { type: String, default: '' },
    tipo: { type: String, enum: ACTION_PLAN_TYPE_TYPES, default: 'corretiva' },
    prioridade: { type: String, enum: ACTION_PLAN_PRIORITY_TYPES, default: 'media' },
    status: { type: String, enum: ACTION_PLAN_STATUS_TYPES, default: 'pendente' },
    responsavel: { type: String, required: true },
    prazo: { type: Date, default: null },
    criterioAceite: { type: String, default: '' },
    evidenciaEsperada: { type: String, default: '' }
  },
  { timestamps: true }
);

environmentSchema.index({ empresaId: 1, unidade: 1, setor: 1, nome: 1 });
environmentSchema.index({ cycleId: 1, createdAt: -1 });
cargoSchema.index({ environmentId: 1, nome: 1 }, { unique: true });
cargoSchema.index({ cycleId: 1, createdAt: -1 });
activitySchema.index({ environmentId: 1, nome: 1 });
activitySchema.index({ cycleId: 1, createdAt: -1 });
riskItemSchema.index({ activityId: 1, riskType: 1 });
riskItemSchema.index({ cycleId: 1, createdAt: -1 });
measurementSchema.index({ riskItemId: 1, dataMedicao: -1 });
assessmentSchema.index({ activityId: 1 });
riskLibrarySchema.index({ tipo: 1, titulo: 1 }, { unique: true });
snapshotSchema.index({ environmentId: 1, createdAt: -1 });
surveyCycleSchema.index({ empresaId: 1, unidade: 1, estabelecimento: 1, version: -1 });
surveyCycleSchema.index({ empresaId: 1, status: 1, updatedAt: -1 });
surveyCycleSnapshotSchema.index({ cycleId: 1, createdAt: -1 });
actionPlanItemSchema.index({ riskItemId: 1, createdAt: -1 });
actionPlanItemSchema.index({ cycleId: 1, status: 1, prioridade: 1 });

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
const RiskSurveyCycle = mongoose.models.RiskSurveyCycle || mongoose.model('RiskSurveyCycle', surveyCycleSchema);
const RiskSurveyCycleSnapshot =
  mongoose.models.RiskSurveyCycleSnapshot || mongoose.model('RiskSurveyCycleSnapshot', surveyCycleSnapshotSchema);
const RiskSurveyActionPlanItem =
  mongoose.models.RiskSurveyActionPlanItem || mongoose.model('RiskSurveyActionPlanItem', actionPlanItemSchema);

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
    cycleId: doc.cycleId?.toString() || null,
    empresaId: doc.empresaId,
    unidade: doc.unidade,
    estabelecimento: doc.estabelecimento || '',
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
    cycleId: doc.cycleId?.toString() || null,
    environmentId: doc.environmentId?.toString(),
    gheId: doc.gheId?.toString() || null,
    empresaId: doc.empresaId,
    unidade: doc.unidade,
    estabelecimento: doc.estabelecimento || '',
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
    cycleId: doc.cycleId?.toString() || null,
    environmentId: doc.environmentId?.toString(),
    cargoId: doc.cargoId?.toString(),
    gheId: doc.gheId?.toString() || null,
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
    cycleId: doc.cycleId?.toString() || null,
    activityId: doc.activityId?.toString(),
    environmentId: doc.environmentId?.toString(),
    gheId: doc.gheId?.toString() || null,
    riskLibraryId: doc.riskLibraryId?.toString() || null,
    empresaId: doc.empresaId,
    titulo: doc.titulo || '',
    perigo: doc.perigo,
    fonteGeradora: doc.fonteGeradora || '',
    eventoPerigoso: doc.eventoPerigoso,
    danoPotencial: doc.danoPotencial,
    descricaoExposicao: doc.descricaoExposicao || '',
    frequenciaExposicao: doc.frequenciaExposicao || 'frequente',
    habitualidade: doc.habitualidade || 'habitual_intermitente',
    duracaoExposicao: doc.duracaoExposicao || '',
    viaExposicao: doc.viaExposicao || '',
    riskType: doc.riskType,
    categoriaAgente: doc.categoriaAgente,
    condicao: doc.condicao,
    numeroExpostos: doc.numeroExpostos,
    grupoHomogeneo: Boolean(doc.grupoHomogeneo),
    controlesExistentes: doc.controlesExistentes,
    controlesEstruturados: doc.controlesEstruturados || {
      epc: [],
      epi: [],
      administrativos: [],
      organizacionais: [],
      emergencia: [],
      observacoes: '',
      eficacia: 'nao_avaliada'
    },
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

const mapSurveyCycle = (doc) => {
  if (!doc) return null;
  return {
    id: doc._id?.toString(),
    empresaId: doc.empresaId,
    unidade: doc.unidade,
    estabelecimento: doc.estabelecimento,
    title: doc.title || '',
    description: doc.description || '',
    version: doc.version,
    status: doc.status,
    reviewReason: doc.reviewReason,
    methodology: doc.methodology,
    context: doc.context || {
      scopeSummary: '',
      operationDescription: '',
      workerParticipation: '',
      contractors: '',
      changesSinceLastReview: '',
      contextOfOrganization: '',
      reviewIntervalMonths: 12,
      lastFieldVisitAt: null,
      nextReviewAt: null
    },
    responsibleTechnical: doc.responsibleTechnical || { nome: '', email: '', registro: '' },
    clonedFromCycleId: doc.clonedFromCycleId?.toString() || null,
    createdBy: doc.createdBy || null,
    updatedBy: doc.updatedBy || null,
    approvedAt: doc.approvedAt || null,
    approvedBy: doc.approvedBy || null,
    publishedAt: doc.publishedAt || null,
    publishedBy: doc.publishedBy || null,
    signatureHash: doc.signatureHash || '',
    documentImpactStatus: doc.documentImpactStatus || 'sem_impacto',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const mapCycleSnapshot = (doc) => {
  if (!doc) return null;
  return {
    id: doc._id?.toString(),
    cycleId: doc.cycleId?.toString(),
    version: doc.version,
    publishedAt: doc.publishedAt,
    publishedBy: doc.publishedBy || null,
    payload: doc.payload,
    createdAt: doc.createdAt
  };
};

const mapActionPlanItem = (doc) => {
  if (!doc) return null;
  return {
    id: doc._id?.toString(),
    cycleId: doc.cycleId?.toString(),
    riskItemId: doc.riskItemId?.toString(),
    environmentId: doc.environmentId?.toString(),
    activityId: doc.activityId?.toString(),
    empresaId: doc.empresaId,
    titulo: doc.titulo,
    descricao: doc.descricao || '',
    tipo: doc.tipo,
    prioridade: doc.prioridade,
    status: doc.status,
    responsavel: doc.responsavel,
    prazo: doc.prazo,
    criterioAceite: doc.criterioAceite || '',
    evidenciaEsperada: doc.evidenciaEsperada || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const mapGhe = (doc) => {
  if (!doc) return null;
  return {
    id: doc._id?.toString(),
    cycleId: doc.cycleId?.toString(),
    environmentId: doc.environmentId?.toString(),
    empresaId: doc.empresaId,
    unidade: doc.unidade,
    estabelecimento: doc.estabelecimento || '',
    setor: doc.setor,
    nomeTecnico: doc.nomeTecnico,
    descricaoSimilaridade: doc.descricaoSimilaridade || '',
    headcount: doc.headcount || 1,
    cargoIds: Array.isArray(doc.cargoIds) ? doc.cargoIds.map((item) => String(item)) : [],
    status: doc.status || 'ativo',
    reviewHistory: Array.isArray(doc.reviewHistory) ? doc.reviewHistory : [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const mapTechnicalConclusion = (doc) => {
  if (!doc) return null;
  return {
    id: doc._id?.toString(),
    cycleId: doc.cycleId?.toString(),
    riskItemId: doc.riskItemId?.toString(),
    gheId: doc.gheId?.toString() || null,
    environmentId: doc.environmentId?.toString(),
    activityId: doc.activityId?.toString(),
    empresaId: doc.empresaId,
    habitualidade: doc.habitualidade || '',
    enquadramentoNormativo: doc.enquadramentoNormativo || '',
    resultadoTecnico: doc.resultadoTecnico || '',
    justificativaTecnica: doc.justificativaTecnica || '',
    responsavelTecnico: doc.responsavelTecnico || { nome: '', email: '', registro: '' },
    status: doc.status || 'draft',
    version: doc.version || 1,
    signedAt: doc.signedAt || null,
    signedBy: doc.signedBy || null,
    signatureHash: doc.signatureHash || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const hashStructuredPayload = (payload) =>
  crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

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

const getNextSurveyCycleVersion = async ({ empresaId, unidade, estabelecimento }) => {
  const latest = await RiskSurveyCycle.findOne({ empresaId, unidade, estabelecimento }).sort({ version: -1 }).lean();
  return Number(latest?.version || 0) + 1;
};

const ensureNoOpenSurveyCycle = async ({ empresaId, unidade, estabelecimento, excludeId = null }) => {
  const filters = {
    empresaId,
    unidade,
    estabelecimento,
    status: { $in: SURVEY_CYCLE_OPEN_STATUS }
  };

  if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
    filters._id = { $ne: excludeId };
  }

  const existing = await RiskSurveyCycle.findOne(filters).lean();
  if (existing) {
    const error = new Error('Ja existe um ciclo ativo para este estabelecimento');
    error.status = 409;
    error.code = 'OPEN_CYCLE_EXISTS';
    throw error;
  }
};

const ensureEditableSurveyCycle = (cycle) => {
  if (!cycle) {
    const error = new Error('Ciclo de levantamento nao encontrado');
    error.status = 404;
    error.code = 'SURVEY_CYCLE_NOT_FOUND';
    throw error;
  }

  if (!SURVEY_CYCLE_OPEN_STATUS.includes(cycle.status)) {
    const error = new Error('Ciclo sem edicao disponivel para novos cadastros');
    error.status = 409;
    error.code = 'SURVEY_CYCLE_LOCKED';
    throw error;
  }
};

const hasAnyStructuredControl = (controls = {}) => {
  if (!controls || typeof controls !== 'object') return false;
  return ['epc', 'epi', 'administrativos', 'organizacionais', 'emergencia'].some(
    (key) => Array.isArray(controls[key]) && controls[key].filter(Boolean).length > 0
  );
};

const normalizeRiskControls = (controls = {}, fallback = {}) => ({
  epc: Array.isArray(controls?.epc)
    ? controls.epc.map((item) => toText(item)).filter(Boolean)
    : Array.isArray(fallback?.epc)
      ? fallback.epc.map((item) => toText(item)).filter(Boolean)
      : [],
  epi: Array.isArray(controls?.epi)
    ? controls.epi.map((item) => toText(item)).filter(Boolean)
    : Array.isArray(fallback?.epi)
      ? fallback.epi.map((item) => toText(item)).filter(Boolean)
      : [],
  administrativos: Array.isArray(controls?.administrativos)
    ? controls.administrativos.map((item) => toText(item)).filter(Boolean)
    : Array.isArray(fallback?.administrativos)
      ? fallback.administrativos.map((item) => toText(item)).filter(Boolean)
      : [],
  organizacionais: Array.isArray(controls?.organizacionais)
    ? controls.organizacionais.map((item) => toText(item)).filter(Boolean)
    : Array.isArray(fallback?.organizacionais)
      ? fallback.organizacionais.map((item) => toText(item)).filter(Boolean)
      : [],
  emergencia: Array.isArray(controls?.emergencia)
    ? controls.emergencia.map((item) => toText(item)).filter(Boolean)
    : Array.isArray(fallback?.emergencia)
      ? fallback.emergencia.map((item) => toText(item)).filter(Boolean)
      : [],
  observacoes:
    controls?.observacoes !== undefined
      ? toText(controls.observacoes)
      : toText(fallback?.observacoes),
  eficacia:
    controls?.eficacia !== undefined
      ? toText(controls.eficacia, 'nao_avaliada')
      : toText(fallback?.eficacia, 'nao_avaliada')
});

const normalizeActionPlanPayload = (body = {}, fallback = {}) => ({
  titulo: body?.titulo !== undefined ? toText(body.titulo) : toText(fallback?.titulo),
  descricao: body?.descricao !== undefined ? toText(body.descricao) : toText(fallback?.descricao),
  tipo: body?.tipo !== undefined ? toText(body.tipo, 'corretiva') : toText(fallback?.tipo, 'corretiva'),
  prioridade:
    body?.prioridade !== undefined ? toText(body.prioridade, 'media') : toText(fallback?.prioridade, 'media'),
  status: body?.status !== undefined ? toText(body.status, 'pendente') : toText(fallback?.status, 'pendente'),
  responsavel:
    body?.responsavel !== undefined ? toText(body.responsavel) : toText(fallback?.responsavel),
  criterioAceite:
    body?.criterioAceite !== undefined ? toText(body.criterioAceite) : toText(fallback?.criterioAceite),
  evidenciaEsperada:
    body?.evidenciaEsperada !== undefined ? toText(body.evidenciaEsperada) : toText(fallback?.evidenciaEsperada),
  prazo: body?.prazo !== undefined ? body.prazo : fallback?.prazo
});

const computeCycleCompletion = async (cycleId) => {
  const validCycleId = toId(cycleId, 'cycleId');
  const cycle = await RiskSurveyCycle.findById(validCycleId).lean();
  if (!cycle) {
    const error = new Error('Ciclo de levantamento nao encontrado');
    error.status = 404;
    error.code = 'SURVEY_CYCLE_NOT_FOUND';
    throw error;
  }

  const riskIds = await RiskSurveyItem.find({ cycleId: validCycleId }).distinct('_id');
  const [environmentCount, gheCount, cargoCount, activityCount, risks, assessments, actionPlanItems, conclusions] =
    await Promise.all([
      RiskSurveyEnvironment.countDocuments({ cycleId: validCycleId }),
      RiskSurveyGhe.countDocuments({ cycleId: validCycleId, status: 'ativo' }),
      RiskSurveyCargo.countDocuments({ cycleId: validCycleId }),
      RiskSurveyActivity.countDocuments({ cycleId: validCycleId }),
      RiskSurveyItem.find({ cycleId: validCycleId }).lean(),
      RiskAssessment.find({ riskItemId: { $in: riskIds } }).lean(),
      RiskSurveyActionPlanItem.find({ cycleId: validCycleId }).lean(),
      RiskTechnicalConclusion.find({ cycleId: validCycleId, riskItemId: { $in: riskIds } }).lean()
    ]);

  const assessedRiskIds = new Set(assessments.map((item) => String(item.riskItemId)));
  const actionByRisk = new Map();
  for (const item of actionPlanItems) {
    const key = String(item.riskItemId);
    if (!actionByRisk.has(key)) actionByRisk.set(key, []);
    actionByRisk.get(key).push(item);
  }

  let risksWithExposure = 0;
  let risksWithControls = 0;
  let risksWithGhe = 0;
  let highOrCritical = 0;
  let highOrCriticalCovered = 0;
  let signedConclusions = 0;

  for (const risk of risks) {
    if (toText(risk.fonteGeradora) && toText(risk.descricaoExposicao)) {
      risksWithExposure += 1;
    }
    if (hasAnyStructuredControl(risk.controlesEstruturados)) {
      risksWithControls += 1;
    }
    if (risk.gheId) {
      risksWithGhe += 1;
    }

    const assessment = assessments.find((item) => String(item.riskItemId) === String(risk._id));
    const conclusion = conclusions.find((item) => String(item.riskItemId) === String(risk._id));
    if (conclusion?.status === 'signed') {
      signedConclusions += 1;
    }
    if (assessment?.classificacao === 'alto' || assessment?.classificacao === 'critico') {
      highOrCritical += 1;
      const linkedActions = actionByRisk.get(String(risk._id)) || [];
      if (linkedActions.length > 0) {
        highOrCriticalCovered += 1;
      }
    }
  }

  const context = cycle.context || {};
  const completionBlocks = {
    contexto:
      Boolean(toText(context.scopeSummary)) &&
      Boolean(toText(context.operationDescription)) &&
      Boolean(toText(context.workerParticipation)),
    estrutura: environmentCount > 0 && gheCount > 0 && cargoCount > 0 && activityCount > 0,
    riscos: risks.length > 0 && risksWithExposure === risks.length && risksWithGhe === risks.length,
    avaliacao: risks.length > 0 && assessedRiskIds.size === risks.length,
    controles: risks.length > 0 && risksWithControls === risks.length,
    conclusaoTecnica: risks.length > 0 && signedConclusions === risks.length,
    planoAcao: highOrCritical === 0 || highOrCriticalCovered === highOrCritical
  };

  const blockers = [];
  if (!completionBlocks.contexto) blockers.push('Preencher contexto do ciclo');
  if (!completionBlocks.estrutura) blockers.push('Completar ambientes, GHEs, cargos e atividades');
  if (!completionBlocks.riscos) blockers.push('Completar fonte geradora, exposição e vínculo ao GHE de todos os riscos');
  if (!completionBlocks.avaliacao) blockers.push('Concluir avaliação qualitativa de todos os riscos');
  if (!completionBlocks.controles) blockers.push('Estruturar controles de todos os riscos');
  if (!completionBlocks.conclusaoTecnica) blockers.push('Registrar e assinar conclusao tecnica de todos os riscos');
  if (!toText(cycle.responsibleTechnical?.registro)) blockers.push('Informar registro profissional do RT');
  if (!completionBlocks.planoAcao) blockers.push('Criar plano de ação para riscos alto ou crítico');

  const totalBlocks = Object.keys(completionBlocks).length;
  const completedBlocks = Object.values(completionBlocks).filter(Boolean).length;

  return {
    cycleId: String(validCycleId),
    status: cycle.status,
    counts: {
      environments: environmentCount,
      ghes: gheCount,
      cargos: cargoCount,
      activities: activityCount,
      risks: risks.length,
      assessedRisks: assessedRiskIds.size,
      technicalConclusions: signedConclusions,
      risksWithExposure,
      risksWithGhe,
      risksWithControls,
      highOrCritical,
      highOrCriticalCovered,
      actionPlanItems: actionPlanItems.length
    },
    blocks: completionBlocks,
    blockers,
    completedBlocks,
    totalBlocks,
    percentage: Math.round((completedBlocks / totalBlocks) * 100),
    readyToPublish: blockers.length === 0
  };
};

const getInitialDocumentImpactStatus = async ({ empresaId, unidade, estabelecimento }) => {
  const activeDocuments = await IssuedDocumentVersion.countDocuments({
    empresaId,
    unidade,
    estabelecimento,
    status: 'active'
  });

  return activeDocuments > 0 ? 'revisao_pendente' : 'sem_impacto';
};

const buildCycleSnapshotPayload = async (cycle, completion = null) => {
  const cycleId = cycle?._id || cycle?.id;
  const validCycleId = toId(cycleId, 'cycleId');
  const riskIds = await RiskSurveyItem.find({ cycleId: validCycleId }).distinct('_id');

  const [environments, ghes, cargos, activities, risks, assessments, measurements, actions, conclusions] =
    await Promise.all([
      RiskSurveyEnvironment.find({ cycleId: validCycleId }).lean(),
      RiskSurveyGhe.find({ cycleId: validCycleId }).lean(),
      RiskSurveyCargo.find({ cycleId: validCycleId }).lean(),
      RiskSurveyActivity.find({ cycleId: validCycleId }).lean(),
      RiskSurveyItem.find({ cycleId: validCycleId }).lean(),
      RiskAssessment.find({ riskItemId: { $in: riskIds } }).lean(),
      RiskMeasurement.find({ riskItemId: { $in: riskIds } }).lean(),
      RiskSurveyActionPlanItem.find({ cycleId: validCycleId }).lean(),
      RiskTechnicalConclusion.find({ cycleId: validCycleId, riskItemId: { $in: riskIds } }).lean()
    ]);

  const assessmentMap = new Map(assessments.map((item) => [String(item.riskItemId), item]));
  const conclusionMap = new Map(conclusions.map((item) => [String(item.riskItemId), item]));
  const measurementMap = new Map();
  const actionMap = new Map();

  for (const measurement of measurements) {
    const key = String(measurement.riskItemId);
    if (!measurementMap.has(key)) measurementMap.set(key, []);
    measurementMap.get(key).push(mapMeasurement(measurement));
  }

  for (const action of actions) {
    const key = String(action.riskItemId);
    if (!actionMap.has(key)) actionMap.set(key, []);
    actionMap.get(key).push(mapActionPlanItem(action));
  }

  const risksByActivity = new Map();
  for (const risk of risks) {
    const key = String(risk.activityId);
    if (!risksByActivity.has(key)) risksByActivity.set(key, []);
    risksByActivity.get(key).push({
      ...mapRisk(risk),
      assessment: mapAssessment(assessmentMap.get(String(risk._id))),
      measurements: measurementMap.get(String(risk._id)) || [],
      actionPlanItems: actionMap.get(String(risk._id)) || [],
      technicalConclusion: mapTechnicalConclusion(conclusionMap.get(String(risk._id)))
    });
  }

  const activitiesByCargo = new Map();
  for (const activity of activities) {
    const key = String(activity.cargoId || 'sem_cargo');
    if (!activitiesByCargo.has(key)) activitiesByCargo.set(key, []);
    activitiesByCargo.get(key).push({
      ...mapActivity(activity),
      risks: risksByActivity.get(String(activity._id)) || []
    });
  }

  const cargosByGhe = new Map();
  const directCargosByEnvironment = new Map();
  for (const cargo of cargos) {
    const payload = {
      ...mapCargo(cargo),
      activities: activitiesByCargo.get(String(cargo._id)) || []
    };

    if (cargo.gheId) {
      const key = String(cargo.gheId);
      if (!cargosByGhe.has(key)) cargosByGhe.set(key, []);
      cargosByGhe.get(key).push(payload);
      continue;
    }

    const envKey = String(cargo.environmentId);
    if (!directCargosByEnvironment.has(envKey)) directCargosByEnvironment.set(envKey, []);
    directCargosByEnvironment.get(envKey).push(payload);
  }

  const ghesByEnvironment = new Map();
  for (const ghe of ghes) {
    const envKey = String(ghe.environmentId);
    if (!ghesByEnvironment.has(envKey)) ghesByEnvironment.set(envKey, []);
    ghesByEnvironment.get(envKey).push({
      ...mapGhe(ghe),
      cargos: cargosByGhe.get(String(ghe._id)) || []
    });
  }

  return {
    cycle: mapSurveyCycle(cycle.toObject ? cycle.toObject() : cycle),
    completion: completion || (await computeCycleCompletion(validCycleId)),
    environments: environments.map((environment) => ({
      ...mapEnvironment(environment),
      ghes: ghesByEnvironment.get(String(environment._id)) || [],
      cargosSemGhe: directCargosByEnvironment.get(String(environment._id)) || []
    })),
    actionPlanItems: actions.map(mapActionPlanItem)
  };
};

const collectPayloadEntityIds = (payload = {}) => {
  const source = payload || {};
  const summary = {
    environments: [],
    ghes: [],
    cargos: [],
    activities: [],
    risks: [],
    technicalConclusions: [],
    actionPlanItems: Array.isArray(source.actionPlanItems) ? source.actionPlanItems.map((item) => item.id) : []
  };

  for (const environment of source.environments || []) {
    if (environment?.id) summary.environments.push(environment.id);

    for (const ghe of environment.ghes || []) {
      if (ghe?.id) summary.ghes.push(ghe.id);
      for (const cargo of ghe.cargos || []) {
        if (cargo?.id) summary.cargos.push(cargo.id);
        for (const activity of cargo.activities || []) {
          if (activity?.id) summary.activities.push(activity.id);
          for (const risk of activity.risks || []) {
            if (risk?.id) summary.risks.push(risk.id);
            if (risk?.technicalConclusion?.id) summary.technicalConclusions.push(risk.technicalConclusion.id);
          }
        }
      }
    }

    for (const cargo of environment.cargosSemGhe || []) {
      if (cargo?.id) summary.cargos.push(cargo.id);
      for (const activity of cargo.activities || []) {
        if (activity?.id) summary.activities.push(activity.id);
        for (const risk of activity.risks || []) {
          if (risk?.id) summary.risks.push(risk.id);
          if (risk?.technicalConclusion?.id) summary.technicalConclusions.push(risk.technicalConclusion.id);
        }
      }
    }
  }

  return summary;
};

const compareEntityLists = (before = [], after = []) => {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);

  return {
    added: after.filter((item) => !beforeSet.has(item)),
    removed: before.filter((item) => !afterSet.has(item))
  };
};

const buildCycleSnapshotDiff = (previousPayload, currentPayload) => {
  const previousIds = collectPayloadEntityIds(previousPayload);
  const currentIds = collectPayloadEntityIds(currentPayload);
  const entityDiff = {
    environments: compareEntityLists(previousIds.environments, currentIds.environments),
    ghes: compareEntityLists(previousIds.ghes, currentIds.ghes),
    cargos: compareEntityLists(previousIds.cargos, currentIds.cargos),
    activities: compareEntityLists(previousIds.activities, currentIds.activities),
    risks: compareEntityLists(previousIds.risks, currentIds.risks),
    technicalConclusions: compareEntityLists(previousIds.technicalConclusions, currentIds.technicalConclusions),
    actionPlanItems: compareEntityLists(previousIds.actionPlanItems, currentIds.actionPlanItems)
  };

  return {
    previousCounts: previousPayload?.completion?.counts || null,
    currentCounts: currentPayload?.completion?.counts || null,
    entities: entityDiff,
    changed:
      Object.values(entityDiff).some((entry) => entry.added.length > 0 || entry.removed.length > 0) ||
      JSON.stringify(previousPayload?.completion?.counts || {}) !== JSON.stringify(currentPayload?.completion?.counts || {})
  };
};

const getComparablePublishedSnapshot = async (cycle) => {
  if (!cycle) return null;

  const previousCycle = await RiskSurveyCycle.findOne({
    _id: { $ne: cycle._id },
    empresaId: cycle.empresaId,
    unidade: cycle.unidade,
    estabelecimento: cycle.estabelecimento,
    status: { $in: ['published', 'superseded'] }
  })
    .sort({ version: -1, publishedAt: -1 })
    .lean();

  if (!previousCycle) return null;

  const snapshot = await RiskSurveyCycleSnapshot.findOne({ cycleId: previousCycle._id }).sort({ createdAt: -1 }).lean();
  if (!snapshot) return null;

  return {
    cycle: mapSurveyCycle(previousCycle),
    snapshot: mapCycleSnapshot(snapshot)
  };
};

const getCycleDocumentImpact = async (cycle) => {
  const activeDocuments = await IssuedDocumentVersion.find({
    empresaId: cycle.empresaId,
    unidade: cycle.unidade,
    estabelecimento: cycle.estabelecimento,
    status: 'active'
  })
    .sort({ issuedAt: -1 })
    .lean();

  return {
    status: cycle.documentImpactStatus || 'sem_impacto',
    hasActiveDocuments: activeDocuments.length > 0,
    activeDocuments: activeDocuments.map((document) => ({
      id: document._id?.toString(),
      cycleId: document.cycleId?.toString(),
      templateCode: document.templateCode,
      documentType: document.documentType,
      title: document.title,
      version: document.version,
      status: document.status,
      issuedAt: document.issuedAt
    }))
  };
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

const ensureApprovedSurveyCycle = (cycle) => {
  if (!cycle) {
    const error = new Error('Ciclo de levantamento nao encontrado');
    error.status = 404;
    error.code = 'SURVEY_CYCLE_NOT_FOUND';
    throw error;
  }

  if (cycle.status !== 'approved') {
    const error = new Error('Ciclo precisa estar aprovado tecnicamente antes da publicacao');
    error.status = 409;
    error.code = 'SURVEY_CYCLE_NOT_APPROVED';
    throw error;
  }
};

const ensureActiveGhe = async (gheId, environment) => {
  const validGheId = toId(gheId, 'gheId');
  const ghe = await RiskSurveyGhe.findById(validGheId);
  if (!ghe) {
    const error = new Error('GHE nao encontrado');
    error.status = 404;
    error.code = 'GHE_NOT_FOUND';
    throw error;
  }
  if (environment && String(ghe.environmentId) !== String(environment._id)) {
    const error = new Error('GHE nao pertence ao ambiente informado');
    error.status = 400;
    error.code = 'GHE_ENVIRONMENT_MISMATCH';
    throw error;
  }
  if (ghe.status !== 'ativo') {
    const error = new Error('GHE inativo nao pode receber novas vinculacoes');
    error.status = 409;
    error.code = 'GHE_INACTIVE';
    throw error;
  }
  return ghe;
};

const upsertSignatureRecord = async ({ entityType, entityId, reason, payload, signer }) => {
  const hash = hashStructuredPayload(payload);
  const created = await RTSignatureRecord.create({
    entityType,
    entityId: String(entityId),
    reason,
    hash,
    signer: toActor(signer),
    signedAt: new Date()
  });
  return { record: created, hash };
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

router.get('/v2/cycles', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const filters = {};
    const includeCompletion = String(req.query?.includeCompletion || 'false').toLowerCase() === 'true';
    if (req.query?.empresaId) filters.empresaId = toText(req.query.empresaId);
    if (req.query?.status) {
      const status = toText(req.query.status);
      if (!isEnum(SURVEY_CYCLE_STATUS, status)) {
        return sendError(res, { message: 'Status do ciclo invalido' }, 400);
      }
      filters.status = status;
    }
    if (req.query?.search) {
      const term = createSearchRegex(toText(req.query.search));
      if (term) {
        filters.$or = [
          { unidade: term },
          { estabelecimento: term },
          { title: term },
          { description: term },
          { 'responsibleTechnical.nome': term }
        ];
      }
    }

    const rows = await RiskSurveyCycle.find(filters).sort({ updatedAt: -1, createdAt: -1 }).lean();
    const mappedRows = rows.map(mapSurveyCycle);
    const completionMap = includeCompletion
      ? await Promise.all(
          mappedRows.map(async (cycle) => ({
            id: cycle.id,
            completion: await computeCycleCompletion(cycle.id)
          }))
        )
      : [];
    const completionById = new Map(completionMap.map((item) => [item.id, item.completion]));

    return sendSuccess(res, {
      data: mappedRows.map((cycle) => ({
        ...cycle,
        completion: completionById.get(cycle.id) || null
      })),
      meta: { total: rows.length, includeCompletion }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar ciclos de levantamento', meta: { details: error.message } }, 500);
  }
});

router.get('/v2/cycles/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const row = await RiskSurveyCycle.findById(req.params.id).lean();
    if (!row) return sendError(res, { message: 'Ciclo nao encontrado' }, 404);
    const completion = await computeCycleCompletion(req.params.id);
    return sendSuccess(res, { data: { ...mapSurveyCycle(row), completion } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao carregar ciclo', meta: { details: error.message } }, 500);
  }
});

router.post('/v2/cycles', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const empresaId = toText(req.body?.empresaId);
    const unidade = toText(req.body?.unidade);
    const estabelecimento = toText(req.body?.estabelecimento);
    const reviewReason = toText(req.body?.reviewReason, 'implantacao_inicial');
    const methodology = toText(req.body?.methodology, 'gro_pgr');
    const responsibleTechnical = {
      nome: toText(req.body?.responsibleTechnical?.nome || req.user?.nome),
      email: toText(req.body?.responsibleTechnical?.email || req.user?.email),
      registro: toText(req.body?.responsibleTechnical?.registro)
    };

    if (!empresaId || !unidade || !estabelecimento) {
      return sendError(res, { message: 'Empresa, unidade e estabelecimento sao obrigatorios' }, 400);
    }
    if (!responsibleTechnical.nome) {
      return sendError(res, { message: 'Responsavel tecnico obrigatorio' }, 400);
    }
    if (!isEnum(SURVEY_CYCLE_REVIEW_REASONS, reviewReason)) {
      return sendError(res, { message: 'Motivo da revisao invalido' }, 400);
    }
    if (!isEnum(SURVEY_CYCLE_METHODOLOGIES, methodology)) {
      return sendError(res, { message: 'Metodologia invalida' }, 400);
    }

    await ensureNoOpenSurveyCycle({ empresaId, unidade, estabelecimento });
    const version = await getNextSurveyCycleVersion({ empresaId, unidade, estabelecimento });
    const documentImpactStatus = await getInitialDocumentImpactStatus({ empresaId, unidade, estabelecimento });

    const created = await RiskSurveyCycle.create({
      empresaId,
      unidade,
      estabelecimento,
      title: toText(req.body?.title, `Levantamento ${estabelecimento}`),
      description: toText(req.body?.description),
      version,
      status: 'draft',
      documentImpactStatus,
      reviewReason,
      methodology,
      responsibleTechnical,
      createdBy: toActor(req.user),
      updatedBy: toActor(req.user)
    });

    const mapped = mapSurveyCycle(created.toObject());
    await logAudit({
      entityType: 'survey_cycle',
      entityId: mapped.id,
      action: 'create',
      actor: req.user,
      before: null,
      after: mapped
    });

    return sendSuccess(res, { data: mapped, message: 'Ciclo de levantamento criado com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao criar ciclo', meta: { code: error.code, details: error.message } }, error.status || 500);
  }
});

router.post('/v2/cycles/:id([a-fA-F0-9]{24})/clone', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const source = await RiskSurveyCycle.findById(req.params.id);
    if (!source) return sendError(res, { message: 'Ciclo de origem nao encontrado' }, 404);
    if (!['published', 'superseded'].includes(source.status)) {
      return sendError(res, { message: 'Somente ciclos publicados podem ser clonados' }, 409);
    }

    await ensureNoOpenSurveyCycle({
      empresaId: source.empresaId,
      unidade: source.unidade,
      estabelecimento: source.estabelecimento
    });

    const version = await getNextSurveyCycleVersion({
      empresaId: source.empresaId,
      unidade: source.unidade,
      estabelecimento: source.estabelecimento
    });
    const documentImpactStatus = await getInitialDocumentImpactStatus({
      empresaId: source.empresaId,
      unidade: source.unidade,
      estabelecimento: source.estabelecimento
    });

    const created = await RiskSurveyCycle.create({
      empresaId: source.empresaId,
      unidade: source.unidade,
      estabelecimento: source.estabelecimento,
      title: source.title,
      description: source.description,
      version,
      status: 'draft',
      documentImpactStatus,
      reviewReason: toText(req.body?.reviewReason, 'revisao_periodica'),
      methodology: source.methodology,
      responsibleTechnical: {
        nome: toText(req.body?.responsibleTechnical?.nome || source.responsibleTechnical?.nome || req.user?.nome),
        email: toText(req.body?.responsibleTechnical?.email || source.responsibleTechnical?.email || req.user?.email),
        registro: toText(req.body?.responsibleTechnical?.registro || source.responsibleTechnical?.registro)
      },
      clonedFromCycleId: source._id,
      createdBy: toActor(req.user),
      updatedBy: toActor(req.user)
    });

    const mapped = mapSurveyCycle(created.toObject());
    await logAudit({
      entityType: 'survey_cycle',
      entityId: mapped.id,
      action: 'clone',
      actor: req.user,
      before: mapSurveyCycle(source.toObject()),
      after: mapped
    });

    return sendSuccess(res, { data: mapped, message: 'Ciclo clonado com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao clonar ciclo', meta: { code: error.code, details: error.message } }, error.status || 500);
  }
});

router.put('/v2/cycles/:id([a-fA-F0-9]{24})/context', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const cycle = await RiskSurveyCycle.findById(req.params.id);
    ensureEditableSurveyCycle(cycle);

    const before = mapSurveyCycle(cycle.toObject());
    const nextReviewAt = req.body?.nextReviewAt ? new Date(req.body.nextReviewAt) : null;
    const lastFieldVisitAt = req.body?.lastFieldVisitAt ? new Date(req.body.lastFieldVisitAt) : null;

    cycle.context = {
      ...cycle.context,
      scopeSummary: toText(req.body?.scopeSummary, cycle.context?.scopeSummary),
      operationDescription: toText(req.body?.operationDescription, cycle.context?.operationDescription),
      workerParticipation: toText(req.body?.workerParticipation, cycle.context?.workerParticipation),
      contractors: toText(req.body?.contractors, cycle.context?.contractors),
      changesSinceLastReview: toText(req.body?.changesSinceLastReview, cycle.context?.changesSinceLastReview),
      contextOfOrganization: toText(req.body?.contextOfOrganization, cycle.context?.contextOfOrganization),
      reviewIntervalMonths: toNumber(req.body?.reviewIntervalMonths, cycle.context?.reviewIntervalMonths || 12),
      lastFieldVisitAt: lastFieldVisitAt && !Number.isNaN(lastFieldVisitAt.getTime()) ? lastFieldVisitAt : cycle.context?.lastFieldVisitAt || null,
      nextReviewAt: nextReviewAt && !Number.isNaN(nextReviewAt.getTime()) ? nextReviewAt : cycle.context?.nextReviewAt || null
    };
    cycle.updatedBy = toActor(req.user);
    await cycle.save();

    const after = mapSurveyCycle(cycle.toObject());
    await logAudit({ entityType: 'survey_cycle', entityId: after.id, action: 'update_context', actor: req.user, before, after });
    const completion = await computeCycleCompletion(after.id);

    return sendSuccess(res, { data: { ...after, completion }, message: 'Contexto do ciclo atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao atualizar contexto do ciclo', meta: { code: error.code, details: error.message } }, error.status || 500);
  }
});

router.get('/v2/cycles/:id([a-fA-F0-9]{24})/completion', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const completion = await computeCycleCompletion(req.params.id);
    return sendSuccess(res, { data: completion });
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao calcular completude do ciclo', meta: { code: error.code, details: error.message } }, error.status || 500);
  }
});

router.post('/v2/cycles/:id([a-fA-F0-9]{24})/review', requirePermission('riskSurvey:finalize'), async (req, res) => {
  try {
    const cycle = await RiskSurveyCycle.findById(req.params.id);
    if (!cycle) return sendError(res, { message: 'Ciclo nao encontrado' }, 404);
    if (cycle.status === 'published' || cycle.status === 'superseded') {
      return sendError(res, { message: 'Ciclo publicado nao pode voltar para revisao direta' }, 409);
    }

    const before = mapSurveyCycle(cycle.toObject());
    cycle.status = 'in_review';
    cycle.updatedBy = toActor(req.user);
    await cycle.save();
    const after = mapSurveyCycle(cycle.toObject());

    await logAudit({ entityType: 'survey_cycle', entityId: after.id, action: 'start_review', actor: req.user, before, after });
    return sendSuccess(res, { data: after, message: 'Ciclo movido para revisao' });
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao iniciar revisao do ciclo', meta: { code: error.code, details: error.message } }, error.status || 500);
  }
});

router.post('/v2/cycles/:id([a-fA-F0-9]{24})/approve', requirePermission('riskSurvey:approve'), async (req, res) => {
  try {
    const cycle = await RiskSurveyCycle.findById(req.params.id);
    ensureEditableSurveyCycle(cycle);

    const completion = await computeCycleCompletion(req.params.id);
    if (!completion.readyToPublish) {
      return sendError(res, { message: 'Ciclo ainda possui pendencias tecnicas', meta: { completion } }, 409);
    }

    const before = mapSurveyCycle(cycle.toObject());
    cycle.status = 'approved';
    cycle.approvedAt = new Date();
    cycle.approvedBy = toActor(req.user);
    cycle.updatedBy = toActor(req.user);
    await cycle.save();

    const after = mapSurveyCycle(cycle.toObject());
    await logAudit({ entityType: 'survey_cycle', entityId: after.id, action: 'approve', actor: req.user, before, after });
    return sendSuccess(res, { data: { ...after, completion }, message: 'Ciclo aprovado tecnicamente' });
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao aprovar ciclo', meta: { code: error.code, details: error.message } }, error.status || 500);
  }
});

router.post('/v2/cycles/:id([a-fA-F0-9]{24})/publish', requirePermission('riskSurvey:finalize'), async (req, res) => {
  try {
    const cycle = await RiskSurveyCycle.findById(req.params.id);
    ensureApprovedSurveyCycle(cycle);

    const completion = await computeCycleCompletion(req.params.id);
    if (!completion.readyToPublish) {
      return sendError(res, { message: 'Ciclo com pendencias para publicacao', meta: { code: 'CYCLE_NOT_READY', completion } }, 409);
    }

    const previousPublished = await getComparablePublishedSnapshot(cycle);
    const payload = await buildCycleSnapshotPayload(cycle, completion);
    const snapshotDiff = buildCycleSnapshotDiff(previousPublished?.snapshot?.payload || null, payload);
    const signature = await upsertSignatureRecord({
      entityType: 'survey_cycle',
      entityId: cycle._id,
      reason: 'cycle_publish',
      payload,
      signer: req.user
    });

    const snapshot = await RiskSurveyCycleSnapshot.create({
      cycleId: cycle._id,
      version: cycle.version,
      publishedAt: new Date(),
      publishedBy: toActor(req.user),
      payload: {
        ...payload,
        diff: snapshotDiff,
        signatureHash: signature.hash
      }
    });

    const before = mapSurveyCycle(cycle.toObject());
    cycle.status = 'published';
    cycle.publishedAt = snapshot.publishedAt;
    cycle.publishedBy = toActor(req.user);
    cycle.signatureHash = signature.hash;
    cycle.documentImpactStatus = 'reemitido';
    cycle.updatedBy = toActor(req.user);
    await cycle.save();

    await RiskSurveyCycle.updateMany(
      {
        _id: { $ne: cycle._id },
        empresaId: cycle.empresaId,
        unidade: cycle.unidade,
        estabelecimento: cycle.estabelecimento,
        status: 'published'
      },
      {
        $set: {
          status: 'superseded',
          updatedBy: toActor(req.user)
        }
      }
    );

    const after = mapSurveyCycle(cycle.toObject());
    await logAudit({ entityType: 'survey_cycle', entityId: after.id, action: 'publish', actor: req.user, before, after });

    return sendSuccess(
      res,
      {
        data: { cycle: after, snapshot: mapCycleSnapshot(snapshot.toObject()), completion },
        message: 'Ciclo publicado com sucesso'
      }
    );
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao publicar ciclo', meta: { code: error.code, details: error.message } }, error.status || 500);
  }
});

router.get('/v2/cycles/:id([a-fA-F0-9]{24})/snapshot', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const snapshot = await RiskSurveyCycleSnapshot.findOne({ cycleId: req.params.id }).sort({ createdAt: -1 }).lean();
    if (!snapshot) return sendError(res, { message: 'Snapshot do ciclo nao encontrado' }, 404);
    return sendSuccess(res, { data: mapCycleSnapshot(snapshot) });
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao carregar snapshot do ciclo', meta: { code: error.code, details: error.message } }, error.status || 500);
  }
});

router.get('/v2/cycles/:id([a-fA-F0-9]{24})/diff', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const cycle = await RiskSurveyCycle.findById(req.params.id);
    if (!cycle) return sendError(res, { message: 'Ciclo nao encontrado' }, 404);

    const currentPayload =
      cycle.status === 'published'
        ? (await RiskSurveyCycleSnapshot.findOne({ cycleId: cycle._id }).sort({ createdAt: -1 }).lean())?.payload ||
          (await buildCycleSnapshotPayload(cycle))
        : await buildCycleSnapshotPayload(cycle);

    const previousPublished = await getComparablePublishedSnapshot(cycle);
    const diffPayload = buildCycleSnapshotDiff(previousPublished?.snapshot?.payload || null, currentPayload);

    return sendSuccess(res, {
      data: {
        cycleId: cycle._id.toString(),
        baselineCycle: previousPublished?.cycle || null,
        baselineSnapshotId: previousPublished?.snapshot?.id || null,
        diff: diffPayload
      }
    });
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao calcular diff do ciclo', meta: { code: error.code, details: error.message } }, error.status || 500);
  }
});

router.get('/v2/cycles/:id([a-fA-F0-9]{24})/document-impact', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const cycle = await RiskSurveyCycle.findById(req.params.id).lean();
    if (!cycle) return sendError(res, { message: 'Ciclo nao encontrado' }, 404);
    const impact = await getCycleDocumentImpact(cycle);
    return sendSuccess(res, { data: impact });
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao carregar impacto documental do ciclo', meta: { code: error.code, details: error.message } }, error.status || 500);
  }
});

router.get('/metadata', requirePermission('riskSurvey:read'), (req, res) => {
  return sendSuccess(res, {
    data: {
      hierarchy: ['empresa', 'unidade', 'setor', 'ambiente', 'ghe', 'cargo', 'atividade', 'risco', 'conclusao_tecnica'],
      environmentTypes: ENV_TYPES,
      ventilationTypes: VENT_TYPES,
      lightingTypes: LIGHT_TYPES,
      temperatureTypes: TEMP_TYPES,
      floorTypes: FLOOR_TYPES,
      activityFrequencyTypes: FREQ_TYPES,
      riskTypes: AGENT_TYPES,
      riskAgentCategories: AGENT_TYPES,
      riskConditionTypes: CONDITION_TYPES,
      exposureFrequencyTypes: EXPOSURE_FREQUENCY_TYPES,
      exposureHabitualityTypes: EXPOSURE_HABITUALITY_TYPES,
      confidenceLevels: CONFIDENCE_TYPES,
      measurementTypes: MEASUREMENT_TYPES,
      controlEffectivenessTypes: CONTROL_EFFECTIVENESS_TYPES,
      actionPlanStatusTypes: ACTION_PLAN_STATUS_TYPES,
      actionPlanPriorityTypes: ACTION_PLAN_PRIORITY_TYPES,
      actionPlanTypeTypes: ACTION_PLAN_TYPE_TYPES,
      gheStatusTypes: GHE_STATUS_TYPES,
      technicalResultTypes: TECHNICAL_RESULT_TYPES,
      technicalConclusionStatusTypes: TECHNICAL_CONCLUSION_STATUS_TYPES,
      documentTemplateCodes: DOCUMENT_TEMPLATE_CODES,
      assessmentRanges: DEFAULT_RANGES,
      surveyCycleStatuses: SURVEY_CYCLE_STATUS,
      surveyCycleReviewReasons: SURVEY_CYCLE_REVIEW_REASONS,
      surveyCycleMethodologies: SURVEY_CYCLE_METHODOLOGIES
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
      const term = createSearchRegex(toText(req.query.search));
      if (term) {
        filters.$or = [{ titulo: term }, { perigo: term }, { eventoPerigoso: term }, { danoPotencial: term }];
      }
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
      const term = createSearchRegex(toText(req.query.search));
      if (term) {
        filters.$or = [{ serialNumber: term }, { marca: term }, { modelo: term }];
      }
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
    if (req.query?.cycleId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.cycleId)) {
        return sendError(res, { message: 'cycleId invalido' }, 400);
      }
      filters.cycleId = req.query.cycleId;
    }
    if (req.query?.surveyStatus) filters.surveyStatus = String(req.query.surveyStatus);
    if (req.query?.search) {
      const term = createSearchRegex(toText(req.query.search));
      if (term) {
        filters.$or = [{ nome: term }, { unidade: term }, { estabelecimento: term }, { setor: term }];
      }
    }

    const rows = await RiskSurveyEnvironment.find(filters).sort({ createdAt: -1 }).lean();
    return sendSuccess(res, { data: rows.map(mapEnvironment), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar ambientes', meta: { details: error.message } }, 500);
  }
});

router.post('/environments', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const cycleId = req.body?.cycleId ? toId(req.body.cycleId, 'cycleId') : null;
    const cycle = cycleId ? await RiskSurveyCycle.findById(cycleId) : null;
    if (cycleId) {
      ensureEditableSurveyCycle(cycle);
    }

    const payload = {
      cycleId: cycle?._id || null,
      empresaId: cycle?.empresaId || toText(req.body?.empresaId),
      unidade: cycle?.unidade || toText(req.body?.unidade),
      estabelecimento: cycle?.estabelecimento || toText(req.body?.estabelecimento),
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
    return sendError(res, { message: error.message || 'Erro ao criar ambiente', meta: { code: error.code, details: error.message } }, error.status || 500);
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

    const gheCount = await RiskSurveyGhe.countDocuments({ environmentId: environment._id });
    if (gheCount > 0) {
      return sendError(res, { message: 'Nao e possivel excluir ambiente com GHEs vinculados' }, 409);
    }

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

router.get('/environments/:id([a-fA-F0-9]{24})/ghes', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const rows = await RiskSurveyGhe.find({ environmentId: req.params.id }).sort({ nomeTecnico: 1, createdAt: 1 }).lean();
    return sendSuccess(res, { data: rows.map(mapGhe), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar GHEs', meta: { details: error.message } }, 500);
  }
});

router.get('/cycles/:id([a-fA-F0-9]{24})/ghes', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const rows = await RiskSurveyGhe.find({ cycleId: req.params.id }).sort({ createdAt: 1 }).lean();
    return sendSuccess(res, { data: rows.map(mapGhe), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar GHEs do ciclo', meta: { details: error.message } }, 500);
  }
});

router.post('/ghes', requirePermission('ghe:write'), async (req, res) => {
  try {
    const environmentId = toId(req.body?.environmentId, 'environmentId');
    const environment = await RiskSurveyEnvironment.findById(environmentId);
    ensureEditableEnvironment(environment);

    const payload = {
      cycleId: environment.cycleId,
      environmentId: environment._id,
      empresaId: environment.empresaId,
      unidade: environment.unidade,
      estabelecimento: environment.estabelecimento || '',
      setor: environment.setor,
      nomeTecnico: toText(req.body?.nomeTecnico),
      descricaoSimilaridade: toText(req.body?.descricaoSimilaridade),
      headcount: toNumber(req.body?.headcount, 1),
      cargoIds: [],
      status: toText(req.body?.status, 'ativo'),
      reviewHistory: [
        {
          at: new Date(),
          actor: toActor(req.user),
          action: 'create',
          note: toText(req.body?.reviewNote)
        }
      ]
    };

    if (!payload.nomeTecnico) {
      return sendError(res, { message: 'Nome tecnico do GHE e obrigatorio' }, 400);
    }
    if (!isEnum(GHE_STATUS_TYPES, payload.status)) {
      return sendError(res, { message: 'Status do GHE invalido' }, 400);
    }

    const created = await RiskSurveyGhe.create(payload);
    const mapped = mapGhe(created.toObject());
    await logAudit({ entityType: 'ghe', entityId: mapped.id, action: 'create', actor: req.user, before: null, after: mapped });
    return sendSuccess(res, { data: mapped, message: 'GHE criado com sucesso' }, 201);
  } catch (error) {
    if (error?.code === 11000) {
      return sendError(res, { message: 'Ja existe um GHE com este nome no ambiente selecionado' }, 409);
    }
    return sendError(res, { message: error.message || 'Erro ao criar GHE', meta: { code: error.code } }, error.status || 500);
  }
});

router.put('/ghes/:id([a-fA-F0-9]{24})', requirePermission('ghe:write'), async (req, res) => {
  try {
    const ghe = await RiskSurveyGhe.findById(req.params.id);
    if (!ghe) return sendError(res, { message: 'GHE nao encontrado' }, 404);

    const environment = await RiskSurveyEnvironment.findById(ghe.environmentId);
    ensureEditableEnvironment(environment);

    const before = mapGhe(ghe.toObject());
    if (req.body?.nomeTecnico !== undefined) ghe.nomeTecnico = toText(req.body.nomeTecnico);
    if (req.body?.descricaoSimilaridade !== undefined) ghe.descricaoSimilaridade = toText(req.body.descricaoSimilaridade);
    if (req.body?.headcount !== undefined) ghe.headcount = toNumber(req.body.headcount, ghe.headcount || 1);
    if (req.body?.status !== undefined) {
      const status = toText(req.body.status);
      if (!isEnum(GHE_STATUS_TYPES, status)) return sendError(res, { message: 'Status do GHE invalido' }, 400);
      ghe.status = status;
    }
    if (req.body?.reviewNote !== undefined) {
      ghe.reviewHistory = [
        ...(Array.isArray(ghe.reviewHistory) ? ghe.reviewHistory : []),
        { at: new Date(), actor: toActor(req.user), action: 'update', note: toText(req.body.reviewNote) }
      ];
    }
    await ghe.save();

    const after = mapGhe(ghe.toObject());
    await logAudit({ entityType: 'ghe', entityId: after.id, action: 'update', actor: req.user, before, after });
    return sendSuccess(res, { data: after, message: 'GHE atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao atualizar GHE', meta: { code: error.code } }, error.status || 500);
  }
});

router.delete('/ghes/:id([a-fA-F0-9]{24})', requirePermission('ghe:write'), async (req, res) => {
  try {
    const ghe = await RiskSurveyGhe.findById(req.params.id);
    if (!ghe) return sendError(res, { message: 'GHE nao encontrado' }, 404);

    const environment = await RiskSurveyEnvironment.findById(ghe.environmentId);
    ensureEditableEnvironment(environment);

    const [cargoCount, activityCount, riskCount, conclusionCount] = await Promise.all([
      RiskSurveyCargo.countDocuments({ gheId: ghe._id }),
      RiskSurveyActivity.countDocuments({ gheId: ghe._id }),
      RiskSurveyItem.countDocuments({ gheId: ghe._id }),
      RiskTechnicalConclusion.countDocuments({ gheId: ghe._id })
    ]);

    if (cargoCount > 0 || activityCount > 0 || riskCount > 0 || conclusionCount > 0) {
      return sendError(
        res,
        {
          message: 'Nao e possivel excluir GHE com vinculos tecnicos',
          meta: { cargoCount, activityCount, riskCount, conclusionCount }
        },
        409
      );
    }

    const before = mapGhe(ghe.toObject());
    await RiskSurveyGhe.deleteOne({ _id: ghe._id });
    await logAudit({ entityType: 'ghe', entityId: before.id, action: 'delete', actor: req.user, before, after: null });
    return sendSuccess(res, { data: null, message: 'GHE removido com sucesso' });
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao remover GHE', meta: { code: error.code } }, error.status || 500);
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
    const ghe = await ensureActiveGhe(req.body?.gheId, environment);

    const payload = {
      cycleId: environment.cycleId || null,
      environmentId: environment._id,
      gheId: ghe._id,
      empresaId: environment.empresaId,
      unidade: environment.unidade,
      estabelecimento: environment.estabelecimento || '',
      setor: environment.setor,
      nome: toText(req.body?.nome),
      descricao: toText(req.body?.descricao),
      ativo: req.body?.ativo !== undefined ? Boolean(req.body.ativo) : true
    };

    if (!payload.nome) {
      return sendError(res, { message: 'Nome do cargo e obrigatorio' }, 400);
    }

    const created = await RiskSurveyCargo.create(payload);
    await RiskSurveyGhe.updateOne({ _id: ghe._id }, { $addToSet: { cargoIds: created._id } });
    const mapped = mapCargo(created.toObject());
    await logAudit({ entityType: 'cargo', entityId: mapped.id, action: 'create', actor: req.user, before: null, after: mapped });
    return sendSuccess(res, { data: mapped, message: 'Cargo criado com sucesso' }, 201);
  } catch (error) {
    if (error?.code === 11000) {
      return sendError(res, { message: 'Cargo ja cadastrado neste ambiente' }, 409);
    }
    return sendError(res, { message: error.message || 'Erro ao criar cargo', meta: { code: error.code, details: error.message } }, error.status || 500);
  }
});

router.put('/cargos/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const cargo = await RiskSurveyCargo.findById(req.params.id);
    if (!cargo) return sendError(res, { message: 'Cargo nao encontrado' }, 404);

    const environment = await RiskSurveyEnvironment.findById(cargo.environmentId);
    ensureEditableEnvironment(environment);

    const before = mapCargo(cargo.toObject());
    if (req.body?.gheId !== undefined) {
      const ghe = await ensureActiveGhe(req.body.gheId, environment);
      const previousGheId = cargo.gheId ? String(cargo.gheId) : null;
      cargo.gheId = ghe._id;
      if (previousGheId && previousGheId !== String(ghe._id)) {
        await RiskSurveyGhe.updateOne({ _id: previousGheId }, { $pull: { cargoIds: cargo._id } });
      }
      await RiskSurveyGhe.updateOne({ _id: ghe._id }, { $addToSet: { cargoIds: cargo._id } });
    }
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
    if (cargo.gheId) {
      await RiskSurveyGhe.updateOne({ _id: cargo.gheId }, { $pull: { cargoIds: cargo._id } });
    }
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
    if (!cargo.gheId) {
      return sendError(res, { message: 'Cargo precisa estar vinculado a um GHE ativo' }, 409);
    }

    const payload = {
      cycleId: environment.cycleId || null,
      environmentId,
      cargoId,
      gheId: cargo.gheId,
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
      if (!cargo.gheId) {
        return sendError(res, { message: 'Cargo precisa estar vinculado a um GHE ativo' }, 409);
      }
      activity.cargoId = cargo._id;
      activity.gheId = cargo.gheId;
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
    const activity = await RiskSurveyActivity.findById(activityId);
    if (!activity) return sendError(res, { message: 'Atividade nao encontrada' }, 404);
    if (!activity.gheId) return sendError(res, { message: 'Atividade precisa estar vinculada a um GHE ativo' }, 409);

    const environment = await RiskSurveyEnvironment.findById(activity.environmentId);
    ensureEditableEnvironment(environment);

    const providedRiskLibraryId = toText(req.body?.riskLibraryId);
    const normalizedRiskType = normalizeRiskType(req.body?.riskType || req.body?.categoriaAgente);

    let library = null;
    if (providedRiskLibraryId) {
      const riskLibraryId = toId(providedRiskLibraryId, 'riskLibraryId');
      library = await RiskLibrary.findById(riskLibraryId).lean();
      if (!library || !library.ativo) {
        return sendError(res, { message: 'Risco da biblioteca nao encontrado ou inativo' }, 400);
      }
    } else {
      const customTitle = toText(req.body?.tituloRisco || req.body?.perigo);
      const customPerigo = toText(req.body?.perigo);
      const customEvento = toText(req.body?.eventoPerigoso);
      const customDano = toText(req.body?.danoPotencial);

      if (!customTitle || !customPerigo || !customEvento || !customDano) {
        return sendError(
          res,
          {
            message:
              'Informe os campos do novo risco (titulo, perigo, evento perigoso e dano potencial) ou selecione um risco da biblioteca'
          },
          400
        );
      }

      library = await RiskLibrary.findOne({
        tipo: normalizedRiskType,
        titulo: customTitle
      }).lean();

      if (!library) {
        const createdLibrary = await RiskLibrary.create({
          tipo: normalizedRiskType,
          titulo: customTitle,
          perigo: customPerigo,
          eventoPerigoso: customEvento,
          danoPotencial: customDano,
          permiteQuantitativa: true,
          origem: 'personalizado',
          ativo: true
        });
        library = createdLibrary.toObject();

        await logAudit({
          entityType: 'risk_library',
          entityId: createdLibrary._id.toString(),
          action: 'create_auto',
          actor: req.user,
          before: null,
          after: mapRiskLibrary(library)
        });
      }
    }

    const payload = {
      cycleId: environment.cycleId || null,
      activityId: activity._id,
      environmentId: environment._id,
      gheId: activity.gheId,
      riskLibraryId: library._id,
      empresaId: environment.empresaId,
      titulo: toText(req.body?.tituloRisco || req.body?.titulo || library.titulo || req.body?.perigo),
      perigo: toText(req.body?.perigo || library.perigo),
      fonteGeradora: toText(req.body?.fonteGeradora),
      eventoPerigoso: toText(req.body?.eventoPerigoso || library.eventoPerigoso),
      danoPotencial: toText(req.body?.danoPotencial || library.danoPotencial),
      descricaoExposicao: toText(req.body?.descricaoExposicao),
      frequenciaExposicao: toText(req.body?.frequenciaExposicao, 'frequente'),
      habitualidade: toText(req.body?.habitualidade, 'habitual_intermitente'),
      duracaoExposicao: toText(req.body?.duracaoExposicao),
      viaExposicao: toText(req.body?.viaExposicao),
      riskType: normalizeRiskType(req.body?.riskType || library.tipo || normalizedRiskType),
      categoriaAgente: normalizeRiskType(req.body?.categoriaAgente || library.tipo || normalizedRiskType),
      condicao: toText(req.body?.condicao, 'normal'),
      numeroExpostos: toNumber(req.body?.numeroExpostos, 1),
      grupoHomogeneo: Boolean(req.body?.grupoHomogeneo),
      controlesExistentes: toText(req.body?.controlesExistentes),
      controlesEstruturados: {
        epc: Array.isArray(req.body?.controlesEstruturados?.epc) ? req.body.controlesEstruturados.epc.map((item) => toText(item)).filter(Boolean) : [],
        epi: Array.isArray(req.body?.controlesEstruturados?.epi) ? req.body.controlesEstruturados.epi.map((item) => toText(item)).filter(Boolean) : [],
        administrativos: Array.isArray(req.body?.controlesEstruturados?.administrativos) ? req.body.controlesEstruturados.administrativos.map((item) => toText(item)).filter(Boolean) : [],
        organizacionais: Array.isArray(req.body?.controlesEstruturados?.organizacionais) ? req.body.controlesEstruturados.organizacionais.map((item) => toText(item)).filter(Boolean) : [],
        emergencia: Array.isArray(req.body?.controlesEstruturados?.emergencia) ? req.body.controlesEstruturados.emergencia.map((item) => toText(item)).filter(Boolean) : [],
        observacoes: toText(req.body?.controlesEstruturados?.observacoes),
        eficacia: toText(req.body?.controlesEstruturados?.eficacia, 'nao_avaliada')
      },
      legacyMigrated: false,
      isCustomRisk: library.origem === 'personalizado'
    };

    if (!payload.perigo || !payload.fonteGeradora || !payload.eventoPerigoso || !payload.danoPotencial || !payload.descricaoExposicao) {
      return sendError(res, { message: 'Perigo, fonte geradora, evento perigoso, dano potencial e exposição sao obrigatorios' }, 400);
    }
    if (!isEnum(AGENT_TYPES, payload.categoriaAgente) || !isEnum(AGENT_TYPES, payload.riskType)) {
      return sendError(res, { message: 'Categoria de agente invalida' }, 400);
    }
    if (!isEnum(CONDITION_TYPES, payload.condicao)) {
      return sendError(res, { message: 'Condicao invalida' }, 400);
    }
    if (!isEnum(EXPOSURE_FREQUENCY_TYPES, payload.frequenciaExposicao)) {
      return sendError(res, { message: 'Frequencia de exposicao invalida' }, 400);
    }
    if (!isEnum(EXPOSURE_HABITUALITY_TYPES, payload.habitualidade)) {
      return sendError(res, { message: 'Habitualidade invalida' }, 400);
    }
    if (!isEnum(CONTROL_EFFECTIVENESS_TYPES, payload.controlesEstruturados.eficacia)) {
      return sendError(res, { message: 'Eficacia dos controles invalida' }, 400);
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

    const [activity, environment, cargo, ghe, library, assessment, conclusion, measurements, actionPlanItems] = await Promise.all([
      RiskSurveyActivity.findById(risk.activityId).lean(),
      RiskSurveyEnvironment.findById(risk.environmentId).lean(),
      RiskSurveyActivity.findById(risk.activityId).then((row) =>
        row?.cargoId ? RiskSurveyCargo.findById(row.cargoId).lean() : null
      ),
      risk.gheId ? RiskSurveyGhe.findById(risk.gheId).lean() : null,
      risk.riskLibraryId ? RiskLibrary.findById(risk.riskLibraryId).lean() : null,
      RiskAssessment.findOne({ riskItemId: risk._id }).lean(),
      RiskTechnicalConclusion.findOne({ riskItemId: risk._id }).lean(),
      RiskMeasurement.find({ riskItemId: risk._id }).sort({ dataMedicao: -1 }).lean(),
      RiskSurveyActionPlanItem.find({ riskItemId: risk._id }).sort({ createdAt: -1 }).lean()
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
        ghe: mapGhe(ghe),
        environment: mapEnvironment(environment),
        library: mapRiskLibrary(library),
        assessment: mapAssessment(assessment),
        technicalConclusion: mapTechnicalConclusion(conclusion),
        measurements: measurements.map((measurement) => ({
          ...mapMeasurement(measurement),
          device: measurement.deviceId ? deviceMap.get(String(measurement.deviceId)) || null : null
        })),
        actionPlanItems: actionPlanItems.map(mapActionPlanItem)
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

    if (req.body?.titulo !== undefined || req.body?.tituloRisco !== undefined) {
      risk.titulo = toText(req.body?.titulo ?? req.body?.tituloRisco);
    }
    if (req.body?.perigo !== undefined) risk.perigo = toText(req.body.perigo);
    if (req.body?.fonteGeradora !== undefined) risk.fonteGeradora = toText(req.body.fonteGeradora);
    if (req.body?.eventoPerigoso !== undefined) risk.eventoPerigoso = toText(req.body.eventoPerigoso);
    if (req.body?.danoPotencial !== undefined) risk.danoPotencial = toText(req.body.danoPotencial);
    if (req.body?.descricaoExposicao !== undefined) risk.descricaoExposicao = toText(req.body.descricaoExposicao);
    if (req.body?.frequenciaExposicao !== undefined) {
      const frequency = toText(req.body.frequenciaExposicao);
      if (!isEnum(EXPOSURE_FREQUENCY_TYPES, frequency)) {
        return sendError(res, { message: 'Frequencia de exposicao invalida' }, 400);
      }
      risk.frequenciaExposicao = frequency;
    }
    if (req.body?.habitualidade !== undefined) {
      const habituality = toText(req.body.habitualidade);
      if (!isEnum(EXPOSURE_HABITUALITY_TYPES, habituality)) {
        return sendError(res, { message: 'Habitualidade invalida' }, 400);
      }
      risk.habitualidade = habituality;
    }
    if (req.body?.duracaoExposicao !== undefined) risk.duracaoExposicao = toText(req.body.duracaoExposicao);
    if (req.body?.viaExposicao !== undefined) risk.viaExposicao = toText(req.body.viaExposicao);
    if (req.body?.riskLibraryId !== undefined) {
      if (!req.body.riskLibraryId) {
        risk.riskLibraryId = null;
      } else {
        const libraryId = toId(req.body.riskLibraryId, 'riskLibraryId');
        const library = await RiskLibrary.findById(libraryId).lean();
        if (!library || !library.ativo) return sendError(res, { message: 'Risco de biblioteca invalido' }, 400);
        risk.riskLibraryId = libraryId;
        risk.riskType = normalizeRiskType(library.tipo);
        risk.categoriaAgente = normalizeRiskType(library.tipo);
        if (!req.body?.titulo && !req.body?.tituloRisco) risk.titulo = library.titulo;
        if (!req.body?.perigo) risk.perigo = library.perigo;
        if (!req.body?.eventoPerigoso) risk.eventoPerigoso = library.eventoPerigoso;
        if (!req.body?.danoPotencial) risk.danoPotencial = library.danoPotencial;
      }
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
    if (req.body?.controlesEstruturados !== undefined) {
      const controls = normalizeRiskControls(req.body.controlesEstruturados, risk.controlesEstruturados);
      if (!isEnum(CONTROL_EFFECTIVENESS_TYPES, controls.eficacia)) {
        return sendError(res, { message: 'Eficacia dos controles invalida' }, 400);
      }
      risk.controlesEstruturados = controls;
    }

    if (!risk.perigo || !risk.fonteGeradora || !risk.eventoPerigoso || !risk.danoPotencial || !risk.descricaoExposicao) {
      return sendError(
        res,
        { message: 'Perigo, fonte geradora, evento perigoso, dano potencial e exposicao sao obrigatorios' },
        400
      );
    }

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
    await RiskSurveyActionPlanItem.deleteMany({ riskItemId: risk._id });
    await RiskSurveyItem.deleteOne({ _id: risk._id });

    await logAudit({ entityType: 'risk_item', entityId: before.id, action: 'delete', actor: req.user, before, after: null });

    return sendSuccess(res, { data: null, message: 'Risco removido com sucesso' });
  } catch (error) {
    return sendError(res, { message: error.message || 'Erro ao remover risco', meta: { code: error.code } }, error.status || 500);
  }
});

router.put('/risks/:id([a-fA-F0-9]{24})/controls', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const risk = await RiskSurveyItem.findById(req.params.id);
    if (!risk) return sendError(res, { message: 'Risco nao encontrado' }, 404);

    const environment = await RiskSurveyEnvironment.findById(risk.environmentId);
    ensureEditableEnvironment(environment);

    const before = mapRisk(risk.toObject());
    const controls = normalizeRiskControls(req.body, risk.controlesEstruturados);
    if (!isEnum(CONTROL_EFFECTIVENESS_TYPES, controls.eficacia)) {
      return sendError(res, { message: 'Eficacia dos controles invalida' }, 400);
    }

    risk.controlesEstruturados = controls;
    if (req.body?.controlesExistentes !== undefined) {
      risk.controlesExistentes = toText(req.body.controlesExistentes);
    }
    await risk.save();

    const after = mapRisk(risk.toObject());
    await logAudit({ entityType: 'risk_item', entityId: after.id, action: 'update_controls', actor: req.user, before, after });

    return sendSuccess(res, { data: after, message: 'Controles do risco atualizados com sucesso' });
  } catch (error) {
    return sendError(
      res,
      { message: error.message || 'Erro ao atualizar controles do risco', meta: { code: error.code } },
      error.status || 500
    );
  }
});

router.get('/risks/:id([a-fA-F0-9]{24})/action-plan-items', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const risk = await RiskSurveyItem.findById(req.params.id).lean();
    if (!risk) return sendError(res, { message: 'Risco nao encontrado' }, 404);

    const items = await RiskSurveyActionPlanItem.find({ riskItemId: risk._id }).sort({ createdAt: -1 }).lean();
    return sendSuccess(res, { data: items.map(mapActionPlanItem) });
  } catch (error) {
    return sendError(
      res,
      { message: error.message || 'Erro ao listar plano de acao do risco', meta: { code: error.code } },
      error.status || 500
    );
  }
});

router.post('/risks/:id([a-fA-F0-9]{24})/action-plan-items', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const risk = await RiskSurveyItem.findById(req.params.id).lean();
    if (!risk) return sendError(res, { message: 'Risco nao encontrado' }, 404);

    const environment = await RiskSurveyEnvironment.findById(risk.environmentId);
    ensureEditableEnvironment(environment);

    const assessment = await RiskAssessment.findOne({ riskItemId: risk._id }).lean();
    if (!assessment) {
      return sendError(res, { message: 'Nao e possivel criar plano de acao sem avaliacao qualitativa' }, 409);
    }

    const payload = normalizeActionPlanPayload(req.body);
    if (!payload.titulo || !payload.responsavel) {
      return sendError(res, { message: 'Titulo e responsavel sao obrigatorios para o plano de acao' }, 400);
    }
    if (!isEnum(ACTION_PLAN_TYPE_TYPES, payload.tipo)) {
      return sendError(res, { message: 'Tipo de acao invalido' }, 400);
    }
    if (!isEnum(ACTION_PLAN_PRIORITY_TYPES, payload.prioridade)) {
      return sendError(res, { message: 'Prioridade invalida' }, 400);
    }
    if (!isEnum(ACTION_PLAN_STATUS_TYPES, payload.status)) {
      return sendError(res, { message: 'Status da acao invalido' }, 400);
    }

    const deadline = payload.prazo ? new Date(payload.prazo) : null;
    if (payload.prazo && Number.isNaN(deadline?.getTime())) {
      return sendError(res, { message: 'Prazo invalido' }, 400);
    }

    const created = await RiskSurveyActionPlanItem.create({
      cycleId: risk.cycleId || null,
      riskItemId: risk._id,
      environmentId: risk.environmentId,
      activityId: risk.activityId,
      empresaId: risk.empresaId,
      titulo: payload.titulo,
      descricao: payload.descricao,
      tipo: payload.tipo,
      prioridade: payload.prioridade,
      status: payload.status,
      responsavel: payload.responsavel,
      prazo: deadline,
      criterioAceite: payload.criterioAceite,
      evidenciaEsperada: payload.evidenciaEsperada
    });

    const mapped = mapActionPlanItem(created.toObject());
    await logAudit({
      entityType: 'risk_action_plan_item',
      entityId: mapped.id,
      action: 'create',
      actor: req.user,
      before: null,
      after: mapped
    });

    return sendSuccess(res, { data: mapped, message: 'Plano de acao vinculado ao risco com sucesso' }, 201);
  } catch (error) {
    return sendError(
      res,
      { message: error.message || 'Erro ao criar plano de acao do risco', meta: { code: error.code } },
      error.status || 500
    );
  }
});

router.put('/action-plan-items/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const item = await RiskSurveyActionPlanItem.findById(req.params.id);
    if (!item) return sendError(res, { message: 'Plano de acao nao encontrado' }, 404);

    const risk = await RiskSurveyItem.findById(item.riskItemId).lean();
    const environment = risk ? await RiskSurveyEnvironment.findById(risk.environmentId) : null;
    ensureEditableEnvironment(environment);

    const before = mapActionPlanItem(item.toObject());
    const payload = normalizeActionPlanPayload(req.body, item.toObject());

    if (!payload.titulo || !payload.responsavel) {
      return sendError(res, { message: 'Titulo e responsavel sao obrigatorios para o plano de acao' }, 400);
    }
    if (!isEnum(ACTION_PLAN_TYPE_TYPES, payload.tipo)) {
      return sendError(res, { message: 'Tipo de acao invalido' }, 400);
    }
    if (!isEnum(ACTION_PLAN_PRIORITY_TYPES, payload.prioridade)) {
      return sendError(res, { message: 'Prioridade invalida' }, 400);
    }
    if (!isEnum(ACTION_PLAN_STATUS_TYPES, payload.status)) {
      return sendError(res, { message: 'Status da acao invalido' }, 400);
    }

    const deadline = payload.prazo ? new Date(payload.prazo) : null;
    if (payload.prazo && Number.isNaN(deadline?.getTime())) {
      return sendError(res, { message: 'Prazo invalido' }, 400);
    }

    item.titulo = payload.titulo;
    item.descricao = payload.descricao;
    item.tipo = payload.tipo;
    item.prioridade = payload.prioridade;
    item.status = payload.status;
    item.responsavel = payload.responsavel;
    item.prazo = deadline;
    item.criterioAceite = payload.criterioAceite;
    item.evidenciaEsperada = payload.evidenciaEsperada;
    await item.save();

    const after = mapActionPlanItem(item.toObject());
    await logAudit({
      entityType: 'risk_action_plan_item',
      entityId: after.id,
      action: 'update',
      actor: req.user,
      before,
      after
    });

    return sendSuccess(res, { data: after, message: 'Plano de acao atualizado com sucesso' });
  } catch (error) {
    return sendError(
      res,
      { message: error.message || 'Erro ao atualizar plano de acao', meta: { code: error.code } },
      error.status || 500
    );
  }
});

router.delete('/action-plan-items/:id([a-fA-F0-9]{24})', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const item = await RiskSurveyActionPlanItem.findById(req.params.id);
    if (!item) return sendError(res, { message: 'Plano de acao nao encontrado' }, 404);

    const risk = await RiskSurveyItem.findById(item.riskItemId).lean();
    const environment = risk ? await RiskSurveyEnvironment.findById(risk.environmentId) : null;
    ensureEditableEnvironment(environment);

    const before = mapActionPlanItem(item.toObject());
    await RiskSurveyActionPlanItem.deleteOne({ _id: item._id });

    await logAudit({
      entityType: 'risk_action_plan_item',
      entityId: before.id,
      action: 'delete',
      actor: req.user,
      before,
      after: null
    });

    return sendSuccess(res, { data: null, message: 'Plano de acao removido com sucesso' });
  } catch (error) {
    return sendError(
      res,
      { message: error.message || 'Erro ao remover plano de acao', meta: { code: error.code } },
      error.status || 500
    );
  }
});

router.put('/risks/:id([a-fA-F0-9]{24})/technical-conclusion', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const risk = await RiskSurveyItem.findById(req.params.id);
    if (!risk) return sendError(res, { message: 'Risco nao encontrado' }, 404);

    const environment = await RiskSurveyEnvironment.findById(risk.environmentId);
    ensureEditableEnvironment(environment);
    await ensureAssessmentExists(risk._id);

    const previous = await RiskTechnicalConclusion.findOne({ riskItemId: risk._id }).lean();
    const responsavelTecnico = {
      nome: toText(req.body?.responsavelTecnico?.nome || req.body?.responsavelTecnicoNome || req.user?.nome),
      email: toText(req.body?.responsavelTecnico?.email || req.user?.email),
      registro: toText(req.body?.responsavelTecnico?.registro || req.body?.registroProfissional)
    };

    const payload = {
      cycleId: risk.cycleId,
      riskItemId: risk._id,
      gheId: risk.gheId || null,
      environmentId: risk.environmentId,
      activityId: risk.activityId,
      empresaId: risk.empresaId,
      habitualidade: toText(req.body?.habitualidade, previous?.habitualidade),
      enquadramentoNormativo: toText(req.body?.enquadramentoNormativo, previous?.enquadramentoNormativo),
      resultadoTecnico: toText(req.body?.resultadoTecnico, previous?.resultadoTecnico),
      justificativaTecnica: toText(req.body?.justificativaTecnica, previous?.justificativaTecnica),
      responsavelTecnico,
      status: 'draft',
      version: Number(previous?.version || 0) + 1,
      signedAt: null,
      signedBy: { id: null, nome: '', email: '', perfil: '' },
      signatureHash: ''
    };

    if (!payload.resultadoTecnico || !payload.habitualidade || !payload.enquadramentoNormativo) {
      return sendError(res, { message: 'Resultado tecnico, habitualidade e enquadramento normativo sao obrigatorios' }, 400);
    }
    if (!isEnum(TECHNICAL_RESULT_TYPES, payload.resultadoTecnico)) {
      return sendError(res, { message: 'Resultado tecnico invalido' }, 400);
    }
    if (!payload.responsavelTecnico.nome || !payload.responsavelTecnico.registro) {
      return sendError(res, { message: 'Responsavel tecnico com registro profissional e obrigatorio' }, 400);
    }

    const updated = await RiskTechnicalConclusion.findOneAndUpdate(
      { riskItemId: risk._id },
      payload,
      { upsert: true, new: true }
    ).lean();

    const mapped = mapTechnicalConclusion(updated);
    await logAudit({
      entityType: 'risk_technical_conclusion',
      entityId: mapped.id,
      action: previous ? 'update' : 'create',
      actor: req.user,
      before: mapTechnicalConclusion(previous),
      after: mapped
    });

    return sendSuccess(res, { data: mapped, message: 'Conclusao tecnica salva com sucesso' });
  } catch (error) {
    return sendError(
      res,
      { message: error.message || 'Erro ao salvar conclusao tecnica', meta: { code: error.code } },
      error.status || 500
    );
  }
});

router.post('/risks/:id([a-fA-F0-9]{24})/technical-conclusion/sign', requirePermission('riskSurvey:sign'), async (req, res) => {
  try {
    const risk = await RiskSurveyItem.findById(req.params.id).lean();
    if (!risk) return sendError(res, { message: 'Risco nao encontrado' }, 404);

    const environment = await RiskSurveyEnvironment.findById(risk.environmentId);
    ensureEditableEnvironment(environment);

    const conclusion = await RiskTechnicalConclusion.findOne({ riskItemId: risk._id });
    if (!conclusion) {
      return sendError(res, { message: 'Conclusao tecnica nao encontrada' }, 404);
    }
    if (!conclusion.responsavelTecnico?.registro) {
      return sendError(res, { message: 'Registro profissional do RT obrigatorio para assinar' }, 400);
    }

    const signaturePayload = mapTechnicalConclusion(conclusion.toObject());
    const { record, hash } = await upsertSignatureRecord({
      entityType: 'risk_technical_conclusion',
      entityId: conclusion._id.toString(),
      reason: 'technical_conclusion',
      payload: signaturePayload,
      signer: req.user
    });

    const before = mapTechnicalConclusion(conclusion.toObject());
    conclusion.status = 'signed';
    conclusion.signedAt = record.signedAt;
    conclusion.signedBy = toActor(req.user);
    conclusion.signatureHash = hash;
    await conclusion.save();

    const after = mapTechnicalConclusion(conclusion.toObject());
    await logAudit({
      entityType: 'risk_technical_conclusion',
      entityId: after.id,
      action: 'sign',
      actor: req.user,
      before,
      after
    });

    return sendSuccess(res, { data: after, message: 'Conclusao tecnica assinada com sucesso' });
  } catch (error) {
    return sendError(
      res,
      { message: error.message || 'Erro ao assinar conclusao tecnica', meta: { code: error.code } },
      error.status || 500
    );
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
    if (req.query?.cycleId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.cycleId)) {
        return sendError(res, { message: 'cycleId invalido' }, 400);
      }
      riskFilter.cycleId = req.query.cycleId;
      baseFilter.cycleId = req.query.cycleId;
    }
    if (req.query?.empresaId) {
      const companyId = String(req.query.empresaId);
      riskFilter.empresaId = companyId;
      baseFilter.empresaId = companyId;
    }

    const [ambientes, ghes, cargos, atividades, riscos] = await Promise.all([
      RiskSurveyEnvironment.countDocuments(baseFilter),
      RiskSurveyGhe.countDocuments(baseFilter),
      RiskSurveyCargo.countDocuments(baseFilter),
      RiskSurveyActivity.countDocuments(baseFilter),
      RiskSurveyItem.find(riskFilter).select({ _id: 1 }).lean()
    ]);

    const riskIds = riscos.map((risk) => risk._id);
    const [avaliacoes, medicoes, conclusoes] = await Promise.all([
      riskIds.length ? RiskAssessment.find({ riskItemId: { $in: riskIds } }).lean() : [],
      riskIds.length ? RiskMeasurement.countDocuments({ riskItemId: { $in: riskIds } }) : 0,
      riskIds.length ? RiskTechnicalConclusion.countDocuments({ riskItemId: { $in: riskIds }, status: 'signed' }) : 0
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
          ghes,
          cargos,
          atividades,
          riscos: riskIds.length,
          avaliacoes: avaliacoes.length,
          conclusoes,
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
    RiskSurveyCycle,
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
    ensureAssessmentExists,
    getNextSurveyCycleVersion
  }
};
