const test = require('node:test');
const assert = require('node:assert/strict');

const {
  computeRiskLevel,
  ensureRoleCanCreateAssessment,
  ensureAssessmentRiskCanExist,
  ensureAssessmentCanPublish
} = require('../sst/rules');

test('calcula classificacao do risco por probabilidade e severidade', () => {
  assert.equal(computeRiskLevel(1, 1), 'toleravel');
  assert.equal(computeRiskLevel(3, 3), 'moderado');
  assert.equal(computeRiskLevel(4, 4), 'alto');
  assert.equal(computeRiskLevel(5, 5), 'critico');
});

test('bloqueia criacao de avaliacao sem cargo', () => {
  assert.throws(
    () => ensureRoleCanCreateAssessment({ roleId: null }),
    (error) => error?.code === 'ROLE_REQUIRED'
  );
});

test('bloqueia criacao de risco sem avaliacao', () => {
  assert.throws(
    () => ensureAssessmentRiskCanExist({ assessmentId: '' }),
    (error) => error?.code === 'ASSESSMENT_REQUIRED'
  );
});

test('bloqueia publicacao sem conclusao assinada', () => {
  assert.throws(
    () =>
      ensureAssessmentCanPublish({
        risks: [{ factor: 'Ruido', hazard: 'Ruido', damage: 'Perda auditiva', probability: 2, severity: 2, level: 'moderado' }],
        conclusion: { status: 'draft' }
      }),
    (error) => error?.code === 'ASSESSMENT_CONCLUSION_NOT_SIGNED'
  );
});

test('bloqueia risco alto sem plano de acao nem justificativa', () => {
  assert.throws(
    () =>
      ensureAssessmentCanPublish({
        risks: [
          {
            factor: 'Quimico',
            hazard: 'Solvente',
            damage: 'Irritacao',
            probability: 4,
            severity: 4,
            level: 'alto',
            actionPlanItems: []
          }
        ],
        conclusion: { status: 'signed' }
      }),
    (error) => error?.code === 'ASSESSMENT_HIGH_RISK_ACTION_REQUIRED'
  );
});

test('permite publicar quando riscos estao completos e conclusao esta assinada', () => {
  assert.doesNotThrow(() =>
    ensureAssessmentCanPublish({
      risks: [
        {
          factor: 'Fisico',
          hazard: 'Ruido',
          damage: 'Perda auditiva',
          probability: 4,
          severity: 4,
          level: 'alto',
          actionPlanItems: [{ title: 'Instalar barreira acustica' }]
        }
      ],
      conclusion: { status: 'signed' }
    })
  );
});
