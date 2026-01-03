// Sistema de auditoria e histórico de alterações (inicia vazio).

const auditLogs = [];

const addAuditLog = (logData) => {
  const newLog = {
    id: auditLogs.length + 1,
    timestamp: new Date().toISOString(),
    ...logData
  };

  auditLogs.push(newLog);
  return newLog;
};

const getAuditLogsByEntity = (entityType, entityId) => {
  const parsedEntityId = parseInt(entityId, 10);

  return auditLogs
    .filter((log) => log.entityType === entityType && log.entityId === parsedEntityId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

const getAuditLogsByUser = (userId) => {
  const parsedUserId = parseInt(userId, 10);

  return auditLogs
    .filter((log) => log.userId === parsedUserId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

module.exports = {
  auditLogs,
  addAuditLog,
  getAuditLogsByEntity,
  getAuditLogsByUser
};
