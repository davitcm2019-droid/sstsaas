const test = require('node:test');
const assert = require('node:assert/strict');

const { renderIssuedDocumentPdfBuffer } = require('../sst/pdfEngine');
const { resolveIssuedDocumentPdfData } = require('../sst/pdfDataResolver');

const toPdfHex = (value) => Buffer.from(String(value), 'latin1').toString('hex').toUpperCase();

const createAssessmentRepoStub = (rows = []) => ({
  find() {
    return {
      lean: async () => rows
    };
  }
});

test('renderIssuedDocumentPdfBuffer gera PDF com sumario, secoes e paginacao', async () => {
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
    options: { debug: { compress: false } }
  });

  const output = buffer.toString('latin1').toUpperCase();
  assert.ok(buffer.slice(0, 4).toString('latin1').startsWith('%PDF'));
  assert.match(output, new RegExp(toPdfHex('SUMARIO')));
  assert.match(output, /31202D204944454E544946494341/);
  assert.match(output, /39202D204D41/);
  assert.match(output, /3133202D20494E56454E54/);
  assert.match(output, /312F[0-9A-F]{2,4}/);
});
