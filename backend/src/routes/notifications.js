const express = require('express');
const { Notification } = require('../models/legacyEntities');
const { notificationTypes } = require('../data/notifications');
const { requirePermission } = require('../middleware/rbac');
const { isValidObjectId, mapMongoEntity, normalizeRefId } = require('../utils/mongoEntity');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

const parseLimit = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
};

const mapNotification = (doc) => {
  const mapped = mapMongoEntity(doc);
  if (!mapped) return null;
  return {
    ...mapped,
    createdAt: mapped.createdAt ? new Date(mapped.createdAt).toISOString() : new Date().toISOString()
  };
};

const sanitizePayload = (payload = {}, current = null) => ({
  userId: payload.userId !== undefined ? normalizeRefId(payload.userId) : current?.userId || null,
  title: String(payload.title ?? current?.title ?? '').trim(),
  message: String(payload.message ?? current?.message ?? '').trim(),
  type: String(payload.type ?? current?.type ?? '').trim(),
  priority: String(payload.priority ?? current?.priority ?? 'medium').trim() || 'medium',
  read: payload.read !== undefined ? Boolean(payload.read) : Boolean(current?.read),
  expiresAt: String(payload.expiresAt ?? current?.expiresAt ?? '').trim()
});

const applyUserFilters = async ({ userId, unreadOnly, type, limit }) => {
  const filters = {};
  if (userId) filters.userId = String(userId);
  if (unreadOnly === true) filters.read = false;
  if (type) filters.type = String(type);

  let query = Notification.find(filters).sort({ createdAt: -1 });
  const parsedLimit = parseLimit(limit);
  if (parsedLimit) query = query.limit(parsedLimit);

  const rows = await query.lean();
  return rows.map(mapNotification);
};

router.get('/', requirePermission('notifications:read'), async (req, res) => {
  try {
    const rows = await applyUserFilters({
      userId: req.query.userId,
      unreadOnly: req.query.unreadOnly === 'true',
      type: req.query.type,
      limit: req.query.limit
    });

    return sendSuccess(res, { data: rows, meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar notificacoes', meta: { details: error.message } }, 500);
  }
});

router.get('/user/:userId', requirePermission('notifications:read'), async (req, res) => {
  try {
    const rows = await applyUserFilters({
      userId: req.params.userId,
      unreadOnly: req.query.unreadOnly === 'true',
      type: req.query.type,
      limit: req.query.limit
    });

    return sendSuccess(res, { data: rows, meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar notificacoes do usuario', meta: { details: error.message } }, 500);
  }
});

router.get('/types', requirePermission('notifications:read'), (req, res) => {
  try {
    return sendSuccess(res, { data: notificationTypes });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar tipos de notificacao', meta: { details: error.message } }, 500);
  }
});

router.get('/stats', requirePermission('notifications:read'), async (req, res) => {
  try {
    const rows = await Notification.find({}).lean();
    const stats = {
      total: rows.length,
      unread: rows.filter((item) => !item.read).length,
      read: rows.filter((item) => item.read).length,
      porTipo: {},
      recentes: rows
        .map(mapNotification)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
    };

    rows.forEach((notification) => {
      stats.porTipo[notification.type] = (stats.porTipo[notification.type] || 0) + 1;
    });

    return sendSuccess(res, { data: stats });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar estatisticas de notificacoes', meta: { details: error.message } }, 500);
  }
});

router.post('/', requirePermission('notifications:write'), async (req, res) => {
  try {
    const payload = sanitizePayload(req.body);
    if (!payload.userId || !payload.type || !payload.message) {
      return sendError(res, { message: 'userId, type e message sao obrigatorios' }, 400);
    }

    if (!payload.title) {
      payload.title = notificationTypes[payload.type]?.name || 'Notificacao';
    }

    const created = await Notification.create(payload);
    return sendSuccess(res, { data: mapNotification(created.toObject()), message: 'Notificacao criada com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar notificacao', meta: { details: error.message } }, 500);
  }
});

router.put('/:id/read', requirePermission('notifications:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Notificacao nao encontrada' }, 404);
    const updated = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true }).lean();
    if (!updated) return sendError(res, { message: 'Notificacao nao encontrada' }, 404);
    return sendSuccess(res, { data: mapNotification(updated), message: 'Notificacao marcada como lida' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao marcar notificacao como lida', meta: { details: error.message } }, 500);
  }
});

router.post('/generate-smart', requirePermission('notifications:write'), async (req, res) => {
  try {
    return sendSuccess(res, { data: [], message: 'Nenhuma notificacao inteligente gerada' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao gerar notificacoes inteligentes', meta: { details: error.message } }, 500);
  }
});

router.delete('/cleanup', requirePermission('notifications:write'), async (req, res) => {
  try {
    const now = new Date().toISOString();
    const result = await Notification.deleteMany({ expiresAt: { $ne: '', $lt: now } });
    return sendSuccess(res, {
      data: { removedCount: result.deletedCount || 0 },
      message: `${result.deletedCount || 0} notificacoes expiradas removidas`
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao limpar notificacoes expiradas', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
