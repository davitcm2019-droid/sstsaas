const express = require('express');
const mongoose = require('mongoose');

const { requirePermission } = require('../middleware/rbac');
const { sendSuccess, sendError } = require('../utils/response');
const { isValidObjectId, mapMongoEntity } = require('../utils/mongoEntity');
const {
  ACTIVITY_STATUS,
  CONTROL_TYPES,
  ACTION_STATUS,
  DOCUMENT_TYPES,
  DOCUMENT_STATUS,
  DOCUMENT_SCOPE_TYPES,
  CATALOG_TYPES,
  buildHash,
  models: {
    SstEstablishment,
    SstSector,
    SstRole,
    SstRiskAssessment,
    SstAssessmentRisk,
    SstAssessmentConclusion,
    SstAssessmentRevision,
    SstDocumentModel,
    SstIssuedTechnicalDocument,
    SstIssuedTechnicalDocumentVersion,
    SstTechnicalCatalogItem,
    SstTechnicalAudit
  }
} = require('../sst/models');
const {
  ASSESSMENT_STATUS,
  RISK_LEVELS,
  createRuleError,
  computeRiskLevel,
  ensureRoleCanCreateAssessment,
  ensureAssessmentRiskCanExist,
  ensureAssessmentCanPublish,
  buildLegacyExportManifest
} = require('../sst/rules');
const {
  getDefaultDocumentModels,
  findDefaultDocumentModelByCode,
  mapDocumentModel,
  normalizeEditableLayer,
  normalizeAnnexes,
  buildDocumentContent,
  hashDocumentPayload
} = require('../sst/documentEngine');
const { buildIssuedDocumentPdfFilename, renderIssuedDocumentPdfBuffer } = require('../sst/pdfEngine');
const { resolveIssuedDocumentPdfData } = require('../sst/pdfDataResolver');
const { composeDocumentPayload } = require('../sst/documentComposer');
const { evaluateDocumentReadiness } = require('../sst/documentReadiness');

const router = express.Router();

const DEFAULT_CATALOG_ITEMS = [
  { catalogType: 'hazard', code: 'HAZ_FIS_RUIDO', title: 'Ruido continuo ou intermitente', description: 'Exposicao a ruido em processo produtivo.' },
  { catalogType: 'hazard', code: 'HAZ_QUI_SOLV', title: 'Solventes organicos', description: 'Exposicao a solventes com potencial de absorcao.' },
  { catalogType: 'risk_factor', code: 'FAC_FISICO', title: 'Agente fisico', description: 'Fator de risco de natureza fisica.' },
  { catalogType: 'risk_factor', code: 'FAC_ERGO', title: 'Fator ergonomico', description: 'Fator relacionado a postura, esforco ou repetitividade.' },
  { catalogType: 'agent', code: 'AGT_RUIDO', title: 'Ruido', description: 'Agente fisico ruido.' },
  { catalogType: 'agent', code: 'AGT_TOLUENO', title: 'Tolueno', description: 'Agente quimico organico.' },
  { catalogType: 'control', code: 'CTRL_ENG_ENCL', title: 'Enclausuramento da fonte', description: 'Controle de engenharia com barreira fisica.' },
  { catalogType: 'control', code: 'CTRL_EPI_AUD', title: 'Protetor auditivo', description: 'EPI para atenuacao de ruido.' },
  { catalogType: 'normative_reference', code: 'NR01_GRO', title: 'NR-01 GRO/PGR', description: 'Gerenciamento de Riscos Ocupacionais.' },
  { catalogType: 'normative_reference', code: 'NR15', title: 'NR-15', description: 'Atividades e operacoes insalubres.' }
];

const parseLimit = (value, fallback = 50, max = 200) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};

const toActor = (user = {}) => ({
  id: user?.id || user?._id?.toString?.() || null,
  nome: user?.nome || '',
  email: user?.email || '',
  perfil: user?.perfil || ''
});

const sanitizeStringArray = (value) =>
  Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];

const sanitizeObjectId = (value) => {
  const normalized = String(value || '').trim();
  return isValidObjectId(normalized) ? normalized : null;
};

const requireObjectId = (value, message) => {
  const normalized = sanitizeObjectId(value);
  if (!normalized) {
    throw createRuleError(message, 'INVALID_OBJECT_ID', 400);
  }
  return normalized;
};

const recordAudit = async ({ entityType, entityId, action, summary, before = null, after = null, meta = {}, actor, origin = 'manual' }) => {
  await SstTechnicalAudit.create({
    entityType,
    entityId: String(entityId),
    action,
    summary,
    before,
    after,
    meta,
    actor,
    origin
  });
};

const ensureDefaultCatalogs = async () => {
  const existing = await SstTechnicalCatalogItem.find({}).select('catalogType code').lean();
  const existingKeys = new Set(existing.map((item) => `${item.catalogType}:${item.code}`));
  const missing = DEFAULT_CATALOG_ITEMS.filter((item) => !existingKeys.has(`${item.catalogType}:${item.code}`));
  if (!missing.length) return;

  await SstTechnicalCatalogItem.insertMany(
    missing.map((item) => ({
      ...item,
      active: true
    })),
    { ordered: false }
  );
};

const ensureDefaultDocumentModels = async () => {
  const existing = await SstDocumentModel.find({ isSystem: true }).select('empresaId code').lean();
  const existingKeys = new Set(existing.map((item) => `${item.empresaId || ''}:${item.code}`));
  const missing = getDefaultDocumentModels().filter((item) => !existingKeys.has(`${item.empresaId || ''}:${item.code}`));
  if (!missing.length) return;

  await SstDocumentModel.insertMany(
    missing.map((item) => ({
      ...item,
      createdBy: { nome: 'system', email: '', perfil: 'sistema', id: null },
      updatedBy: { nome: 'system', email: '', perfil: 'sistema', id: null }
    })),
    { ordered: false }
  );
};

let issuedDocumentIndexSyncPromise = null;

const ensureIssuedDocumentIndexes = async () => {
  if (issuedDocumentIndexSyncPromise) {
    return issuedDocumentIndexSyncPromise;
  }

  issuedDocumentIndexSyncPromise = (async () => {
    const collection = SstIssuedTechnicalDocument.collection;
    const indexes = await collection.indexes();
    const legacyIndex = indexes.find((index) => {
      const keys = index?.key || {};
      return (
        index.unique &&
        keys.documentType === 1 &&
        keys.scopeType === 1 &&
        keys.scopeRefId === 1 &&
        keys.documentModelCode === undefined
      );
    });

    if (legacyIndex?.name) {
      try {
        await collection.dropIndex(legacyIndex.name);
      } catch (error) {
        if (!['IndexNotFound', 'NamespaceNotFound'].includes(error?.codeName)) {
          throw error;
        }
      }
    }

    await collection.createIndex(
      { documentType: 1, scopeType: 1, scopeRefId: 1, documentModelCode: 1 },
      {
        unique: true,
        name: 'documentType_1_scopeType_1_scopeRefId_1_documentModelCode_1'
      }
    );
  })();

  try {
    await issuedDocumentIndexSyncPromise;
  } finally {
    issuedDocumentIndexSyncPromise = null;
  }
};

const mapEstablishment = (doc) => {
  const row = mapMongoEntity(doc);
  return { ...row, status: row.status || 'ativo' };
};

const mapSector = (doc) => {
  const row = mapMongoEntity(doc);
  return { ...row, status: row.status || 'ativo' };
};

const mapRole = (doc) => {
  const row = mapMongoEntity(doc);
  return {
    ...row,
    status: row.status || 'ativo',
    atividadesBase: Array.isArray(row.atividadesBase) ? row.atividadesBase : []
  };
};

const mapAssessment = (doc, extras = {}) => {
  const row = mapMongoEntity(doc);
  return {
    ...row,
    riskCount: extras.riskCount || 0,
    highRiskCount: extras.highRiskCount || 0,
    criticalRiskCount: extras.criticalRiskCount || 0,
    actionItemCount: extras.actionItemCount || 0,
    conclusionStatus: extras.conclusionStatus || null
  };
};

const mapAssessmentRisk = (doc) => {
  const row = mapMongoEntity(doc);
  return {
    ...row,
    controls: Array.isArray(row.controls) ? row.controls : [],
    actionPlanItems: Array.isArray(row.actionPlanItems) ? row.actionPlanItems : [],
    normativeRefs: Array.isArray(row.normativeRefs) ? row.normativeRefs : []
  };
};

const mapConclusion = (doc) => mapMongoEntity(doc);
const mapCatalogItem = (doc) => mapMongoEntity(doc);
const mapAuditItem = (doc) => mapMongoEntity(doc);
const mapDocumentModelItem = (doc) => {
  const row = mapMongoEntity(doc);
  return {
    ...row,
    empresaId: row.empresaId || '',
    allowedScopeTypes: Array.isArray(row.allowedScopeTypes) ? row.allowedScopeTypes : ['assessment'],
    layers: {
      fixed: String(row.layers?.fixed || '').trim(),
      editable: normalizeEditableLayer(row.layers?.editable || {}),
      annexes: normalizeAnnexes(row.layers?.annexes || [])
    }
  };
};

const mapIssuedDocument = (doc, latestVersion = null) => {
  const row = mapMongoEntity(doc);
  return {
    ...row,
    latestIssuedVersion: latestVersion ? mapMongoEntity(latestVersion) : null
  };
};

const sanitizeEstablishmentPayload = (payload = {}, current = null) => ({
  empresaId: String(payload.empresaId ?? current?.empresaId ?? '').trim(),
  nome: String(payload.nome ?? current?.nome ?? '').trim(),
  codigo: String(payload.codigo ?? current?.codigo ?? '').trim(),
  endereco: String(payload.endereco ?? current?.endereco ?? '').trim(),
  status: ACTIVITY_STATUS.includes(payload.status) ? payload.status : current?.status || 'ativo'
});

