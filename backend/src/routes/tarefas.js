const express = require('express');
const { Task } = require('../models/legacyEntities');
const { requirePermission } = require('../middleware/rbac');
const lookupsRepository = require('../repositories/lookupsRepository');
const { createSearchRegex } = require('../utils/regex');
const { isValidObjectId, mapMongoEntity, normalizeRefId } = require('../utils/mongoEntity');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

const sanitizeTaskPayload = async (payload = {}, current = null) => {
  const empresaId =
    payload.empresaId !== undefined ? normalizeRefId(payload.empresaId) : current?.empresaId || null;
  const empresaNome =
    payload.empresaNome !== undefined
      ? String(payload.empresaNome || '').trim()
      : empresaId
        ? await lookupsRepository.getEmpresaNomeById(empresaId)
        : current?.empresaNome || '';

  return {
    titulo: String(payload.titulo ?? current?.titulo ?? '').trim(),
    descricao: String(payload.descricao ?? current?.descricao ?? '').trim(),
    prioridade: String(payload.prioridade ?? current?.prioridade ?? 'media').trim() || 'media',
    status: String(payload.status ?? current?.status ?? 'pendente').trim() || 'pendente',
    empresaId,
    empresaNome,
    responsavel: String(payload.responsavel ?? current?.responsavel ?? '').trim(),
    categoria: String(payload.categoria ?? current?.categoria ?? '').trim(),
    dataVencimento: String(payload.dataVencimento ?? current?.dataVencimento ?? '').trim()
  };
};

const findTaskById = async (id) => {
  if (!isValidObjectId(id)) return null;
  const task = await Task.findById(id).lean();
  return task ? mapMongoEntity(task) : null;
};

router.get('/', requirePermission('tasks:read'), async (req, res) => {
  try {
    const { status, prioridade, empresaId, categoria, search } = req.query;
    const filters = {};

    if (status) filters.status = String(status);
    if (prioridade) filters.prioridade = String(prioridade);
    if (categoria) filters.categoria = String(categoria);
    if (empresaId) filters.empresaId = String(empresaId);
    if (search) {
      const term = createSearchRegex(search);
      if (term) {
        filters.$or = [{ titulo: term }, { descricao: term }];
      }
    }

    const rows = await Task.find(filters).sort({ createdAt: -1 }).lean();
    return sendSuccess(res, { data: rows.map(mapMongoEntity), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar tarefas', meta: { details: error.message } }, 500);
  }
});

router.get('/:id', requirePermission('tasks:read'), async (req, res) => {
  try {
    const task = await findTaskById(req.params.id);
    if (!task) return sendError(res, { message: 'Tarefa nao encontrada' }, 404);
    return sendSuccess(res, { data: task });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar tarefa', meta: { details: error.message } }, 500);
  }
});

router.post('/', requirePermission('tasks:write'), async (req, res) => {
  try {
    const payload = await sanitizeTaskPayload(req.body);
    if (!payload.titulo) {
      return sendError(res, { message: 'Titulo e obrigatorio' }, 400);
    }

    const created = await Task.create(payload);
    return sendSuccess(res, { data: mapMongoEntity(created.toObject()), message: 'Tarefa criada com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar tarefa', meta: { details: error.message } }, 500);
  }
});

router.put('/:id', requirePermission('tasks:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, { message: 'Tarefa nao encontrada' }, 404);
    }

    const current = await Task.findById(req.params.id).lean();
    if (!current) return sendError(res, { message: 'Tarefa nao encontrada' }, 404);

    const payload = await sanitizeTaskPayload(req.body, current);
    if (!payload.titulo) {
      return sendError(res, { message: 'Titulo e obrigatorio' }, 400);
    }

    const updated = await Task.findByIdAndUpdate(req.params.id, payload, { new: true }).lean();
    return sendSuccess(res, { data: mapMongoEntity(updated), message: 'Tarefa atualizada com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar tarefa', meta: { details: error.message } }, 500);
  }
});

router.delete('/:id', requirePermission('tasks:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, { message: 'Tarefa nao encontrada' }, 404);
    }

    const deleted = await Task.findByIdAndDelete(req.params.id);
    if (!deleted) return sendError(res, { message: 'Tarefa nao encontrada' }, 404);

    return sendSuccess(res, { data: null, message: 'Tarefa deletada com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao deletar tarefa', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
