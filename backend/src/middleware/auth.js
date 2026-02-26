const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { config } = require('../config');
const usersRepository = require('../repositories/usersRepository');
const { sendError } = require('../utils/response');

const authenticateToken = async (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.headers?.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return sendError(res, { message: 'Token de acesso requerido', meta: { code: 'AUTH_MISSING_TOKEN' } }, 401);
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return sendError(res, { message: 'Token inválido ou expirado', meta: { code: 'AUTH_INVALID_TOKEN' } }, 403);
  }

  try {
    const user = await usersRepository.findById(payload.id);
    if (!user) {
      return sendError(res, { message: 'Usuário não autenticado', meta: { code: 'AUTH_USER_NOT_FOUND' } }, 401);
    }

    if (user.status !== 'ativo') {
      return sendError(res, { message: 'Usuário inativo', meta: { code: 'AUTH_USER_INACTIVE' } }, 401);
    }

    req.user = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
      status: user.status,
      telefone: user.telefone,
      cargo: user.cargo,
      empresaId: user.empresaId,
      dataCadastro: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : null
    };

    return next();
  } catch (error) {
    return sendError(res, { message: 'Erro ao validar token', meta: { code: 'AUTH_VALIDATE_ERROR' } }, 500);
  }
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
