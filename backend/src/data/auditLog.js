// Sistema de auditoria e histórico de alterações

const auditLogs = [
  {
    id: 1,
    entityType: 'empresa',
    entityId: 1,
    action: 'created',
    field: null,
    oldValue: null,
    newValue: 'Indústria Metalúrgica ABC Ltda',
    userId: 1,
    userName: 'Administrador Sistema',
    timestamp: '2023-06-01T10:30:00Z',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  {
    id: 2,
    entityType: 'empresa',
    entityId: 1,
    action: 'updated',
    field: 'conformidade',
    oldValue: 'em_dia',
    newValue: 'atrasado',
    userId: 2,
    userName: 'João Silva',
    timestamp: '2024-01-15T14:20:00Z',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  {
    id: 3,
    entityType: 'tarefa',
    entityId: 1,
    action: 'created',
    field: null,
    oldValue: null,
    newValue: 'Renovar certificado de EPI',
    userId: 2,
    userName: 'João Silva',
    timestamp: '2024-02-01T09:15:00Z',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  {
    id: 4,
    entityType: 'tarefa',
    entityId: 3,
    action: 'updated',
    field: 'status',
    oldValue: 'pendente',
    newValue: 'concluido',
    userId: 2,
    userName: 'João Silva',
    timestamp: '2024-01-30T16:45:00Z',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  {
    id: 5,
    entityType: 'risco',
    entityId: 1,
    action: 'created',
    field: null,
    oldValue: null,
    newValue: 'Ruído excessivo na área de solda',
    userId: 2,
    userName: 'João Silva',
    timestamp: '2024-01-10T11:30:00Z',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  {
    id: 6,
    entityType: 'usuario',
    entityId: 4,
    action: 'created',
    field: null,
    oldValue: null,
    newValue: 'Carlos Oliveira',
    userId: 1,
    userName: 'Administrador Sistema',
    timestamp: '2023-04-01T08:00:00Z',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
];

// Função para adicionar novo log de auditoria
const addAuditLog = (logData) => {
  const newLog = {
    id: auditLogs.length + 1,
    timestamp: new Date().toISOString(),
    ...logData
  };
  auditLogs.push(newLog);
  return newLog;
};

// Função para buscar logs por entidade
const getAuditLogsByEntity = (entityType, entityId) => {
  return auditLogs.filter(log => 
    log.entityType === entityType && log.entityId === parseInt(entityId)
  ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// Função para buscar logs por usuário
const getAuditLogsByUser = (userId) => {
  return auditLogs.filter(log => 
    log.userId === parseInt(userId)
  ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

module.exports = {
  auditLogs,
  addAuditLog,
  getAuditLogsByEntity,
  getAuditLogsByUser
};
