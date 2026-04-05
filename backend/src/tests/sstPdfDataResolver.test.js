const test = require('node:test');
const assert = require('node:assert/strict');

const { buildSectionsPlan, resolveIssuedDocumentPdfData } = require('../sst/pdfDataResolver');

const createAssessmentRepoStub = (rows = []) => ({
  find() {
    return {
      lean: async () => rows
    };
  }
});

test('buildSectionsPlan monta secoes esperadas para pgr e ltcat', () => {
  const pgrSections = buildSectionsPlan('pgr');
  const ltcatSections = buildSectionsPlan('ltcat');

  assert.equal(pgrSections[0].title, '1 - IDENTIFICACAO DA EMPRESA');
  assert.ok(pgrSections.some((section) => section.key === 'metas_prioridades_controle'));
  assert.ok(ltcatSections.some((section) => section.key === 'metodologia_avaliacoes'));
  assert.ok(ltcatSections.some((section) => section.key === 'conclusao'));
});

test('resolveIssuedDocumentPdfData aplica fallbacks e lookup de empresa', async () => {
  const document = {
    empresaId: 'empresa-1',
    documentType: 'pgr'
  };
  const version = {
    sourceAssessmentIds: ['a1'],
    content: {
      assessments: [
        {
          fixed: {
            assessment: {
              id: 'a1',
              responsibleTechnical: { nome: 'RT Teste', registro: '123' }
            }
          },
          dynamic: {
            summary: { totalRisks: 1, actionItems: 1 }
          }
        }
      ]
    }
  };

  const pdfData = await resolveIssuedDocumentPdfData({
    document,
    version,
    deps: {
      empresaRepo: {
        findById: async () => null
      },
      assessmentRepo: createAssessmentRepoStub([
        {
          _id: 'a1',
          abrangenciaInicio: '',
          abrangenciaFim: ''
        }
      ])
    }
  });

  assert.equal(pdfData.labels.documentTypeLabel, 'Programa de Gerenciamento de Riscos (PGR)');
  assert.equal(pdfData.empresa.nome, 'Nao informado');
  assert.ok(pdfData.missingData.includes('Nome da empresa'));
  assert.ok(pdfData.missingData.includes('Periodo de abrangencia da avaliacao'));
  assert.ok(pdfData.sectionsPlan.some((section) => section.key === 'inventario_riscos'));
});
