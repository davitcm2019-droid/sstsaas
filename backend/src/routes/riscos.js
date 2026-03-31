const express = require('express');
const { LegacyRisk } = require('../models/legacyEntities');
const { requirePermission } = require('../middleware/rbac');
const { isValidObjectId, mapMongoEntity, normalizeRefId } = require('../utils/mongoEntity');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

const sanitizeLegacyRiskPayload = (payload = {}, current = null) => ({
  empresaId: payload.empresaId !== undefined ? normalizeRefId(payload.empresaId) : current?.empresaId || null,
  tipo: String(payload.tipo ?? current?.tipo ?? '').trim(),
  descricao: String(payload.descricao ?? current?.descricao ?? '').trim(),
  classificacao: String(payload.classificacao ?? current?.classificacao ?? '').trim(),
  probabilidade: String(payload.probabilidade ?? current?.probabilidade ?? '').trim(),
  consequencia: String(payload.consequencia ?? current?.consequencia ?? '').trim(),
  medidasPreventivas: String(payload.medidasPreventivas ?? current?.medidasPreventivas ?? '').trim(),
  responsavel: String(payload.responsavel ?? current?.responsavel ?? '').trim(),
  dataIdentificacao: String(payload.dataIdentificacao ?? current?.dataIdentificacao ?? new Date().toISOString().split('T')[0]).trim(),
  status: String(payload.status ?? current?.status ?? 'ativo').trim() || 'ativo'
});

router.get('/', requirePermission('legacyRisks:read'), async (req, res) => {
  try {
    const { empresaId, tipo, classificacao, status } = req.query;
    const filters = {};

    if (empresaId) filters.empresaId = String(empresaId);
    if (tipo) filters.tipo = String(tipo);
    if (classificacao) filters.classificacao = String(classificacao);
    if (status) filters.status = String(status);

    const rows = await LegacyRisk.find(filters).sort({ createdAt: -1 }).lean();
    return sendSuccess(res, { data: rows.map(mapMongoEntity), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar riscos', meta: { details: error.message } }, 500);
  }
});

router.get('/:id', requirePermission('legacyRisks:read'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Risco nao encontrado' }, 404);
    const risk = await LegacyRisk.findById(req.params.id).lean();
    if (!risk) return sendError(res, { message: 'Risco nao encontrado' }, 404);
    return sendSuccess(res, { data: mapMongoEntity(risk) });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar risco', meta: { details: error.message } }, 500);
  }
});

router.post('/', requirePermission('legacyRisks:write'), async (req, res) => {
  try {
    const payload = sanitizeLegacyRiskPayload(req.body);
    if (!payload.descricao || !payload.tipo) {
      return sendError(res, { message: 'descricao e tipo sao obrigatorios' }, 400);
    }

    const created = await LegacyRisk.create(payload);
    return sendSuccess(res, { data: mapMongoEntity(created.toObject()), message: 'Risco criado com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar risco', meta: { details: error.message } }, 500);
  }
});

router.put('/:id', requirePermission('legacyRisks:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Risco nao encontrado' }, 404);
    const current = await LegacyRisk.findById(req.params.id).lean();
    if (!current) return sendError(res, { message: 'Risco nao encontrado' }, 404);

    const payload = sanitizeLegacyRiskPayload(req.body, current);
    if (!payload.descricao || !payload.tipo) {
      return sendError(res, { message: 'descricao e tipo sao obrigatorios' }, 400);
    }

    const updated = await LegacyRisk.findByIdAndUpdate(req.params.id, payload, { new: true }).lean();
    return sendSuccess(res, { data: mapMongoEntity(updated), message: 'Risco atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar risco', meta: { details: error.message } }, 500);
  }
});

router.delete('/:id', requirePermission('legacyRisks:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Risco nao encontrado' }, 404);
    const deleted = await LegacyRisk.findByIdAndDelete(req.params.id);
    if (!deleted) return sendError(res, { message: 'Risco nao encontrado' }, 404);
    return sendSuccess(res, { data: null, message: 'Risco deletado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao deletar risco', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
