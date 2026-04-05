const test = require('node:test');
const assert = require('node:assert/strict');

const { buildDocumentSections } = require('../sst/documentSectionBuilder');

test('buildDocumentSections retorna estrutura formal completa para pgr', () => {
  const sections = buildDocumentSections('pgr');
  assert.equal(sections.length, 19);
  assert.equal(sections[0].key, 'identificacao_empresa');
  assert.ok(sections.some((section) => section.key === 'inventario_riscos'));
  assert.ok(sections.some((section) => section.key === 'metas_prioridades_controle'));
});

test('buildDocumentSections adiciona anexos sob demanda', () => {
  const sections = buildDocumentSections('ltcat', { includeAnnexes: true });
  assert.ok(sections.some((section) => section.key === 'anexos'));
});
