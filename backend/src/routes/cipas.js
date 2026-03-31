const express = require('express');
const { Cipa } = require('../models/legacyEntities');
const { requirePermission } = require('../middleware/rbac');
const lookupsRepository = require('../repositories/lookupsRepository');
const { createSearchRegex } = require('../utils/regex');
const { isValidObjectId, mapMongoEntity, normalizeRefId } = require('../utils/mongoEntity');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

const sanitizeMembros = (membros) => {
  if (!Array.isArray(membros)) return [];
  return membros.map((membro) => ({
    nome: String(membro?.nome || '').trim(),
    cargo: String(membro?.cargo || '').trim(),
    setor: String(membro?.setor || '').trim()
  }));
};

const sanitizePayload = async (payload = {}, current = null) => {
  const empresaId = payload.empresaId !== undefined ? normalizeRefId(payload.empresaId) : current?.empresaId || null;

  return {
    empresaId,
    empresaNome:
      payload.empresaNome !== undefined
        ? String(payload.empresaNome || '').trim()
        : empresaId
          ? await lookupsRepository.getEmpresaNomeById(empresaId)
          : current?.empresaNome || '',
    gestao: String(payload.gestao ?? current?.gestao ?? '').trim(),
    dataInicio: String(payload.dataInicio ?? current?.dataInicio ?? '').trim(),
    dataFim: String(payload.dataFim ?? current?.dataFim ?? '').trim(),
    presidente: String(payload.presidente ?? current?.presidente ?? '').trim(),
    vicePresidente: String(payload.vicePresidente ?? current?.vicePresidente ?? '').trim(),
    secretario: String(payload.secretario ?? current?.secretario ?? '').trim(),
    membros: sanitizeMembros(payload.membros !== undefined ? payload.membros : current?.membros),
    status: String(payload.status ?? current?.status ?? 'ativa').trim() || 'ativa',
    observacoes: String(payload.observacoes ?? current?.observacoes ?? '').trim()
  };
};

router.get('/', requirePermission('cipas:read'), async (req, res) => {
  try {
    const { status, gestao, search } = req.query;
    const filters = {};

    if (status) filters.status = String(status);
    if (gestao) filters.gestao = String(gestao);
    if (search) {
      const term = createSearchRegex(search);
      if (term) {
        filters.$or = [
          { empresaNome: term },
          { gestao: term },
          { presidente: term },
          { vicePresidente: term },
          { secretario: term }
        ];
      }
    }

    const rows = await Cipa.find(filters).sort({ createdAt: -1 }).lean();
    return sendSuccess(res, { data: rows.map(mapMongoEntity), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar CIPAs', meta: { details: error.message } }, 500);
  }
});

router.get('/:id', requirePermission('cipas:read'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'CIPA nao encontrada' }, 404);
    const cipa = await Cipa.findById(req.params.id).lean();
    if (!cipa) return sendError(res, { message: 'CIPA nao encontrada' }, 404);
    return sendSuccess(res, { data: mapMongoEntity(cipa) });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar CIPA', meta: { details: error.message } }, 500);
  }
});

router.post('/', requirePermission('cipas:write'), async (req, res) => {
  try {
    const payload = await sanitizePayload(req.body);
    if (!payload.empresaId || !payload.gestao || !payload.dataInicio || !payload.dataFim || !payload.presidente) {
      return sendError(res, { message: 'empresaId, gestao, dataInicio, dataFim e presidente sao obrigatorios' }, 400);
    }

    const created = await Cipa.create(payload);
    return sendSuccess(res, { data: mapMongoEntity(created.toObject()), message: 'CIPA criada com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar CIPA', meta: { details: error.message } }, 500);
  }
});

router.put('/:id', requirePermission('cipas:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'CIPA nao encontrada' }, 404);
    const current = await Cipa.findById(req.params.id).lean();
    if (!current) return sendError(res, { message: 'CIPA nao encontrada' }, 404);

    const payload = await sanitizePayload(req.body, current);
    if (!payload.empresaId || !payload.gestao || !payload.dataInicio || !payload.dataFim || !payload.presidente) {
      return sendError(res, { message: 'empresaId, gestao, dataInicio, dataFim e presidente sao obrigatorios' }, 400);
    }

    const updated = await Cipa.findByIdAndUpdate(req.params.id, payload, { new: true }).lean();
    return sendSuccess(res, { data: mapMongoEntity(updated), message: 'CIPA atualizada com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar CIPA', meta: { details: error.message } }, 500);
  }
});

router.delete('/:id', requirePermission('cipas:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'CIPA nao encontrada' }, 404);
    const deleted = await Cipa.findByIdAndDelete(req.params.id);
    if (!deleted) return sendError(res, { message: 'CIPA nao encontrada' }, 404);
    return sendSuccess(res, { data: null, message: 'CIPA excluida com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao excluir CIPA', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
