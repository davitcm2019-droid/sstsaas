const express = require('express');
const { treinamentos } = require('../data/mockData');
const lookupsRepository = require('../repositories/lookupsRepository');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

const toLower = (value = '') => String(value).toLowerCase();

const normalizeNumber = (value, fallback = 0) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const getEmpresaNome = async (empresaId) => {
  return lookupsRepository.getEmpresaNomeById(empresaId);
};

const sanitizeTreinamento = async (data = {}) => {
  const empresaId = data.empresaId ? String(data.empresaId) : null;
  return {
    titulo: data.titulo || '',
    descricao: data.descricao || '',
    empresaId,
    empresaNome: data.empresaNome || (await getEmpresaNome(empresaId)),
    tipo: data.tipo || 'obrigatorio',
    duracao: normalizeNumber(data.duracao, 0),
    instrutor: data.instrutor || '',
    dataInicio: data.dataInicio || '',
    dataFim: data.dataFim || '',
    local: data.local || '',
    maxParticipantes: normalizeNumber(data.maxParticipantes, 0),
    participantes: normalizeNumber(data.participantes, 0),
    status: data.status || 'agendado',
    observacoes: data.observacoes || ''
  };
};

// GET /api/treinamentos
router.get('/', (req, res) => {
  try {
    const { status, tipo, search } = req.query;
    let results = [...treinamentos];

    if (status) {
      results = results.filter((item) => item.status === status);
    }

    if (tipo) {
      results = results.filter((item) => item.tipo === tipo);
    }

    if (search) {
      const term = toLower(search);
      results = results.filter((item) => {
        return (
          toLower(item.titulo).includes(term) ||
          toLower(item.instrutor).includes(term) ||
          toLower(item.empresaNome).includes(term) ||
          toLower(item.local).includes(term)
        );
      });
    }

    return sendSuccess(res, { data: results, meta: { total: results.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar treinamentos', meta: { details: error.message } }, 500);
  }
});

// GET /api/treinamentos/:id
router.get('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const treinamento = treinamentos.find((item) => item.id === id);

    if (!treinamento) {
      return sendError(res, { message: 'Treinamento não encontrado' }, 404);
    }

    return sendSuccess(res, { data: treinamento });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar treinamento', meta: { details: error.message } }, 500);
  }
});

// POST /api/treinamentos
router.post('/', async (req, res) => {
  try {
    const sanitized = await sanitizeTreinamento(req.body);
    const nextId = treinamentos.length ? Math.max(...treinamentos.map((item) => item.id)) + 1 : 1;

    const novoTreinamento = {
      id: nextId,
      ...sanitized
    };

    treinamentos.push(novoTreinamento);

    return sendSuccess(res, { data: novoTreinamento, message: 'Treinamento criado com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar treinamento', meta: { details: error.message } }, 500);
  }
});

// PUT /api/treinamentos/:id
router.put('/:id(\\d+)', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const index = treinamentos.findIndex((item) => item.id === id);

    if (index === -1) {
      return sendError(res, { message: 'Treinamento não encontrado' }, 404);
    }

    const sanitized = await sanitizeTreinamento({
      ...treinamentos[index],
      ...req.body
    });

    treinamentos[index] = {
      id,
      ...sanitized
    };

    return sendSuccess(res, { data: treinamentos[index], message: 'Treinamento atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar treinamento', meta: { details: error.message } }, 500);
  }
});

// DELETE /api/treinamentos/:id
router.delete('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const index = treinamentos.findIndex((item) => item.id === id);

    if (index === -1) {
      return sendError(res, { message: 'Treinamento não encontrado' }, 404);
    }

    treinamentos.splice(index, 1);

    return sendSuccess(res, { data: null, message: 'Treinamento excluído com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao excluir treinamento', meta: { details: error.message } }, 500);
  }
});

module.exports = router;
