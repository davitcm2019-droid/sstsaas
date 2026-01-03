const express = require('express');
const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { usuarios } = require('../data/mockData');
const { authenticateToken, generateToken, verifyPassword, hashPassword } = require('../middleware/auth');
const { toUserDTO } = require('../dtos/user');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

// POST /api/auth/register - Registrar novo usuário (perfil sempre visualizador)
router.post('/register', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return sendError(res, { message: 'Nome, email e senha são obrigatórios' }, 400);
    }

    if (String(senha).length < 6) {
      return sendError(res, { message: 'A senha deve ter pelo menos 6 caracteres' }, 400);
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = usuarios.find((user) => normalizeEmail(user.email) === normalizedEmail);
    if (existingUser) {
      return sendError(res, { message: 'Email já cadastrado' }, 400);
    }

    const newUser = {
      id: usuarios.length + 1,
      nome,
      email: normalizedEmail,
      senha: await hashPassword(senha),
      perfil: 'visualizador',
      status: 'ativo',
      dataCadastro: new Date().toISOString().split('T')[0]
    };

    usuarios.push(newUser);

    const token = generateToken(newUser);

    return sendSuccess(
      res,
      {
        data: {
          user: toUserDTO(newUser),
          token
        },
        message: 'Usuário registrado com sucesso'
      },
      201
    );
  } catch (error) {
    return sendError(res, { message: 'Erro ao registrar usuário', meta: { details: error.message } }, 500);
  }
});

// POST /api/auth/login - Login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return sendError(res, { message: 'Email e senha são obrigatórios' }, 400);
    }

    const normalizedEmail = normalizeEmail(email);
    const user = usuarios.find((candidate) => normalizeEmail(candidate.email) === normalizedEmail);
    if (!user) {
      return sendError(res, { message: 'Credenciais inválidas' }, 401);
    }

    if (!(await verifyPassword(senha, user.senha))) {
      return sendError(res, { message: 'Credenciais inválidas' }, 401);
    }

    if (user.status !== 'ativo') {
      return sendError(res, { message: 'Usuário inativo' }, 401);
    }

    const token = generateToken(user);

    return sendSuccess(res, {
      data: {
        user: toUserDTO(user),
        token
      },
      message: 'Login realizado com sucesso'
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao fazer login', meta: { details: error.message } }, 500);
  }
});

// POST /api/auth/logout - Logout
router.post('/logout', authenticateToken, (req, res) => {
  try {
    return sendSuccess(res, { data: null, message: 'Logout realizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao fazer logout', meta: { details: error.message } }, 500);
  }
});

// GET /api/auth/me - Obter dados do usuário logado
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = usuarios.find((candidate) => candidate.id === req.user.id);
    if (!user) {
      return sendError(res, { message: 'Usuário não encontrado' }, 404);
    }

    return sendSuccess(res, { data: toUserDTO(user) });
  } catch (error) {
    return sendError(res, { message: 'Erro ao obter usuário atual', meta: { details: error.message } }, 500);
  }
});

// POST /api/auth/refresh - Renovar token
router.post('/refresh', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return sendError(res, { message: 'Token é obrigatório' }, 400);
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = usuarios.find((candidate) => candidate.id === decoded.id);
    if (!user) {
      return sendError(res, { message: 'Usuário não encontrado' }, 404);
    }

    if (user.status !== 'ativo') {
      return sendError(res, { message: 'Usuário inativo' }, 401);
    }

    const newToken = generateToken(user);

    return sendSuccess(res, { data: { token: newToken }, message: 'Token renovado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Token inválido', meta: { details: error.message } }, 401);
  }
});

module.exports = router;
