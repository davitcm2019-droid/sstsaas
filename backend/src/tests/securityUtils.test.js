const test = require('node:test');
const assert = require('node:assert/strict');

const { sendError } = require('../utils/response');
const { createSearchRegex } = require('../utils/regex');
const { hasPermission } = require('../rbac/permissions');

const createMockResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return body;
    }
  };

  return response;
};

test('sendError remove detalhes internos em erros 500', () => {
  const res = createMockResponse();

  sendError(res, { message: 'Erro interno', meta: { details: 'stack trace', code: 'INTERNAL' } }, 500);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.payload, {
    success: false,
    data: null,
    message: 'Erro interno',
    meta: { code: 'INTERNAL' }
  });
});

test('sendError preserva detalhes em erros de validacao', () => {
  const res = createMockResponse();

  sendError(res, { message: 'Entrada invalida', meta: { details: 'campo x ausente' } }, 400);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.meta.details, 'campo x ausente');
});

test('createSearchRegex escapa caracteres especiais', () => {
  const regex = createSearchRegex('abc.*(teste)');

  assert.equal(regex.test('abc.*(teste)'), true);
  assert.equal(regex.test('abcdef teste'), false);
});

test('matriz de permissoes bloqueia visualizador em escrita e libera tecnico', () => {
  assert.equal(hasPermission('visualizador', 'tasks:write'), false);
  assert.equal(hasPermission('tecnico_seguranca', 'tasks:write'), true);
  assert.equal(hasPermission('administrador', 'riskSurvey:configure'), true);
});
