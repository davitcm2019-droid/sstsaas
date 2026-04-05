/**
 * @deprecated Este arquivo faz parte do sistema legado de documentos (ciclos de levantamento).
 * O novo sistema de geracao documental SST esta em /modules/documents/ e exposto em /api/sst/documents/.
 * Manter este arquivo para compatibilidade retroativa ate migracao completa.
 */
const express = require('express');
const mongoose = require('mongoose');
const { Document } = require('../models/legacyEntities');
const { documentTypes, documentCategories } = require('../data/documents');
const { requirePermission } = require('../middleware/rbac');
const {
  DOCUMENT_TEMPLATE_CODES,
  models: { DocumentTemplate, IssuedDocumentVersion, RTSignatureRecord }
} = require('../safety/models');
const {
  DEFAULT_TEMPLATES,
  buildDynamicText,
  buildFixedText,
  countSummary,
  hashPayload
} = require('../safety/documentEngine');
const { createSearchRegex } = require('../utils/regex');
const { isValidObjectId, mapMongoEntity, normalizeRefId } = require('../utils/mongoEntity');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

const parseLimit = (value, fallback = 50) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

const sanitizePayload = (payload = {}, current = null) => ({
  nome: String(payload.nome ?? current?.nome ?? '').trim(),
  descricao: String(payload.descricao ?? current?.descricao ?? '').trim(),
  empresaId: payload.empresaId !== undefined ? normalizeRefId(payload.empresaId) : current?.empresaId || null,
  empresaNome: String(payload.empresaNome ?? current?.empresaNome ?? '').trim(),
  tipo: String(payload.tipo ?? current?.tipo ?? 'documento').trim() || 'documento',
  categoria: String(payload.categoria ?? current?.categoria ?? 'conformidade').trim() || 'conformidade',
  tags: Array.isArray(payload.tags) ? payload.tags.map((tag) => String(tag).trim()).filter(Boolean) : current?.tags || [],
  url: String(payload.url ?? current?.url ?? '').trim(),
  tamanho: Number(payload.tamanho ?? current?.tamanho ?? 0) || 0,
  dataUpload: String(payload.dataUpload ?? current?.dataUpload ?? new Date().toISOString()).trim(),
  status: String(payload.status ?? current?.status ?? 'ativo').trim() || 'ativo',
  versao: String(payload.versao ?? current?.versao ?? '1.0').trim() || '1.0',
  acessos: Number(payload.acessos ?? current?.acessos ?? 0) || 0,
  downloads: Number(payload.downloads ?? current?.downloads ?? 0) || 0
});

const buildStats = (rows) => {
  const stats = {
    total: rows.length,
    porTipo: {},
    porCategoria: {},
    porEmpresa: {},
    totalTamanho: 0,
    totalDownloads: 0,
    totalAcessos: 0
  };

  rows.forEach((doc) => {
    stats.porTipo[doc.tipo] = (stats.porTipo[doc.tipo] || 0) + 1;
    stats.porCategoria[doc.categoria] = (stats.porCategoria[doc.categoria] || 0) + 1;
    stats.porEmpresa[doc.empresaNome || 'Sem empresa'] = (stats.porEmpresa[doc.empresaNome || 'Sem empresa'] || 0) + 1;
    stats.totalTamanho += Number(doc.tamanho || 0);
    stats.totalDownloads += Number(doc.downloads || 0);
    stats.totalAcessos += Number(doc.acessos || 0);
  });

  return stats;
};

