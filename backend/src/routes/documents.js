const express = require('express');
const { Document } = require('../models/legacyEntities');
const { documentTypes, documentCategories } = require('../data/documents');
const { requirePermission } = require('../middleware/rbac');
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
    return sendSuccess(res, { data: buildStats(rows) });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar estatisticas de documentos', meta: { details: error.message } }, 500);
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
