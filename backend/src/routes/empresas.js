const express = require('express');
const empresasRepository = require('../repositories/empresasRepository');
const { requirePermission } = require('../middleware/rbac');
const { sendSuccess, sendError } = require('../utils/response');
const { getCnaeCatalog } = require('../data/checklists');

const router = express.Router();

const CNAE_PENDING_VALUE = 'A_DEFINIR';

const normalizeDocumento = (documento = '') => String(documento).replace(/\D/g, '').trim();

const isValidDocumento = (documento = '') => {
  const normalized = normalizeDocumento(documento);
  return normalized.length === 11 || normalized.length === 14;
};

const normalizeStatus = (status) => {
  if (!status) return null;
  const normalized = String(status).trim().toLowerCase();
  if (normalized === 'ativa' || normalized === 'ativo') return 'ativo';
  if (normalized === 'inativa' || normalized === 'inativo') return 'inativo';
  return null;
};

const normalizeConformidade = (conformidade) => {
  if (!conformidade) return 'em_dia';
  const normalized = String(conformidade).trim().toLowerCase();
  if (['em dia', 'emdia', 'em_dia'].includes(normalized)) return 'em_dia';
  if (['atrasado', 'atrasada'].includes(normalized)) return 'atrasado';
  if (['pendente', 'pendencia'].includes(normalized)) return 'pendente';
  return 'em_dia';
};

const parseNonNegativeInt = (value, fallback = 0) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return fallback;
  return parsed;
};

const templateFields = {
  required: ['nome', 'documento', 'status'],
  optional: [],
  acceptedDocumentFields: ['documento', 'cnpj', 'cpf'],
  acceptedStatus: ['ativa', 'inativa']
};

const buildEmpresaPayload = (row = {}) => ({
  nome: row.nome,
  cnpj: normalizeDocumento(row.documento || row.cnpj || row.cpf),
  cnae: row.cnae || CNAE_PENDING_VALUE,
  ramo: row.ramo || null,
  endereco: row.endereco || null,
  cidade: row.cidade || null,
  estado: row.estado || null,
  cep: row.cep || null,
  telefone: row.telefone || null,
  email: row.email || null,
  responsavel: row.responsavel || null,
  status: normalizeStatus(row.status),
  conformidade: normalizeConformidade(row.conformidade),
  pendencias: parseNonNegativeInt(row.pendencias, 0),
  alertas: parseNonNegativeInt(row.alertas, 0)
});

const validateImportRow = (payload) => {
  if (!payload.nome || !payload.cnpj || !payload.status) {
    return 'Campos obrigatorios ausentes (nome, documento/cnpj/cpf, status)';
  }

  if (!isValidDocumento(payload.cnpj)) {
    return 'Documento invalido. Use CNPJ (14) ou CPF (11) sem mascara';
  }

  if (!normalizeStatus(payload.status)) {
    return 'Status invalido. Use ativa ou inativa';
  }

  return null;
};

