// Sistema de notificações inteligentes (inicia vazio, sem dados fictícios).

const notifications = [];

const notificationTypes = {
  task_due: {
    name: 'Tarefa Próxima do Vencimento',
    icon: 'clock',
    color: 'yellow',
    priority: 'medium'
  },
  task_completed: {
    name: 'Tarefa Concluída',
    icon: 'check-circle',
    color: 'green',
    priority: 'low'
  },
  compliance_alert: {
    name: 'Alerta de Conformidade',
    icon: 'alert-triangle',
    color: 'red',
    priority: 'high'
  },
  risk_identified: {
    name: 'Risco Identificado',
    icon: 'shield-alert',
    color: 'orange',
    priority: 'high'
  },
  epi_expiring: {
    name: 'EPI Próximo do Vencimento',
    icon: 'hard-hat',
    color: 'yellow',
    priority: 'medium'
  },
  training_due: {
    name: 'Treinamento Pendente',
    icon: 'graduation-cap',
    color: 'blue',
    priority: 'medium'
  },
  inspection_due: {
    name: 'Inspeção Pendente',
    icon: 'clipboard-check',
    color: 'purple',
    priority: 'medium'
  }
};

const createNotification = (notificationData) => {
  const newNotification = {
    id: notifications.length + 1,
    read: false,
    createdAt: new Date().toISOString(),
    ...notificationData
  };

  notifications.push(newNotification);
  return newNotification;
};

const markAsRead = (notificationId) => {
  const parsedNotificationId = parseInt(notificationId, 10);
  const notification = notifications.find((item) => item.id === parsedNotificationId);
  if (!notification) return null;

  notification.read = true;
  return notification;
};

const getNotificationsByUser = (userId, options = {}) => {
  const parsedUserId = parseInt(userId, 10);
  if (Number.isNaN(parsedUserId)) return [];

  let userNotifications = notifications.filter((item) => item.userId === parsedUserId);

  if (options.unreadOnly) {
    userNotifications = userNotifications.filter((item) => !item.read);
  }

  if (options.type) {
    userNotifications = userNotifications.filter((item) => item.type === options.type);
  }

  userNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (options.limit) {
    userNotifications = userNotifications.slice(0, options.limit);
  }

  return userNotifications;
};

const generateSmartNotifications = () => {
  return [];
};

const cleanExpiredNotifications = () => {
  const now = new Date();
  const initialLength = notifications.length;

  for (let i = notifications.length - 1; i >= 0; i--) {
    if (new Date(notifications[i].expiresAt) < now) {
      notifications.splice(i, 1);
    }
  }

  return initialLength - notifications.length;
};

module.exports = {
  notifications,
  notificationTypes,
  createNotification,
  markAsRead,
  getNotificationsByUser,
  generateSmartNotifications,
  cleanExpiredNotifications
};
