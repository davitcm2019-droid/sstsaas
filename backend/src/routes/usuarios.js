const express = require('express');
const { authorize, hashPassword } = require('../middleware/auth');
const { toUserDTO } = require('../dtos/user');
const userRepository = require('../repositories/userRepository');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

router.use(authorize('administrador'));

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

router.get('/', async (req, res) => {
  try {
    const { perfil, status } = req.query;
    const users = await userRepository.list({ perfil, status });

    return sendSuccess(res, {
      data: users.map(toUserDTO),
      meta: { total: users.length }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar usuários', meta: { details: error.message } }, 500);
  }
});

router.get('/:id(\\d+)', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await userRepository.findById(id);

    if (!user) {
      return sendError(res, { message: 'Usuário não encontrado' }, 404);
    }

    return sendSuccess(res, { data: toUserDTO(user) });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar usuário', meta: { details: error.message } }, 500);
  }
});

router.post('/', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return sendError(res, { message: 'Nome, email e senha são obrigatórios' }, 400);
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      return sendError(res, { message: 'Email já cadastrado' }, 400);
    }

    const createdUser = await userRepository.create({
      nome,
      email: normalizedEmail,
      senhaHash: await hashPassword(senha),
      status: req.body?.status || 'ativo',
      perfil: req.body?.perfil || 'visualizador'
    });

    return sendSuccess(res, { data: toUserDTO(createdUser), message: 'Usuário criado com sucesso' }, 201);
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    return sendError(res, { message: 'Erro ao criar usuário', meta: { details: error.message } }, statusCode);
  }
});

router.put('/:id(\\d+)', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const currentUser = await userRepository.findById(id);

    if (!currentUser) {
      return sendError(res, { message: 'Usuário não encontrado' }, 404);
    }

    const payload = { ...req.body };

    if (payload.email) {
      payload.email = normalizeEmail(payload.email);
      const emailOwner = await userRepository.findByEmail(payload.email);
      if (emailOwner && emailOwner.id !== id) {
        return sendError(res, { message: 'Email já cadastrado' }, 400);
      }
    }

    if (payload.senha) {
      payload.senhaHash = await hashPassword(payload.senha);
      delete payload.senha;
    }

    const updatedUser = await userRepository.update(id, payload);
    if (!updatedUser) {
      return sendError(res, { message: 'Usuário não encontrado' }, 404);
    }

    return sendSuccess(res, { data: toUserDTO(updatedUser), message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    return sendError(res, { message: 'Erro ao atualizar usuário', meta: { details: error.message } }, statusCode);
  }
});

router.delete('/:id(\\d+)', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const removed = await userRepository.remove(id);

    if (!removed) {
      return sendError(res, { message: 'Usuário não encontrado' }, 404);
    }

    return sendSuccess(res, { data: null, message: 'Usuário deletado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao deletar usuário', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
