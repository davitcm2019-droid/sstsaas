const express = require('express');
const { empresas } = require('../data/mockData');
const { addAuditLog } = require('../data/auditLog');
const { config } = require('../config');
const { lookupCnpjOnCnpja, mapCnpjaOfficeToEmpresaDTO } = require('../services/cnpja');
const { isValidCnpj, sanitizeCnpj } = require('../utils/cnpj');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

const toLower = (value = '') => String(value).toLowerCase();

// POST /api/empresas/lookup-cnpj - Consultar CNPJ via CNPJA (Open)
router.post('/lookup-cnpj', async (req, res) => {
  const rawCnpj = req.body?.cnpj;
  const cnpjDigits = sanitizeCnpj(rawCnpj);

  if (!cnpjDigits) {
    return sendError(res, { message: 'CNPJ é obrigatório', meta: { code: 'CNPJ_REQUIRED' } }, 400);
  }

  if (!isValidCnpj(cnpjDigits)) {
    addAuditLog({
      entityType: 'empresa',
      entityId: null,
      action: 'cnpj_lookup',
      field: 'cnpj',
      oldValue: null,
      newValue: cnpjDigits,
      userId: req.user?.id ?? null,
      userName: req.user?.nome ?? null,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: false,
      error: 'CNPJ inválido'
    });

    return sendError(res, { message: 'CNPJ inválido', meta: { code: 'CNPJ_INVALID' } }, 400);
  }

  try {
    const office = await lookupCnpjOnCnpja(cnpjDigits);
    const empresaDTO = mapCnpjaOfficeToEmpresaDTO(office);

    addAuditLog({
      entityType: 'empresa',
      entityId: null,
      action: 'cnpj_lookup',
      field: 'cnpj',
      oldValue: null,
      newValue: `${cnpjDigits}${empresaDTO?.nome ? ` (${empresaDTO.nome})` : ''}`,
      userId: req.user?.id ?? null,
      userName: req.user?.nome ?? null,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true
    });

    return sendSuccess(res, { data: empresaDTO });
  } catch (error) {
    const statusCode =
      typeof error?.status === 'number' && error.status >= 400 && error.status < 600 ? error.status : 500;

    addAuditLog({
      entityType: 'empresa',
      entityId: null,
      action: 'cnpj_lookup',
      field: 'cnpj',
      oldValue: null,
      newValue: cnpjDigits,
      userId: req.user?.id ?? null,
      userName: req.user?.nome ?? null,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: false,
      statusCode,
      error: error?.message
    });

    if (statusCode === 404) {
      return sendError(res, { message: 'Empresa não encontrada', meta: { code: 'CNPJ_NOT_FOUND' } }, 404);
    }

    if (statusCode === 401 || statusCode === 403) {
      const missingKey = !config.cnpja.apiKey;
      return sendError(
        res,
        {
          message: missingKey
            ? 'CNPJA_API_KEY não configurada (a CNPJA exige autenticação)'
            : 'Falha de autenticação ao consultar a CNPJA',
          meta: { code: missingKey ? 'CNPJA_MISSING_API_KEY' : 'CNPJA_AUTH_FAILED' }
        },
        missingKey ? 500 : 502
      );
    }

    if (statusCode === 429) {
      return sendError(
        res,
        {
          message: 'Limite de requisições da CNPJA atingido. Tente novamente em alguns minutos.',
          meta: { code: 'CNPJ_RATE_LIMIT' }
        },
        503
      );
    }

    if (statusCode === 504) {
      return sendError(res, { message: 'Tempo limite ao consultar CNPJ', meta: { code: 'CNPJ_TIMEOUT' } }, 504);
    }

    return sendError(
      res,
      { message: 'Falha ao consultar CNPJ', meta: { code: 'CNPJ_LOOKUP_FAILED', details: error?.message } },
      502
    );
  }
});

// GET /api/empresas - Listar todas as empresas
router.get('/', (req, res) => {
  try {
    const { cnae, status, conformidade, search } = req.query;
    let filteredEmpresas = [...empresas];

    if (cnae) {
      filteredEmpresas = filteredEmpresas.filter((empresa) => empresa.cnae.includes(cnae));
    }

    if (status) {
      filteredEmpresas = filteredEmpresas.filter((empresa) => empresa.status === status);
    }

    if (conformidade) {
      filteredEmpresas = filteredEmpresas.filter((empresa) => empresa.conformidade === conformidade);
    }

    if (search) {
      const term = toLower(search);
      filteredEmpresas = filteredEmpresas.filter(
        (empresa) =>
          toLower(empresa.nome).includes(term) ||
          String(empresa.cnpj).includes(search) ||
          toLower(empresa.ramo).includes(term)
      );
    }

    return sendSuccess(res, {
      data: filteredEmpresas,
      meta: { total: filteredEmpresas.length }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar empresas', meta: { details: error.message } }, 500);
  }
});

// GET /api/empresas/:id - Buscar empresa por ID
router.get('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const empresa = empresas.find((emp) => emp.id === id);

    if (!empresa) {
      return sendError(res, { message: 'Empresa não encontrada' }, 404);
    }

    return sendSuccess(res, { data: empresa });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar empresa', meta: { details: error.message } }, 500);
  }
});

// POST /api/empresas - Criar nova empresa
router.post('/', (req, res) => {
  try {
    const nextId = empresas.length ? Math.max(...empresas.map((emp) => emp.id)) + 1 : 1;
    const novaEmpresa = {
      id: nextId,
      ...req.body,
      dataCadastro: new Date().toISOString().split('T')[0],
      status: 'ativo',
      conformidade: 'em_dia',
      pendencias: 0,
      alertas: 0
    };

    empresas.push(novaEmpresa);

    return sendSuccess(res, { data: novaEmpresa, message: 'Empresa criada com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar empresa', meta: { details: error.message } }, 500);
  }
});

// PUT /api/empresas/:id - Atualizar empresa
router.put('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const empresaIndex = empresas.findIndex((emp) => emp.id === id);

    if (empresaIndex === -1) {
      return sendError(res, { message: 'Empresa não encontrada' }, 404);
    }

    empresas[empresaIndex] = {
      ...empresas[empresaIndex],
      ...req.body,
      id
    };

    return sendSuccess(res, { data: empresas[empresaIndex], message: 'Empresa atualizada com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar empresa', meta: { details: error.message } }, 500);
  }
});

// DELETE /api/empresas/:id - Deletar empresa
router.delete('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const empresaIndex = empresas.findIndex((emp) => emp.id === id);

    if (empresaIndex === -1) {
      return sendError(res, { message: 'Empresa não encontrada' }, 404);
    }

    empresas.splice(empresaIndex, 1);

    return sendSuccess(res, { data: null, message: 'Empresa deletada com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao deletar empresa', meta: { details: error.message } }, 500);
  }
});

module.exports = router;

