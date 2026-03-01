const express = require('express');
const {
  inspectionChecklists,
  inspections,
  createInspection,
  getChecklistsForCnae,
  calculateScore
} = require('../data/checklists');
const empresasRepository = require('../repositories/empresasRepository');
const { requirePermission } = require('../middleware/rbac');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

const NON_FILTERABLE_CNAE_VALUES = new Set(['A_DEFINIR', 'N/A', 'NA', '-', '']);

const normalizeCnaeFilter = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (NON_FILTERABLE_CNAE_VALUES.has(normalized.toUpperCase())) return '';
  return normalized;
};

const getChecklistById = (checklistId) =>
  inspectionChecklists.find((checklist) => checklist.id === Number.parseInt(checklistId, 10)) || null;

const sortByDateDesc = (list = []) =>
  [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const resolveEmpresaFromId = async (empresaIdRaw) => {
  const id = String(empresaIdRaw || '').trim();
  if (!id) {
    const error = new Error('empresaId invalido');
    error.status = 400;
    throw error;
  }

  const empresa = await empresasRepository.findById(id);
  if (!empresa) {
    const error = new Error('Empresa nao encontrada');
    error.status = 404;
    throw error;
  }

  return empresa;
};

const resolveCnaeFromEmpresaId = async (empresaIdRaw) => {
  const empresa = await resolveEmpresaFromId(empresaIdRaw);
  return normalizeCnaeFilter(empresa.cnae);
};

const sanitizeInspectionItems = (checklist, itemsRaw) => {
  const rawItems = Array.isArray(itemsRaw) ? itemsRaw : [];
  const rawById = new Map();

  rawItems.forEach((raw) => {
    const id = String(raw?.itemId || '').trim();
    if (id) rawById.set(id, raw);
  });

  return (checklist?.items || []).map((checklistItem) => {
    const itemId = String(checklistItem.id);
    const raw = rawById.get(itemId);
    const options = Array.isArray(checklistItem.options) ? checklistItem.options : [];
    const selected = options.find((option) => option.value === raw?.answer) || null;

    return {
      itemId,
      answer: selected ? selected.value : null,
      score: selected ? Number(selected.score) || 0 : 0,
      observations: String(raw?.observations || '').trim()
    };
  });
};

const hasMissingRequiredAnswers = (checklist, items) => {
  const answersById = new Map((items || []).map((item) => [String(item.itemId), item]));
  return (checklist?.items || []).some((checklistItem) => {
    if (checklistItem.required === false) return false;
    const answer = answersById.get(String(checklistItem.id))?.answer;
    return answer === null || answer === undefined;
  });
};

// GET /api/checklists - Listar checklists disponiveis
router.get('/', requirePermission('checklists:read'), async (req, res) => {
  try {
    const { category, active, cnae, empresaId } = req.query;
    let filteredChecklists = [...inspectionChecklists];

    let cnaeToUse = normalizeCnaeFilter(cnae);
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
    if (status !== 500) return sendError(res, { message: error.message }, status);
    return sendError(res, { message: 'Erro ao buscar checklists', meta: { details: error.message } }, 500);
  }
});

// GET /api/checklists/categories - Listar categorias de checklists
router.get('/categories', requirePermission('checklists:read'), async (req, res) => {
  try {
    const { cnae, empresaId } = req.query;
    let checklists = [...inspectionChecklists];

    let cnaeToUse = normalizeCnaeFilter(cnae);
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
    if (status !== 500) return sendError(res, { message: error.message }, status);
    return sendError(res, { message: 'Erro ao buscar categorias', meta: { details: error.message } }, 500);
  }
});

// POST /api/checklists/:id/inspection - Criar inspecao
router.post('/:id(\\d+)/inspection', requirePermission('inspections:write'), async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const checklist = getChecklistById(id);
    if (!checklist) {
      return sendError(res, { message: 'Checklist nao encontrado' }, 404);
    }

    const empresaId = req.body?.empresaId;
    if (!empresaId) {
      return sendError(res, { message: 'empresaId e obrigatorio' }, 400);
    }

    const empresa = await resolveEmpresaFromId(empresaId);
    const items = sanitizeInspectionItems(checklist, req.body?.items);

    if (hasMissingRequiredAnswers(checklist, items)) {
      return sendError(res, { message: 'Existem itens obrigatorios sem resposta.' }, 400);
    }

    const inspectionData = {
      ...req.body,
      checklistId: id,
      empresaId: String(empresa.id),
      empresaNome: empresa.nome,
      inspectorId: req.user?.id ?? req.body?.inspectorId,
      inspectorName: req.user?.nome ?? req.body?.inspectorName,
      items,
      status: 'completed'
    };

    const newInspection = createInspection(inspectionData);
    return sendSuccess(res, { data: newInspection, message: 'Inspecao criada com sucesso' }, 201);
  } catch (error) {
    const status = error.status || 500;
    if (status !== 500) return sendError(res, { message: error.message }, status);
    return sendError(res, { message: 'Erro ao criar inspecao', meta: { details: error.message } }, 500);
  }
});

