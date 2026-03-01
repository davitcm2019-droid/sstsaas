const ROLE_PERMISSIONS = {
  visualizador: ['companies:read', 'checklists:read', 'inspections:read'],
  auditor: ['companies:read', 'checklists:read', 'inspections:read', 'riskSurvey:read'],
  tecnico_seguranca: [
    'companies:read',
    'companies:write',
    'checklists:read',
    'inspections:read',
    'inspections:write',
    'riskSurvey:read',
    'riskSurvey:write'
  ],
  administrador: [
    'companies:read',
    'companies:write',
    'checklists:read',
    'inspections:read',
    'inspections:write',
    'users:manage',
    'riskSurvey:read',
    'riskSurvey:write',
    'riskSurvey:finalize',
    'riskSurvey:configure'
  ]
};

const hasPermission = (role, permission) => {
  if (!role || !permission) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
};

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission
};
