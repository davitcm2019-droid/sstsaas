const express = require('express');
const { usuarios } = require('../data/mockData');
const { authorize, hashPassword } = require('../middleware/auth');
const { toUserDTO } = require('../dtos/user');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

router.use(authorize('administrador'));

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

// GET /api/usuarios - Listar todos os usuários
router.get('/', (req, res) => {
  try {
    const { perfil, status } = req.query;
    let filteredUsuarios = [...usuarios];

    if (perfil) {
      filteredUsuarios = filteredUsuarios.filter((usuario) => usuario.perfil === perfil);
    }

    if (status) {
      filteredUsuarios = filteredUsuarios.filter((usuario) => usuario.status === status);
    }

    return sendSuccess(res, {
      data: filteredUsuarios.map(toUserDTO),
      meta: { total: filteredUsuarios.length }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar usuários', meta: { details: error.message } }, 500);
  }
});

// GET /api/usuarios/:id - Buscar usuário por ID
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const usuario = usuarios.find((usr) => usr.id === id);

    if (!usuario) {
      return sendError(res, { message: 'Usuário não encontrado' }, 404);
    }

    return sendSuccess(res, { data: toUserDTO(usuario) });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar usuário', meta: { details: error.message } }, 500);
  }
});

// POST /api/usuarios - Criar novo usuário
router.post('/', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return sendError(res, { message: 'Nome, email e senha são obrigatórios' }, 400);
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = usuarios.find((usr) => normalizeEmail(usr.email) === normalizedEmail);
    if (existingUser) {
      return sendError(res, { message: 'Email já cadastrado' }, 400);
    }

    const novoUsuario = {
      id: usuarios.length ? Math.max(...usuarios.map((usr) => usr.id)) + 1 : 1,
      ...req.body,
      email: normalizedEmail,
      senha: await hashPassword(senha),
      dataCadastro: new Date().toISOString().split('T')[0],
      status: req.body?.status || 'ativo',
      perfil: req.body?.perfil || 'visualizador'
    };

    usuarios.push(novoUsuario);

    return sendSuccess(res, { data: toUserDTO(novoUsuario), message: 'Usuário criado com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar usuário', meta: { details: error.message } }, 500);
  }
});

// PUT /api/usuarios/:id - Atualizar usuário
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const usuarioIndex = usuarios.findIndex((usr) => usr.id === id);

    if (usuarioIndex === -1) {
      return sendError(res, { message: 'Usuário não encontrado' }, 404);
    }

    const payload = { ...req.body };

    if (payload.email) {
      payload.email = normalizeEmail(payload.email);
      const emailOwner = usuarios.find((usr) => normalizeEmail(usr.email) === payload.email);
      if (emailOwner && emailOwner.id !== id) {
        return sendError(res, { message: 'Email já cadastrado' }, 400);
      }
    }

    if (payload.senha) {
      payload.senha = await hashPassword(payload.senha);
    }

    usuarios[usuarioIndex] = {
      ...usuarios[usuarioIndex],
      ...payload,
      id
    };

    return sendSuccess(res, { data: toUserDTO(usuarios[usuarioIndex]), message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar usuário', meta: { details: error.message } }, 500);
  }
});

// DELETE /api/usuarios/:id - Deletar usuário
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const usuarioIndex = usuarios.findIndex((usr) => usr.id === id);

    if (usuarioIndex === -1) {
      return sendError(res, { message: 'Usuário não encontrado' }, 404);
    }

    usuarios.splice(usuarioIndex, 1);

    return sendSuccess(res, { data: null, message: 'Usuário deletado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao deletar usuário', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