// GET /api/checklists/inspections - Listar inspecoes
router.get('/inspections', requirePermission('inspections:read'), (req, res) => {
  try {
    const { empresaId, inspectorId, status } = req.query;
    let filteredInspections = [...inspections];

    if (empresaId) {
      const normalized = String(empresaId).trim();
      filteredInspections = filteredInspections.filter(
        (inspection) => String(inspection.empresaId) === normalized
      );
    }

    if (inspectorId) {
      const normalized = String(inspectorId).trim();
      filteredInspections = filteredInspections.filter(
        (inspection) => String(inspection.inspectorId) === normalized
      );
    }

    if (status) {
      filteredInspections = filteredInspections.filter((inspection) => inspection.status === status);
    }

    return sendSuccess(res, {
      data: sortByDateDesc(filteredInspections),
      meta: { total: filteredInspections.length }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar inspecoes', meta: { details: error.message } }, 500);
  }
});

// GET /api/checklists/inspections/stats - Estatisticas de inspecoes
router.get('/inspections/stats', requirePermission('inspections:read'), (req, res) => {
  try {
    const stats = {
      total: inspections.length,
      completed: inspections.filter((item) => item.status === 'completed').length,
      inProgress: inspections.filter((item) => item.status === 'in_progress').length,
      averageScore: 0,
      porEmpresa: {},
      porInspector: {}
    };

    if (inspections.length > 0) {
      const totalScore = inspections.reduce((sum, inspection) => sum + (Number(inspection.score) || 0), 0);
      const totalMaxScore = inspections.reduce(
        (sum, inspection) => sum + (Number(inspection.maxScore) || 0),
        0
      );
      stats.averageScore = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
    }

    inspections.forEach((inspection) => {
      const empresaNome = inspection.empresaNome || 'Sem empresa';
      const inspectorName = inspection.inspectorName || 'Sem inspetor';
      stats.porEmpresa[empresaNome] = (stats.porEmpresa[empresaNome] || 0) + 1;
      stats.porInspector[inspectorName] = (stats.porInspector[inspectorName] || 0) + 1;
    });

    return sendSuccess(res, { data: stats });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar estatisticas de inspecoes', meta: { details: error.message } }, 500);
  }
});

// GET /api/checklists/inspections/:id - Buscar inspecao por ID
router.get('/inspections/:id(\\d+)', requirePermission('inspections:read'), (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const inspection = inspections.find((item) => item.id === id);

    if (!inspection) {
      return sendError(res, { message: 'Inspecao nao encontrada' }, 404);
    }

    return sendSuccess(res, { data: inspection });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar inspecao', meta: { details: error.message } }, 500);
  }
});

// PUT /api/checklists/inspections/:id - Atualizar inspecao
router.put('/inspections/:id(\\d+)', requirePermission('inspections:write'), (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const inspectionIndex = inspections.findIndex((item) => item.id === id);
    if (inspectionIndex === -1) {
      return sendError(res, { message: 'Inspecao nao encontrada' }, 404);
    }

    const existing = inspections[inspectionIndex];
    const checklist = getChecklistById(existing.checklistId);

    const updatedInspection = {
      ...existing,
      ...req.body,
      id,
      checklistId: existing.checklistId,
      empresaId: existing.empresaId,
      empresaNome: existing.empresaNome
    };

    if (req.body.items && checklist) {
      const items = sanitizeInspectionItems(checklist, req.body.items);
      updatedInspection.items = items;

      if (updatedInspection.status === 'completed' && hasMissingRequiredAnswers(checklist, items)) {
        return sendError(res, { message: 'Existem itens obrigatorios sem resposta.' }, 400);
      }

      const scoreData = calculateScore(items, existing.checklistId);
      updatedInspection.score = scoreData.score;
      updatedInspection.maxScore = scoreData.maxScore;
    }

    inspections[inspectionIndex] = updatedInspection;
    return sendSuccess(res, { data: updatedInspection, message: 'Inspecao atualizada com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar inspecao', meta: { details: error.message } }, 500);
  }
});

// GET /api/checklists/:id - Buscar checklist por ID
router.get('/:id(\\d+)', requirePermission('checklists:read'), (req, res) => {
  try {
    const checklist = getChecklistById(req.params.id);
    if (!checklist) {
      return sendError(res, { message: 'Checklist nao encontrado' }, 404);
    }
    return sendSuccess(res, { data: checklist });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar checklist', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
