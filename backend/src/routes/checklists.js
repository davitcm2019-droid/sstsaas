const express = require('express');
const {
  inspectionChecklists,
  inspections,
  createChecklist,
  createInspection,
  getInspectionsByEmpresa,
  getInspectionsByInspector,
  calculateScore
} = require('../data/checklists');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// GET /api/checklists - Listar checklists disponíveis
router.get('/', (req, res) => {
  try {
    const { category, active } = req.query;
    let filteredChecklists = [...inspectionChecklists];

    if (category) {
      filteredChecklists = filteredChecklists.filter((checklist) => checklist.category === category);
    }

    if (active !== undefined) {
      filteredChecklists = filteredChecklists.filter((checklist) => checklist.active === (active === 'true'));
    }

    return sendSuccess(res, { data: filteredChecklists, meta: { total: filteredChecklists.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar checklists', meta: { details: error.message } }, 500);
  }
});

// GET /api/checklists/categories - Listar categorias de checklists
router.get('/categories', (req, res) => {
  try {
    const categories = [...new Set(inspectionChecklists.map((c) => c.category))];
    return sendSuccess(res, { data: categories, meta: { total: categories.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar categorias', meta: { details: error.message } }, 500);
  }
});

// POST /api/checklists - Criar checklist
router.post('/', (req, res) => {
  try {
    const result = createChecklist(req.body);
    const statusCode = result.created ? 201 : 200;

    return sendSuccess(
      res,
      {
        data: result.checklist,
        message: result.created ? 'Checklist criado com sucesso' : 'Checklist já existe'
      },
      statusCode
    );
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    return sendError(res, { message: 'Erro ao criar checklist', meta: { details: error.message } }, statusCode);
  }
});

// POST /api/checklists/:id/inspection - Criar inspeção
router.post('/:id(\\d+)/inspection', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const checklist = inspectionChecklists.find((c) => c.id === id);

    if (!checklist) {
      return sendError(res, { message: 'Checklist não encontrado' }, 404);
    }

    const inspectionData = {
      checklistId: id,
      ...req.body
    };

    const newInspection = createInspection(inspectionData);

    return sendSuccess(res, { data: newInspection, message: 'Inspeção criada com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar inspeção', meta: { details: error.message } }, 500);
  }
});

// GET /api/checklists/inspections - Listar inspeções
router.get('/inspections', (req, res) => {
  try {
    const { empresaId, inspectorId, status } = req.query;
    let filteredInspections = [...inspections];

    if (empresaId) {
      filteredInspections = getInspectionsByEmpresa(parseInt(empresaId, 10));
    }

    if (inspectorId) {
      filteredInspections = getInspectionsByInspector(parseInt(inspectorId, 10));
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
router.get('/inspections/stats', (req, res) => {
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
router.get('/inspections/:id(\\d+)', (req, res) => {
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
router.put('/inspections/:id(\\d+)', (req, res) => {
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
      const scoreData = calculateScore(req.body.items, updatedInspection.checklistId);
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
router.get('/:id(\\d+)', (req, res) => {
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
