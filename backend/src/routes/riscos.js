const express = require('express');
const { riscos } = require('../data/mockData');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// GET /api/riscos - Listar todos os riscos
router.get('/', (req, res) => {
  try {
    const { empresaId, tipo, classificacao, status } = req.query;
    let filteredRiscos = [...riscos];

    if (empresaId) {
      filteredRiscos = filteredRiscos.filter((risco) => risco.empresaId === parseInt(empresaId, 10));
    }

    if (tipo) {
      filteredRiscos = filteredRiscos.filter((risco) => risco.tipo === tipo);
    }

    if (classificacao) {
      filteredRiscos = filteredRiscos.filter((risco) => risco.classificacao === classificacao);
    }

    if (status) {
      filteredRiscos = filteredRiscos.filter((risco) => risco.status === status);
    }

    return sendSuccess(res, { data: filteredRiscos, meta: { total: filteredRiscos.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar riscos', meta: { details: error.message } }, 500);
  }
});

// GET /api/riscos/:id - Buscar risco por ID
router.get('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const risco = riscos.find((item) => item.id === id);

    if (!risco) {
      return sendError(res, { message: 'Risco não encontrado' }, 404);
    }

    return sendSuccess(res, { data: risco });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar risco', meta: { details: error.message } }, 500);
  }
});

// POST /api/riscos - Criar novo risco
router.post('/', (req, res) => {
  try {
    const nextId = riscos.length ? Math.max(...riscos.map((item) => item.id)) + 1 : 1;
    const novoRisco = {
      id: nextId,
      ...req.body,
      dataIdentificacao: new Date().toISOString().split('T')[0],
      status: 'ativo'
    };

    riscos.push(novoRisco);

    return sendSuccess(res, { data: novoRisco, message: 'Risco criado com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar risco', meta: { details: error.message } }, 500);
  }
});

// PUT /api/riscos/:id - Atualizar risco
router.put('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const riscoIndex = riscos.findIndex((item) => item.id === id);

    if (riscoIndex === -1) {
      return sendError(res, { message: 'Risco não encontrado' }, 404);
    }

    riscos[riscoIndex] = {
      ...riscos[riscoIndex],
      ...req.body,
      id
    };

    return sendSuccess(res, { data: riscos[riscoIndex], message: 'Risco atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar risco', meta: { details: error.message } }, 500);
  }
});

// DELETE /api/riscos/:id - Deletar risco
router.delete('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const riscoIndex = riscos.findIndex((item) => item.id === id);

    if (riscoIndex === -1) {
      return sendError(res, { message: 'Risco não encontrado' }, 404);
    }

    riscos.splice(riscoIndex, 1);

    return sendSuccess(res, { data: null, message: 'Risco deletado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao deletar risco', meta: { details: error.message } }, 500);
  }
});

module.exports = router;

