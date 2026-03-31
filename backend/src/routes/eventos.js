const express = require('express');
const { Event } = require('../models/legacyEntities');
const { requirePermission } = require('../middleware/rbac');
const { isValidObjectId, mapMongoEntity, normalizeRefId } = require('../utils/mongoEntity');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

const sanitizeEventPayload = (payload = {}, current = null) => ({
  titulo: String(payload.titulo ?? current?.titulo ?? '').trim(),
  descricao: String(payload.descricao ?? current?.descricao ?? '').trim(),
  empresaId: payload.empresaId !== undefined ? normalizeRefId(payload.empresaId) : current?.empresaId || null,
  responsavel: String(payload.responsavel ?? current?.responsavel ?? '').trim(),
  prioridade: String(payload.prioridade ?? current?.prioridade ?? 'media').trim() || 'media',
  tipo: String(payload.tipo ?? current?.tipo ?? 'evento').trim() || 'evento',
  status: String(payload.status ?? current?.status ?? 'pendente').trim() || 'pendente',
  dataEvento: String(payload.dataEvento ?? current?.dataEvento ?? '').trim(),
  horaEvento: String(payload.horaEvento ?? current?.horaEvento ?? '').trim()
});

router.get('/', requirePermission('events:read'), async (req, res) => {
  try {
    const filters = {};

    if (req.query.empresaId) filters.empresaId = String(req.query.empresaId);
    if (req.query.tipo) filters.tipo = String(req.query.tipo);
    if (req.query.status) filters.status = String(req.query.status);

    const rows = await Event.find(filters).sort({ dataEvento: 1, horaEvento: 1, createdAt: -1 }).lean();
    return sendSuccess(res, { data: rows.map(mapMongoEntity), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar eventos', meta: { details: error.message } }, 500);
  }
});

router.get('/:id', requirePermission('events:read'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Evento nao encontrado' }, 404);
    const event = await Event.findById(req.params.id).lean();
    if (!event) return sendError(res, { message: 'Evento nao encontrado' }, 404);
    return sendSuccess(res, { data: mapMongoEntity(event) });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar evento', meta: { details: error.message } }, 500);
  }
});

router.post('/', requirePermission('events:write'), async (req, res) => {
  try {
    const payload = sanitizeEventPayload(req.body);
    if (!payload.titulo || !payload.empresaId || !payload.dataEvento) {
      return sendError(res, { message: 'titulo, empresaId e dataEvento sao obrigatorios' }, 400);
    }

    const created = await Event.create(payload);
    return sendSuccess(res, { data: mapMongoEntity(created.toObject()), message: 'Evento criado com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar evento', meta: { details: error.message } }, 500);
  }
});

router.put('/:id', requirePermission('events:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Evento nao encontrado' }, 404);
    const current = await Event.findById(req.params.id).lean();
    if (!current) return sendError(res, { message: 'Evento nao encontrado' }, 404);

    const payload = sanitizeEventPayload(req.body, current);
    if (!payload.titulo || !payload.empresaId || !payload.dataEvento) {
      return sendError(res, { message: 'titulo, empresaId e dataEvento sao obrigatorios' }, 400);
    }

    const updated = await Event.findByIdAndUpdate(req.params.id, payload, { new: true }).lean();
    return sendSuccess(res, { data: mapMongoEntity(updated), message: 'Evento atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar evento', meta: { details: error.message } }, 500);
  }
});

router.delete('/:id', requirePermission('events:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Evento nao encontrado' }, 404);
    const deleted = await Event.findByIdAndDelete(req.params.id);
    if (!deleted) return sendError(res, { message: 'Evento nao encontrado' }, 404);
    return sendSuccess(res, { data: null, message: 'Evento excluido com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao excluir evento', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
