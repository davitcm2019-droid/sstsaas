const express = require('express');
const {
  inspectionChecklists,
  inspections,
  createInspection,
  getChecklistsForCnae,
  getInspectionsByEmpresa,
  getInspectionsByInspector,
  calculateScore
} = require('../data/checklists');
const empresasRepository = require('../repositories/empresasRepository');
const { requirePermission } = require('../middleware/rbac');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

const resolveEmpresaFromId = async (empresaIdRaw) => {
  const id = String(empresaIdRaw || '').trim();
  if (!id) {
    const error = new Error('empresaId inválido');
    error.status = 400;
    throw error;
  }

  const empresa = await empresasRepository.findById(id);
  if (!empresa) {
    const error = new Error('Empresa não encontrada');
    error.status = 404;
    throw error;
  }

  return empresa;
};

const resolveCnaeFromEmpresaId = async (empresaIdRaw) => {
  const empresa = await resolveEmpresaFromId(empresaIdRaw);
  return String(empresa.cnae || '').trim();
};

// GET /api/checklists - Listar checklists disponíveis
router.get('/', requirePermission('checklists:read'), async (req, res) => {
  try {
    const { category, active, cnae, empresaId } = req.query;
    let filteredChecklists = [...inspectionChecklists];

    let cnaeToUse = typeof cnae === 'string' ? cnae.trim() : '';

    if (empresaId) {
      cnaeToUse = await resolveCnaeFromEmpresaId(empresaId);
    }

    if (cnaeToUse) {
      filteredChecklists = getChecklistsForCnae(cnaeToUse);
    }

    if (category) {
      filteredChecklists = filteredChecklists.filter((checklist) => checklist.category === category);
    }

    if (active === 'true' || active === 'false') {
      const isActive = active === 'true';
      filteredChecklists = filteredChecklists.filter((checklist) => checklist.active === isActive);
    }

    return sendSuccess(res, { data: filteredChecklists, meta: { total: filteredChecklists.length } });
  } catch (error) {
    const status = error.status || 500;
    if (status !== 500) {
      return sendError(res, { message: error.message }, status);
    }

    return sendError(res, { message: 'Erro ao buscar checklists', meta: { details: error.message } }, 500);
  }
});

// GET /api/checklists/categories - Listar categorias de checklists
router.get('/categories', requirePermission('checklists:read'), async (req, res) => {
  try {
    const { cnae, empresaId } = req.query;

    let checklists = [...inspectionChecklists];
    let cnaeToUse = typeof cnae === 'string' ? cnae.trim() : '';

    if (empresaId) {
      cnaeToUse = await resolveCnaeFromEmpresaId(empresaId);
    }

    if (cnaeToUse) {
      checklists = getChecklistsForCnae(cnaeToUse);
    }

    const categories = [...new Set(checklists.map((item) => item.category))].sort();
    return sendSuccess(res, { data: categories, meta: { total: categories.length } });
  } catch (error) {
    const status = error.status || 500;
    if (status !== 500) {
      return sendError(res, { message: error.message }, status);
    }

    return sendError(res, { message: 'Erro ao buscar categorias', meta: { details: error.message } }, 500);
  }
});

// POST /api/checklists/:id/inspection - Criar inspeção
router.post('/:id(\\d+)/inspection', requirePermission('inspections:write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const checklist = inspectionChecklists.find((c) => c.id === id);

    if (!checklist) {
      return sendError(res, { message: 'Checklist não encontrado' }, 404);
    }

    const empresaId = req.body?.empresaId;
    if (!empresaId) {
      return sendError(res, { message: 'empresaId é obrigatório' }, 400);
    }

    const empresa = await resolveEmpresaFromId(empresaId);

    const inspectionData = {
      checklistId: id,
      ...req.body,
      empresaNome: req.body?.empresaNome || empresa.nome,
      inspectorId: req.user?.id ?? req.body?.inspectorId,
      inspectorName: req.user?.nome ?? req.body?.inspectorName
    };

    const newInspection = createInspection(inspectionData);

    return sendSuccess(res, { data: newInspection, message: 'Inspeção criada com sucesso' }, 201);
  } catch (error) {
    const status = error.status || 500;
    if (status !== 500) {
      return sendError(res, { message: error.message }, status);
    }

    return sendError(res, { message: 'Erro ao criar inspeção', meta: { details: error.message } }, 500);
  }
});