const sanitizeSectorPayload = (payload = {}, current = null) => ({
  empresaId: String(payload.empresaId ?? current?.empresaId ?? '').trim(),
  establishmentId: sanitizeObjectId(payload.establishmentId ?? current?.establishmentId),
  nome: String(payload.nome ?? current?.nome ?? '').trim(),
  descricao: String(payload.descricao ?? current?.descricao ?? '').trim(),
  status: ACTIVITY_STATUS.includes(payload.status) ? payload.status : current?.status || 'ativo'
});

const sanitizeRolePayload = (payload = {}, current = null) => ({
  empresaId: String(payload.empresaId ?? current?.empresaId ?? '').trim(),
  establishmentId: sanitizeObjectId(payload.establishmentId ?? current?.establishmentId),
  sectorId: sanitizeObjectId(payload.sectorId ?? current?.sectorId),
  nome: String(payload.nome ?? current?.nome ?? '').trim(),
  descricao: String(payload.descricao ?? current?.descricao ?? '').trim(),
  atividadesBase: sanitizeStringArray(payload.atividadesBase ?? current?.atividadesBase ?? []),
  exposicaoBase: String(payload.exposicaoBase ?? current?.exposicaoBase ?? '').trim(),
  status: ACTIVITY_STATUS.includes(payload.status) ? payload.status : current?.status || 'ativo'
});

const sanitizeAssessmentPayload = (payload = {}, current = null) => ({
  title: String(payload.title ?? current?.title ?? '').trim(),
  reviewReason: String(payload.reviewReason ?? current?.reviewReason ?? 'implantacao_inicial').trim() || 'implantacao_inicial',
  context: {
    processoPrincipal: String(payload.context?.processoPrincipal ?? current?.context?.processoPrincipal ?? '').trim(),
    localAreaPosto: String(payload.context?.localAreaPosto ?? current?.context?.localAreaPosto ?? '').trim(),
    jornadaTurno: String(payload.context?.jornadaTurno ?? current?.context?.jornadaTurno ?? '').trim(),
    quantidadeExpostos: Number(payload.context?.quantidadeExpostos ?? current?.context?.quantidadeExpostos ?? 1) || 1,
    condicaoOperacional: String(payload.context?.condicaoOperacional ?? current?.context?.condicaoOperacional ?? '').trim(),
    metodologia: String(payload.context?.metodologia ?? current?.context?.metodologia ?? '').trim(),
    instrumentosUtilizados: String(payload.context?.instrumentosUtilizados ?? current?.context?.instrumentosUtilizados ?? '').trim(),
    criteriosAvaliacao: String(payload.context?.criteriosAvaliacao ?? current?.context?.criteriosAvaliacao ?? '').trim(),
    matrizRisco: String(payload.context?.matrizRisco ?? current?.context?.matrizRisco ?? '').trim(),
    atividadesBase: sanitizeStringArray(payload.context?.atividadesBase ?? current?.context?.atividadesBase ?? []),
    observations: String(payload.context?.observations ?? current?.context?.observations ?? '').trim()
  },
  responsibleTechnical: {
    nome: String(payload.responsibleTechnical?.nome ?? current?.responsibleTechnical?.nome ?? '').trim(),
    email: String(payload.responsibleTechnical?.email ?? current?.responsibleTechnical?.email ?? '').trim(),
    registro: String(payload.responsibleTechnical?.registro ?? current?.responsibleTechnical?.registro ?? '').trim()
  }
});

const sanitizeRiskPayload = (payload = {}, current = null) => {
  const probability = Number(payload.probability ?? current?.probability ?? 1) || 1;
  const severity = Number(payload.severity ?? current?.severity ?? 1) || 1;
  const level = String(payload.level ?? current?.level ?? computeRiskLevel(probability, severity)).trim() || computeRiskLevel(probability, severity);

  return {
    category: String(payload.category ?? current?.category ?? '').trim(),
    riskGroup: String(payload.riskGroup ?? current?.riskGroup ?? '').trim(),
    factor: String(payload.factor ?? current?.factor ?? '').trim(),
    hazard: String(payload.hazard ?? current?.hazard ?? '').trim(),
    agent: String(payload.agent ?? current?.agent ?? '').trim(),
    source: String(payload.source ?? current?.source ?? '').trim(),
    exposure: String(payload.exposure ?? current?.exposure ?? '').trim(),
    damage: String(payload.damage ?? current?.damage ?? '').trim(),
    probability: Math.min(Math.max(probability, 1), 5),
    severity: Math.min(Math.max(severity, 1), 5),
    level: RISK_LEVELS.includes(level) ? level : computeRiskLevel(probability, severity),
    normativeRefs: sanitizeStringArray(payload.normativeRefs ?? current?.normativeRefs ?? []),
    treatmentStatus: String(payload.treatmentStatus ?? current?.treatmentStatus ?? 'identificado').trim() || 'identificado',
    highRiskJustification: String(payload.highRiskJustification ?? current?.highRiskJustification ?? '').trim(),
    controls: Array.isArray(payload.controls ?? current?.controls)
      ? (payload.controls ?? current?.controls).map((control, index) => ({
          type: CONTROL_TYPES.includes(control?.type) ? control.type : 'administrativo',
          description: String(control?.description || '').trim(),
          hierarchyLevel: Number(control?.hierarchyLevel ?? index + 1) || index + 1,
          effectiveness: String(control?.effectiveness || 'nao_avaliada').trim() || 'nao_avaliada',
          caNumber: String(control?.caNumber || '').trim(),
          notes: String(control?.notes || '').trim()
        })).filter((control) => control.description)
      : [],
    actionPlanItems: Array.isArray(payload.actionPlanItems ?? current?.actionPlanItems)
      ? (payload.actionPlanItems ?? current?.actionPlanItems).map((item) => ({
          title: String(item?.title || '').trim(),
          responsible: String(item?.responsible || '').trim(),
          dueDate: item?.dueDate ? new Date(item.dueDate) : null,
          status: ACTION_STATUS.includes(item?.status) ? item.status : 'pendente',
          acceptanceCriteria: String(item?.acceptanceCriteria || '').trim()
        })).filter((item) => item.title)
      : []
  };
};

const sanitizeConclusionPayload = (payload = {}, current = null) => ({
  result: String(payload.result ?? current?.result ?? '').trim(),
  basis: String(payload.basis ?? current?.basis ?? '').trim(),
  normativeFrame: String(payload.normativeFrame ?? current?.normativeFrame ?? '').trim()
});

