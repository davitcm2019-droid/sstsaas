const express = require('express');
const router = express.Router();
const { acoes, empresas, usuarios } = require('../data/mockData');
const { sendSuccess, sendError } = require('../utils/response');

const toLower = (value = '') => String(value).toLowerCase();

const findEmpresaNome = (empresaId) => {
  if (!empresaId) return '';
  const empresa = empresas.find((item) => item.id === empresaId);
  return empresa ? empresa.nome : '';
};

const findResponsavelNome = (responsavelId) => {
  if (!responsavelId) return '';
  const responsavel = usuarios.find((item) => item.id === responsavelId);
  return responsavel ? responsavel.nome : '';
};

const parseNumber = (value, fallback = 0) => {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const sanitizePayload = (data = {}) => {
  const empresaId = data.empresaId ? parseInt(data.empresaId, 10) : null;
  const responsavelId = data.responsavelId ? parseInt(data.responsavelId, 10) : null;

  return {
    titulo: data.titulo || '',
    descricao: data.descricao || '',
    empresaId,
    empresaNome: data.empresaNome || findEmpresaNome(empresaId),
    responsavelId,
    responsavelNome: data.responsavelNome || findResponsavelNome(responsavelId),
    tipo: data.tipo || 'preventiva',
    prioridade: data.prioridade || 'media',
    status: data.status || 'pendente',
    dataInicio: data.dataInicio || '',
    dataFim: data.dataFim || '',
    custo: parseNumber(data.custo, 0),
    observacoes: data.observacoes || ''
  };
};

// GET /api/acoes
router.get('/', (req, res) => {
  try {
    const { status, tipo, prioridade, search } = req.query;
    let results = [...acoes];

    if (status) {
      results = results.filter((acao) => acao.status === status);
    }

    if (tipo) {
      results = results.filter((acao) => acao.tipo === tipo);
    }

    if (prioridade) {
      results = results.filter((acao) => acao.prioridade === prioridade);
    }

    if (search) {
      const term = toLower(search);
      results = results.filter((acao) => {
        return (
          toLower(acao.titulo).includes(term) ||
          toLower(acao.descricao).includes(term) ||
          toLower(acao.empresaNome).includes(term) ||
          toLower(acao.responsavelNome).includes(term)
        );
      });
    }

    return sendSuccess(res, { data: results, meta: { total: results.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar ações', meta: { details: error.message } }, 500);
  }
});

// GET /api/acoes/:id
router.get('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const acao = acoes.find((item) => item.id === id);

    if (!acao) {
      return sendError(res, { message: 'Ação não encontrada' }, 404);
    }

    return sendSuccess(res, { data: acao });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar ação', meta: { details: error.message } }, 500);
  }
});

// POST /api/acoes
router.post('/', (req, res) => {
  try {
    const sanitized = sanitizePayload(req.body);
    const nextId = acoes.length ? Math.max(...acoes.map((item) => item.id)) + 1 : 1;

    const novaAcao = {
      id: nextId,
      ...sanitized
    };

    acoes.push(novaAcao);

    return sendSuccess(res, { data: novaAcao, message: 'Ação criada com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar ação', meta: { details: error.message } }, 500);
  }
});

// PUT /api/acoes/:id
router.put('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const index = acoes.findIndex((item) => item.id === id);

    if (index === -1) {
      return sendError(res, { message: 'Ação não encontrada' }, 404);
    }

    const sanitized = sanitizePayload({
      ...acoes[index],
      ...req.body
    });

    acoes[index] = {
      id,
      ...sanitized
    };

    return sendSuccess(res, { data: acoes[index], message: 'Ação atualizada com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar ação', meta: { details: error.message } }, 500);
  }
});

// DELETE /api/acoes/:id
router.delete('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const index = acoes.findIndex((item) => item.id === id);

    if (index === -1) {
      return sendError(res, { message: 'Ação não encontrada' }, 404);
    }

    acoes.splice(index, 1);

    return sendSuccess(res, { data: null, message: 'Ação excluída com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao excluir ação', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
