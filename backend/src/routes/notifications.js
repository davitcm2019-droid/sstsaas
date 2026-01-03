const express = require('express');
const {
  notifications,
  notificationTypes,
  getNotificationsByUser,
  createNotification,
  markAsRead,
  generateSmartNotifications,
  cleanExpiredNotifications
} = require('../data/notifications');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// GET /api/notifications - Listar notificações
router.get('/', (req, res) => {
  try {
    const { userId, unreadOnly, type, limit } = req.query;
    let filteredNotifications = [...notifications];

    if (userId) {
      filteredNotifications = getNotificationsByUser(parseInt(userId, 10), {
        unreadOnly: unreadOnly === 'true',
        type,
        limit: limit ? parseInt(limit, 10) : undefined
      });
    }

    return sendSuccess(res, { data: filteredNotifications, meta: { total: filteredNotifications.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar notificações', meta: { details: error.message } }, 500);
  }
});

// GET /api/notifications/user/:userId - Buscar notificações por usuário
router.get('/user/:userId(\\d+)', (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const { unreadOnly, type, limit } = req.query;

    const userNotifications = getNotificationsByUser(userId, {
      unreadOnly: unreadOnly === 'true',
      type,
      limit: limit ? parseInt(limit, 10) : undefined
    });

    return sendSuccess(res, { data: userNotifications, meta: { total: userNotifications.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar notificações do usuário', meta: { details: error.message } }, 500);
  }
});

// GET /api/notifications/types - Listar tipos de notificação
router.get('/types', (req, res) => {
  try {
    return sendSuccess(res, { data: notificationTypes });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar tipos de notificação', meta: { details: error.message } }, 500);
  }
});

// GET /api/notifications/stats - Estatísticas de notificações
router.get('/stats', (req, res) => {
  try {
    const stats = {
      total: notifications.length,
      unread: notifications.filter((n) => !n.read).length,
      read: notifications.filter((n) => n.read).length,
      porTipo: {},
      recentes: [...notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
    };

    notifications.forEach((notification) => {
      stats.porTipo[notification.type] = (stats.porTipo[notification.type] || 0) + 1;
    });

    return sendSuccess(res, { data: stats });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar estatísticas de notificações', meta: { details: error.message } }, 500);
  }
});

// POST /api/notifications - Criar notificação
router.post('/', (req, res) => {
  try {
    const newNotification = createNotification(req.body);
    return sendSuccess(res, { data: newNotification, message: 'Notificação criada com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar notificação', meta: { details: error.message } }, 500);
  }
});

// PUT /api/notifications/:id/read - Marcar notificação como lida
router.put('/:id(\\d+)/read', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const notification = markAsRead(id);

    if (!notification) {
      return sendError(res, { message: 'Notificação não encontrada' }, 404);
    }

    return sendSuccess(res, { data: notification, message: 'Notificação marcada como lida' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao marcar notificação como lida', meta: { details: error.message } }, 500);
  }
});

// POST /api/notifications/generate-smart - Gerar notificações inteligentes
router.post('/generate-smart', (req, res) => {
  try {
    const smartNotifications = generateSmartNotifications();
    return sendSuccess(res, { data: smartNotifications, message: 'Notificações inteligentes geradas' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao gerar notificações inteligentes', meta: { details: error.message } }, 500);
  }
});

// DELETE /api/notifications/cleanup - Limpar notificações expiradas
router.delete('/cleanup', (req, res) => {
  try {
    const removedCount = cleanExpiredNotifications();
    return sendSuccess(res, { data: { removedCount }, message: `${removedCount} notificações expiradas removidas` });
  } catch (error) {
    return sendError(res, { message: 'Erro ao limpar notificações expiradas', meta: { details: error.message } }, 500);
  }
});

module.exports = router;

