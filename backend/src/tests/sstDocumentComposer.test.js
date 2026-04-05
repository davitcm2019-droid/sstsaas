const test = require('node:test');
const assert = require('node:assert/strict');

const { composeDocumentPayload } = require('../sst/documentComposer');

test('composeDocumentPayload monta dto canonico e ordena riscos por criticidade', () => {
  const document = {
    documentType: 'pgr',
    title: 'PGR Teste',
    scopeType: 'assessment',
    scopeRefId: 'a1',
    latestVersion: 1
  };
  const version = {
    version: 1,
    hash: 'abc',
    issuedAt: '2026-04-05T10:00:00.000Z',
    issuedBy: { nome: 'Sistema' },
    content: {
      assessments: [
        {
          fixed: {
            assessment: { id: 'a1', title: 'Avaliacao A', version: 1, responsibleTechnical: { nome: 'RT', registro: '123' } },
            establishment: { nome: 'Unidade 1' },
            sector: { nome: 'Setor 1' },
            role: { nome: 'Cargo 1' }
          },
          dynamic: {
            risks: [
              { hazard: 'Moderado', factor: 'Ergo', damage: 'Dor', level: 'moderado', probability: 2, severity: 2, controls: [], actionPlanItems: [] },
              { hazard: 'Critico', factor: 'Fisico', damage: 'Perda', level: 'critico', probability: 5, severity: 5, controls: [], actionPlanItems: [] }
            ],
            conclusion: { result: 'Concluido', basis: 'Base', normativeFrame: 'NR-01' }
          }
        }
      ],
      annexes: []
    }
  };
  const pdfData = {
    labels: { documentTypeLabel: 'PGR' },
    empresa: { nome: 'Empresa A', cnpj: '00', cnae: '6201' },
    summary: { overview: 'Resumo', assessmentsCount: 1, risksCount: 2, actionItemsCount: 0 },
    missingData: [],
    assessmentContexts: new Map([
      [
        'a1',
        {
          context: {
            processoPrincipal: 'Operacao',
            localAreaPosto: 'Posto 1',
            jornadaTurno: '44h',
            quantidadeExpostos: 4,
            condicaoOperacional: 'Normal',
            metodologia: 'NHO',
            instrumentosUtilizados: 'Dosimetro',
            criteriosAvaliacao: 'PxS',
            matrizRisco: '5x5'
          },
          abrangenciaInicio: '2026-01-10',
          abrangenciaFim: '2026-12-10'
        }
      ]
    ])
  };

  const composed = composeDocumentPayload({ document, version, pdfData });
  assert.equal(composed.sections[0].key, 'identificacao_empresa');
  assert.equal(composed.riskInventory[0].hazard, 'Critico');
  assert.equal(composed.documentMeta.coverageLabel, '10/01/2026 a 10/12/2026');
  assert.equal(composed.documentMeta.acronym, 'PGR');
  assert.ok(composed.sections.some((section) => section.key === 'inventario_riscos'));
  assert.ok(composed.sections.some((section) => section.key === 'metas_prioridades_controle'));
});
