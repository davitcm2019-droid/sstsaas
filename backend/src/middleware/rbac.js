const { hasPermission } = require('../rbac/permissions');
const { sendError } = require('../utils/response');

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (req.method === 'OPTIONS') {
      return next();
    }

    if (!req.user) {
      return sendError(res, { message: 'Usuário não autenticado', meta: { code: 'AUTH_NOT_AUTHENTICATED' } }, 401);
    }

    if (!hasPermission(req.user.perfil, permission)) {
      return sendError(
        res,
        {
          message: 'Acesso negado. Permissão insuficiente.',
          meta: { code: 'AUTH_FORBIDDEN_PERMISSION', permission }
        },
        403
      );
    }

    return next();
  };
};

module.exports = {
  requirePermission
};
