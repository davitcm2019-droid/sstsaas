const express = require('express');
const { Training } = require('../models/legacyEntities');
const { requirePermission } = require('../middleware/rbac');
const lookupsRepository = require('../repositories/lookupsRepository');
const { createSearchRegex } = require('../utils/regex');
const { isValidObjectId, mapMongoEntity, normalizeRefId } = require('../utils/mongoEntity');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const sanitizePayload = async (data = {}, current = null) => {
  const empresaId = data.empresaId !== undefined ? normalizeRefId(data.empresaId) : current?.empresaId || null;

  return {
    titulo: String(data.titulo ?? current?.titulo ?? '').trim(),
    descricao: String(data.descricao ?? current?.descricao ?? '').trim(),
    empresaId,
    empresaNome:
      data.empresaNome !== undefined
        ? String(data.empresaNome || '').trim()
        : empresaId
          ? await lookupsRepository.getEmpresaNomeById(empresaId)
          : current?.empresaNome || '',
    tipo: String(data.tipo ?? current?.tipo ?? 'obrigatorio').trim() || 'obrigatorio',
    duracao: normalizeNumber(data.duracao ?? current?.duracao, 0),
    instrutor: String(data.instrutor ?? current?.instrutor ?? '').trim(),
    dataInicio: String(data.dataInicio ?? current?.dataInicio ?? '').trim(),
    dataFim: String(data.dataFim ?? current?.dataFim ?? '').trim(),
    local: String(data.local ?? current?.local ?? '').trim(),
    maxParticipantes: normalizeNumber(data.maxParticipantes ?? current?.maxParticipantes, 0),
    participantes: normalizeNumber(data.participantes ?? current?.participantes, 0),
    status: String(data.status ?? current?.status ?? 'agendado').trim() || 'agendado',
    observacoes: String(data.observacoes ?? current?.observacoes ?? '').trim()
  };
};

router.get('/', requirePermission('trainings:read'), async (req, res) => {
  try {
    const { status, tipo, search } = req.query;
    const filters = {};

    if (status) filters.status = String(status);
    if (tipo) filters.tipo = String(tipo);
    if (search) {
      const term = createSearchRegex(search);
      if (term) {
        filters.$or = [{ titulo: term }, { instrutor: term }, { empresaNome: term }, { local: term }];
      }
    }

    const rows = await Training.find(filters).sort({ createdAt: -1 }).lean();
    return sendSuccess(res, { data: rows.map(mapMongoEntity), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar treinamentos', meta: { details: error.message } }, 500);
  }
});

router.get('/:id', requirePermission('trainings:read'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Treinamento nao encontrado' }, 404);
    const training = await Training.findById(req.params.id).lean();
    if (!training) return sendError(res, { message: 'Treinamento nao encontrado' }, 404);
    return sendSuccess(res, { data: mapMongoEntity(training) });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar treinamento', meta: { details: error.message } }, 500);
  }
});

router.post('/', requirePermission('trainings:write'), async (req, res) => {
  try {
    const payload = await sanitizePayload(req.body);
    if (!payload.titulo || !payload.empresaId || !payload.tipo || !payload.instrutor || !payload.dataInicio || !payload.dataFim || !payload.local) {
      return sendError(res, { message: 'titulo, empresaId, tipo, instrutor, dataInicio, dataFim e local sao obrigatorios' }, 400);
    }

    const created = await Training.create(payload);
    return sendSuccess(res, { data: mapMongoEntity(created.toObject()), message: 'Treinamento criado com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar treinamento', meta: { details: error.message } }, 500);
  }
});

router.put('/:id', requirePermission('trainings:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Treinamento nao encontrado' }, 404);
    const current = await Training.findById(req.params.id).lean();
    if (!current) return sendError(res, { message: 'Treinamento nao encontrado' }, 404);

    const payload = await sanitizePayload(req.body, current);
    if (!payload.titulo || !payload.empresaId || !payload.tipo || !payload.instrutor || !payload.dataInicio || !payload.dataFim || !payload.local) {
      return sendError(res, { message: 'titulo, empresaId, tipo, instrutor, dataInicio, dataFim e local sao obrigatorios' }, 400);
    }

    const updated = await Training.findByIdAndUpdate(req.params.id, payload, { new: true }).lean();
    return sendSuccess(res, { data: mapMongoEntity(updated), message: 'Treinamento atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar treinamento', meta: { details: error.message } }, 500);
  }
});

router.delete('/:id', requirePermission('trainings:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Treinamento nao encontrado' }, 404);
    const deleted = await Training.findByIdAndDelete(req.params.id);
    if (!deleted) return sendError(res, { message: 'Treinamento nao encontrado' }, 404);
    return sendSuccess(res, { data: null, message: 'Treinamento excluido com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao excluir treinamento', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
