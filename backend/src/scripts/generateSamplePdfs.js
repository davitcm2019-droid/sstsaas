const fs = require('fs');
const path = require('path');

const { renderIssuedDocumentPdfBuffer, buildIssuedDocumentPdfFilename } = require('../sst/pdfEngine');
const { resolveIssuedDocumentPdfData } = require('../sst/pdfDataResolver');

const OUTPUT_DIR = path.join(__dirname, '..', '..', 'tmp', 'pdfs');

const createFixture = (documentType) => {
  const titleMap = {
    pgr: 'Programa de Gerenciamento de Riscos - Exemplo',
    ltcat: 'LTCAT - Exemplo',
    inventario: 'Inventario de Riscos - Exemplo'
  };

  return {
    document: {
      id: `${documentType}-doc`,
      title: titleMap[documentType] || 'Documento Tecnico - Exemplo',
      documentType,
      scopeType: 'assessment',
      scopeRefId: `${documentType}-assessment`,
      empresaId: 'empresa-exemplo',
      latestVersion: 1
    },
    version: {
      version: 1,
      hash: `${documentType}-hash`,
      issuedAt: new Date().toISOString(),
      issuedBy: { nome: 'Sistema SST', email: 'sistema@sst.local' },
      documentModelTitle: titleMap[documentType] || 'Documento Tecnico',
      sourceAssessmentIds: [`${documentType}-assessment`],
      content: {
        model: { title: titleMap[documentType] || 'Documento Tecnico', layers: { fixed: 'Texto fixo padrao do modelo.' } },
        editable: {
          resumo: 'Resumo tecnico gerado automaticamente para demonstracao local.',
          notas: 'Notas adicionais para demonstracao do PDF.',
          ressalvas: 'Ressalvas tecnicas geradas a partir da fixture.'
        },
        assessments: [
          {
            fixed: {
              assessment: {
                id: `${documentType}-assessment`,
                title: `Avaliacao ${documentType.toUpperCase()}`,
                version: 1,
                responsibleTechnical: { nome: 'RT Exemplo', registro: 'CREA 12345' }
              },
              establishment: { nome: 'Unidade Exemplo' },
              sector: { nome: 'Setor Operacional' },
              role: { nome: 'Operador' }
            },
            dynamic: {
              summary: { totalRisks: 2, actionItems: 1 },
              risks: [
                {
                  hazard: 'Ruido',
                  factor: 'Fisico',
                  agent: 'Ruido continuo',
                  level: 'alto',
                  source: 'Maquina de corte',
                  damage: 'Perda auditiva',
                  probability: 4,
                  severity: 4,
                  controls: [{ description: 'Protetor auditivo' }],
                  actionPlanItems: [{ title: 'Instalar enclausuramento' }]
                },
                {
                  hazard: 'Postura inadequada',
                  factor: 'Ergonomico',
                  agent: 'Movimentos repetitivos',
                  level: 'moderado',
                  source: 'Bancada de montagem',
                  damage: 'Dor lombar',
                  probability: 3,
                  severity: 3,
                  controls: [{ description: 'Pausa e ajuste ergonomico' }],
                  actionPlanItems: []
                }
              ],
              conclusion: {
                result: 'Conclusao tecnica de exemplo',
                basis: 'Base tecnica sintetica da avaliacao.',
                signedAt: new Date().toISOString(),
                signedBy: { nome: 'RT Exemplo' }
              }
            }
          }
        ],
        annexes: [
          {
            title: 'Anexo de exemplo',
            content: 'Conteudo complementar do anexo para verificacao visual da geracao local.',
            order: 1
          }
        ]
      }
    }
  };
};

const createDeps = (documentType) => ({
  empresaRepo: {
    findById: async () => ({
      nome: 'Empresa Exemplo LTDA',
      cnpj: '00.000.000/0001-00',
      cnae: '6201-5/01',
      endereco: 'Rua Exemplo, 100',
      cidade: 'Sao Paulo',
      estado: 'SP',
      cep: '01000-000',
      telefone: '(11) 99999-9999',
      email: 'contato@empresa-exemplo.com'
    })
  },
  assessmentRepo: {
    find() {
      return {
        lean: async () => [
          {
            _id: `${documentType}-assessment`,
            context: {
              processoPrincipal: 'Operacao industrial',
              localAreaPosto: 'Area principal',
              jornadaTurno: '44h semanais',
              quantidadeExpostos: 12,
              condicaoOperacional: 'Rotina de trabalho em producao'
            }
          }
        ]
      };
    }
  }
});

const main = async () => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const documentType of ['pgr', 'ltcat', 'inventario']) {
    const fixture = createFixture(documentType);
    const pdfData = await resolveIssuedDocumentPdfData({
      document: fixture.document,
      version: fixture.version,
      deps: createDeps(documentType)
    });
    const buffer = await renderIssuedDocumentPdfBuffer({
      document: fixture.document,
      version: fixture.version,
      pdfData
    });
    const filename = buildIssuedDocumentPdfFilename(fixture.document, fixture.version);
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), buffer);
  }

  console.log(`PDFs de exemplo gerados em ${OUTPUT_DIR}`);
};

main().catch((error) => {
  console.error('Erro ao gerar PDFs de exemplo:', error);
  process.exit(1);
});