// GET /api/checklists/inspections - Listar inspeções
router.get('/inspections', requirePermission('inspections:read'), (req, res) => {
  try {
    const { empresaId, inspectorId, status } = req.query;
    let filteredInspections = [...inspections];

    if (empresaId) {
      filteredInspections = getInspectionsByEmpresa(empresaId);
    }

    if (inspectorId) {
      filteredInspections = getInspectionsByInspector(inspectorId);
    }

    if (status) {
      filteredInspections = filteredInspections.filter((inspection) => inspection.status === status);
    }

    return sendSuccess(res, { data: filteredInspections, meta: { total: filteredInspections.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar inspeções', meta: { details: error.message } }, 500);
  }
});

// GET /api/checklists/inspections/stats - Estatísticas de inspeções
router.get('/inspections/stats', requirePermission('inspections:read'), (req, res) => {
  try {
    const stats = {
      total: inspections.length,
      completed: inspections.filter((i) => i.status === 'completed').length,
      inProgress: inspections.filter((i) => i.status === 'in_progress').length,
      averageScore: 0,
      porEmpresa: {},
      porInspector: {}
    };

    if (inspections.length > 0) {
      const totalScore = inspections.reduce((sum, inspection) => sum + inspection.score, 0);
      const totalMaxScore = inspections.reduce((sum, inspection) => sum + inspection.maxScore, 0);
      stats.averageScore = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
    }

    inspections.forEach((inspection) => {
      stats.porEmpresa[inspection.empresaNome] = (stats.porEmpresa[inspection.empresaNome] || 0) + 1;
      stats.porInspector[inspection.inspectorName] = (stats.porInspector[inspection.inspectorName] || 0) + 1;
    });

    return sendSuccess(res, { data: stats });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar estatísticas de inspeções', meta: { details: error.message } }, 500);
  }
});

// GET /api/checklists/inspections/:id - Buscar inspeção por ID
router.get('/inspections/:id(\\d+)', requirePermission('inspections:read'), (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const inspection = inspections.find((i) => i.id === id);

    if (!inspection) {
      return sendError(res, { message: 'Inspeção não encontrada' }, 404);
    }

    return sendSuccess(res, { data: inspection });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar inspeção', meta: { details: error.message } }, 500);
  }
});

// PUT /api/checklists/inspections/:id - Atualizar inspeção
router.put('/inspections/:id(\\d+)', requirePermission('inspections:write'), (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const inspectionIndex = inspections.findIndex((i) => i.id === id);

    if (inspectionIndex === -1) {
      return sendError(res, { message: 'Inspeção não encontrada' }, 404);
    }

    const updatedInspection = {
      ...inspections[inspectionIndex],
      ...req.body,
      id
    };

    if (req.body.items) {
      const scoreData = calculateScore(req.body.items);
      updatedInspection.score = scoreData.score;
      updatedInspection.maxScore = scoreData.maxScore;
    }

    inspections[inspectionIndex] = updatedInspection;

    return sendSuccess(res, { data: updatedInspection, message: 'Inspeção atualizada com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar inspeção', meta: { details: error.message } }, 500);
  }
});

// GET /api/checklists/:id - Buscar checklist por ID
router.get('/:id(\\d+)', requirePermission('checklists:read'), (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const checklist = inspectionChecklists.find((c) => c.id === id);

    if (!checklist) {
      return sendError(res, { message: 'Checklist não encontrado' }, 404);
    }

    return sendSuccess(res, { data: checklist });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar checklist', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
