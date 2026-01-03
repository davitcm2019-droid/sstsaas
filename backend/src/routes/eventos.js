const express = require('express');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

let eventos = [];
let currentId = 1;

// GET /api/eventos
router.get('/', (req, res) => {
  try {
    let results = [...eventos];

    if (req.query.empresaId) {
      results = results.filter((evento) => evento.empresaId === parseInt(req.query.empresaId, 10));
    }

    if (req.query.tipo) {
      results = results.filter((evento) => evento.tipo === req.query.tipo);
    }

    return sendSuccess(res, { data: results, meta: { total: results.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar eventos', meta: { details: error.message } }, 500);
  }
});

// POST /api/eventos
router.post('/', (req, res) => {
  try {
    const evento = { id: currentId++, ...req.body };
    eventos.push(evento);
    return sendSuccess(res, { data: evento, message: 'Evento criado com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar evento', meta: { details: error.message } }, 500);
  }
});

// PUT /api/eventos/:id
router.put('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const index = eventos.findIndex((evento) => evento.id === id);
    if (index === -1) return sendError(res, { message: 'Evento não encontrado' }, 404);

    eventos[index] = { ...eventos[index], ...req.body, id };
    return sendSuccess(res, { data: eventos[index], message: 'Evento atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar evento', meta: { details: error.message } }, 500);
  }
});

// DELETE /api/eventos/:id
router.delete('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const before = eventos.length;
    eventos = eventos.filter((evento) => evento.id !== id);
    if (eventos.length === before) return sendError(res, { message: 'Evento não encontrado' }, 404);

    return sendSuccess(res, { data: null, message: 'Evento excluído com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao excluir evento', meta: { details: error.message } }, 500);
  }
});

module.exports = router;

