// Sistema de auditoria em memória (sem persistência).

const auditLogs = [];

const addAuditLog = (logData) => {
  const newLog = {
    id: auditLogs.length ? auditLogs[auditLogs.length - 1].id + 1 : 1,
    timestamp: new Date().toISOString(),
    ...logData
  };
  auditLogs.push(newLog);
  return newLog;
};

const getAuditLogsByEntity = (entityType, entityId) => {
  return auditLogs
    .filter((log) => log.entityType === entityType && log.entityId === parseInt(entityId, 10))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

const getAuditLogsByUser = (userId) => {
  return auditLogs
    .filter((log) => log.userId === parseInt(userId, 10))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

module.exports = {
  auditLogs,
  addAuditLog,
  getAuditLogsByEntity,
  getAuditLogsByUser
};

