const ROLE_PERMISSIONS = require('../../../shared/permissions.json');

const hasPermission = (role, permission) => {
  if (!role || !permission) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
};

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission
};
