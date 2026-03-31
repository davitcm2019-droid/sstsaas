const express = require('express');
const { AuditLog } = require('../models/legacyEntities');
const { requirePermission } = require('../middleware/rbac');
const { mapMongoEntity } = require('../utils/mongoEntity');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

const parseLimit = (value, fallback = 50) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

router.get('/', requirePermission('audit:read'), async (req, res) => {
  try {
    const { entityType, entityId, userId, action, limit = 50 } = req.query;
    const filters = {};

    if (entityType) filters.entityType = String(entityType);
    if (entityId) filters.entityId = String(entityId);
    if (userId) filters.userId = String(userId);
    if (action) filters.action = String(action);

    const rows = await AuditLog.find(filters)
      .sort({ timestamp: -1 })
      .limit(parseLimit(limit))
      .lean();

    return sendSuccess(res, { data: rows.map(mapMongoEntity), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar logs de auditoria', meta: { details: error.message } }, 500);
  }
});

router.get('/entity/:type/:id', requirePermission('audit:read'), async (req, res) => {
  try {
    const rows = await AuditLog.find({ entityType: req.params.type, entityId: String(req.params.id) })
      .sort({ timestamp: -1 })
      .lean();

    return sendSuccess(res, { data: rows.map(mapMongoEntity), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar logs da entidade', meta: { details: error.message } }, 500);
  }
});

router.get('/user/:id', requirePermission('audit:read'), async (req, res) => {
  try {
    const rows = await AuditLog.find({ userId: String(req.params.id) }).sort({ timestamp: -1 }).lean();
    return sendSuccess(res, { data: rows.map(mapMongoEntity), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar logs do usuario', meta: { details: error.message } }, 500);
  }
});

router.get('/stats', requirePermission('audit:read'), async (req, res) => {
  try {
    const rows = await AuditLog.find({}).lean();
    const stats = {
      totalLogs: rows.length,
      actions: {
        created: rows.filter((log) => log.action === 'created').length,
        updated: rows.filter((log) => log.action === 'updated').length,
        deleted: rows.filter((log) => log.action === 'deleted').length
      },
      entities: {},
      recentActivity: rows
        .map(mapMongoEntity)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10)
    };

    rows.forEach((log) => {
      stats.entities[log.entityType] = (stats.entities[log.entityType] || 0) + 1;
    });

    return sendSuccess(res, { data: stats });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar estatisticas de auditoria', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
