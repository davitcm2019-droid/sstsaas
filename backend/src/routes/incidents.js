const express = require('express');
const { Incident } = require('../models/legacyEntities');
const { incidentTypes, severityLevels, incidentStatus } = require('../data/incidents');
const { requirePermission } = require('../middleware/rbac');
const { isValidObjectId, mapMongoEntity, normalizeRefId } = require('../utils/mongoEntity');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeIncidentPayload = (payload = {}, current = null, actor = null) => {
  const diretos = toNumber(payload.custos?.diretos ?? current?.custos?.diretos, 0);
  const indiretos = toNumber(payload.custos?.indiretos ?? current?.custos?.indiretos, 0);
  const total = payload.custos?.total !== undefined ? toNumber(payload.custos.total, diretos + indiretos) : diretos + indiretos;

  return {
    titulo: String(payload.titulo ?? current?.titulo ?? '').trim(),
    descricao: String(payload.descricao ?? current?.descricao ?? '').trim(),
    empresaId: payload.empresaId !== undefined ? normalizeRefId(payload.empresaId) : current?.empresaId || null,
    empresaNome: String(payload.empresaNome ?? current?.empresaNome ?? '').trim(),
    local: String(payload.local ?? current?.local ?? '').trim(),
    tipo: String(payload.tipo ?? current?.tipo ?? 'quase_acidente').trim() || 'quase_acidente',
    severidade: String(payload.severidade ?? current?.severidade ?? 'baixa').trim() || 'baixa',
    status: String(payload.status ?? current?.status ?? 'registrado').trim() || 'registrado',
    dataRegistro: String(payload.dataRegistro ?? current?.dataRegistro ?? new Date().toISOString()).trim(),
    dataOcorrencia: String(payload.dataOcorrencia ?? current?.dataOcorrencia ?? new Date().toISOString()).trim(),
    responsavelRegistroId:
      payload.responsavelRegistroId !== undefined
        ? normalizeRefId(payload.responsavelRegistroId)
        : current?.responsavelRegistroId || actor?.id || null,
    responsavelRegistro: String(payload.responsavelRegistro ?? current?.responsavelRegistro ?? actor?.nome ?? '').trim(),
    fotos: Array.isArray(payload.fotos) ? payload.fotos : current?.fotos || [],
    documentos: Array.isArray(payload.documentos) ? payload.documentos : current?.documentos || [],
    custos: {
      diretos,
      indiretos,
      total
    },
    tempoPerdido: toNumber(payload.tempoPerdido ?? current?.tempoPerdido, 0),
    afastamentos: toNumber(payload.afastamentos ?? current?.afastamentos, 0),
    testemunhas: Array.isArray(payload.testemunhas) ? payload.testemunhas : current?.testemunhas || [],
    causas: Array.isArray(payload.causas) ? payload.causas : current?.causas || [],
    acoesCorretivas: Array.isArray(payload.acoesCorretivas) ? payload.acoesCorretivas : current?.acoesCorretivas || []
  };
};

const buildStats = (rows) => {
  const stats = {
    total: rows.length,
    porTipo: {},
    porSeveridade: {},
    porStatus: {},
    custosTotais: 0,
    tempoPerdidoTotal: 0,
    afastamentosTotal: 0
  };

  rows.forEach((incident) => {
    stats.porTipo[incident.tipo] = (stats.porTipo[incident.tipo] || 0) + 1;
    stats.porSeveridade[incident.severidade] = (stats.porSeveridade[incident.severidade] || 0) + 1;
    stats.porStatus[incident.status] = (stats.porStatus[incident.status] || 0) + 1;
    stats.custosTotais += Number(incident.custos?.total || 0);
    stats.tempoPerdidoTotal += Number(incident.tempoPerdido || 0);
    stats.afastamentosTotal += Number(incident.afastamentos || 0);
  });

  return stats;
};

router.get('/types', requirePermission('incidents:read'), (req, res) => {
  try {
    return sendSuccess(res, { data: incidentTypes });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar tipos de incidente', meta: { details: error.message } }, 500);
  }
});

