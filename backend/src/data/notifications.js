// Catalogo estatico de notificacoes.

const notificationTypes = {
  task_due: {
    name: 'Tarefa Proxima do Vencimento',
    icon: 'clock',
    color: 'yellow',
    priority: 'medium'
  },
  task_completed: {
    name: 'Tarefa Concluida',
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
    name: 'EPI Proximo do Vencimento',
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
    name: 'Inspecao Pendente',
    icon: 'clipboard-check',
    color: 'purple',
    priority: 'medium'
  }
};

module.exports = {
  notificationTypes
};
