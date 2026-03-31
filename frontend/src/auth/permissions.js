import rolePermissions from '../../../shared/permissions.json';

export const ROLE_PERMISSIONS = rolePermissions;

export const getPermissionsForRole = (role) => ROLE_PERMISSIONS[role] || [];

export const hasPermission = (role, permission) => {
  if (!role || !permission) return false;
  return getPermissionsForRole(role).includes(permission);
};
