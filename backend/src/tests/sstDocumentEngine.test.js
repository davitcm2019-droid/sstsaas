const test = require('node:test');
const assert = require('node:assert/strict');

const { getDefaultDocumentModels, buildDocumentContent } = require('../sst/documentEngine');

test('semeia modelos documentais padrao com camadas fixo, editavel e anexos', () => {
  const models = getDefaultDocumentModels();
  assert.ok(models.length >= 5);
  assert.ok(models.every((model) => model.layers && typeof model.layers.fixed === 'string'));
  assert.ok(models.every((model) => model.layers && model.layers.editable));
  assert.ok(models.some((model) => Array.isArray(model.layers.annexes) && model.layers.annexes.length > 0));
});

test('mescla conteudo editavel do modelo com overrides da emissao', () => {
  const [model] = getDefaultDocumentModels();
  const content = buildDocumentContent({
    documentType: model.documentType,
    model,
    assessment: {
      id: 'a1',
      empresaId: 'empresa-1',
      title: 'Avaliacao de ruido',
      version: 1,
      status: 'published',
      responsibleTechnical: { nome: 'RT', registro: '123' }
    },
    establishment: { id: 'e1', nome: 'Unidade Centro', codigo: 'UC' },
    sector: { id: 's1', nome: 'Producao' },
    role: { id: 'r1', nome: 'Operador' },
    risks: [],
    conclusion: null,
    editable: { resumo: 'Resumo customizado' }
  });

  assert.equal(content.model.code, model.code);
  assert.equal(content.editable.resumo, 'Resumo customizado');
  assert.equal(content.editable.notas, model.layers.editable.notas);
  assert.ok(Array.isArray(content.annexes));
});
