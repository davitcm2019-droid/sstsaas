const fs = require('fs');
const path = require('path');

const { renderIssuedDocumentPdfBuffer, buildIssuedDocumentPdfFilename } = require('../sst/pdfEngine');
const { resolveIssuedDocumentPdfData } = require('../sst/pdfDataResolver');

const OUTPUT_DIR = path.join(__dirname, '..', '..', 'tmp', 'pdfs');

const DOCUMENT_CONFIGS = {
  pgr: { title: 'Programa de Gerenciamento de Riscos - Exemplo', formalTitle: 'Programa de Gerenciamento de Riscos' },
  ltcat: { title: 'LTCAT - Exemplo', formalTitle: 'Laudo Tecnico das Condicoes Ambientais de Trabalho' },
  inventario: { title: 'Inventario de Riscos - Exemplo', formalTitle: 'Inventario de Riscos Ocupacionais' },
  ordem_servico: { title: 'Ordem de Servico - Exemplo', formalTitle: 'Ordem de Servico de Seguranca e Saude no Trabalho' },
  laudo_insalubridade: { title: 'Laudo de Insalubridade - Exemplo', formalTitle: 'Laudo Tecnico de Insalubridade' },
  laudo_periculosidade: { title: 'Laudo de Periculosidade - Exemplo', formalTitle: 'Laudo Tecnico de Periculosidade' },
  laudo_tecnico: { title: 'Laudo Tecnico - Exemplo', formalTitle: 'Laudo Tecnico SST' }
};

const createFixture = (documentType) => {
  const cfg = DOCUMENT_CONFIGS[documentType] || { title: 'Documento Tecnico - Exemplo', formalTitle: 'Documento Tecnico' };

  return {
    document: {
      id: `${documentType}-doc`,
      title: cfg.title,
      documentType,
      scopeType: 'assessment',
      scopeRefId: `${documentType}-assessment`,
      empresaId: 'empresa-exemplo',
      latestVersion: 1
    },
    version: {
      version: 1,
      hash: `${documentType}-hash-${Date.now().toString(36)}`,
      issuedAt: new Date().toISOString(),
      issuedBy: { nome: 'Sistema SST', email: 'sistema@sst.local' },
      documentModelTitle: cfg.formalTitle,
      sourceAssessmentIds: [`${documentType}-assessment`],
      content: {
        model: { title: cfg.formalTitle, layers: { fixed: 'Texto fixo padrao do modelo.' } },
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
                abrangenciaInicio: '2026-01-10',
                abrangenciaFim: '2026-12-10',
                version: 1,
                responsibleTechnical: { nome: 'RT Exemplo', registro: 'CREA 12345', email: 'rt@exemplo.com' }
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
                  exposure: 'Jornada completa',
                  damage: 'Perda auditiva',
                  probability: 4,
                  severity: 4,
                  controls: [{ description: 'Protetor auditivo' }],
                  actionPlanItems: [{ title: 'Instalar enclausuramento', responsible: 'Manutencao', status: 'pendente' }]
                },
                {
                  hazard: 'Postura inadequada',
                  factor: 'Ergonomico',
                  agent: 'Movimentos repetitivos',
                  level: 'moderado',
                  source: 'Bancada de montagem',
                  exposure: 'Intermitente',
                  damage: 'Dor lombar',
                  probability: 3,
                  severity: 3,
                  controls: [{ description: 'Pausa e ajuste ergonomico' }],
                  actionPlanItems: []
                }
              ],
              conclusion: {
                result: 'Conclusao tecnica de exemplo para demonstracao',
                basis: 'Base tecnica sintetica da avaliacao publicada.',
                normativeFrame: 'NR-15, Anexo 1',
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
      email: 'contato@empresa-exemplo.com',
      responsavel: 'Gestor Exemplo'
    })
  },
  assessmentRepo: {
    find() {
      return {
        lean: async () => [
          {
            _id: `${documentType}-assessment`,
            abrangenciaInicio: '2026-01-10',
            abrangenciaFim: '2026-12-10',
            context: {
              processoPrincipal: 'Operacao industrial',
              localAreaPosto: 'Area principal',
              jornadaTurno: '44h semanais',
              quantidadeExpostos: 12,
              condicaoOperacional: 'Rotina de trabalho em producao',
              metodologia: 'NHO 01 — Avaliacao da exposicao ocupacional ao ruido',
              instrumentosUtilizados: 'Dosimetro modelo DOS-500',
              criteriosAvaliacao: 'Probabilidade x Severidade',
              matrizRisco: 'Matriz 5x5',
              atividadesBase: ['Operacao de maquina', 'Montagem', 'Inspecao visual']
            }
          }
        ]
      };
    }
  }
});

const main = async () => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const types = Object.keys(DOCUMENT_CONFIGS);
  const results = [];

  for (const documentType of types) {
    const fixture = createFixture(documentType);

    try {
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
      results.push({ documentType, filename, size: buffer.length, status: 'ok' });
    } catch (error) {
      results.push({ documentType, status: 'error', message: error.message });
    }
  }

  console.log(`\nPDFs gerados em ${OUTPUT_DIR}\n`);
  console.table(results);

  const { shutdown } = require('../modules/documents/renderers/browserPool');
  await shutdown();
};

main().catch((error) => {
  console.error('Erro ao gerar PDFs de exemplo:', error);
  process.exit(1);
});
