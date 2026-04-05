const test = require('node:test');
const assert = require('node:assert/strict');

const { evaluateDocumentReadiness } = require('../sst/documentReadiness');

test('evaluateDocumentReadiness bloqueia pgr com lacunas obrigatorias', () => {
  const assessment = {
    _id: 'a1',
    status: 'published',
    responsibleTechnical: { nome: 'RT', registro: '' },
    context: {
      processoPrincipal: '',
      localAreaPosto: 'Linha 1',
      jornadaTurno: '',
      quantidadeExpostos: 0,
      condicaoOperacional: '',
      criteriosAvaliacao: '',
      matrizRisco: ''
    }
  };

  const readiness = evaluateDocumentReadiness({
    documentType: 'pgr',
    assessments: [assessment],
    risksByAssessment: new Map([
      [
        'a1',
        [
          {
            _id: 'r1',
            factor: 'Fisico',
            hazard: '',
            damage: '',
            probability: 0,
            severity: 0,
            level: '',
            controls: [],
            actionPlanItems: []
          }
        ]
      ]
    ]),
    conclusionsByAssessment: new Map([['a1', { status: 'draft' }]])
  });

  assert.equal(readiness.emitible, false);
  assert.equal(readiness.blocking, true);
  assert.ok(readiness.missingFields.some((item) => item.code === 'ASSESSMENT_CONCLUSION_NOT_SIGNED'));
  assert.ok(readiness.missingFields.some((item) => item.code === 'PGR_RISK_MATRIX_REQUIRED'));
});

test('evaluateDocumentReadiness libera pgr completo', () => {
  const assessment = {
    _id: 'a1',
    status: 'published',
    responsibleTechnical: { nome: 'RT', registro: '123' },
    context: {
      processoPrincipal: 'Operacao',
      localAreaPosto: 'Linha 1',
      jornadaTurno: '44h',
      quantidadeExpostos: 5,
      condicaoOperacional: 'Normal',
      criteriosAvaliacao: 'Probabilidade x Severidade',
      matrizRisco: '5x5'
    }
  };

  const readiness = evaluateDocumentReadiness({
    documentType: 'pgr',
    assessments: [assessment],
    risksByAssessment: new Map([
      [
        'a1',
        [
          {
            _id: 'r1',
            factor: 'Fisico',
            hazard: 'Ruido',
            damage: 'Perda auditiva',
            probability: 4,
            severity: 4,
            level: 'alto',
            controls: [{ description: 'Barreira acustica' }],
            actionPlanItems: [{ title: 'Instalar enclausuramento', responsible: 'Manutencao', status: 'pendente' }]
          }
        ]
      ]
    ]),
    conclusionsByAssessment: new Map([['a1', { status: 'signed', normativeFrame: 'NR-01' }]])
  });

  assert.equal(readiness.emitible, true);
  assert.equal(readiness.blocking, false);
  assert.equal(readiness.missingFields.length, 0);
});

test('evaluateDocumentReadiness aplica validacoes base em laudo tecnico', () => {
  const readiness = evaluateDocumentReadiness({
    documentType: 'laudo_tecnico',
    assessments: [
      {
        _id: 'a1',
        status: 'published',
        responsibleTechnical: { nome: 'RT', registro: '' },
        context: {
          processoPrincipal: 'Operacao',
          localAreaPosto: 'Linha 1',
          jornadaTurno: '44h',
          quantidadeExpostos: 2,
          condicaoOperacional: 'Normal'
        }
      }
    ],
    risksByAssessment: new Map([
      [
        'a1',
        [
          {
            _id: 'r1',
            factor: 'Fisico',
            hazard: 'Ruido',
            damage: 'Perda auditiva',
            probability: 2,
            severity: 2,
            level: 'moderado',
            controls: [{ description: 'Protetor auditivo' }]
          }
        ]
      ]
    ]),
    conclusionsByAssessment: new Map([['a1', { status: 'signed' }]])
  });

  assert.equal(readiness.emitible, false);
  assert.ok(readiness.missingFields.some((item) => item.code === 'ASSESSMENT_RT_REGISTRATION_REQUIRED'));
});
