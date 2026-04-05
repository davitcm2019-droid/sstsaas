const test = require('node:test');
const assert = require('node:assert/strict');

const { renderIssuedDocumentPdfBuffer, buildIssuedDocumentPdfFilename } = require('../sst/pdfEngine');
const { resolveIssuedDocumentPdfData } = require('../sst/pdfDataResolver');

const createAssessmentRepoStub = (rows = []) => ({
  find() {
    return {
      lean: async () => rows
    };
  }
});

test('renderIssuedDocumentPdfBuffer delega para o novo pipeline documental e gera o nome esperado', async () => {
  const document = {
    id: 'doc1',
    title: 'Programa de Gerenciamento de Riscos - Empresa X',
    documentType: 'pgr',
    scopeType: 'assessment',
    scopeRefId: 'assess1',
    empresaId: 'empresa-1',
    latestVersion: 1
  };

  const version = {
    version: 1,
    hash: 'abc123',
    issuedAt: '2026-04-04T12:00:00.000Z',
    issuedBy: { nome: 'Sistema', email: 'sistema@example.com' },
    documentModelTitle: 'Programa de Gerenciamento de Riscos',
    sourceAssessmentIds: ['assess1'],
    content: {
      model: { title: 'PGR', layers: { fixed: 'Texto fixo do modelo.' } },
      editable: { resumo: 'Resumo do documento.', notas: 'Notas do documento.', ressalvas: 'Ressalvas do documento.' },
      assessments: [
        {
          fixed: {
            assessment: {
              id: 'assess1',
              title: 'Avaliacao Cargo A',
              abrangenciaInicio: '2026-01-10',
              abrangenciaFim: '2026-12-10',
              version: 1,
              responsibleTechnical: { nome: 'RT Teste', registro: '123' }
            },
            establishment: { nome: 'Unidade 1' },
            sector: { nome: 'Setor 1' },
            role: { nome: 'Cargo 1' }
          },
          dynamic: {
            summary: { totalRisks: 1, actionItems: 1 },
            risks: [
              {
                hazard: 'Ruido',
                factor: 'Fisico',
                agent: 'Ruido continuo',
                level: 'alto',
                source: 'Maquina X',
                damage: 'Perda auditiva',
                probability: 4,
                severity: 4,
                controls: [{ description: 'Protetor auditivo' }],
                actionPlanItems: [{ title: 'Instalar enclausuramento' }]
              }
            ],
            conclusion: { basis: 'Base tecnica da conclusao.' }
          }
        }
      ],
      annexes: []
    }
  };

  const pdfData = await resolveIssuedDocumentPdfData({
    document,
    version,
    deps: {
      empresaRepo: {
        findById: async () => ({
          nome: 'Empresa X',
          cnpj: '00.000.000/0001-00',
          cnae: '6201-5/01',
          endereco: 'Rua Teste, 100',
          cidade: 'Sao Paulo',
          estado: 'SP',
          cep: '01000-000',
          telefone: '(11) 1111-1111',
          email: 'contato@empresa-x.com'
        })
      },
      assessmentRepo: createAssessmentRepoStub([
        {
          _id: 'assess1',
          abrangenciaInicio: '2026-01-10',
          abrangenciaFim: '2026-12-10',
          context: {
            processoPrincipal: 'Operacao de maquina',
            localAreaPosto: 'Linha 1',
            jornadaTurno: '44h',
            quantidadeExpostos: 10,
            condicaoOperacional: 'Rotina operacional'
          }
        }
      ])
    }
  });

  const buffer = await renderIssuedDocumentPdfBuffer({
    document,
    version,
    pdfData,
    options: {
      rendererDeps: {
        browser: {
          async newPage() {
            return {
              async setContent() {},
              async emulateMediaType() {},
              async pdf() {
                return Buffer.from('%PDF-FAKE');
              },
              async close() {}
            };
          }
        }
      }
    }
  });

  assert.equal(buffer.toString('utf8'), '%PDF-FAKE');
  assert.equal(buildIssuedDocumentPdfFilename(document, version), 'programa-de-gerenciamento-de-riscos-empresa-x-v1.pdf');
});