const sanitizeDocumentModelPayload = (payload = {}, current = null) => {
  const normalizedCode = String(payload.code ?? current?.code ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  const allowedScopeTypes = Array.isArray(payload.allowedScopeTypes ?? current?.allowedScopeTypes)
    ? (payload.allowedScopeTypes ?? current?.allowedScopeTypes)
        .map((scopeType) => String(scopeType).trim())
        .filter((scopeType) => DOCUMENT_SCOPE_TYPES.includes(scopeType))
    : ['assessment'];

  return {
    empresaId: String(payload.empresaId ?? current?.empresaId ?? '').trim(),
    code: normalizedCode,
    title: String(payload.title ?? current?.title ?? '').trim(),
    description: String(payload.description ?? current?.description ?? '').trim(),
    documentType: DOCUMENT_TYPES.includes(payload.documentType) ? payload.documentType : current?.documentType || 'inventario',
    allowedScopeTypes: allowedScopeTypes.length ? allowedScopeTypes : ['assessment'],
    active: payload.active === undefined ? Boolean(current?.active ?? true) : Boolean(payload.active),
    isSystem: Boolean(current?.isSystem),
    layers: {
      fixed: String(payload.layers?.fixed ?? current?.layers?.fixed ?? '').trim(),
      editable: normalizeEditableLayer(payload.layers?.editable ?? current?.layers?.editable ?? {}),
      annexes: normalizeAnnexes(payload.layers?.annexes ?? current?.layers?.annexes ?? [])
    }
  };
};

const sanitizeCatalogPayload = (payload = {}, current = null) => ({
  catalogType: CATALOG_TYPES.includes(payload.catalogType) ? payload.catalogType : current?.catalogType || 'hazard',
  code: String(payload.code ?? current?.code ?? '').trim(),
  title: String(payload.title ?? current?.title ?? '').trim(),
  description: String(payload.description ?? current?.description ?? '').trim(),
  metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : current?.metadata || {},
  active: payload.active !== undefined ? Boolean(payload.active) : Boolean(current?.active ?? true)
});

const markRevisionRequired = async (filter, revisionReason) => {
  await SstRiskAssessment.updateMany(
    { ...filter, status: 'published' },
    {
      $set: {
        revisionRequired: true,
        revisionReason,
        updatedAt: new Date()
      }
    }
  );
};

router.get('/metadata', requirePermission('sst:read'), async (req, res) => {
  try {
    await ensureDefaultCatalogs();
    const counts = await Promise.all([
      SstEstablishment.countDocuments({}),
      SstSector.countDocuments({}),
      SstRole.countDocuments({}),
      SstRiskAssessment.countDocuments({}),
      SstAssessmentRisk.countDocuments({})
    ]);

    return sendSuccess(res, {
      data: {
        statuses: {
          activity: ACTIVITY_STATUS,
          assessment: ASSESSMENT_STATUS,
          document: DOCUMENT_STATUS
        },
        controls: CONTROL_TYPES,
        actionStatus: ACTION_STATUS,
        documentTypes: DOCUMENT_TYPES,
        templates: getTemplates(),
        ppp: {
          available: false,
          reason: 'PPP depende de trabalhador nominal e historico por periodo.'
        },
        counts: {
          establishments: counts[0],
          sectors: counts[1],
          roles: counts[2],
          assessments: counts[3],
          assessmentRisks: counts[4]
        }
      }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao carregar metadados do modulo SST', meta: { details: error.message } }, error.status || 500);
  }
});

router.post('/legacy/export', requirePermission('sst:configure'), async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const legacyCollections = collections
      .map((item) => item.name)
      .filter((name) => /(risksurvey|risk_survey)/i.test(name));

    const payload = {};
    const totals = {};

    for (const collectionName of legacyCollections) {
      const rows = await db.collection(collectionName).find({}).toArray();
      payload[collectionName] = rows;
      totals[collectionName] = rows.length;
    }

    return sendSuccess(res, {
      data: buildLegacyExportManifest({
        generatedAt: new Date().toISOString(),
        collections: payload,
        totals
      }),
      message: 'Export tecnico do legado gerado com sucesso'
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao exportar legado do SST', meta: { details: error.message } }, error.status || 500);
  }
});

router.get('/establishments', requirePermission('sst:read'), async (req, res) => {
  try {
    const filters = {};
    if (req.query.empresaId) filters.empresaId = String(req.query.empresaId);
    if (req.query.status) filters.status = String(req.query.status);

    const rows = await SstEstablishment.find(filters).sort({ nome: 1 }).lean();
    return sendSuccess(res, { data: rows.map(mapEstablishment), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar estabelecimentos', meta: { details: error.message } }, error.status || 500);
  }
});

router.post('/establishments', requirePermission('sst:write'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const payload = sanitizeEstablishmentPayload(req.body);

    if (!payload.empresaId || !payload.nome) {
      return sendError(res, { message: 'empresaId e nome do estabelecimento sao obrigatorios' }, 400);
    }

    const created = await SstEstablishment.create({
      ...payload,
      createdBy: actor,
      updatedBy: actor
    });

    await recordAudit({
      entityType: 'establishment',
      entityId: created._id,
      action: 'create',
      summary: `Estabelecimento ${created.nome} criado`,
      after: created.toObject(),
      actor
    });

    return sendSuccess(res, { data: mapEstablishment(created), message: 'Estabelecimento criado com sucesso' }, 201);
  } catch (error) {
    const status = error?.code === 11000 ? 409 : error.status || 500;
    const message = error?.code === 11000 ? 'Ja existe estabelecimento com este nome na empresa' : 'Erro ao criar estabelecimento';
    return sendError(res, { message, meta: { details: error.message } }, status);
  }
});

router.put('/establishments/:id', requirePermission('sst:write'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const current = await SstEstablishment.findById(req.params.id);
    if (!current) return sendError(res, { message: 'Estabelecimento nao encontrado' }, 404);

    const before = current.toObject();
    const payload = sanitizeEstablishmentPayload(req.body, current);
    if (!payload.empresaId || !payload.nome) {
      return sendError(res, { message: 'empresaId e nome do estabelecimento sao obrigatorios' }, 400);
    }

    Object.assign(current, payload, { updatedBy: actor });
    await current.save();
    await markRevisionRequired({ establishmentId: current._id }, 'Mudanca estrutural no estabelecimento');
    await recordAudit({
      entityType: 'establishment',
      entityId: current._id,
      action: 'update',
      summary: `Estabelecimento ${current.nome} atualizado`,
      before,
      after: current.toObject(),
      actor
    });

    return sendSuccess(res, {
      data: mapEstablishment(current),
      meta: { revisionRequired: true },
      message: 'Estabelecimento atualizado com sucesso'
    });
  } catch (error) {
    const status = error?.code === 11000 ? 409 : error.status || 500;
    const message = error?.code === 11000 ? 'Ja existe estabelecimento com este nome na empresa' : 'Erro ao atualizar estabelecimento';
    return sendError(res, { message, meta: { details: error.message } }, status);
  }
});

router.delete('/establishments/:id', requirePermission('sst:write'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const current = await SstEstablishment.findById(req.params.id);
    if (!current) return sendError(res, { message: 'Estabelecimento nao encontrado' }, 404);

    const [sectorCount, assessmentCount, publishedCount] = await Promise.all([
      SstSector.countDocuments({ establishmentId: current._id }),
      SstRiskAssessment.countDocuments({ establishmentId: current._id }),
      SstRiskAssessment.countDocuments({ establishmentId: current._id, status: 'published' })
    ]);

    if (publishedCount > 0 || sectorCount > 0 || assessmentCount > 0) {
      current.status = 'inativo';
      current.updatedBy = actor;
      await current.save();
      await markRevisionRequired({ establishmentId: current._id }, 'Estabelecimento descontinuado');
      await recordAudit({
        entityType: 'establishment',
        entityId: current._id,
        action: 'deactivate',
        summary: `Estabelecimento ${current.nome} descontinuado`,
        after: current.toObject(),
        meta: { sectorCount, assessmentCount, publishedCount },
        actor
      });
      return sendSuccess(res, { data: mapEstablishment(current), message: 'Estabelecimento descontinuado logicamente' });
    }

    await current.deleteOne();
    await recordAudit({
      entityType: 'establishment',
      entityId: current._id,
      action: 'delete',
      summary: `Estabelecimento ${current.nome} removido`,
      before: current.toObject(),
      actor
    });
    return sendSuccess(res, { data: null, message: 'Estabelecimento removido com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao remover estabelecimento', meta: { details: error.message } }, error.status || 500);
  }
});

router.get('/sectors', requirePermission('sst:read'), async (req, res) => {
  try {
    const filters = {};
    if (req.query.empresaId) filters.empresaId = String(req.query.empresaId);
    if (req.query.establishmentId) filters.establishmentId = requireObjectId(req.query.establishmentId, 'establishmentId invalido');
    if (req.query.status) filters.status = String(req.query.status);

    const rows = await SstSector.find(filters).sort({ nome: 1 }).lean();
    return sendSuccess(res, { data: rows.map(mapSector), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar setores', meta: { details: error.message } }, error.status || 500);
  }
});

router.post('/sectors', requirePermission('sst:write'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const payload = sanitizeSectorPayload(req.body);
    if (!payload.empresaId || !payload.establishmentId || !payload.nome) {
      return sendError(res, { message: 'empresaId, establishmentId e nome do setor sao obrigatorios' }, 400);
    }

    const establishment = await SstEstablishment.findById(payload.establishmentId).lean();
    if (!establishment) return sendError(res, { message: 'Estabelecimento nao encontrado' }, 404);

    const created = await SstSector.create({
      ...payload,
      createdBy: actor,
      updatedBy: actor
    });

    await recordAudit({
      entityType: 'sector',
      entityId: created._id,
      action: 'create',
      summary: `Setor ${created.nome} criado`,
      after: created.toObject(),
      actor
    });

    return sendSuccess(res, { data: mapSector(created), message: 'Setor criado com sucesso' }, 201);
  } catch (error) {
    const status = error?.code === 11000 ? 409 : error.status || 500;
    const message = error?.code === 11000 ? 'Ja existe setor com este nome no estabelecimento' : 'Erro ao criar setor';
    return sendError(res, { message, meta: { details: error.message } }, status);
  }
});

router.put('/sectors/:id', requirePermission('sst:write'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const current = await SstSector.findById(req.params.id);
    if (!current) return sendError(res, { message: 'Setor nao encontrado' }, 404);

    const before = current.toObject();
    const payload = sanitizeSectorPayload(req.body, current);
    if (!payload.empresaId || !payload.establishmentId || !payload.nome) {
      return sendError(res, { message: 'empresaId, establishmentId e nome do setor sao obrigatorios' }, 400);
    }

    Object.assign(current, payload, { updatedBy: actor });
    await current.save();
    await markRevisionRequired({ sectorId: current._id }, 'Mudanca estrutural no setor');
    await recordAudit({
      entityType: 'sector',
      entityId: current._id,
      action: 'update',
      summary: `Setor ${current.nome} atualizado`,
      before,
      after: current.toObject(),
      actor
    });

    return sendSuccess(res, { data: mapSector(current), meta: { revisionRequired: true }, message: 'Setor atualizado com sucesso' });
  } catch (error) {
    const status = error?.code === 11000 ? 409 : error.status || 500;
    const message = error?.code === 11000 ? 'Ja existe setor com este nome no estabelecimento' : 'Erro ao atualizar setor';
    return sendError(res, { message, meta: { details: error.message } }, status);
  }
});

router.delete('/sectors/:id', requirePermission('sst:write'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const current = await SstSector.findById(req.params.id);
    if (!current) return sendError(res, { message: 'Setor nao encontrado' }, 404);

    const [roleCount, assessmentCount, publishedCount] = await Promise.all([
      SstRole.countDocuments({ sectorId: current._id }),
      SstRiskAssessment.countDocuments({ sectorId: current._id }),
      SstRiskAssessment.countDocuments({ sectorId: current._id, status: 'published' })
    ]);

    if (publishedCount > 0 || roleCount > 0 || assessmentCount > 0) {
      current.status = 'inativo';
      current.updatedBy = actor;
      await current.save();
      await markRevisionRequired({ sectorId: current._id }, 'Setor descontinuado');
      await recordAudit({
        entityType: 'sector',
        entityId: current._id,
        action: 'deactivate',
        summary: `Setor ${current.nome} descontinuado`,
        after: current.toObject(),
        meta: { roleCount, assessmentCount, publishedCount },
        actor
      });
      return sendSuccess(res, { data: mapSector(current), message: 'Setor descontinuado logicamente' });
    }

    await current.deleteOne();
    await recordAudit({
      entityType: 'sector',
      entityId: current._id,
      action: 'delete',
      summary: `Setor ${current.nome} removido`,
      before: current.toObject(),
      actor
    });
    return sendSuccess(res, { data: null, message: 'Setor removido com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao remover setor', meta: { details: error.message } }, error.status || 500);
  }
});

router.get('/roles', requirePermission('sst:read'), async (req, res) => {
  try {
    const filters = {};
    if (req.query.empresaId) filters.empresaId = String(req.query.empresaId);
    if (req.query.establishmentId) filters.establishmentId = requireObjectId(req.query.establishmentId, 'establishmentId invalido');
    if (req.query.sectorId) filters.sectorId = requireObjectId(req.query.sectorId, 'sectorId invalido');
    if (req.query.status) filters.status = String(req.query.status);

    const rows = await SstRole.find(filters).sort({ nome: 1 }).lean();
    return sendSuccess(res, { data: rows.map(mapRole), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar cargos', meta: { details: error.message } }, error.status || 500);
  }
});

router.post('/roles', requirePermission('sst:write'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const payload = sanitizeRolePayload(req.body);
    if (!payload.empresaId || !payload.establishmentId || !payload.sectorId || !payload.nome) {
      return sendError(res, { message: 'empresaId, establishmentId, sectorId e nome do cargo sao obrigatorios' }, 400);
    }

    const sector = await SstSector.findById(payload.sectorId).lean();
    if (!sector) return sendError(res, { message: 'Setor nao encontrado' }, 404);

    const created = await SstRole.create({
      ...payload,
      createdBy: actor,
      updatedBy: actor
    });

    await recordAudit({
      entityType: 'role',
      entityId: created._id,
      action: 'create',
      summary: `Cargo ${created.nome} criado`,
      after: created.toObject(),
      actor
    });

    return sendSuccess(res, { data: mapRole(created), message: 'Cargo criado com sucesso' }, 201);
  } catch (error) {
    const status = error?.code === 11000 ? 409 : error.status || 500;
    const message = error?.code === 11000 ? 'Ja existe cargo com este nome no setor' : 'Erro ao criar cargo';
    return sendError(res, { message, meta: { details: error.message } }, status);
  }
});

router.put('/roles/:id', requirePermission('sst:write'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const current = await SstRole.findById(req.params.id);
    if (!current) return sendError(res, { message: 'Cargo nao encontrado' }, 404);

    const before = current.toObject();
    const payload = sanitizeRolePayload(req.body, current);
    if (!payload.empresaId || !payload.establishmentId || !payload.sectorId || !payload.nome) {
      return sendError(res, { message: 'empresaId, establishmentId, sectorId e nome do cargo sao obrigatorios' }, 400);
    }

    Object.assign(current, payload, { updatedBy: actor });
    await current.save();
    await markRevisionRequired({ roleId: current._id }, 'Mudanca estrutural no cargo');
    await recordAudit({
      entityType: 'role',
      entityId: current._id,
      action: 'update',
      summary: `Cargo ${current.nome} atualizado`,
      before,
      after: current.toObject(),
      actor
    });

    return sendSuccess(res, { data: mapRole(current), meta: { revisionRequired: true }, message: 'Cargo atualizado com sucesso' });
  } catch (error) {
    const status = error?.code === 11000 ? 409 : error.status || 500;
    const message = error?.code === 11000 ? 'Ja existe cargo com este nome no setor' : 'Erro ao atualizar cargo';
    return sendError(res, { message, meta: { details: error.message } }, status);
  }
});

router.delete('/roles/:id', requirePermission('sst:write'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const current = await SstRole.findById(req.params.id);
    if (!current) return sendError(res, { message: 'Cargo nao encontrado' }, 404);

    const [assessmentCount, publishedCount] = await Promise.all([
      SstRiskAssessment.countDocuments({ roleId: current._id }),
      SstRiskAssessment.countDocuments({ roleId: current._id, status: 'published' })
    ]);

    if (publishedCount > 0 || assessmentCount > 0) {
      current.status = 'inativo';
      current.updatedBy = actor;
      await current.save();
      await markRevisionRequired({ roleId: current._id }, 'Cargo descontinuado');
      await recordAudit({
        entityType: 'role',
        entityId: current._id,
        action: 'deactivate',
        summary: `Cargo ${current.nome} descontinuado`,
        after: current.toObject(),
        meta: { assessmentCount, publishedCount },
        actor
      });
      return sendSuccess(res, { data: mapRole(current), message: 'Cargo descontinuado logicamente' });
    }

    await current.deleteOne();
    await recordAudit({
      entityType: 'role',
      entityId: current._id,
      action: 'delete',
      summary: `Cargo ${current.nome} removido`,
      before: current.toObject(),
      actor
    });
    return sendSuccess(res, { data: null, message: 'Cargo removido com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao remover cargo', meta: { details: error.message } }, error.status || 500);
  }
});

