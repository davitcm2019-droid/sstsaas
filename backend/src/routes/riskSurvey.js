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

const activitySchema = new mongoose.Schema(
  {
    environmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyEnvironment', required: true, index: true },
    empresaId: { type: String, required: true, index: true },
    nome: { type: String, required: true },
    funcaoCargo: { type: String, required: true },
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
    empresaId: { type: String, required: true, index: true },
    perigo: { type: String, required: true },
    eventoPerigoso: { type: String, required: true },
    danoPotencial: { type: String, required: true },
    categoriaAgente: { type: String, enum: AGENT_TYPES, required: true },
    condicao: { type: String, enum: CONDITION_TYPES, required: true },
    numeroExpostos: { type: Number, default: 1 },
    grupoHomogeneo: { type: Boolean, default: false },
    controlesExistentes: { type: String, default: '' }
  },
  { timestamps: true }
);

const assessmentSchema = new mongoose.Schema(
  {
    riskItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyItem', required: true, unique: true, index: true },
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
activitySchema.index({ environmentId: 1, nome: 1 });
riskItemSchema.index({ activityId: 1, categoriaAgente: 1 });
measurementSchema.index({ riskItemId: 1, dataMedicao: -1 });
snapshotSchema.index({ environmentId: 1, createdAt: -1 });

const RiskSurveyEnvironment =
  mongoose.models.RiskSurveyEnvironment || mongoose.model('RiskSurveyEnvironment', environmentSchema);
const RiskSurveyActivity = mongoose.models.RiskSurveyActivity || mongoose.model('RiskSurveyActivity', activitySchema);
const RiskSurveyItem = mongoose.models.RiskSurveyItem || mongoose.model('RiskSurveyItem', riskItemSchema);
const RiskAssessment = mongoose.models.RiskAssessment || mongoose.model('RiskAssessment', assessmentSchema);
const RiskMeasurement = mongoose.models.RiskMeasurement || mongoose.model('RiskMeasurement', measurementSchema);
const RiskReference = mongoose.models.RiskReference || mongoose.model('RiskReference', referenceSchema);
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

const mapActivity = (doc) => {
  if (!doc) return null;
  return {
    id: doc._id?.toString(),
    environmentId: doc.environmentId?.toString(),
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
    empresaId: doc.empresaId,
    perigo: doc.perigo,
    eventoPerigoso: doc.eventoPerigoso,
    danoPotencial: doc.danoPotencial,
    categoriaAgente: doc.categoriaAgente,
    condicao: doc.condicao,
    numeroExpostos: doc.numeroExpostos,
    grupoHomogeneo: Boolean(doc.grupoHomogeneo),
    controlesExistentes: doc.controlesExistentes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const mapAssessment = (doc) => {
  if (!doc) return null;
  return {
    id: doc._id?.toString(),
    riskItemId: doc.riskItemId?.toString(),
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

router.use(requireFeatureFlag('structured_risk_survey'));

router.get('/metadata', requirePermission('riskSurvey:read'), (req, res) => {
  return sendSuccess(res, {
    data: {
      environmentTypes: ENV_TYPES,
      ventilationTypes: VENT_TYPES,
      lightingTypes: LIGHT_TYPES,
      temperatureTypes: TEMP_TYPES,
      floorTypes: FLOOR_TYPES,
      activityFrequencyTypes: FREQ_TYPES,
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

router.get('/environments/:id([a-fA-F0-9]{24})/activities', requirePermission('riskSurvey:read'), async (req, res) => {
  try {
    const rows = await RiskSurveyActivity.find({ environmentId: req.params.id }).sort({ createdAt: 1 }).lean();
    return sendSuccess(res, { data: rows.map(mapActivity), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar atividades', meta: { details: error.message } }, 500);
  }
});

router.post('/activities', requirePermission('riskSurvey:write'), async (req, res) => {
  try {
    const environmentId = toId(req.body?.environmentId, 'environmentId');
    const environment = await RiskSurveyEnvironment.findById(environmentId);
    ensureEditableEnvironment(environment);

    const payload = {
      environmentId,
      empresaId: environment.empresaId,
      nome: toText(req.body?.nome),
      funcaoCargo: toText(req.body?.funcaoCargo),
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

    if (!payload.nome || !payload.funcaoCargo || !payload.processoMacro || !payload.descricaoTecnica || !payload.descricaoTarefa) {
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

    const environment = await RiskSurveyEnvironment.findById(activity.environmentId);
    ensureEditableEnvironment(environment);

    const payload = {
      activityId: activity._id,
      environmentId: environment._id,
      empresaId: environment.empresaId,
      perigo: toText(req.body?.perigo),
      eventoPerigoso: toText(req.body?.eventoPerigoso),
      danoPotencial: toText(req.body?.danoPotencial),
      categoriaAgente: toText(req.body?.categoriaAgente),
      condicao: toText(req.body?.condicao),
      numeroExpostos: toNumber(req.body?.numeroExpostos, 1),
      grupoHomogeneo: Boolean(req.body?.grupoHomogeneo),
      controlesExistentes: toText(req.body?.controlesExistentes)
    };

    if (!payload.perigo || !payload.eventoPerigoso || !payload.danoPotencial) {
      return sendError(res, { message: 'Perigo, evento perigoso e dano potencial sao obrigatorios' }, 400);
    }
    if (!isEnum(AGENT_TYPES, payload.categoriaAgente)) {
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

    const [activity, environment, assessment, measurements] = await Promise.all([
      RiskSurveyActivity.findById(risk.activityId).lean(),
      RiskSurveyEnvironment.findById(risk.environmentId).lean(),
      RiskAssessment.findOne({ riskItemId: risk._id }).lean(),
      RiskMeasurement.find({ riskItemId: risk._id }).sort({ dataMedicao: -1 }).lean()
    ]);

    return sendSuccess(res, {
      data: {
        risk: mapRisk(risk),
        activity: mapActivity(activity),
        environment: mapEnvironment(environment),
        assessment: mapAssessment(assessment),
        measurements: measurements.map(mapMeasurement)
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
    if (req.body?.categoriaAgente !== undefined) {
      const category = toText(req.body.categoriaAgente);
      if (!isEnum(AGENT_TYPES, category)) return sendError(res, { message: 'Categoria invalida' }, 400);
      risk.categoriaAgente = category;
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

    const environment = await RiskSurveyEnvironment.findById(risk.environmentId);
    ensureEditableEnvironment(environment);

    const tipo = toText(req.body?.tipo);
    const valorMedido = Number(req.body?.valorMedido);
    const unidade = toText(req.body?.unidade);
    const tempoExposicao = toText(req.body?.tempoExposicao);
    const metodoObservacao = toText(req.body?.metodoObservacao);
    const instrumentoUtilizado = toText(req.body?.instrumentoUtilizado);
    const dataMedicao = req.body?.dataMedicao ? new Date(req.body.dataMedicao) : null;

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
      tipo,
      valorMedido,
      unidade,
      tempoExposicao,
      metodoObservacao,
      instrumentoUtilizado,
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

    const before = mapMeasurement(measurement.toObject());

    const tipo = req.body?.tipo !== undefined ? toText(req.body.tipo) : measurement.tipo;
    const valorMedido = req.body?.valorMedido !== undefined ? Number(req.body.valorMedido) : measurement.valorMedido;
    const unidade = req.body?.unidade !== undefined ? toText(req.body.unidade) : measurement.unidade;
    const dataMedicao = req.body?.dataMedicao ? new Date(req.body.dataMedicao) : measurement.dataMedicao;

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
    measurement.valorMedido = valorMedido;
    measurement.unidade = unidade;
    measurement.tempoExposicao = req.body?.tempoExposicao !== undefined ? toText(req.body.tempoExposicao) : measurement.tempoExposicao;
    measurement.metodoObservacao = req.body?.metodoObservacao !== undefined ? toText(req.body.metodoObservacao) : measurement.metodoObservacao;
    measurement.instrumentoUtilizado = req.body?.instrumentoUtilizado !== undefined ? toText(req.body.instrumentoUtilizado) : measurement.instrumentoUtilizado;
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

    const [activities, risks] = await Promise.all([
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

    const snapshotPayload = {
      environment: mapEnvironment(environment.toObject()),
      activities: activities.map((activity) => ({
        ...mapActivity(activity),
        risks: risksByActivity.get(activity._id.toString()) || []
      }))
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

    const [ambientes, atividades, riscos] = await Promise.all([
      RiskSurveyEnvironment.countDocuments(baseFilter),
      RiskSurveyActivity.countDocuments(baseFilter),
      RiskSurveyItem.find(riskFilter).select({ _id: 1 }).lean()
    ]);

    const riskIds = riscos.map((risk) => risk._id);
    const [avaliacoes, medicoes] = await Promise.all([
      riskIds.length ? RiskAssessment.find({ riskItemId: { $in: riskIds } }).lean() : [],
      riskIds.length ? RiskMeasurement.countDocuments({ riskItemId: { $in: riskIds } }) : 0
    ]);

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

    return sendSuccess(res, {
      data: {
        counts: {
          ambientes,
          atividades,
          riscos: riskIds.length,
          avaliacoes: avaliacoes.length,
          medicoes,
          acoesNecessarias: classificacao.alto + classificacao.critico
        },
        classificacao
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
