const express = require('express');
const empresasRepository = require('../repositories/empresasRepository');
const { requirePermission } = require('../middleware/rbac');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

const normalizeCnpj = (cnpj = '') => String(cnpj).replace(/\D/g, '').trim();

const normalizeStatus = (status) => {
  if (!status) return status;
  const normalized = String(status).trim().toLowerCase();
  if (normalized === 'ativa') return 'ativo';
  if (normalized === 'inativa') return 'inativo';
  return status;
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

// GET /api/empresas/:id - Buscar empresa por ID
router.get('/:id(\\d+)', requirePermission('companies:read'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const empresa = await empresasRepository.findById(id);

    if (!empresa) {
      return sendError(res, { message: 'Empresa não encontrada' }, 404);
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
    const cnpj = normalizeCnpj(req.body?.cnpj);
    const cnae = req.body?.cnae;

    if (!nome || !cnpj || !cnae) {
      return sendError(res, { message: 'Nome, CNPJ e CNAE são obrigatórios' }, 400);
    }

    const existing = await empresasRepository.findByCnpj(cnpj);
    if (existing) {
      return sendError(res, { message: 'CNPJ já cadastrado' }, 400);
    }

    const createdEmpresa = await empresasRepository.createEmpresa({
      nome,
      cnpj,
      cnae,
      ramo: req.body?.ramo || null,
      endereco: req.body?.endereco || null,
      cidade: req.body?.cidade || null,
      estado: req.body?.estado || null,
      cep: req.body?.cep || null,
      telefone: req.body?.telefone || null,
      email: req.body?.email || null,
      responsavel: req.body?.responsavel || null,
      status: normalizeStatus(req.body?.status) || 'ativo',
      conformidade: req.body?.conformidade || 'em_dia',
      pendencias: req.body?.pendencias ?? 0,
      alertas: req.body?.alertas ?? 0
    });

    return sendSuccess(res, { data: createdEmpresa, message: 'Empresa criada com sucesso' }, 201);
  } catch (error) {
    if (error?.code === '23505') {
      return sendError(res, { message: 'CNPJ já cadastrado' }, 400);
    }

    return sendError(res, { message: 'Erro ao criar empresa', meta: { details: error.message } }, 500);
  }
});

// PUT /api/empresas/:id - Atualizar empresa
router.put('/:id(\\d+)', requirePermission('companies:write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const currentEmpresa = await empresasRepository.findById(id);

    if (!currentEmpresa) {
      return sendError(res, { message: 'Empresa não encontrada' }, 404);
    }

    if (req.body?.cnpj !== undefined) {
      const cnpj = normalizeCnpj(req.body.cnpj);
      if (!cnpj) {
        return sendError(res, { message: 'CNPJ inválido' }, 400);
      }

      const existing = await empresasRepository.findByCnpj(cnpj);
      if (existing && existing.id !== id) {
        return sendError(res, { message: 'CNPJ já cadastrado' }, 400);
      }
    }

    const updates = { ...req.body };
    if (updates.cnpj !== undefined) updates.cnpj = normalizeCnpj(updates.cnpj);
    if (updates.status !== undefined) updates.status = normalizeStatus(updates.status);

    const updatedEmpresa = await empresasRepository.updateEmpresa(id, updates);

    return sendSuccess(res, { data: updatedEmpresa, message: 'Empresa atualizada com sucesso' });
  } catch (error) {
    if (error?.code === '23505') {
      return sendError(res, { message: 'CNPJ já cadastrado' }, 400);
    }

    return sendError(res, { message: 'Erro ao atualizar empresa', meta: { details: error.message } }, 500);
  }
});

// DELETE /api/empresas/:id - Deletar empresa
router.delete('/:id(\\d+)', requirePermission('companies:write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await empresasRepository.deleteEmpresa(id);

    if (!deleted) {
      return sendError(res, { message: 'Empresa não encontrada' }, 404);
    }

    return sendSuccess(res, { data: null, message: 'Empresa deletada com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao deletar empresa', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
