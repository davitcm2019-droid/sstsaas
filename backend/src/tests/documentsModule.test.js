const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createDefaultRegistry,
  DocumentGenerationService,
  buildDocumentFileName
} = require('../modules/documents/services/documentGenerationService');

const registry = createDefaultRegistry();

const createAssessmentRepoStub = (rows = []) => ({
  find() {
    return {
      lean: async () => rows
    };
  }
});

const fixture = {
  document: {
    id: 'doc1',
    title: 'Programa de Gerenciamento de Riscos - Empresa X',
    documentType: 'pgr',
    scopeType: 'assessment',
    scopeRefId: 'assess1',
    empresaId: 'empresa-1',
    latestVersion: 1
  },
  version: {
    version: 1,
    hash: 'abc123',
    issuedAt: '2026-04-04T12:00:00.000Z',
    issuedBy: { nome: 'Sistema', email: 'sistema@example.com' },
    documentModelTitle: 'Programa de Gerenciamento de Riscos',
    sourceAssessmentIds: ['assess1'],
    templateCode: 'pgr_programa',
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
              responsibleTechnical: { nome: 'RT Teste', registro: '123', email: 'rt@example.com' }
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
                actionPlanItems: [{ title: 'Instalar enclausuramento', responsible: 'Manutencao', status: 'pendente' }]
              }
            ],
            conclusion: { basis: 'Base tecnica da conclusao.', result: 'Conclusao', normativeFrame: 'NR-01' }
          }
        }
      ],
      annexes: []
    }
  },
  deps: {
    dataDeps: {
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
            condicaoOperacional: 'Rotina operacional',
            metodologia: 'NHO 01',
            instrumentosUtilizados: 'Dosimetro',
            criteriosAvaliacao: 'PxS',
            matrizRisco: '5x5'
          }
        }
      ])
    }
  }
};

test('document registry expoe os tipos documentais suportados', () => {
  const types = registry.list().map((item) => item.type);
  assert.ok(types.includes('pgr'));
  assert.ok(types.includes('ltcat'));
  assert.ok(types.includes('ordem_servico'));
});

test('DocumentGenerationService gera HTML estruturado a partir do modulo documental', async () => {
  const service = new DocumentGenerationService({ registry });
  const result = await service.generateIssuedSstDocument({
    ...fixture,
    outputFormat: 'html'
  });

  assert.match(result.html, /Programa de Gerenciamento de Riscos - Empresa X/);
  assert.match(result.html, /SUMARIO/);
  assert.match(result.html, /CONTROLE DE EMISSAO/);
  assert.match(result.html, /COMPOSICAO DO QUADRO DE FUNCIONARIOS/);
  assert.match(result.html, /INVENTARIO DE RISCOS/);
  assert.match(result.html, /Sugestao\(oes\) iniciais/);
  assert.match(result.html, /Riscos \(Possiveis danos a saude\)/);
  assert.match(result.html, /Plano de acao/);
  assert.match(result.html, /IDENTIFICACAO DA EMPRESA/);
  assert.match(result.html, /Ruido/);
  assert.match(result.html, /Instalar enclausuramento/);
});

test('DocumentGenerationService renderiza PDF via renderer injetado e preserva nome do arquivo', async () => {
  const service = new DocumentGenerationService({
    registry,
    renderer: async () => Buffer.from('%PDF-FAKE')
  });

  const result = await service.generateIssuedSstDocument({
    ...fixture,
    outputFormat: 'pdf'
  });

  assert.equal(result.buffer.toString('utf8'), '%PDF-FAKE');
  assert.equal(result.fileName, buildDocumentFileName(fixture.document, fixture.version));
});

test('DocumentGenerationService persiste asset quando persist=true', async () => {
  const saves = [];
  const service = new DocumentGenerationService({
    registry,
    renderer: async () => Buffer.from('%PDF-FAKE'),
    storage: {
      async save(payload) {
        saves.push(payload);
        return {
          provider: 's3',
          bucket: 'documents',
          key: `documents/${payload.documentType}/${payload.fileName}`,
          fileName: payload.fileName,
          size: payload.buffer.length,
          createdAt: '2026-04-05T00:00:00.000Z'
        };
      }
    }
  });

  const result = await service.generateIssuedSstDocument({
    ...fixture,
    outputFormat: 'pdf',
    persist: true
  });

  assert.equal(saves.length, 1);
  assert.equal(saves[0].assetType, 'pdf');
  assert.equal(result.storage.provider, 's3');
});
