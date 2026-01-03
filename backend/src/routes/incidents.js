const express = require('express');
const {
  incidents,
  incidentTypes,
  severityLevels,
  incidentStatus,
  createIncident,
  updateIncidentStatus,
  getIncidentsByEmpresa,
  getIncidentsByResponsavel,
  getIncidentStats
} = require('../data/incidents');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// GET /api/incidents/types - Listar tipos de incidente
router.get('/types', (req, res) => {
  try {
    return sendSuccess(res, { data: incidentTypes });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar tipos de incidente', meta: { details: error.message } }, 500);
  }
});

// GET /api/incidents/severity-levels - Listar níveis de severidade
router.get('/severity-levels', (req, res) => {
  try {
    return sendSuccess(res, { data: severityLevels });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar níveis de severidade', meta: { details: error.message } }, 500);
  }
});

// GET /api/incidents/status - Listar status de incidentes
router.get('/status', (req, res) => {
  try {
    return sendSuccess(res, { data: incidentStatus });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar status de incidentes', meta: { details: error.message } }, 500);
  }
});

// GET /api/incidents/stats - Estatísticas de incidentes
router.get('/stats', (req, res) => {
  try {
    const stats = getIncidentStats();
    return sendSuccess(res, { data: stats });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar estatísticas de incidentes', meta: { details: error.message } }, 500);
  }
});

// GET /api/incidents - Listar incidentes
router.get('/', (req, res) => {
  try {
    const { empresaId, responsavelId, tipo, severidade, status } = req.query;
    let filteredIncidents = [...incidents];

    if (empresaId) {
      filteredIncidents = getIncidentsByEmpresa(parseInt(empresaId, 10));
    }

    if (responsavelId) {
      filteredIncidents = getIncidentsByResponsavel(parseInt(responsavelId, 10));
    }

    if (tipo) {
      filteredIncidents = filteredIncidents.filter((incident) => incident.tipo === tipo);
    }

    if (severidade) {
      filteredIncidents = filteredIncidents.filter((incident) => incident.severidade === severidade);
    }

    if (status) {
      filteredIncidents = filteredIncidents.filter((incident) => incident.status === status);
    }

    return sendSuccess(res, { data: filteredIncidents, meta: { total: filteredIncidents.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar incidentes', meta: { details: error.message } }, 500);
  }
});

// POST /api/incidents - Criar incidente
router.post('/', (req, res) => {
  try {
    const newIncident = createIncident(req.body);
    return sendSuccess(res, { data: newIncident, message: 'Incidente criado com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar incidente', meta: { details: error.message } }, 500);
  }
});

// PUT /api/incidents/:id/status - Atualizar status do incidente
router.put('/:id(\\d+)/status', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;

    const incident = updateIncidentStatus(id, status);
    if (!incident) {
      return sendError(res, { message: 'Incidente não encontrado' }, 404);
    }

    return sendSuccess(res, { data: incident, message: 'Status do incidente atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar status do incidente', meta: { details: error.message } }, 500);
  }
});

// GET /api/incidents/:id - Buscar incidente por ID
router.get('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const incident = incidents.find((item) => item.id === id);

    if (!incident) {
      return sendError(res, { message: 'Incidente não encontrado' }, 404);
    }

    return sendSuccess(res, { data: incident });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar incidente', meta: { details: error.message } }, 500);
  }
});

// PUT /api/incidents/:id - Atualizar incidente
router.put('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const incidentIndex = incidents.findIndex((item) => item.id === id);

    if (incidentIndex === -1) {
      return sendError(res, { message: 'Incidente não encontrado' }, 404);
    }

    incidents[incidentIndex] = {
      ...incidents[incidentIndex],
      ...req.body,
      id
    };

    return sendSuccess(res, { data: incidents[incidentIndex], message: 'Incidente atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar incidente', meta: { details: error.message } }, 500);
  }
});

// DELETE /api/incidents/:id - Deletar incidente
router.delete('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const incidentIndex = incidents.findIndex((item) => item.id === id);

    if (incidentIndex === -1) {
      return sendError(res, { message: 'Incidente não encontrado' }, 404);
    }

    incidents.splice(incidentIndex, 1);

    return sendSuccess(res, { data: null, message: 'Incidente deletado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao deletar incidente', meta: { details: error.message } }, 500);
  }
});

module.exports = router;

