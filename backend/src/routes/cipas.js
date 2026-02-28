const express = require('express');
const { cipas } = require('../data/mockData');
const lookupsRepository = require('../repositories/lookupsRepository');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

const toLower = (value = '') => String(value).toLowerCase();

const getEmpresaNome = async (empresaId) => {
  return lookupsRepository.getEmpresaNomeById(empresaId);
};

const sanitizeMembros = (membros) => {
  if (!Array.isArray(membros)) {
    return [];
  }

  return membros.map((membro) => ({
    nome: membro?.nome || '',
    cargo: membro?.cargo || '',
    setor: membro?.setor || ''
  }));
};

// GET /api/cipas
router.get('/', (req, res) => {
  try {
    const { status, gestao, search } = req.query;
    let results = [...cipas];

    if (status) {
      results = results.filter((cipa) => cipa.status === status);
    }

    if (gestao) {
      results = results.filter((cipa) => cipa.gestao === gestao);
    }

    if (search) {
      const term = toLower(search);
      results = results.filter((cipa) => {
        return (
          toLower(cipa.empresaNome).includes(term) ||
          toLower(cipa.gestao).includes(term) ||
          toLower(cipa.presidente).includes(term) ||
          toLower(cipa.vicePresidente).includes(term) ||
          toLower(cipa.secretario).includes(term)
        );
      });
    }

    return sendSuccess(res, { data: results, meta: { total: results.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar CIPAs', meta: { details: error.message } }, 500);
  }
});

// GET /api/cipas/:id
router.get('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const cipa = cipas.find((item) => item.id === id);

    if (!cipa) {
      return sendError(res, { message: 'CIPA não encontrada' }, 404);
    }

    return sendSuccess(res, { data: cipa });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar CIPA', meta: { details: error.message } }, 500);
  }
});

// POST /api/cipas
router.post('/', async (req, res) => {
  try {
    const payload = { ...req.body };
    const empresaId = payload.empresaId ? String(payload.empresaId) : null;
    const nextId = cipas.length ? Math.max(...cipas.map((item) => item.id)) + 1 : 1;

    const novaCipa = {
      id: nextId,
      empresaId,
      empresaNome: payload.empresaNome || (await getEmpresaNome(empresaId)),
      gestao: payload.gestao || '',
      dataInicio: payload.dataInicio || '',
      dataFim: payload.dataFim || '',
      presidente: payload.presidente || '',
      vicePresidente: payload.vicePresidente || '',
      secretario: payload.secretario || '',
      status: payload.status || 'ativa',
      membros: sanitizeMembros(payload.membros),
      observacoes: payload.observacoes || ''
    };

    cipas.push(novaCipa);

    return sendSuccess(res, { data: novaCipa, message: 'CIPA criada com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar CIPA', meta: { details: error.message } }, 500);
  }
});

// PUT /api/cipas/:id
router.put('/:id(\\d+)', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const index = cipas.findIndex((item) => item.id === id);

    if (index === -1) {
      return sendError(res, { message: 'CIPA não encontrada' }, 404);
    }

    const payload = { ...req.body };
    const empresaId =
      payload.empresaId === undefined || payload.empresaId === null || payload.empresaId === ''
        ? cipas[index].empresaId
        : String(payload.empresaId);

    const empresaNome =
      payload.empresaNome !== undefined
        ? payload.empresaNome
        : (await getEmpresaNome(empresaId)) || cipas[index].empresaNome;

    const updatedCipa = {
      ...cipas[index],
      ...payload,
      empresaId,
      empresaNome,
      membros: sanitizeMembros(payload.membros !== undefined ? payload.membros : cipas[index].membros),
      status: payload.status || cipas[index].status,
      observacoes: payload.observacoes !== undefined ? payload.observacoes : cipas[index].observacoes
    };

    cipas[index] = updatedCipa;

    return sendSuccess(res, { data: updatedCipa, message: 'CIPA atualizada com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar CIPA', meta: { details: error.message } }, 500);
  }
});

// DELETE /api/cipas/:id
router.delete('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const index = cipas.findIndex((item) => item.id === id);

    if (index === -1) {
      return sendError(res, { message: 'CIPA não encontrada' }, 404);
    }

    cipas.splice(index, 1);

    return sendSuccess(res, { data: null, message: 'CIPA excluída com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao excluir CIPA', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
