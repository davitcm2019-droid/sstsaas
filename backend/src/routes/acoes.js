const express = require('express');
const { Acao } = require('../models/legacyEntities');
const { requirePermission } = require('../middleware/rbac');
const lookupsRepository = require('../repositories/lookupsRepository');
const { createSearchRegex } = require('../utils/regex');
const { isValidObjectId, mapMongoEntity, normalizeRefId } = require('../utils/mongoEntity');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

const parseNumber = (value, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const sanitizePayload = async (data = {}, current = null) => {
  const empresaId = data.empresaId !== undefined ? normalizeRefId(data.empresaId) : current?.empresaId || null;
  const responsavelId =
    data.responsavelId !== undefined ? normalizeRefId(data.responsavelId) : current?.responsavelId || null;

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
    responsavelId,
    responsavelNome:
      data.responsavelNome !== undefined
        ? String(data.responsavelNome || '').trim()
        : responsavelId
          ? await lookupsRepository.getUsuarioNomeById(responsavelId)
          : current?.responsavelNome || '',
    tipo: String(data.tipo ?? current?.tipo ?? 'preventiva').trim() || 'preventiva',
    prioridade: String(data.prioridade ?? current?.prioridade ?? 'media').trim() || 'media',
    status: String(data.status ?? current?.status ?? 'pendente').trim() || 'pendente',
    dataInicio: String(data.dataInicio ?? current?.dataInicio ?? '').trim(),
    dataFim: String(data.dataFim ?? current?.dataFim ?? '').trim(),
    custo: parseNumber(data.custo ?? current?.custo, 0),
    observacoes: String(data.observacoes ?? current?.observacoes ?? '').trim()
  };
};

router.get('/', requirePermission('actions:read'), async (req, res) => {
  try {
    const { status, tipo, prioridade, search } = req.query;
    const filters = {};

    if (status) filters.status = String(status);
    if (tipo) filters.tipo = String(tipo);
    if (prioridade) filters.prioridade = String(prioridade);
    if (search) {
      const term = createSearchRegex(search);
      if (term) {
        filters.$or = [
          { titulo: term },
          { descricao: term },
          { empresaNome: term },
          { responsavelNome: term }
        ];
      }
    }

    const rows = await Acao.find(filters).sort({ createdAt: -1 }).lean();
    return sendSuccess(res, { data: rows.map(mapMongoEntity), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar acoes', meta: { details: error.message } }, 500);
  }
});

router.get('/:id', requirePermission('actions:read'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Acao nao encontrada' }, 404);
    const acao = await Acao.findById(req.params.id).lean();
    if (!acao) return sendError(res, { message: 'Acao nao encontrada' }, 404);
    return sendSuccess(res, { data: mapMongoEntity(acao) });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar acao', meta: { details: error.message } }, 500);
  }
});

router.post('/', requirePermission('actions:write'), async (req, res) => {
  try {
    const payload = await sanitizePayload(req.body);
    if (!payload.titulo || !payload.descricao || !payload.empresaId || !payload.responsavelId) {
      return sendError(res, { message: 'titulo, descricao, empresaId e responsavelId sao obrigatorios' }, 400);
    }

    const created = await Acao.create(payload);
    return sendSuccess(res, { data: mapMongoEntity(created.toObject()), message: 'Acao criada com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar acao', meta: { details: error.message } }, 500);
  }
});

router.put('/:id', requirePermission('actions:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Acao nao encontrada' }, 404);
    const current = await Acao.findById(req.params.id).lean();
    if (!current) return sendError(res, { message: 'Acao nao encontrada' }, 404);

    const payload = await sanitizePayload(req.body, current);
    if (!payload.titulo || !payload.descricao || !payload.empresaId || !payload.responsavelId) {
      return sendError(res, { message: 'titulo, descricao, empresaId e responsavelId sao obrigatorios' }, 400);
    }

    const updated = await Acao.findByIdAndUpdate(req.params.id, payload, { new: true }).lean();
    return sendSuccess(res, { data: mapMongoEntity(updated), message: 'Acao atualizada com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar acao', meta: { details: error.message } }, 500);
  }
});

router.delete('/:id', requirePermission('actions:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Acao nao encontrada' }, 404);
    const deleted = await Acao.findByIdAndDelete(req.params.id);
    if (!deleted) return sendError(res, { message: 'Acao nao encontrada' }, 404);
    return sendSuccess(res, { data: null, message: 'Acao excluida com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao excluir acao', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
