const express = require('express');
const { auditLogs, getAuditLogsByEntity, getAuditLogsByUser } = require('../data/auditLog');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// GET /api/audit - Listar logs de auditoria
router.get('/', (req, res) => {
  try {
    const { entityType, entityId, userId, action, limit = 50 } = req.query;
    let filteredLogs = [...auditLogs];

    if (entityType) {
      filteredLogs = filteredLogs.filter((log) => log.entityType === entityType);
    }

    if (entityId) {
      filteredLogs = filteredLogs.filter((log) => log.entityId === parseInt(entityId, 10));
    }

    if (userId) {
      filteredLogs = filteredLogs.filter((log) => log.userId === parseInt(userId, 10));
    }

    if (action) {
      filteredLogs = filteredLogs.filter((log) => log.action === action);
    }

    filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const parsedLimit = parseInt(limit, 10);
    if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
      filteredLogs = filteredLogs.slice(0, parsedLimit);
    }

    return sendSuccess(res, { data: filteredLogs, meta: { total: filteredLogs.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar logs de auditoria', meta: { details: error.message } }, 500);
  }
});

// GET /api/audit/entity/:type/:id - Buscar logs por entidade
router.get('/entity/:type/:id(\\d+)', (req, res) => {
  try {
    const { type, id } = req.params;
    const logs = getAuditLogsByEntity(type, id);

    return sendSuccess(res, { data: logs, meta: { total: logs.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar logs da entidade', meta: { details: error.message } }, 500);
  }
});

// GET /api/audit/user/:id - Buscar logs por usuário
router.get('/user/:id(\\d+)', (req, res) => {
  try {
    const { id } = req.params;
    const logs = getAuditLogsByUser(id);

    return sendSuccess(res, { data: logs, meta: { total: logs.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar logs do usuário', meta: { details: error.message } }, 500);
  }
});

// GET /api/audit/stats - Estatísticas de auditoria
router.get('/stats', (req, res) => {
  try {
    const stats = {
      totalLogs: auditLogs.length,
      actions: {
        created: auditLogs.filter((log) => log.action === 'created').length,
        updated: auditLogs.filter((log) => log.action === 'updated').length,
        deleted: auditLogs.filter((log) => log.action === 'deleted').length
      },
      entities: {
        empresa: auditLogs.filter((log) => log.entityType === 'empresa').length,
        tarefa: auditLogs.filter((log) => log.entityType === 'tarefa').length,
        risco: auditLogs.filter((log) => log.entityType === 'risco').length,
        usuario: auditLogs.filter((log) => log.entityType === 'usuario').length
      },
      recentActivity: [...auditLogs]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10)
    };

    return sendSuccess(res, { data: stats });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar estatísticas de auditoria', meta: { details: error.message } }, 500);
  }
});

module.exports = router;

