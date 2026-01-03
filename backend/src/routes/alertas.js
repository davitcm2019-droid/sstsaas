const express = require('express');
const { alertas } = require('../data/mockData');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// GET /api/alertas - Listar todos os alertas
router.get('/', (req, res) => {
  try {
    const { empresaId, tipo, prioridade, status } = req.query;
    let filteredAlertas = [...alertas];

    if (empresaId) {
      filteredAlertas = filteredAlertas.filter((alerta) => alerta.empresaId === parseInt(empresaId, 10));
    }

    if (tipo) {
      filteredAlertas = filteredAlertas.filter((alerta) => alerta.tipo === tipo);
    }

    if (prioridade) {
      filteredAlertas = filteredAlertas.filter((alerta) => alerta.prioridade === prioridade);
    }

    if (status) {
      filteredAlertas = filteredAlertas.filter((alerta) => alerta.status === status);
    }

    return sendSuccess(res, { data: filteredAlertas, meta: { total: filteredAlertas.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar alertas', meta: { details: error.message } }, 500);
  }
});

// GET /api/alertas/:id - Buscar alerta por ID
router.get('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const alerta = alertas.find((alt) => alt.id === id);

    if (!alerta) {
      return sendError(res, { message: 'Alerta não encontrado' }, 404);
    }

    return sendSuccess(res, { data: alerta });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar alerta', meta: { details: error.message } }, 500);
  }
});

// POST /api/alertas - Criar novo alerta
router.post('/', (req, res) => {
  try {
    const nextId = alertas.length ? Math.max(...alertas.map((alt) => alt.id)) + 1 : 1;
    const novoAlerta = {
      id: nextId,
      ...req.body,
      dataCriacao: new Date().toISOString().split('T')[0],
      status: 'ativo'
    };

    alertas.push(novoAlerta);

    return sendSuccess(res, { data: novoAlerta, message: 'Alerta criado com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar alerta', meta: { details: error.message } }, 500);
  }
});

// PUT /api/alertas/:id - Atualizar alerta
router.put('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const alertaIndex = alertas.findIndex((alt) => alt.id === id);

    if (alertaIndex === -1) {
      return sendError(res, { message: 'Alerta não encontrado' }, 404);
    }

    alertas[alertaIndex] = {
      ...alertas[alertaIndex],
      ...req.body,
      id
    };

    return sendSuccess(res, { data: alertas[alertaIndex], message: 'Alerta atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar alerta', meta: { details: error.message } }, 500);
  }
});

// DELETE /api/alertas/:id - Deletar alerta
router.delete('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const alertaIndex = alertas.findIndex((alt) => alt.id === id);

    if (alertaIndex === -1) {
      return sendError(res, { message: 'Alerta não encontrado' }, 404);
    }

    alertas.splice(alertaIndex, 1);

    return sendSuccess(res, { data: null, message: 'Alerta deletado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao deletar alerta', meta: { details: error.message } }, 500);
  }
});

module.exports = router;

