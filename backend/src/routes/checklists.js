const express = require('express');
const {
  inspectionChecklists,
  getChecklistsForCnae,
  calculateScore,
  getCnaeCatalog
} = require('../data/checklists');
const { Inspection } = require('../models/legacyEntities');
const empresasRepository = require('../repositories/empresasRepository');
const { requirePermission } = require('../middleware/rbac');
const { isValidObjectId, mapMongoEntity } = require('../utils/mongoEntity');
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

    const scoreData = calculateScore(items, id);
    const created = await Inspection.create({
      ...req.body,
      checklistId: id,
      empresaId: String(empresa.id),
      empresaNome: empresa.nome,
      inspectorId: req.user?.id ?? req.body?.inspectorId ?? null,
      inspectorName: req.user?.nome ?? req.body?.inspectorName ?? '',
      items,
      status: 'completed',
      score: scoreData.score,
      maxScore: scoreData.maxScore,
      date: new Date().toISOString()
    });

    return sendSuccess(res, { data: mapMongoEntity(created.toObject()), message: 'Inspecao criada com sucesso' }, 201);
  } catch (error) {
    const status = error.status || 500;
    if (status !== 500) return sendError(res, { message: error.message }, status);
    return sendError(res, { message: 'Erro ao criar inspecao', meta: { details: error.message } }, 500);
  }
});

router.get('/inspections', requirePermission('inspections:read'), async (req, res) => {
  try {
    const { empresaId, inspectorId, status } = req.query;
    const filters = {};

    if (empresaId) filters.empresaId = String(empresaId).trim();
    if (inspectorId) filters.inspectorId = String(inspectorId).trim();
    if (status) filters.status = String(status);

    const rows = await Inspection.find(filters).sort({ date: -1, createdAt: -1 }).lean();
    return sendSuccess(res, {
      data: rows.map(mapMongoEntity),
      meta: { total: rows.length }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar inspecoes', meta: { details: error.message } }, 500);
  }
});

router.get('/inspections/stats', requirePermission('inspections:read'), async (req, res) => {
  try {
    const inspections = await Inspection.find({}).lean();
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
      const totalMaxScore = inspections.reduce((sum, inspection) => sum + (Number(inspection.maxScore) || 0), 0);
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

router.get('/inspections/:id', requirePermission('inspections:read'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Inspecao nao encontrada' }, 404);
    const inspection = await Inspection.findById(req.params.id).lean();
    if (!inspection) {
      return sendError(res, { message: 'Inspecao nao encontrada' }, 404);
    }

    return sendSuccess(res, { data: mapMongoEntity(inspection) });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar inspecao', meta: { details: error.message } }, 500);
  }
});

router.put('/inspections/:id', requirePermission('inspections:write'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, { message: 'Inspecao nao encontrada' }, 404);
    const existing = await Inspection.findById(req.params.id).lean();
    if (!existing) {
      return sendError(res, { message: 'Inspecao nao encontrada' }, 404);
    }

    const checklist = getChecklistById(existing.checklistId);
    const updatedInspection = {
      ...existing,
      ...req.body,
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

    const updated = await Inspection.findByIdAndUpdate(req.params.id, updatedInspection, { new: true }).lean();
    return sendSuccess(res, { data: mapMongoEntity(updated), message: 'Inspecao atualizada com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar inspecao', meta: { details: error.message } }, 500);
  }
});

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