const collectAssessmentStats = async (assessmentIds = []) => {
  if (!assessmentIds.length) return { riskMap: new Map(), conclusionMap: new Map() };

  const [riskStats, conclusions] = await Promise.all([
    SstAssessmentRisk.aggregate([
      { $match: { assessmentId: { $in: assessmentIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
      {
        $project: {
          assessmentId: 1,
          level: 1,
          actionItemsCount: { $size: { $ifNull: ['$actionPlanItems', []] } }
        }
      },
      {
        $group: {
          _id: '$assessmentId',
          riskCount: { $sum: 1 },
          highRiskCount: { $sum: { $cond: [{ $eq: ['$level', 'alto'] }, 1, 0] } },
          criticalRiskCount: { $sum: { $cond: [{ $eq: ['$level', 'critico'] }, 1, 0] } },
          actionItemCount: { $sum: '$actionItemsCount' }
        }
      }
    ]),
    SstAssessmentConclusion.find({ assessmentId: { $in: assessmentIds } }).lean()
  ]);

  return {
    riskMap: new Map(riskStats.map((item) => [String(item._id), item])),
    conclusionMap: new Map(conclusions.map((item) => [String(item.assessmentId), item.status]))
  };
};

const fetchAssessmentBundle = async (assessmentId) => {
  const assessment = await SstRiskAssessment.findById(assessmentId).lean();
  if (!assessment) {
    throw createRuleError('Avaliacao nao encontrada', 'ASSESSMENT_NOT_FOUND', 404);
  }

  const [establishment, sector, role, risks, conclusion] = await Promise.all([
    SstEstablishment.findById(assessment.establishmentId).lean(),
    SstSector.findById(assessment.sectorId).lean(),
    SstRole.findById(assessment.roleId).lean(),
    SstAssessmentRisk.find({ assessmentId }).sort({ createdAt: 1 }).lean(),
    SstAssessmentConclusion.findOne({ assessmentId }).lean()
  ]);

  return { assessment, establishment, sector, role, risks, conclusion };
};

router.get('/assessments', requirePermission('sst:read'), async (req, res) => {
  try {
    const filters = {};
    if (req.query.empresaId) filters.empresaId = String(req.query.empresaId);
    if (req.query.establishmentId) filters.establishmentId = requireObjectId(req.query.establishmentId, 'establishmentId invalido');
    if (req.query.sectorId) filters.sectorId = requireObjectId(req.query.sectorId, 'sectorId invalido');
    if (req.query.roleId) filters.roleId = requireObjectId(req.query.roleId, 'roleId invalido');
    if (req.query.status) filters.status = String(req.query.status);
    if (req.query.revisionRequired === 'true') filters.revisionRequired = true;

    const rows = await SstRiskAssessment.find(filters).sort({ updatedAt: -1, createdAt: -1 }).lean();
    const ids = rows.map((row) => row._id.toString());
    const { riskMap, conclusionMap } = await collectAssessmentStats(ids);

    return sendSuccess(res, {
      data: rows.map((row) => {
        const stats = riskMap.get(String(row._id)) || {};
        return mapAssessment(row, { ...stats, conclusionStatus: conclusionMap.get(String(row._id)) || null });
      }),
      meta: { total: rows.length }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar avaliacoes', meta: { details: error.message } }, error.status || 500);
  }
});

router.post('/assessments', requirePermission('sst:write'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const roleId = requireObjectId(req.body?.roleId, 'roleId obrigatorio');
    ensureRoleCanCreateAssessment({ roleId });

    const role = await SstRole.findById(roleId).lean();
    if (!role) return sendError(res, { message: 'Cargo nao encontrado' }, 404);

    const active = await SstRiskAssessment.findOne({ roleId, status: { $in: ['draft', 'in_review'] } }).lean();
    if (active) {
      return sendError(res, { message: 'Ja existe avaliacao ativa para este cargo' }, 409);
    }

    const latest = await SstRiskAssessment.findOne({ roleId }).sort({ version: -1 }).lean();
    const version = Number(latest?.version || 0) + 1;
    const payload = sanitizeAssessmentPayload(req.body);
    const title = payload.title || `Avaliacao ${role.nome} v${version}`;

    const created = await SstRiskAssessment.create({
      empresaId: role.empresaId,
      establishmentId: role.establishmentId,
      sectorId: role.sectorId,
      roleId: role._id,
      version,
      status: 'draft',
      title,
      reviewReason: payload.reviewReason,
      context: payload.context,
      responsibleTechnical: payload.responsibleTechnical,
      createdBy: actor,
      updatedBy: actor
    });

    await recordAudit({
      entityType: 'assessment',
      entityId: created._id,
      action: 'create',
      summary: `Avaliacao ${created.title} criada`,
      after: created.toObject(),
      actor
    });

    return sendSuccess(res, { data: mapAssessment(created), message: 'Avaliacao criada com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar avaliacao', meta: { details: error.message } }, error.status || 500);
  }
});

router.get('/assessments/:id', requirePermission('sst:read'), async (req, res) => {
  try {
    const assessmentId = requireObjectId(req.params.id, 'Avaliacao invalida');
    const bundle = await fetchAssessmentBundle(assessmentId);

    return sendSuccess(res, {
      data: {
        assessment: mapAssessment(bundle.assessment),
        establishment: bundle.establishment ? mapEstablishment(bundle.establishment) : null,
        sector: bundle.sector ? mapSector(bundle.sector) : null,
        role: bundle.role ? mapRole(bundle.role) : null,
        risks: bundle.risks.map(mapAssessmentRisk),
        conclusion: bundle.conclusion ? mapConclusion(bundle.conclusion) : null
      }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao carregar avaliacao', meta: { details: error.message } }, error.status || 500);
  }
});

router.put('/assessments/:id', requirePermission('sst:write'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const current = await SstRiskAssessment.findById(req.params.id);
    if (!current) return sendError(res, { message: 'Avaliacao nao encontrada' }, 404);
    if (current.status === 'published' || current.status === 'superseded') {
      return sendError(res, { message: 'Versao publicada nao pode ser editada diretamente' }, 409);
    }

    const before = current.toObject();
    const payload = sanitizeAssessmentPayload(req.body, current);

    current.title = payload.title || current.title;
    current.reviewReason = payload.reviewReason;
    current.context = payload.context;
    current.responsibleTechnical = payload.responsibleTechnical;
    current.updatedBy = actor;
    await current.save();

    await recordAudit({
      entityType: 'assessment',
      entityId: current._id,
      action: 'update',
      summary: `Avaliacao ${current.title} atualizada`,
      before,
      after: current.toObject(),
      actor
    });

    return sendSuccess(res, { data: mapAssessment(current), message: 'Avaliacao atualizada com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar avaliacao', meta: { details: error.message } }, error.status || 500);
  }
});

router.post('/assessments/:id/review', requirePermission('sst:approve'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const current = await SstRiskAssessment.findById(req.params.id);
    if (!current) return sendError(res, { message: 'Avaliacao nao encontrada' }, 404);
    if (current.status !== 'draft') return sendError(res, { message: 'Somente avaliacoes em rascunho podem entrar em revisao' }, 409);

    current.status = 'in_review';
    current.updatedBy = actor;
    await current.save();

    await recordAudit({
      entityType: 'assessment',
      entityId: current._id,
      action: 'review',
      summary: `Avaliacao ${current.title} enviada para revisao`,
      after: current.toObject(),
      actor
    });

    return sendSuccess(res, { data: mapAssessment(current), message: 'Avaliacao movida para revisao' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao iniciar revisao', meta: { details: error.message } }, error.status || 500);
  }
});

router.post('/assessments/:id/revision', requirePermission('sst:write'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const assessmentId = requireObjectId(req.params.id, 'Avaliacao invalida');
    const bundle = await fetchAssessmentBundle(assessmentId);

    if (bundle.assessment.status !== 'published' && bundle.assessment.status !== 'superseded') {
      return sendError(res, { message: 'Somente avaliacoes publicadas podem originar revisao' }, 409);
    }

    const active = await SstRiskAssessment.findOne({
      roleId: bundle.assessment.roleId,
      status: { $in: ['draft', 'in_review'] }
    }).lean();
    if (active) {
      return sendError(res, { message: 'Ja existe revisao ativa para este cargo' }, 409);
    }

    const nextVersion = Number(bundle.assessment.version || 1) + 1;
    const clonedAssessment = await SstRiskAssessment.create({
      empresaId: bundle.assessment.empresaId,
      establishmentId: bundle.assessment.establishmentId,
      sectorId: bundle.assessment.sectorId,
      roleId: bundle.assessment.roleId,
      title: `${bundle.assessment.title} - revisao v${nextVersion}`,
      version: nextVersion,
      status: 'draft',
      reviewReason: String(req.body?.reviewReason || 'revisao_periodica').trim(),
      revisionRequired: false,
      revisionReason: '',
      context: bundle.assessment.context,
      responsibleTechnical: bundle.assessment.responsibleTechnical,
      createdBy: actor,
      updatedBy: actor
    });

    if (bundle.risks.length) {
      await SstAssessmentRisk.insertMany(
        bundle.risks.map((risk) => ({
          assessmentId: clonedAssessment._id,
          empresaId: risk.empresaId,
          establishmentId: risk.establishmentId,
          sectorId: risk.sectorId,
          roleId: risk.roleId,
          category: risk.category,
          riskGroup: risk.riskGroup,
          factor: risk.factor,
          hazard: risk.hazard,
          agent: risk.agent,
          source: risk.source,
          exposure: risk.exposure,
          damage: risk.damage,
          probability: risk.probability,
          severity: risk.severity,
          level: risk.level,
          normativeRefs: risk.normativeRefs || [],
          treatmentStatus: risk.treatmentStatus,
          highRiskJustification: risk.highRiskJustification,
          controls: risk.controls || [],
          actionPlanItems: risk.actionPlanItems || [],
          createdBy: actor,
          updatedBy: actor
        }))
      );
    }

    if (bundle.conclusion) {
      await SstAssessmentConclusion.create({
        assessmentId: clonedAssessment._id,
        result: bundle.conclusion.result,
        basis: bundle.conclusion.basis,
        normativeFrame: bundle.conclusion.normativeFrame,
        status: 'draft',
        hash: ''
      });
    }

    await SstRiskAssessment.updateOne(
      { _id: bundle.assessment._id },
      {
        $set: {
          revisionRequired: false,
          revisionReason: ''
        }
      }
    );

    await recordAudit({
      entityType: 'assessment',
      entityId: clonedAssessment._id,
      action: 'revision_create',
      summary: `Revisao ${clonedAssessment.title} criada a partir da versao ${bundle.assessment.version}`,
      meta: { sourceAssessmentId: assessmentId },
      after: clonedAssessment.toObject(),
      actor
    });

    return sendSuccess(res, { data: mapAssessment(clonedAssessment), message: 'Revisao criada com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar revisao', meta: { details: error.message } }, error.status || 500);
  }
});

router.get('/assessments/:id/risks', requirePermission('sst:read'), async (req, res) => {
  try {
    const assessmentId = requireObjectId(req.params.id, 'Avaliacao invalida');
    const rows = await SstAssessmentRisk.find({ assessmentId }).sort({ createdAt: 1 }).lean();
    return sendSuccess(res, { data: rows.map(mapAssessmentRisk), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar riscos da avaliacao', meta: { details: error.message } }, error.status || 500);
  }
});

router.post('/assessments/:id/risks', requirePermission('sst:write'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const assessmentId = requireObjectId(req.params.id, 'Avaliacao invalida');
    ensureAssessmentRiskCanExist({ assessmentId });

    const assessment = await SstRiskAssessment.findById(assessmentId).lean();
    if (!assessment) return sendError(res, { message: 'Avaliacao nao encontrada' }, 404);
    if (assessment.status === 'published' || assessment.status === 'superseded') {
      return sendError(res, { message: 'Versao publicada nao pode receber novos riscos' }, 409);
    }

    const payload = sanitizeRiskPayload(req.body);
    if (!payload.factor || !payload.hazard || !payload.damage) {
      return sendError(res, { message: 'factor, hazard e damage sao obrigatorios' }, 400);
    }

    const created = await SstAssessmentRisk.create({
      assessmentId,
      empresaId: assessment.empresaId,
      establishmentId: assessment.establishmentId,
      sectorId: assessment.sectorId,
      roleId: assessment.roleId,
      ...payload,
      createdBy: actor,
      updatedBy: actor
    });

    await recordAudit({
      entityType: 'assessment_risk',
      entityId: created._id,
      action: 'create',
      summary: `Risco ${created.hazard} criado na avaliacao ${assessment.title}`,
      after: created.toObject(),
      meta: { assessmentId },
      actor
    });

    return sendSuccess(res, { data: mapAssessmentRisk(created), message: 'Risco da avaliacao criado com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar risco da avaliacao', meta: { details: error.message } }, error.status || 500);
  }
});

router.put('/assessment-risks/:id', requirePermission('sst:write'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const current = await SstAssessmentRisk.findById(req.params.id);
    if (!current) return sendError(res, { message: 'Risco da avaliacao nao encontrado' }, 404);

    const assessment = await SstRiskAssessment.findById(current.assessmentId).lean();
    if (!assessment) return sendError(res, { message: 'Avaliacao nao encontrada' }, 404);
    if (assessment.status === 'published' || assessment.status === 'superseded') {
      return sendError(res, { message: 'Versao publicada nao pode ser alterada diretamente' }, 409);
    }

    const before = current.toObject();
    const payload = sanitizeRiskPayload(req.body, current);
    if (!payload.factor || !payload.hazard || !payload.damage) {
      return sendError(res, { message: 'factor, hazard e damage sao obrigatorios' }, 400);
    }

    Object.assign(current, payload, { updatedBy: actor });
    await current.save();

    await recordAudit({
      entityType: 'assessment_risk',
      entityId: current._id,
      action: 'update',
      summary: `Risco ${current.hazard} atualizado`,
      before,
      after: current.toObject(),
      meta: { assessmentId: current.assessmentId.toString() },
      actor
    });

    return sendSuccess(res, { data: mapAssessmentRisk(current), message: 'Risco da avaliacao atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar risco da avaliacao', meta: { details: error.message } }, error.status || 500);
  }
});

router.delete('/assessment-risks/:id', requirePermission('sst:write'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const current = await SstAssessmentRisk.findById(req.params.id);
    if (!current) return sendError(res, { message: 'Risco da avaliacao nao encontrado' }, 404);

    const assessment = await SstRiskAssessment.findById(current.assessmentId).lean();
    if (!assessment) return sendError(res, { message: 'Avaliacao nao encontrada' }, 404);
    if (assessment.status === 'published' || assessment.status === 'superseded') {
      return sendError(res, { message: 'Versao publicada nao pode ser alterada diretamente' }, 409);
    }

    await current.deleteOne();
    await recordAudit({
      entityType: 'assessment_risk',
      entityId: current._id,
      action: 'delete',
      summary: `Risco ${current.hazard} removido`,
      before: current.toObject(),
      meta: { assessmentId: current.assessmentId.toString() },
      actor
    });

    return sendSuccess(res, { data: null, message: 'Risco removido com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao remover risco da avaliacao', meta: { details: error.message } }, error.status || 500);
  }
});

router.get('/assessments/:id/conclusion', requirePermission('sst:read'), async (req, res) => {
  try {
    const assessmentId = requireObjectId(req.params.id, 'Avaliacao invalida');
    const conclusion = await SstAssessmentConclusion.findOne({ assessmentId }).lean();
    return sendSuccess(res, { data: conclusion ? mapConclusion(conclusion) : null });
  } catch (error) {
    return sendError(res, { message: 'Erro ao carregar conclusao tecnica', meta: { details: error.message } }, error.status || 500);
  }
});

router.put('/assessments/:id/conclusion', requirePermission('sst:write'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const assessmentId = requireObjectId(req.params.id, 'Avaliacao invalida');
    const assessment = await SstRiskAssessment.findById(assessmentId).lean();
    if (!assessment) return sendError(res, { message: 'Avaliacao nao encontrada' }, 404);
    if (assessment.status === 'published' || assessment.status === 'superseded') {
      return sendError(res, { message: 'Conclusao de avaliacao publicada nao pode ser alterada diretamente' }, 409);
    }

    const current = await SstAssessmentConclusion.findOne({ assessmentId });
    const before = current ? current.toObject() : null;
    const payload = sanitizeConclusionPayload(req.body, current);
    if (!payload.result) return sendError(res, { message: 'Resultado tecnico e obrigatorio' }, 400);

    const next = current || new SstAssessmentConclusion({ assessmentId });
    next.result = payload.result;
    next.basis = payload.basis;
    next.normativeFrame = payload.normativeFrame;
    next.status = 'draft';
    next.hash = '';
    next.signedBy = {};
    next.signedAt = null;
    await next.save();

    await recordAudit({
      entityType: 'assessment_conclusion',
      entityId: next._id,
      action: current ? 'update' : 'create',
      summary: `Conclusao tecnica ${current ? 'atualizada' : 'criada'} para a avaliacao ${assessment.title}`,
      before,
      after: next.toObject(),
      meta: { assessmentId },
      actor
    });

    return sendSuccess(res, { data: mapConclusion(next), message: 'Conclusao tecnica salva com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao salvar conclusao tecnica', meta: { details: error.message } }, error.status || 500);
  }
});

router.post('/assessments/:id/conclusion/sign', requirePermission('sst:sign'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const assessmentId = requireObjectId(req.params.id, 'Avaliacao invalida');
    const assessment = await SstRiskAssessment.findById(assessmentId).lean();
    if (!assessment) return sendError(res, { message: 'Avaliacao nao encontrada' }, 404);

    const conclusion = await SstAssessmentConclusion.findOne({ assessmentId });
    if (!conclusion) return sendError(res, { message: 'Conclusao tecnica nao encontrada' }, 404);
    if (!assessment.responsibleTechnical?.registro) {
      return sendError(res, { message: 'Registro profissional do responsavel tecnico e obrigatorio para assinatura' }, 409);
    }

    conclusion.status = 'signed';
    conclusion.signedBy = actor;
    conclusion.signedAt = new Date();
    conclusion.hash = buildHash({
      assessmentId,
      result: conclusion.result,
      basis: conclusion.basis,
      normativeFrame: conclusion.normativeFrame,
      responsibleTechnical: assessment.responsibleTechnical,
      actor
    });
    await conclusion.save();

    await recordAudit({
      entityType: 'assessment_conclusion',
      entityId: conclusion._id,
      action: 'sign',
      summary: `Conclusao tecnica assinada para a avaliacao ${assessment.title}`,
      after: conclusion.toObject(),
      meta: { assessmentId },
      actor
    });

    return sendSuccess(res, { data: mapConclusion(conclusion), message: 'Conclusao tecnica assinada com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao assinar conclusao tecnica', meta: { details: error.message } }, error.status || 500);
  }
});

router.post('/assessments/:id/publish', requirePermission('sst:approve'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const assessmentId = requireObjectId(req.params.id, 'Avaliacao invalida');
    const bundle = await fetchAssessmentBundle(assessmentId);

    if (bundle.assessment.status !== 'in_review' && bundle.assessment.status !== 'draft') {
      return sendError(res, { message: 'Somente avaliacoes em rascunho ou revisao podem ser publicadas' }, 409);
    }

    ensureAssessmentCanPublish({ risks: bundle.risks, conclusion: bundle.conclusion });

    const previousPublished = await SstRiskAssessment.findOne({
      roleId: bundle.assessment.roleId,
      status: 'published',
      _id: { $ne: bundle.assessment._id }
    });

    if (previousPublished) {
      previousPublished.status = 'superseded';
      previousPublished.updatedBy = actor;
      await previousPublished.save();
    }

    const payload = {
      assessment: bundle.assessment,
      establishment: bundle.establishment,
      sector: bundle.sector,
      role: bundle.role,
      risks: bundle.risks,
      conclusion: bundle.conclusion
    };
    const hash = buildHash(payload);

    await SstAssessmentRevision.create({
      assessmentId: bundle.assessment._id,
      version: bundle.assessment.version,
      status: 'published',
      publishedAt: new Date(),
      publishedBy: actor,
      hash,
      payload
    });

    await SstRiskAssessment.updateOne(
      { _id: bundle.assessment._id },
      {
        $set: {
          status: 'published',
          revisionRequired: false,
          revisionReason: '',
          publicationHash: hash,
          publishedAt: new Date(),
          publishedBy: actor,
          updatedBy: actor,
          updatedAt: new Date()
        }
      }
    );

    await recordAudit({
      entityType: 'assessment',
      entityId: bundle.assessment._id,
      action: 'publish',
      summary: `Avaliacao ${bundle.assessment.title} publicada`,
      meta: { previousPublishedId: previousPublished?._id?.toString?.() || null, publicationHash: hash },
      actor
    });

    return sendSuccess(
      res,
      {
        data: { ...mapAssessment(bundle.assessment), status: 'published', publicationHash: hash },
        meta: { publicationHash: hash },
        message: 'Avaliacao publicada com sucesso'
      }
    );
  } catch (error) {
    return sendError(res, { message: 'Erro ao publicar avaliacao', meta: { details: error.message } }, error.status || 500);
  }
});

const getScopeAssessments = async ({ scopeType, scopeRefId }) => {
  const filter = { status: 'published' };
  const draftFilter = { status: { $in: ['draft', 'in_review'] } };

  if (scopeType === 'assessment') {
    const assessmentId = requireObjectId(scopeRefId, 'assessmentId invalido');
    filter._id = assessmentId;
    draftFilter._id = assessmentId;
  } else if (scopeType === 'sector') {
    const sectorId = requireObjectId(scopeRefId, 'sectorId invalido');
    filter.sectorId = sectorId;
    draftFilter.sectorId = sectorId;
  } else if (scopeType === 'establishment') {
    const establishmentId = requireObjectId(scopeRefId, 'establishmentId invalido');
    filter.establishmentId = establishmentId;
    draftFilter.establishmentId = establishmentId;
  } else {
    throw createRuleError('scopeType invalido', 'DOCUMENT_SCOPE_INVALID', 400);
  }

  const [published, drafts] = await Promise.all([
    SstRiskAssessment.find(filter).sort({ sectorId: 1, roleId: 1, version: -1 }).lean(),
    SstRiskAssessment.find(draftFilter).lean()
  ]);

  if (!published.length) {
    throw createRuleError('Nenhuma avaliacao publicada encontrada no escopo informado', 'DOCUMENT_SCOPE_EMPTY', 404);
  }
  if (drafts.length) {
    throw createRuleError('Existe avaliacao em aberto no escopo informado', 'DOCUMENT_SCOPE_HAS_DRAFTS', 409);
  }

  return published;
};

const buildDocumentSourceBundle = async ({ scopeType, scopeRefId }) => {
  const assessments = await getScopeAssessments({ scopeType, scopeRefId });
  const assessmentIds = assessments.map((assessment) => assessment._id);
  const [risks, conclusions, establishments, sectors, roles] = await Promise.all([
    SstAssessmentRisk.find({ assessmentId: { $in: assessmentIds } }).lean(),
    SstAssessmentConclusion.find({ assessmentId: { $in: assessmentIds } }).lean(),
    SstEstablishment.find({ _id: { $in: assessments.map((item) => item.establishmentId) } }).lean(),
    SstSector.find({ _id: { $in: assessments.map((item) => item.sectorId) } }).lean(),
    SstRole.find({ _id: { $in: assessments.map((item) => item.roleId) } }).lean()
  ]);

  const risksByAssessment = new Map();
  risks.forEach((risk) => {
    const key = String(risk.assessmentId);
    const current = risksByAssessment.get(key) || [];
    current.push(risk);
    risksByAssessment.set(key, current);
  });

  return {
    assessments,
    assessmentIds,
    risks,
    conclusions,
    maps: {
      risksByAssessment,
      conclusionByAssessment: new Map(conclusions.map((item) => [String(item.assessmentId), item])),
      establishmentById: new Map(establishments.map((item) => [String(item._id), item])),
      sectorById: new Map(sectors.map((item) => [String(item._id), item])),
      roleById: new Map(roles.map((item) => [String(item._id), item]))
    }
  };
};

router.get('/documents/readiness', requirePermission('sst:read'), async (req, res) => {
  try {
    const documentType = String(req.query.documentType || '').trim();
    const scopeType = String(req.query.scopeType || '').trim();
    const scopeRefId = String(req.query.scopeRefId || '').trim();

    if (!documentType || !DOCUMENT_TYPES.includes(documentType)) {
      return sendError(res, { message: 'documentType invalido' }, 400);
    }
    if (!scopeType || !DOCUMENT_SCOPE_TYPES.includes(scopeType)) {
      return sendError(res, { message: 'scopeType invalido' }, 400);
    }
    if (!scopeRefId) {
      return sendError(res, { message: 'scopeRefId obrigatorio' }, 400);
    }

    const bundle = await buildDocumentSourceBundle({ scopeType, scopeRefId });
    const readiness = evaluateDocumentReadiness({
      documentType,
      assessments: bundle.assessments,
      risksByAssessment: bundle.maps.risksByAssessment,
      conclusionsByAssessment: bundle.maps.conclusionByAssessment
    });

    return sendSuccess(res, {
      data: {
        documentType,
        scope: { scopeType, scopeRefId },
        emitible: readiness.emitible,
        blocking: readiness.blocking,
        missingFields: readiness.missingFields,
        summary: readiness.summary
      }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao calcular prontidao documental', meta: { details: error.message } }, error.status || 500);
  }
});

router.get('/documents/models', requirePermission('sst:read'), async (req, res) => {
  try {
    await ensureDefaultDocumentModels();

    const filters = {};
    if (req.query.documentType) filters.documentType = String(req.query.documentType).trim();
    if (req.query.active !== undefined) filters.active = req.query.active === 'true';

    const empresaId = String(req.query.empresaId || '').trim();
    if (empresaId) filters.$or = [{ empresaId: '' }, { empresaId }];

    const rows = await SstDocumentModel.find(filters).sort({ empresaId: -1, documentType: 1, title: 1 }).lean();
    return sendSuccess(res, { data: rows.map(mapDocumentModelItem), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar modelos documentais', meta: { details: error.message } }, error.status || 500);
  }
});

router.post('/documents/models', requirePermission('sst:configure'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const payload = sanitizeDocumentModelPayload(req.body);
    if (!payload.code || !payload.title || !payload.documentType) {
      return sendError(res, { message: 'code, title e documentType sao obrigatorios' }, 400);
    }

    const created = await SstDocumentModel.create({
      ...payload,
      isSystem: false,
      createdBy: actor,
      updatedBy: actor
    });

    await recordAudit({
      entityType: 'document_model',
      entityId: created._id,
      action: 'create',
      summary: `Modelo documental ${created.title} criado`,
      after: created.toObject(),
      actor
    });

    return sendSuccess(res, { data: mapDocumentModelItem(created), message: 'Modelo documental criado com sucesso' }, 201);
  } catch (error) {
    const status = error?.code === 11000 ? 409 : error.status || 500;
    const message = error?.code === 11000 ? 'Ja existe modelo com este codigo para a empresa informada' : 'Erro ao criar modelo documental';
    return sendError(res, { message, meta: { details: error.message } }, status);
  }
});

router.put('/documents/models/:id', requirePermission('sst:configure'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const modelId = requireObjectId(req.params.id, 'Modelo documental invalido');
    const current = await SstDocumentModel.findById(modelId);
    if (!current) return sendError(res, { message: 'Modelo documental nao encontrado' }, 404);

    const payload = sanitizeDocumentModelPayload(req.body, current.toObject());
    if (!payload.title) return sendError(res, { message: 'title e obrigatorio' }, 400);

    if (current.isSystem) {
      payload.code = current.code;
      payload.documentType = current.documentType;
      payload.empresaId = current.empresaId;
      payload.isSystem = true;
    }

    const before = current.toObject();
    current.set({
      ...payload,
      updatedBy: actor
    });
    await current.save();

    await recordAudit({
      entityType: 'document_model',
      entityId: current._id,
      action: 'update',
      summary: `Modelo documental ${current.title} atualizado`,
      before,
      after: current.toObject(),
      actor
    });

    return sendSuccess(res, { data: mapDocumentModelItem(current), message: 'Modelo documental atualizado com sucesso' });
  } catch (error) {
    const status = error?.code === 11000 ? 409 : error.status || 500;
    const message = error?.code === 11000 ? 'Ja existe modelo com este codigo para a empresa informada' : 'Erro ao atualizar modelo documental';
    return sendError(res, { message, meta: { details: error.message } }, status);
  }
});

router.get('/documents/templates', requirePermission('sst:read'), async (req, res) => {
  try {
    await ensureDefaultDocumentModels();
    const empresaId = String(req.query.empresaId || '').trim();
    const filters = { active: true };
    if (empresaId) {
      filters.$or = [{ empresaId: '' }, { empresaId }];
    } else {
      filters.empresaId = '';
    }
    const rows = await SstDocumentModel.find(filters).sort({ empresaId: -1, documentType: 1, title: 1 }).lean();

    return sendSuccess(res, {
      data: {
        templates: rows.map(mapDocumentModelItem),
        ppp: {
          title: 'PPP',
          status: 'prepared',
          emitible: false,
          reason: 'Emissao nominal indisponivel ate a camada de trabalhador e historico por periodo.'
        }
      }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar modelos tecnicos', meta: { details: error.message } }, error.status || 500);
  }
});

router.get('/documents/issued', requirePermission('sst:read'), async (req, res) => {
  try {
    await ensureIssuedDocumentIndexes();
    const filters = {};
    if (req.query.documentType) filters.documentType = String(req.query.documentType);
    if (req.query.scopeType) filters.scopeType = String(req.query.scopeType);
    if (req.query.scopeRefId) filters.scopeRefId = String(req.query.scopeRefId);
    if (req.query.empresaId) filters.empresaId = String(req.query.empresaId);
    if (req.query.status) filters.status = String(req.query.status);

    const rows = await SstIssuedTechnicalDocument.find(filters).sort({ updatedAt: -1, createdAt: -1 }).lean();
    const versions = await SstIssuedTechnicalDocumentVersion.find({
      documentId: { $in: rows.map((row) => row._id) }
    }).sort({ version: -1 }).lean();
    const latestVersionMap = new Map();
    versions.forEach((version) => {
      const key = String(version.documentId);
      if (!latestVersionMap.has(key)) latestVersionMap.set(key, version);
    });

    return sendSuccess(res, {
      data: rows.map((row) => mapIssuedDocument(row, latestVersionMap.get(String(row._id)) || null)),
      meta: { total: rows.length }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar documentos tecnicos emitidos', meta: { details: error.message } }, error.status || 500);
  }
});

router.post('/documents/issue', requirePermission('sst:sign'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    await ensureDefaultDocumentModels();
    await ensureIssuedDocumentIndexes();
    const templateCode = String(req.body?.templateCode || '').trim();
    const documentModelId = sanitizeObjectId(req.body?.documentModelId || req.body?.modelId);
    const scopeType = String(req.body?.scopeType || '').trim();
    const scopeRefId = String(req.body?.scopeRefId || '').trim();
    const documentModel = documentModelId
      ? await SstDocumentModel.findById(documentModelId)
      : await SstDocumentModel.findOne({ code: templateCode, empresaId: '', active: true });
    const fallbackModel = !documentModel && templateCode ? findDefaultDocumentModelByCode(templateCode) : null;
    const resolvedModel = documentModel ? mapDocumentModelItem(documentModel) : fallbackModel ? mapDocumentModel(fallbackModel) : null;

    if (!resolvedModel) return sendError(res, { message: 'Modelo documental invalido' }, 400);
    if (!resolvedModel.active) return sendError(res, { message: 'Modelo documental inativo' }, 409);
    if (!resolvedModel.allowedScopeTypes.includes(scopeType)) {
      return sendError(res, { message: 'Modelo documental nao suporta o escopo informado' }, 409);
    }

    const bundle = await buildDocumentSourceBundle({ scopeType, scopeRefId });
    const { assessments, assessmentIds, risks } = bundle;
    const riskByAssessment = bundle.maps.risksByAssessment;
    const conclusionMap = bundle.maps.conclusionByAssessment;
    const establishmentMap = bundle.maps.establishmentById;
    const sectorMap = bundle.maps.sectorById;
    const roleMap = bundle.maps.roleById;

    const readiness = evaluateDocumentReadiness({
      documentType: resolvedModel.documentType,
      assessments,
      risksByAssessment: riskByAssessment,
      conclusionsByAssessment: conclusionMap
    });

    if (readiness.blocking) {
      return sendError(
        res,
        {
          message: 'Documento nao pode ser emitido por pendencias obrigatorias',
          meta: {
            code: 'DOCUMENT_READINESS_BLOCKED',
            documentType: resolvedModel.documentType,
            scope: { scopeType, scopeRefId },
            blocking: true,
            missingFields: readiness.missingFields
          }
        },
        409
      );
    }

    for (const assessment of assessments) {
      const conclusion = conclusionMap.get(String(assessment._id));
      if (!conclusion || conclusion.status !== 'signed') {
        return sendError(res, { message: 'Documento exige conclusoes tecnicas assinadas em todas as avaliacoes de origem' }, 409);
      }
      if (!assessment.responsibleTechnical?.registro) {
        return sendError(res, { message: 'Documento exige RT com registro informado em todas as avaliacoes de origem' }, 409);
      }
    }

    const assessmentContents = assessments.map((assessment) =>
      buildDocumentContent({
        documentType: resolvedModel.documentType,
        model: resolvedModel,
        assessment,
        establishment: establishmentMap.get(String(assessment.establishmentId)) || null,
        sector: sectorMap.get(String(assessment.sectorId)) || null,
        role: roleMap.get(String(assessment.roleId)) || null,
        risks: riskByAssessment.get(String(assessment._id)) || [],
        conclusion: conclusionMap.get(String(assessment._id)) || null,
        editable: {}
      })
    );

    const baseAssessment = assessments[0];
    const requestedEmpresaId = String(req.body?.empresaId || '').trim();
    if (requestedEmpresaId && requestedEmpresaId !== baseAssessment.empresaId) {
      return sendError(res, { message: 'A empresa informada nao corresponde ao escopo das avaliacoes selecionadas' }, 409);
    }
    if (resolvedModel.empresaId && resolvedModel.empresaId !== baseAssessment.empresaId) {
      return sendError(res, { message: 'O modelo selecionado pertence a outra empresa' }, 409);
    }

    const mergedEditable = {
      ...resolvedModel.layers.editable,
      ...normalizeEditableLayer(req.body?.editable || {})
    };
    const title = `${resolvedModel.title} - ${baseAssessment.empresaId} - ${scopeType}`;
    const existingDocument =
      (await SstIssuedTechnicalDocument.findOne({
        documentType: resolvedModel.documentType,
        scopeType,
        scopeRefId,
        documentModelCode: resolvedModel.code
      })) ||
      (await SstIssuedTechnicalDocument.findOne({
        documentType: resolvedModel.documentType,
        scopeType,
        scopeRefId,
        $or: [{ documentModelCode: { $exists: false } }, { documentModelCode: '' }, { documentModelCode: null }]
      }));
    const nextVersion = Number(existingDocument?.latestVersion || 0) + 1;
    const payload = {
      documentModelId: documentModel?._id?.toString?.() || null,
      templateCode: resolvedModel.code,
      documentType: resolvedModel.documentType,
      scopeType,
      scopeRefId,
      sourceAssessmentIds: assessmentIds.map((id) => id.toString()),
      content: {
        model: resolvedModel,
        assessments: assessmentContents,
        editable: mergedEditable,
        annexes: resolvedModel.layers.annexes,
        canonical: {
          readiness: {
            emitible: readiness.emitible,
            blocking: readiness.blocking,
            missingFields: readiness.missingFields,
            summary: readiness.summary
          }
        }
      }
    };
    const hash = hashDocumentPayload(payload);

    const document = existingDocument
      ? await SstIssuedTechnicalDocument.findByIdAndUpdate(
          existingDocument._id,
          {
            $set: {
              latestVersion: nextVersion,
              status: 'issued',
              title,
              documentModelId: documentModel?._id || null,
              documentModelCode: resolvedModel.code,
              documentModelTitle: resolvedModel.title,
              empresaId: baseAssessment.empresaId,
              establishmentId: baseAssessment.establishmentId,
              sectorId: baseAssessment.sectorId
            }
          },
          { new: true }
        )
      : await SstIssuedTechnicalDocument.create({
          documentType: resolvedModel.documentType,
          documentModelId: documentModel?._id || null,
          documentModelCode: resolvedModel.code,
          documentModelTitle: resolvedModel.title,
          scopeType,
          scopeRefId,
          empresaId: baseAssessment.empresaId,
          establishmentId: baseAssessment.establishmentId,
          sectorId: baseAssessment.sectorId,
          title,
          latestVersion: nextVersion,
          status: 'issued'
        });

    await SstIssuedTechnicalDocumentVersion.updateMany(
      { documentId: document._id, status: 'issued' },
      { $set: { status: 'superseded', updatedAt: new Date() } }
    );

    const createdVersion = await SstIssuedTechnicalDocumentVersion.create({
      documentId: document._id,
      documentType: resolvedModel.documentType,
      documentModelId: documentModel?._id || null,
      documentModelTitle: resolvedModel.title,
      version: nextVersion,
      status: 'issued',
      sourceAssessmentIds: assessmentIds,
      hash,
      templateCode: resolvedModel.code,
      summary: {
        assessments: assessments.length,
        risks: risks.length
      },
      content: payload.content,
      issuedAt: new Date(),
      issuedBy: actor
    });

    await recordAudit({
      entityType: 'issued_document',
      entityId: document._id,
      action: 'issue',
      summary: `Documento ${resolvedModel.title} emitido na versao ${nextVersion}`,
      after: createdVersion.toObject(),
      meta: {
        scopeType,
        scopeRefId,
        documentModelCode: resolvedModel.code,
        sourceAssessmentIds: assessmentIds.map((id) => id.toString())
      },
      actor
    });

    return sendSuccess(res, { data: mapIssuedDocument(document, createdVersion), message: 'Documento tecnico emitido com sucesso' }, 201);
  } catch (error) {
    const status = error?.code === 11000 ? 409 : error.status || 500;
    const message =
      error?.code === 11000
        ? 'Conflito ao emitir documento tecnico. A base ainda possuia um indice legado; tente novamente.'
        : 'Erro ao emitir documento tecnico';
    return sendError(res, { message, meta: { details: error.message } }, status);
  }
});

router.get('/documents/issued/:id/pdf', requirePermission('sst:read'), async (req, res) => {
  try {
    const documentId = requireObjectId(req.params.id, 'Documento invalido');
    const document = await SstIssuedTechnicalDocument.findById(documentId).lean();
    if (!document) return sendError(res, { message: 'Documento nao encontrado' }, 404);

    const version = await SstIssuedTechnicalDocumentVersion.findOne({ documentId }).sort({ version: -1 }).lean();
    if (!version) return sendError(res, { message: 'Nenhuma versao emitida encontrada para este documento' }, 404);

    const pdfData = await resolveIssuedDocumentPdfData({ document, version });
    const composedDocument = composeDocumentPayload({ document, version, pdfData });
    const pdfBuffer = await renderIssuedDocumentPdfBuffer({ document, version, pdfData, composedDocument });
    const filename = buildIssuedDocumentPdfFilename(document, version);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    return sendError(res, { message: 'Erro ao gerar PDF do documento tecnico', meta: { details: error.message } }, error.status || 500);
  }
});

router.post('/documents/issued/:id/invalidate', requirePermission('sst:sign'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const documentId = requireObjectId(req.params.id, 'Documento invalido');
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return sendError(res, { message: 'Motivo da invalidacao e obrigatorio' }, 400);

    const document = await SstIssuedTechnicalDocument.findById(documentId);
    if (!document) return sendError(res, { message: 'Documento nao encontrado' }, 404);

    document.status = 'invalidated';
    await document.save();
    await SstIssuedTechnicalDocumentVersion.updateMany(
      { documentId: document._id, status: 'issued' },
      { $set: { status: 'invalidated', updatedAt: new Date() } }
    );

    await recordAudit({
      entityType: 'issued_document',
      entityId: document._id,
      action: 'invalidate',
      summary: `Documento ${document.title} invalidado`,
      meta: { reason },
      actor
    });

    return sendSuccess(res, { data: mapMongoEntity(document), message: 'Documento invalidado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao invalidar documento tecnico', meta: { details: error.message } }, error.status || 500);
  }
});

router.get('/catalogs', requirePermission('sst:read'), async (req, res) => {
  try {
    await ensureDefaultCatalogs();
    const filters = {};
    if (req.query.catalogType) filters.catalogType = String(req.query.catalogType);
    if (req.query.active !== undefined) filters.active = req.query.active === 'true';

    const rows = await SstTechnicalCatalogItem.find(filters).sort({ catalogType: 1, title: 1 }).lean();
    return sendSuccess(res, { data: rows.map(mapCatalogItem), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar catalogos tecnicos', meta: { details: error.message } }, error.status || 500);
  }
});

router.post('/catalogs', requirePermission('sst:configure'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const payload = sanitizeCatalogPayload(req.body);
    if (!payload.catalogType || !payload.code || !payload.title) {
      return sendError(res, { message: 'catalogType, code e title sao obrigatorios' }, 400);
    }

    const created = await SstTechnicalCatalogItem.create({
      ...payload,
      createdBy: actor,
      updatedBy: actor
    });

    await recordAudit({
      entityType: 'catalog',
      entityId: created._id,
      action: 'create',
      summary: `Item ${created.title} criado no catalogo ${created.catalogType}`,
      after: created.toObject(),
      actor
    });

    return sendSuccess(res, { data: mapCatalogItem(created), message: 'Item de catalogo criado com sucesso' }, 201);
  } catch (error) {
    const status = error?.code === 11000 ? 409 : error.status || 500;
    const message = error?.code === 11000 ? 'Ja existe item com este codigo no catalogo' : 'Erro ao criar item de catalogo';
    return sendError(res, { message, meta: { details: error.message } }, status);
  }
});

router.put('/catalogs/:id', requirePermission('sst:configure'), async (req, res) => {
  try {
    const actor = toActor(req.user);
    const current = await SstTechnicalCatalogItem.findById(req.params.id);
    if (!current) return sendError(res, { message: 'Item de catalogo nao encontrado' }, 404);

    const before = current.toObject();
    const payload = sanitizeCatalogPayload(req.body, current);
    if (!payload.catalogType || !payload.code || !payload.title) {
      return sendError(res, { message: 'catalogType, code e title sao obrigatorios' }, 400);
    }

    Object.assign(current, payload, { updatedBy: actor });
    await current.save();

    await recordAudit({
      entityType: 'catalog',
      entityId: current._id,
      action: 'update',
      summary: `Item ${current.title} atualizado no catalogo ${current.catalogType}`,
      before,
      after: current.toObject(),
      actor
    });

    return sendSuccess(res, { data: mapCatalogItem(current), message: 'Item de catalogo atualizado com sucesso' });
  } catch (error) {
    const status = error?.code === 11000 ? 409 : error.status || 500;
    const message = error?.code === 11000 ? 'Ja existe item com este codigo no catalogo' : 'Erro ao atualizar item de catalogo';
    return sendError(res, { message, meta: { details: error.message } }, status);
  }
});

router.get('/audit', requirePermission('sst:read'), async (req, res) => {
  try {
    const filters = {};
    if (req.query.entityType) filters.entityType = String(req.query.entityType);
    if (req.query.entityId) filters.entityId = String(req.query.entityId);
    if (req.query.action) filters.action = String(req.query.action);

    const rows = await SstTechnicalAudit.find(filters)
      .sort({ createdAt: -1 })
      .limit(parseLimit(req.query.limit, 80))
      .lean();

    return sendSuccess(res, { data: rows.map(mapAuditItem), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar auditoria tecnica', meta: { details: error.message } }, error.status || 500);
  }
});

module.exports = router;
