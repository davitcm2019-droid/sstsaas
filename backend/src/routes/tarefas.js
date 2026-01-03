const express = require('express');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

let tarefas = [];
let currentId = 1;

// GET /api/tarefas
router.get('/', (req, res) => {
  try {
    let results = [...tarefas];

    const { status, prioridade, empresaId, categoria, search } = req.query;

    if (status) results = results.filter((t) => t.status === status);
    if (prioridade) results = results.filter((t) => t.prioridade === prioridade);
    if (categoria) results = results.filter((t) => t.categoria === categoria);
    if (empresaId) results = results.filter((t) => t.empresaId === parseInt(empresaId, 10));
    if (search) {
      const term = String(search).toLowerCase();
      results = results.filter(
        (t) =>
          String(t.titulo || '')
            .toLowerCase()
            .includes(term) ||
          String(t.descricao || '')
            .toLowerCase()
            .includes(term)
      );
    }

    return sendSuccess(res, { data: results, meta: { total: results.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar tarefas', meta: { details: error.message } }, 500);
  }
});

// POST /api/tarefas
router.post('/', (req, res) => {
  try {
    const tarefa = { id: currentId++, ...req.body };
    tarefas.push(tarefa);
    return sendSuccess(res, { data: tarefa, message: 'Tarefa criada com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar tarefa', meta: { details: error.message } }, 500);
  }
});

// PUT /api/tarefas/:id
router.put('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const index = tarefas.findIndex((t) => t.id === id);
    if (index === -1) return sendError(res, { message: 'Tarefa não encontrada' }, 404);

    tarefas[index] = { ...tarefas[index], ...req.body, id };
    return sendSuccess(res, { data: tarefas[index], message: 'Tarefa atualizada com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar tarefa', meta: { details: error.message } }, 500);
  }
});

// DELETE /api/tarefas/:id
router.delete('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const before = tarefas.length;
    tarefas = tarefas.filter((t) => t.id !== id);
    if (tarefas.length === before) return sendError(res, { message: 'Tarefa não encontrada' }, 404);

    return sendSuccess(res, { data: null, message: 'Tarefa deletada com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao deletar tarefa', meta: { details: error.message } }, 500);
  }
});

module.exports = router;

