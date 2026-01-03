const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { config } = require('../config');
const { sendError } = require('../utils/response');

const authenticateToken = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.headers?.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return sendError(res, { message: 'Token de acesso requerido', meta: { code: 'AUTH_MISSING_TOKEN' } }, 401);
  }

  jwt.verify(token, config.jwt.secret, (err, payload) => {
    if (err) {
      return sendError(res, { message: 'Token inválido ou expirado', meta: { code: 'AUTH_INVALID_TOKEN' } }, 403);
    }

    req.user = payload;
    return next();
  });
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, { message: 'Usuário não autenticado', meta: { code: 'AUTH_NOT_AUTHENTICATED' } }, 401);
    }

    if (!roles.includes(req.user.perfil)) {
      return sendError(res, { message: 'Acesso negado. Perfil insuficiente.', meta: { code: 'AUTH_FORBIDDEN_ROLE' } }, 403);
    }

    return next();
  };
};

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: user.perfil
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

const verifyPassword = async (password, passwordHash) => {
  if (!passwordHash) return false;
  return bcrypt.compare(password, passwordHash);
};

const hashPassword = async (password) => {
  return bcrypt.hash(password, config.security.bcryptSaltRounds);
};

module.exports = {
  authenticateToken,
  authorize,
  generateToken,
  verifyPassword,
  hashPassword
};