router.get('/severity-levels', requirePermission('incidents:read'), (req, res) => {
  try {
    return sendSuccess(res, { data: severityLevels });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar niveis de severidade', meta: { details: error.message } }, 500);
  }
});

router.get('/status', requirePermission('incidents:read'), (req, res) => {
  try {
    return sendSuccess(res, { data: incidentStatus });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar status de incidentes', meta: { details: error.message } }, 500);
  }
});

router.get('/stats', requirePermission('incidents:read'), async (req, res) => {
  try {
    const rows = await Incident.find({}).lean();
    return sendSuccess(res, { data: buildStats(rows) });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar estatisticas de incidentes', meta: { details: error.message } }, 500);
  }
});

router.get('/', requirePermission('incidents:read'), async (req, res) => {
  try {
    const { empresaId, responsavelId, tipo, severidade, status } = req.query;
    const filters = {};

    if (empresaId) filters.empresaId = String(empresaId);
    if (responsavelId) filters.responsavelRegistroId = String(responsavelId);
    if (tipo) filters.tipo = String(tipo);
    if (severidade) filters.severidade = String(severidade);
    if (status) filters.status = String(status);

    const rows = await Incident.find(filters).sort({ dataOcorrencia: -1, createdAt: -1 }).lean();
    return sendSuccess(res, { data: rows.map(mapMongoEntity), meta: { total: rows.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar incidentes', meta: { details: error.message } }, 500);
  }
});

router.post('/', requirePermission('incidents:write'), async (req, res) => {
  try {
    const payload = sanitizeIncidentPayload(req.body, null, req.user);
    if (!payload.titulo || !payload.empresaId || !payload.local || !payload.dataOcorrencia || !payload.responsavelRegistro) {
      return sendError(res, { message: 'titulo, empresaId, local, dataOcorrencia e responsavelRegistro sao obrigatorios' }, 400);
    }

    const created = await Incident.create(payload);
    return sendSuccess(res, { data: mapMongoEntity(created.toObject()), message: 'Incidente criado com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar incidente', meta: { details: error.message } }, 500);
  }
});

router.put('/:id/status', requirePermission('incidents:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Incidente nao encontrado' }, 404);
    const updated = await Incident.findByIdAndUpdate(
      req.params.id,
      { status: String(req.body?.status || '').trim() },
      { new: true }
    ).lean();

    if (!updated) return sendError(res, { message: 'Incidente nao encontrado' }, 404);
    return sendSuccess(res, { data: mapMongoEntity(updated), message: 'Status do incidente atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar status do incidente', meta: { details: error.message } }, 500);
  }
});

router.get('/:id', requirePermission('incidents:read'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Incidente nao encontrado' }, 404);
    const incident = await Incident.findById(req.params.id).lean();
    if (!incident) return sendError(res, { message: 'Incidente nao encontrado' }, 404);
    return sendSuccess(res, { data: mapMongoEntity(incident) });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar incidente', meta: { details: error.message } }, 500);
  }
});

router.put('/:id', requirePermission('incidents:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Incidente nao encontrado' }, 404);
    const current = await Incident.findById(req.params.id).lean();
    if (!current) return sendError(res, { message: 'Incidente nao encontrado' }, 404);

    const payload = sanitizeIncidentPayload(req.body, current, req.user);
    if (!payload.titulo || !payload.empresaId || !payload.local || !payload.dataOcorrencia || !payload.responsavelRegistro) {
      return sendError(res, { message: 'titulo, empresaId, local, dataOcorrencia e responsavelRegistro sao obrigatorios' }, 400);
    }

    const updated = await Incident.findByIdAndUpdate(req.params.id, payload, { new: true }).lean();
    return sendSuccess(res, { data: mapMongoEntity(updated), message: 'Incidente atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar incidente', meta: { details: error.message } }, 500);
  }
});

router.delete('/:id', requirePermission('incidents:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Incidente nao encontrado' }, 404);
    const deleted = await Incident.findByIdAndDelete(req.params.id);
    if (!deleted) return sendError(res, { message: 'Incidente nao encontrado' }, 404);
    return sendSuccess(res, { data: null, message: 'Incidente deletado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao deletar incidente', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
