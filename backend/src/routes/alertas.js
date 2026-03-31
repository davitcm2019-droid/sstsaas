const express = require('express');
const { Alert } = require('../models/legacyEntities');
const { requirePermission } = require('../middleware/rbac');
const { isValidObjectId, mapMongoEntity, normalizeRefId } = require('../utils/mongoEntity');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

const sanitizeAlertPayload = (payload = {}, current = null) => ({
  titulo: String(payload.titulo ?? current?.titulo ?? '').trim(),
  descricao: String(payload.descricao ?? current?.descricao ?? '').trim(),
  empresaId: payload.empresaId !== undefined ? normalizeRefId(payload.empresaId) : current?.empresaId || null,
  tipo: String(payload.tipo ?? current?.tipo ?? '').trim(),
  prioridade: String(payload.prioridade ?? current?.prioridade ?? 'media').trim() || 'media',
  status: String(payload.status ?? current?.status ?? 'ativo').trim() || 'ativo',
  dataCriacao: String(payload.dataCriacao ?? current?.dataCriacao ?? new Date().toISOString().split('T')[0]).trim()
});

router.get('/', requirePermission('alerts:read'), async (req, res) => {
  try {
    const { empresaId, tipo, prioridade, status } = req.query;
    const filters = {};

    if (empresaId) filters.empresaId = String(empresaId);
    if (tipo) filters.tipo = String(tipo);
    if (prioridade) filters.prioridade = String(prioridade);
    if (status) filters.status = String(status);

    const rows = await Alert.find(filters).sort({ createdAt: -1 }).lean();
    return sendSuccess(res, { data: rows.map(mapMongoEntity), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar alertas', meta: { details: error.message } }, 500);
  }
});

router.get('/:id', requirePermission('alerts:read'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Alerta nao encontrado' }, 404);
    const alert = await Alert.findById(req.params.id).lean();
    if (!alert) return sendError(res, { message: 'Alerta nao encontrado' }, 404);
    return sendSuccess(res, { data: mapMongoEntity(alert) });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar alerta', meta: { details: error.message } }, 500);
  }
});

router.post('/', requirePermission('alerts:write'), async (req, res) => {
  try {
    const payload = sanitizeAlertPayload(req.body);
    if (!payload.titulo || !payload.descricao) {
      return sendError(res, { message: 'titulo e descricao sao obrigatorios' }, 400);
    }

    const created = await Alert.create(payload);
    return sendSuccess(res, { data: mapMongoEntity(created.toObject()), message: 'Alerta criado com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar alerta', meta: { details: error.message } }, 500);
  }
});

router.put('/:id', requirePermission('alerts:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Alerta nao encontrado' }, 404);
    const current = await Alert.findById(req.params.id).lean();
    if (!current) return sendError(res, { message: 'Alerta nao encontrado' }, 404);

    const payload = sanitizeAlertPayload(req.body, current);
    if (!payload.titulo || !payload.descricao) {
      return sendError(res, { message: 'titulo e descricao sao obrigatorios' }, 400);
    }

    const updated = await Alert.findByIdAndUpdate(req.params.id, payload, { new: true }).lean();
    return sendSuccess(res, { data: mapMongoEntity(updated), message: 'Alerta atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar alerta', meta: { details: error.message } }, 500);
  }
});

router.delete('/:id', requirePermission('alerts:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Alerta nao encontrado' }, 404);
    const deleted = await Alert.findByIdAndDelete(req.params.id);
    if (!deleted) return sendError(res, { message: 'Alerta nao encontrado' }, 404);
    return sendSuccess(res, { data: null, message: 'Alerta deletado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao deletar alerta', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