const mapTemplate = (doc) => ({
  id: doc._id?.toString(),
  code: doc.code,
  documentType: doc.documentType,
  title: doc.title,
  version: doc.version,
  active: Boolean(doc.active),
  builtIn: Boolean(doc.builtIn),
  layers: doc.layers || { fixed: '', dynamic: '', editable: '' },
  updatedBy: doc.updatedBy || null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const mapIssuedDocument = (doc) => ({
  id: doc._id?.toString(),
  cycleId: doc.cycleId?.toString(),
  snapshotId: doc.snapshotId?.toString(),
  previousIssuedDocumentId: doc.previousIssuedDocumentId?.toString() || null,
  signatureRecordId: doc.signatureRecordId?.toString() || null,
  templateCode: doc.templateCode,
  documentType: doc.documentType,
  empresaId: doc.empresaId,
  unidade: doc.unidade,
  estabelecimento: doc.estabelecimento,
  title: doc.title,
  version: doc.version,
  status: doc.status,
  hash: doc.hash,
  contentLayers: doc.contentLayers || {},
  sourceSummary: doc.sourceSummary || {},
  responsibleTechnical: doc.responsibleTechnical || {},
  issuedBy: doc.issuedBy || null,
  issuedAt: doc.issuedAt,
  invalidatedAt: doc.invalidatedAt || null,
  invalidatedBy: doc.invalidatedBy || null,
  invalidationReason: doc.invalidationReason || '',
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const toActor = (user = {}) => ({
  id: user?.id || user?._id?.toString?.() || null,
  nome: user?.nome || user?.name || '',
  email: user?.email || '',
  perfil: user?.perfil || ''
});

const ensureDefaultTemplates = async () => {
  const existingCodes = await DocumentTemplate.find({ code: { $in: DOCUMENT_TEMPLATE_CODES } }).distinct('code');
  const missing = DEFAULT_TEMPLATES.filter((template) => !existingCodes.includes(template.code));
  if (!missing.length) return;

  await DocumentTemplate.insertMany(
    missing.map((template) => ({
      ...template,
      active: true,
      builtIn: true
    })),
    { ordered: false }
  );
};

const getRiskSurveyModels = () => {
  const RiskSurveyCycle = mongoose.models.RiskSurveyCycle;
  const RiskSurveyCycleSnapshot = mongoose.models.RiskSurveyCycleSnapshot;

  if (!RiskSurveyCycle || !RiskSurveyCycleSnapshot) {
    const error = new Error('Modelos de levantamento ainda nao foram carregados');
    error.status = 500;
    throw error;
  }

  return { RiskSurveyCycle, RiskSurveyCycleSnapshot };
};

const sanitizeTemplatePayload = (payload = {}, current = null) => ({
  title: String(payload.title ?? current?.title ?? '').trim(),
  active: payload.active !== undefined ? Boolean(payload.active) : Boolean(current?.active ?? true),
  layers: {
    fixed: String(payload.layers?.fixed ?? current?.layers?.fixed ?? '').trim(),
    dynamic: String(payload.layers?.dynamic ?? current?.layers?.dynamic ?? '').trim(),
    editable: String(payload.layers?.editable ?? current?.layers?.editable ?? '').trim()
  }
});

const sanitizeEditableLayer = (payload = {}) => ({
  resumo: String(payload.resumo ?? payload.summary ?? '').trim(),
  notas: String(payload.notas ?? payload.notes ?? '').trim(),
  ressalvas: String(payload.ressalvas ?? '').trim()
});

router.get('/types', requirePermission('documents:read'), (req, res) => {
  try {
    return sendSuccess(res, { data: documentTypes });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar tipos de documento', meta: { details: error.message } }, 500);
  }
});

router.get('/categories', requirePermission('documents:read'), (req, res) => {
  try {
    return sendSuccess(res, { data: documentCategories });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar categorias de documento', meta: { details: error.message } }, 500);
  }
});

router.get('/stats', requirePermission('documents:read'), async (req, res) => {
  try {
    const rows = await Document.find({}).lean();
    const issued = await IssuedDocumentVersion.find({}).lean();
    const stats = buildStats(rows);
    stats.emitidos = {
      total: issued.length,
      ativos: issued.filter((item) => item.status === 'active').length,
      invalidados: issued.filter((item) => item.status === 'invalidated').length,
      substituidos: issued.filter((item) => item.status === 'superseded').length
    };
    return sendSuccess(res, { data: stats });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar estatisticas de documentos', meta: { details: error.message } }, 500);
  }
});

router.get('/templates', requirePermission('documents:read'), async (req, res) => {
  try {
    await ensureDefaultTemplates();
    const templates = await DocumentTemplate.find({})
      .sort({ builtIn: -1, documentType: 1, title: 1 })
      .lean();

    return sendSuccess(res, { data: templates.map(mapTemplate), meta: { total: templates.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar templates documentais', meta: { details: error.message } }, error.status || 500);
  }
});

router.put('/templates/:code', requirePermission('documents:write'), async (req, res) => {
  try {
    await ensureDefaultTemplates();

    const code = String(req.params.code || '').trim();
    if (!DOCUMENT_TEMPLATE_CODES.includes(code)) {
      return sendError(res, { message: 'Template documental invalido' }, 400);
    }

    const current = await DocumentTemplate.findOne({ code });
    if (!current) return sendError(res, { message: 'Template nao encontrado' }, 404);

    const payload = sanitizeTemplatePayload(req.body, current);
    if (!payload.title) {
      return sendError(res, { message: 'Titulo do template e obrigatorio' }, 400);
    }

    current.title = payload.title;
    current.active = payload.active;
    current.layers = payload.layers;
    current.version = Number(current.version || 1) + 1;
    current.updatedBy = toActor(req.user);
    await current.save();

    return sendSuccess(res, { data: mapTemplate(current.toObject()), message: 'Template documental atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar template documental', meta: { details: error.message } }, error.status || 500);
  }
});

router.get('/issued', requirePermission('documents:read'), async (req, res) => {
  try {
    const filters = {};
    const { empresaId, cycleId, documentType, templateCode, status, search, limit } = req.query;

    if (empresaId) filters.empresaId = String(empresaId);
    if (cycleId && isValidObjectId(cycleId)) filters.cycleId = cycleId;
    if (documentType) filters.documentType = String(documentType);
    if (templateCode) filters.templateCode = String(templateCode);
    if (status) filters.status = String(status);
    if (search) {
      const term = createSearchRegex(search);
      if (term) {
        filters.$or = [{ title: term }, { documentType: term }, { templateCode: term }];
      }
    }

    const rows = await IssuedDocumentVersion.find(filters)
      .sort({ issuedAt: -1, createdAt: -1 })
      .limit(parseLimit(limit))
      .lean();

    return sendSuccess(res, { data: rows.map(mapIssuedDocument), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar documentos emitidos', meta: { details: error.message } }, error.status || 500);
  }
});

router.post('/issue', requirePermission('documents:issue'), async (req, res) => {
  try {
    await ensureDefaultTemplates();

    const cycleId = normalizeRefId(req.body?.cycleId);
    const templateCode = String(req.body?.templateCode || '').trim();
    const issueJustification = String(req.body?.issueJustification || '').trim();
    const editableLayer = sanitizeEditableLayer(req.body?.editableContent);

    if (!cycleId || !isValidObjectId(cycleId)) {
      return sendError(res, { message: 'cycleId e obrigatorio' }, 400);
    }
    if (!DOCUMENT_TEMPLATE_CODES.includes(templateCode)) {
      return sendError(res, { message: 'templateCode invalido' }, 400);
    }

    const { RiskSurveyCycle, RiskSurveyCycleSnapshot } = getRiskSurveyModels();
    const [cycle, template, snapshot] = await Promise.all([
      RiskSurveyCycle.findById(cycleId).lean(),
      DocumentTemplate.findOne({ code: templateCode, active: true }).lean(),
      RiskSurveyCycleSnapshot.findOne({ cycleId }).sort({ createdAt: -1 }).lean()
    ]);

    if (!cycle) return sendError(res, { message: 'Ciclo nao encontrado' }, 404);
    if (!snapshot) return sendError(res, { message: 'Snapshot publicado do ciclo nao encontrado' }, 404);
    if (cycle.status !== 'published') {
      return sendError(res, { message: 'Somente ciclos publicados podem emitir documentos' }, 409);
    }
    if (!cycle.responsibleTechnical?.registro) {
      return sendError(res, { message: 'Registro profissional do RT e obrigatorio para emissao' }, 409);
    }

    const overdueActions = (snapshot.payload?.actionPlanItems || []).filter((item) => {
      if (!item?.prazo || item?.status === 'concluida' || item?.status === 'cancelada') return false;
      const parsed = new Date(item.prazo);
      return !Number.isNaN(parsed.getTime()) && parsed.getTime() < Date.now();
    });

    if (overdueActions.length > 0 && !issueJustification) {
      return sendError(
        res,
        {
          message: 'Existem acoes vencidas no escopo do documento. Informe justificativa para seguir.',
          meta: { overdueActions: overdueActions.map((item) => item.id) }
        },
        409
      );
    }

    const scopeFilters = {
      empresaId: cycle.empresaId,
      unidade: cycle.unidade,
      estabelecimento: cycle.estabelecimento,
      documentType: template.documentType
    };

    const previousActive = await IssuedDocumentVersion.findOne({
      ...scopeFilters,
      status: 'active'
    })
      .sort({ version: -1, issuedAt: -1 })
      .lean();

    const latestVersion = await IssuedDocumentVersion.findOne(scopeFilters).sort({ version: -1 }).lean();
    const nextVersion = Number(latestVersion?.version || 0) + 1;

    const cycleLabel = cycle.title || `Levantamento ${cycle.estabelecimento}`;
    const title = `${template.title} - ${cycleLabel}`;
    const fixedText = buildFixedText({ cycle, template });
    const dynamicText = buildDynamicText(snapshot.payload, template.code);
    const sourceSummary = countSummary(snapshot.payload);
    const contentLayers = {
      fixed: {
        templateVersion: template.version,
        text: fixedText
      },
      dynamic: {
        templateVersion: template.version,
        text: dynamicText
      },
      editable: editableLayer
    };

    const integrityPayload = {
      cycleId,
      snapshotId: snapshot._id.toString(),
      templateCode,
      documentType: template.documentType,
      version: nextVersion,
      contentLayers,
      sourceSummary,
      responsibleTechnical: cycle.responsibleTechnical
    };

    const hash = hashPayload(integrityPayload);
    const signatureRecord = await RTSignatureRecord.create({
      entityType: 'issued_document',
      entityId: `pending:${cycleId}:${templateCode}:${nextVersion}`,
      reason: 'document_issue',
      hash,
      signer: toActor(req.user),
      signedAt: new Date()
    });

    const created = await IssuedDocumentVersion.create({
      cycleId: cycle._id,
      snapshotId: snapshot._id,
      previousIssuedDocumentId: previousActive?._id || null,
      signatureRecordId: signatureRecord._id,
      templateCode: template.code,
      documentType: template.documentType,
      empresaId: cycle.empresaId,
      unidade: cycle.unidade,
      estabelecimento: cycle.estabelecimento,
      title,
      version: nextVersion,
      status: 'active',
      hash,
      contentLayers,
      sourceSummary,
      responsibleTechnical: cycle.responsibleTechnical,
      issuedBy: toActor(req.user),
      issuedAt: new Date()
    });

    if (previousActive?._id) {
      await IssuedDocumentVersion.updateOne(
        { _id: previousActive._id },
        {
          $set: {
            status: 'superseded',
            updatedAt: new Date()
          }
        }
      );
    }

    await RTSignatureRecord.updateOne(
      { _id: signatureRecord._id },
      { $set: { entityId: created._id.toString() } }
    );

    await RiskSurveyCycle.updateOne(
      { _id: cycle._id },
      { $set: { documentImpactStatus: 'reemitido', updatedAt: new Date() } }
    );

    return sendSuccess(
      res,
      {
        data: mapIssuedDocument(created.toObject()),
        meta: { issueJustification, overdueActions: overdueActions.length },
        message: 'Documento emitido com sucesso'
      },
      201
    );
  } catch (error) {
    return sendError(res, { message: 'Erro ao emitir documento', meta: { details: error.message } }, error.status || 500);
  }
});

router.get('/issued/:id', requirePermission('documents:read'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Documento emitido nao encontrado' }, 404);
    const row = await IssuedDocumentVersion.findById(req.params.id).lean();
    if (!row) return sendError(res, { message: 'Documento emitido nao encontrado' }, 404);
    return sendSuccess(res, { data: mapIssuedDocument(row) });
  } catch (error) {
    return sendError(res, { message: 'Erro ao carregar documento emitido', meta: { details: error.message } }, error.status || 500);
  }
});

router.post('/issued/:id/invalidate', requirePermission('documents:invalidate'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Documento emitido nao encontrado' }, 404);

    const current = await IssuedDocumentVersion.findById(req.params.id);
    if (!current) return sendError(res, { message: 'Documento emitido nao encontrado' }, 404);
    if (current.status !== 'active') {
      return sendError(res, { message: 'Somente documentos ativos podem ser invalidados' }, 409);
    }

    const reason = String(req.body?.reason || '').trim();
    if (!reason) {
      return sendError(res, { message: 'Motivo da invalidacao e obrigatorio' }, 400);
    }

    current.status = 'invalidated';
    current.invalidatedAt = new Date();
    current.invalidatedBy = toActor(req.user);
    current.invalidationReason = reason;
    await current.save();

    return sendSuccess(res, { data: mapIssuedDocument(current.toObject()), message: 'Documento invalidado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao invalidar documento emitido', meta: { details: error.message } }, error.status || 500);
  }
});

router.get('/', requirePermission('documents:read'), async (req, res) => {
  try {
    const { empresaId, tipo, categoria, search, limit } = req.query;
    const filters = {};

    if (empresaId) filters.empresaId = String(empresaId);
    if (tipo) filters.tipo = String(tipo);
    if (categoria) filters.categoria = String(categoria);
    if (search) {
      const term = createSearchRegex(search);
      if (term) {
        filters.$or = [{ nome: term }, { descricao: term }, { tags: term }];
      }
    }

    const rows = await Document.find(filters)
      .sort({ dataUpload: -1, createdAt: -1 })
      .limit(parseLimit(limit))
      .lean();

    return sendSuccess(res, { data: rows.map(mapMongoEntity), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar documentos', meta: { details: error.message } }, 500);
  }
});

router.post('/', requirePermission('documents:write'), async (req, res) => {
  try {
    const payload = sanitizePayload(req.body);
    if (!payload.nome || !payload.empresaId || !payload.tipo || !payload.categoria) {
      return sendError(res, { message: 'nome, empresaId, tipo e categoria sao obrigatorios' }, 400);
    }

    const created = await Document.create(payload);
    return sendSuccess(res, { data: mapMongoEntity(created.toObject()), message: 'Documento criado com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar documento', meta: { details: error.message } }, 500);
  }
});

router.post('/:id/download', requirePermission('documents:read'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Documento nao encontrado' }, 404);
    const updated = await Document.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } }, { new: true }).lean();
    if (!updated) return sendError(res, { message: 'Documento nao encontrado' }, 404);
    return sendSuccess(res, { data: mapMongoEntity(updated), message: 'Download registrado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao registrar download', meta: { details: error.message } }, 500);
  }
});

router.get('/:id', requirePermission('documents:read'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Documento nao encontrado' }, 404);
    const updated = await Document.findByIdAndUpdate(req.params.id, { $inc: { acessos: 1 } }, { new: true }).lean();
    if (!updated) return sendError(res, { message: 'Documento nao encontrado' }, 404);
    return sendSuccess(res, { data: mapMongoEntity(updated) });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar documento', meta: { details: error.message } }, 500);
  }
});

router.put('/:id', requirePermission('documents:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Documento nao encontrado' }, 404);
    const current = await Document.findById(req.params.id).lean();
    if (!current) return sendError(res, { message: 'Documento nao encontrado' }, 404);

    const payload = sanitizePayload(req.body, current);
    if (!payload.nome || !payload.empresaId || !payload.tipo || !payload.categoria) {
      return sendError(res, { message: 'nome, empresaId, tipo e categoria sao obrigatorios' }, 400);
    }

    const updated = await Document.findByIdAndUpdate(req.params.id, payload, { new: true }).lean();
    return sendSuccess(res, { data: mapMongoEntity(updated), message: 'Documento atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar documento', meta: { details: error.message } }, 500);
  }
});

router.delete('/:id', requirePermission('documents:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Documento nao encontrado' }, 404);
    const deleted = await Document.findByIdAndDelete(req.params.id);
    if (!deleted) return sendError(res, { message: 'Documento nao encontrado' }, 404);
    return sendSuccess(res, { data: null, message: 'Documento deletado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao deletar documento', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
