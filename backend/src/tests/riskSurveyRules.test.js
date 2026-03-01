const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyScore,
  requiresTechnicalJustification,
  ensureRiskCanBeCreated,
  ensureQuantitativeAllowed,
  migrateLegacyRiskRecord
} = require('../riskSurvey/rules');

test('fluxo novo calcula score e classificacao', () => {
  const score = 4 * 4;
  const classification = classifyScore(score);
  assert.equal(score, 16);
  assert.equal(classification, 'alto');
  assert.equal(requiresTechnicalJustification(score), true);
});

test('bloqueia criacao de risco sem activity', () => {
  assert.throws(
    () => ensureRiskCanBeCreated({ activityId: null }),
    (error) => error?.code === 'ACTIVITY_REQUIRED'
  );
});

test('bloqueia quantitativa sem qualitativa previa', () => {
  assert.throws(
    () => ensureQuantitativeAllowed({ hasQualitative: false, allowsQuantitative: true }),
    (error) => error?.code === 'QUALITATIVE_REQUIRED'
  );
});

test('migracao legado gera estrutura minima com flag legacy', () => {
  const migrated = migrateLegacyRiskRecord({
    empresaId: 'empresa-1',
    setor: 'Producao',
    perigo: 'Ruido alto',
    categoriaAgente: 'fisico'
  });

  assert.equal(migrated.environment.nome, 'Ambiente migrado');
  assert.equal(migrated.activity.nome, 'Atividade migrada - modelo anterior');
  assert.equal(migrated.risk.legacyMigrated, true);
  assert.equal(migrated.risk.perigo, 'Ruido alto');
  assert.equal(migrated.risk.riskType, 'fisico');
});