// GET /api/empresas - Listar todas as empresas
router.get('/', requirePermission('companies:read'), async (req, res) => {
  try {
    const { cnae, status, conformidade, search } = req.query;
    const empresas = await empresasRepository.listEmpresas({ cnae, status, conformidade, search });

    return sendSuccess(res, {
      data: empresas,
      meta: { total: empresas.length }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar empresas', meta: { details: error.message } }, 500);
  }
});

// GET /api/empresas/import-template - Modelo para importacao
router.get('/import-template', requirePermission('companies:read'), (req, res) => {
  return sendSuccess(res, {
    data: templateFields,
    message: 'Modelo de importacao carregado com sucesso'
  });
});

// GET /api/empresas/cnaes - Lista geral de CNAEs para selecao
router.get('/cnaes', requirePermission('companies:read'), (req, res) => {
  try {
    const cnaes = getCnaeCatalog({ search: req.query?.search, limit: req.query?.limit });
    return sendSuccess(res, {
      data: cnaes,
      meta: { total: cnaes.length }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar CNAEs', meta: { details: error.message } }, 500);
  }
});

// POST /api/empresas/import - Importar empresas via planilha
router.post('/import', requirePermission('companies:write'), async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.empresas) ? req.body.empresas : [];
    if (!rows.length) {
      return sendError(res, { message: 'Nenhuma empresa enviada para importacao' }, 400);
    }

    const imported = [];
    const skipped = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const line = index + 2;
      const payload = buildEmpresaPayload(row);

      const validationError = validateImportRow(payload);
      if (validationError) {
        skipped.push({ line, reason: validationError });
        continue;
      }

      const existing = await empresasRepository.findByCnpj(payload.cnpj);
      if (existing) {
        skipped.push({
          line,
          reason: `Documento ja cadastrado (${payload.cnpj})`
        });
        continue;
      }

      try {
        const created = await empresasRepository.createEmpresa(payload);
        imported.push(created);
      } catch (error) {
        skipped.push({
          line,
          reason: error?.code === 11000 ? `Documento ja cadastrado (${payload.cnpj})` : error.message
        });
      }
    }

    return sendSuccess(res, {
      data: {
        imported,
        skipped,
        summary: {
          total: rows.length,
          imported: imported.length,
          skipped: skipped.length
        },
        templateFields
      },
      message: 'Importacao processada'
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao importar empresas', meta: { details: error.message } }, 500);
  }
});

// GET /api/empresas/:id - Buscar empresa por ID
router.get('/:id([a-fA-F0-9]{24})', requirePermission('companies:read'), async (req, res) => {
  try {
    const empresa = await empresasRepository.findById(req.params.id);

    if (!empresa) {
      return sendError(res, { message: 'Empresa nao encontrada' }, 404);
    }

    return sendSuccess(res, { data: empresa });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar empresa', meta: { details: error.message } }, 500);
  }
});

// POST /api/empresas - Criar nova empresa
router.post('/', requirePermission('companies:write'), async (req, res) => {
  try {
    const nome = req.body?.nome;
    const cnpj = normalizeDocumento(req.body?.cnpj);
    const cnae = req.body?.cnae;
    const status = normalizeStatus(req.body?.status) || 'ativo';

    if (!nome || !cnpj || !cnae) {
      return sendError(res, { message: 'Nome, CNPJ/CPF e CNAE sao obrigatorios' }, 400);
    }

    if (!isValidDocumento(cnpj)) {
      return sendError(res, { message: 'CNPJ/CPF invalido' }, 400);
    }

    const existing = await empresasRepository.findByCnpj(cnpj);
    if (existing) {
      return sendError(res, { message: 'Documento ja cadastrado' }, 400);
    }

    const createdEmpresa = await empresasRepository.createEmpresa(
      buildEmpresaPayload({
        ...req.body,
        nome,
        cnpj,
        cnae,
        status
      })
    );

    return sendSuccess(res, { data: createdEmpresa, message: 'Empresa criada com sucesso' }, 201);
  } catch (error) {
    if (error?.code === '23505' || error?.code === 11000) {
      return sendError(res, { message: 'Documento ja cadastrado' }, 400);
    }

    return sendError(res, { message: 'Erro ao criar empresa', meta: { details: error.message } }, 500);
  }
});

// PUT /api/empresas/:id - Atualizar empresa
router.put('/:id([a-fA-F0-9]{24})', requirePermission('companies:write'), async (req, res) => {
  try {
    const id = req.params.id;
    const currentEmpresa = await empresasRepository.findById(id);

    if (!currentEmpresa) {
      return sendError(res, { message: 'Empresa nao encontrada' }, 404);
    }

    if (req.body?.cnpj !== undefined) {
      const cnpj = normalizeDocumento(req.body.cnpj);
      if (!cnpj || !isValidDocumento(cnpj)) {
        return sendError(res, { message: 'CNPJ/CPF invalido' }, 400);
      }

      const existing = await empresasRepository.findByCnpj(cnpj);
      if (existing && existing.id !== id) {
        return sendError(res, { message: 'Documento ja cadastrado' }, 400);
      }
    }

    const updates = { ...req.body };
    if (updates.cnpj !== undefined) updates.cnpj = normalizeDocumento(updates.cnpj);
    if (updates.status !== undefined) {
      const normalizedStatus = normalizeStatus(updates.status);
      if (!normalizedStatus) {
        return sendError(res, { message: 'Status invalido. Use ativa ou inativa' }, 400);
      }
      updates.status = normalizedStatus;
    }

    const updatedEmpresa = await empresasRepository.updateEmpresa(id, updates);

    return sendSuccess(res, { data: updatedEmpresa, message: 'Empresa atualizada com sucesso' });
  } catch (error) {
    if (error?.code === '23505' || error?.code === 11000) {
      return sendError(res, { message: 'Documento ja cadastrado' }, 400);
    }

    return sendError(res, { message: 'Erro ao atualizar empresa', meta: { details: error.message } }, 500);
  }
});

// DELETE /api/empresas/:id - Deletar empresa
router.delete('/:id([a-fA-F0-9]{24})', requirePermission('companies:write'), async (req, res) => {
  try {
    const deleted = await empresasRepository.deleteEmpresa(req.params.id);

    if (!deleted) {
      return sendError(res, { message: 'Empresa nao encontrada' }, 404);
    }

    return sendSuccess(res, { data: null, message: 'Empresa deletada com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao deletar empresa', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
