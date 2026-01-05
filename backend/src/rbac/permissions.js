const ROLE_PERMISSIONS = {
  visualizador: ['companies:read', 'checklists:read', 'inspections:read'],
  tecnico_seguranca: ['companies:read', 'companies:write', 'checklists:read', 'inspections:read', 'inspections:write'],
  administrador: [
    'companies:read',
    'companies:write',
    'checklists:read',
    'inspections:read',
    'inspections:write',
    'users:manage'
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

