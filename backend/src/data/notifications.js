// Sistema de notificações inteligentes

const notifications = [
  {
    id: 1,
    userId: 2,
    type: 'task_due',
    title: 'Tarefa próxima do vencimento',
    message: 'A tarefa "Renovar certificado de EPI" vence em 3 dias',
    data: {
      taskId: 1,
      dueDate: '2024-03-15',
      priority: 'alta'
    },
    read: false,
    createdAt: '2024-03-12T10:00:00Z',
    expiresAt: '2024-03-20T10:00:00Z'
  },
  {
    id: 2,
    userId: 2,
    type: 'compliance_alert',
    title: 'Empresa com conformidade baixa',
    message: 'A empresa "Construtora XYZ S.A." está com 65% de conformidade',
    data: {
      empresaId: 2,
      compliance: 65,
      threshold: 70
    },
    read: false,
    createdAt: '2024-03-10T14:30:00Z',
    expiresAt: '2024-03-17T14:30:00Z'
  },
  {
    id: 3,
    userId: 1,
    type: 'risk_identified',
    title: 'Novo risco identificado',
    message: 'Risco "Exposição a poeira de cimento" foi identificado na empresa "Construtora XYZ S.A."',
    data: {
      riskId: 2,
      empresaId: 2,
      classification: 'medio'
    },
    read: true,
    createdAt: '2024-03-08T09:15:00Z',
    expiresAt: '2024-03-15T09:15:00Z'
  },
  {
    id: 4,
    userId: 3,
    type: 'task_completed',
    title: 'Tarefa concluída',
    message: 'A tarefa "Atualizar PGR" foi concluída com sucesso',
    data: {
      taskId: 3,
      completedBy: 'João Silva',
      completedAt: '2024-01-30T16:45:00Z'
    },
    read: true,
    createdAt: '2024-01-30T16:45:00Z',
    expiresAt: '2024-02-06T16:45:00Z'
  },
  {
    id: 5,
    userId: 2,
    type: 'epi_expiring',
    title: 'EPI próximo do vencimento',
    message: 'Capacete de segurança vence em 7 dias na empresa "Indústria Metalúrgica ABC Ltda"',
    data: {
      epiType: 'Capacete de segurança',
      empresaId: 1,
      expiryDate: '2024-03-19',
      daysUntilExpiry: 7
    },
    read: false,
    createdAt: '2024-03-12T08:00:00Z',
    expiresAt: '2024-03-26T08:00:00Z'
  }
];

// Tipos de notificação
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

// Função para criar notificação
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

// Função para marcar notificação como lida
const markAsRead = (notificationId) => {
  const notification = notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
    return notification;
  }
  return null;
};

// Função para buscar notificações por usuário
const getNotificationsByUser = (userId, options = {}) => {
  let userNotifications = notifications.filter(n => n.userId === parseInt(userId));
  
  if (options.unreadOnly) {
    userNotifications = userNotifications.filter(n => !n.read);
  }
  
  if (options.type) {
    userNotifications = userNotifications.filter(n => n.type === options.type);
  }
  
  // Ordenar por data de criação (mais recente primeiro)
  userNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  if (options.limit) {
    userNotifications = userNotifications.slice(0, options.limit);
  }
  
  return userNotifications;
};

// Função para gerar notificações inteligentes
const generateSmartNotifications = () => {
  const today = new Date();
  const smartNotifications = [];
  
  // Verificar tarefas próximas do vencimento (7 dias)
  // Verificar EPIs próximos do vencimento (30 dias)
  // Verificar conformidade baixa (< 70%)
  // Verificar riscos não tratados há mais de 30 dias
  
  return smartNotifications;
};

// Função para limpar notificações expiradas
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
