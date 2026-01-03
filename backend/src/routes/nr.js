const express = require('express');
const { nrs, getNrsByCnae, getChecklistByNr, calculateCompliance } = require('../data/nrData');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// GET /api/nr - Listar todas as NRs
router.get('/', (req, res) => {
  try {
    return sendSuccess(res, { data: nrs, meta: { total: nrs.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar NRs', meta: { details: error.message } }, 500);
  }
});

// GET /api/nr/cnae/:cnae - Buscar NRs aplicáveis por CNAE
router.get('/cnae/:cnae', (req, res) => {
  try {
    const { cnae } = req.params;
    const nrsAplicaveis = getNrsByCnae(cnae);

    return sendSuccess(res, { data: nrsAplicaveis, meta: { total: nrsAplicaveis.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar NRs por CNAE', meta: { details: error.message } }, 500);
  }
});

// GET /api/nr/:codigo/checklist - Buscar checklist por NR
router.get('/:codigo/checklist', (req, res) => {
  try {
    const { codigo } = req.params;
    const checklist = getChecklistByNr(codigo);

    return sendSuccess(res, { data: checklist, meta: { total: checklist.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar checklist da NR', meta: { details: error.message } }, 500);
  }
});

// GET /api/nr/compliance/:empresaId - Calcular conformidade da empresa
router.get('/compliance/:empresaId(\\d+)', (req, res) => {
  try {
    const { empresaId } = req.params;
    const { cnae } = req.query;

    if (!cnae) {
      return sendError(res, { message: 'CNAE é obrigatório para calcular conformidade' }, 400);
    }

    const compliance = calculateCompliance(empresaId, cnae);
    return sendSuccess(res, { data: compliance });
  } catch (error) {
    return sendError(res, { message: 'Erro ao calcular conformidade', meta: { details: error.message } }, 500);
  }
});

module.exports = router;

