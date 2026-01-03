const express = require('express');
const {
  documents,
  documentTypes,
  documentCategories,
  createDocument,
  getDocumentsByEmpresa,
  incrementDownloads,
  incrementAccess,
  getDocumentStats
} = require('../data/documents');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// GET /api/documents/types - Listar tipos de documento
router.get('/types', (req, res) => {
  try {
    return sendSuccess(res, { data: documentTypes });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar tipos de documento', meta: { details: error.message } }, 500);
  }
});

// GET /api/documents/categories - Listar categorias de documento
router.get('/categories', (req, res) => {
  try {
    return sendSuccess(res, { data: documentCategories });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar categorias de documento', meta: { details: error.message } }, 500);
  }
});

// GET /api/documents/stats - Estatísticas de documentos
router.get('/stats', (req, res) => {
  try {
    const stats = getDocumentStats();
    return sendSuccess(res, { data: stats });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar estatísticas de documentos', meta: { details: error.message } }, 500);
  }
});

// GET /api/documents - Listar documentos
router.get('/', (req, res) => {
  try {
    const { empresaId, tipo, categoria, search, limit = 50 } = req.query;
    let filteredDocuments = [...documents];

    if (empresaId) {
      filteredDocuments = getDocumentsByEmpresa(parseInt(empresaId, 10));
    }

    if (tipo) {
      filteredDocuments = filteredDocuments.filter((doc) => doc.tipo === tipo);
    }

    if (categoria) {
      filteredDocuments = filteredDocuments.filter((doc) => doc.categoria === categoria);
    }

    if (search) {
      const term = String(search).toLowerCase();
      filteredDocuments = filteredDocuments.filter(
        (doc) =>
          doc.nome.toLowerCase().includes(term) ||
          doc.descricao.toLowerCase().includes(term) ||
          doc.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    }

    filteredDocuments.sort((a, b) => new Date(b.dataUpload) - new Date(a.dataUpload));

    const parsedLimit = parseInt(limit, 10);
    if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
      filteredDocuments = filteredDocuments.slice(0, parsedLimit);
    }

    return sendSuccess(res, { data: filteredDocuments, meta: { total: filteredDocuments.length } });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar documentos', meta: { details: error.message } }, 500);
  }
});

// POST /api/documents - Criar documento
router.post('/', (req, res) => {
  try {
    const newDocument = createDocument(req.body);
    return sendSuccess(res, { data: newDocument, message: 'Documento criado com sucesso' }, 201);
  } catch (error) {
    return sendError(res, { message: 'Erro ao criar documento', meta: { details: error.message } }, 500);
  }
});

// POST /api/documents/:id/download - Incrementar downloads
router.post('/:id(\\d+)/download', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const document = incrementDownloads(id);

    if (!document) {
      return sendError(res, { message: 'Documento não encontrado' }, 404);
    }

    return sendSuccess(res, { data: document, message: 'Download registrado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao registrar download', meta: { details: error.message } }, 500);
  }
});

// GET /api/documents/:id - Buscar documento por ID
router.get('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const document = documents.find((doc) => doc.id === id);

    if (!document) {
      return sendError(res, { message: 'Documento não encontrado' }, 404);
    }

    incrementAccess(id);
    return sendSuccess(res, { data: document });
  } catch (error) {
    return sendError(res, { message: 'Erro ao buscar documento', meta: { details: error.message } }, 500);
  }
});

// PUT /api/documents/:id - Atualizar documento
router.put('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const documentIndex = documents.findIndex((doc) => doc.id === id);

    if (documentIndex === -1) {
      return sendError(res, { message: 'Documento não encontrado' }, 404);
    }

    documents[documentIndex] = {
      ...documents[documentIndex],
      ...req.body,
      id
    };

    return sendSuccess(res, { data: documents[documentIndex], message: 'Documento atualizado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao atualizar documento', meta: { details: error.message } }, 500);
  }
});

// DELETE /api/documents/:id - Deletar documento
router.delete('/:id(\\d+)', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const documentIndex = documents.findIndex((doc) => doc.id === id);

    if (documentIndex === -1) {
      return sendError(res, { message: 'Documento não encontrado' }, 404);
    }

    documents.splice(documentIndex, 1);
    return sendSuccess(res, { data: null, message: 'Documento deletado com sucesso' });
  } catch (error) {
    return sendError(res, { message: 'Erro ao deletar documento', meta: { details: error.message } }, 500);
  }
});

module.exports = router;

