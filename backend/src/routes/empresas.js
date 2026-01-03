const express = require('express');
const { empresas } = require('../data/mockData');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

const toLower = (value = '') => String(value).toLowerCase();

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

