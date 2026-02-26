const express = require('express');
const { hashPassword } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { toUserDTO } = require('../dtos/user');
const usersRepository = require('../repositories/usersRepository');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

router.use(requirePermission('users:manage'));

const allowedPerfis = new Set(['visualizador', 'tecnico_seguranca', 'administrador']);

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

const parseOptionalId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
};

// GET /api/usuarios - Listar todos os usuários
router.get('/', async (req, res) => {
  try {
    const { perfil, status, search } = req.query;
    const users = await usersRepository.listUsers({ perfil, status, search });

    return sendSuccess(res, {
      data: users.map(toUserDTO),
      meta: { total: users.length }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar usuários', meta: { details: error.message } }, 500);
  }
});

// GET /api/usuarios/:id - Buscar usuário por ID
router.get('/:id', async (req, res) => {
  try {
    const user = await usersRepository.findById(req.params.id);

    if (!user) {
      return sendError(res, { message: 'Usuário não encontrado' }, 404);
    }

    return sendSuccess(res, { data: toUserDTO(user) });
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

    if (String(senha).length < 6) {
      return sendError(res, { message: 'A senha deve ter pelo menos 6 caracteres' }, 400);
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await usersRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      return sendError(res, { message: 'Email já cadastrado' }, 400);
    }

    const perfil = req.body?.perfil || 'visualizador';
    if (!allowedPerfis.has(perfil)) {
      return sendError(res, { message: 'Perfil inválido' }, 400);
    }

  const createdUser = await usersRepository.createUser({
      nome,
      email: normalizedEmail,
      senhaHash: await hashPassword(senha),
      perfil,
      status: req.body?.status || 'ativo',
      telefone: req.body?.telefone || null,
      cargo: req.body?.cargo || null,
      empresaId: parseOptionalId(req.body?.empresaId)
    });

    return sendSuccess(res, { data: toUserDTO(createdUser), message: 'Usuário criado com sucesso' }, 201);
  } catch (error) {
    if (error?.code === '23505' || error?.code === 11000) {
      return sendError(res, { message: 'Email já cadastrado' }, 400);
    }

    return sendError(res, { message: 'Erro ao criar usuário', meta: { details: error.message } }, 500);
  }
});

// PUT /api/usuarios/:id - Atualizar usuário
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const currentUser = await usersRepository.findById(id);

    if (!currentUser) {
      return sendError(res, { message: 'Usuário não encontrado' }, 404);
    }

    const updates = {};

    if (req.body?.nome !== undefined) updates.nome = req.body.nome;

    if (req.body?.email !== undefined) {
      const normalizedEmail = normalizeEmail(req.body.email);
      const emailOwner = await usersRepository.findByEmail(normalizedEmail);
      if (emailOwner && emailOwner.id !== id) {
        return sendError(res, { message: 'Email já cadastrado' }, 400);
      }
      updates.email = normalizedEmail;
    }

    if (req.body?.senha !== undefined) {
      if (String(req.body.senha).length < 6) {
        return sendError(res, { message: 'A senha deve ter pelo menos 6 caracteres' }, 400);
      }
      updates.senhaHash = await hashPassword(req.body.senha);
    }

    if (req.body?.perfil !== undefined) {
      if (!allowedPerfis.has(req.body.perfil)) {
        return sendError(res, { message: 'Perfil inválido' }, 400);
      }
      updates.perfil = req.body.perfil;
    }

    if (req.body?.status !== undefined) updates.status = req.body.status;
    if (req.body?.telefone !== undefined) updates.telefone = req.body.telefone;
    if (req.body?.cargo !== undefined) updates.cargo = req.body.cargo;
    if (req.body?.empresaId !== undefined) updates.empresaId = parseOptionalId(req.body.empresaId);

    const updatedUser = await usersRepository.updateUser(id, updates);

    return sendSuccess(res, { data: toUserDTO(updatedUser), message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    if (error?.code === '23505' || error?.code === 11000) {
      return sendError(res, { message: 'Email já cadastrado' }, 400);
    }

    return sendError(res, { message: 'Erro ao atualizar usuário', meta: { details: error.message } }, 500);
  }
});

// DELETE /api/usuarios/:id - Deletar usuário
router.delete('/:id(\\d+)', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await usersRepository.deleteUser(req.params.id);

    if (!deleted) {
      return sendError(res, { message: 'Usuário não encontrado' }, 404);
    }

    return sendSuccess(res, { data: null, message: 'Usuário deletado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao deletar usuário', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
