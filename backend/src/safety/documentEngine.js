const crypto = require('crypto');

const DEFAULT_TEMPLATES = {
  pgr: {
    documentType: 'PGR',
    title: 'Programa de Gerenciamento de Riscos',
    layers: {
      fixedIntro: 'Documento estruturado a partir do ciclo tecnico publicado no modulo de levantamento de riscos.',
      dynamicRules: 'Consolidar contexto, inventario, medidas de controle e plano de acao do ciclo.',
      editableGuidance: 'Registrar particularidades operacionais, premissas e ressalvas do RT.'
    }
  },
  inventario_riscos: {
    documentType: 'Inventario de Riscos',
    title: 'Inventario de Riscos Ocupacionais',
    layers: {
      fixedIntro: 'Inventario consolidado dos cenarios de risco publicados para o estabelecimento.',
      dynamicRules: 'Listar GHEs, atividades, agentes, avaliacoes, conclusoes e controles.',
      editableGuidance: 'Complementar observacoes tecnicas de campo.'
    }
  },
  ltcat: {
    documentType: 'LTCAT',
    title: 'Laudo Tecnico das Condicoes Ambientais de Trabalho',
    layers: {
      fixedIntro: 'Laudo derivado do ciclo tecnico publicado e das avaliacoes registradas.',
      dynamicRules: 'Destacar agentes com potencial previdenciario e suas conclusoes tecnicas.',
      editableGuidance: 'Adicionar contexto previdenciario ou ressalvas especificas.'
    }
  },
  laudo_insalubridade: {
    documentType: 'Laudo de Insalubridade',
    title: 'Laudo de Insalubridade',
    layers: {
      fixedIntro: 'Laudo de enquadramento baseado em avaliacao publicada e conclusao tecnica.',
      dynamicRules: 'Consolidar agentes da NR-15 com resultados e enquadramento.',
      editableGuidance: 'Incluir observacoes complementares do RT.'
    }
  },
  laudo_periculosidade: {
    documentType: 'Laudo de Periculosidade',
    title: 'Laudo de Periculosidade',
    layers: {
      fixedIntro: 'Laudo estruturado a partir de riscos com potencial enquadramento em NR-16.',
      dynamicRules: 'Consolidar cenarios, atividades e conclusoes tecnicas pertinentes.',
      editableGuidance: 'Registrar peculiaridades da atividade e do ambiente.'
    }
  },
  ltip: {
    documentType: 'LTIP',
    title: 'Laudo Tecnico de Insalubridade e Periculosidade',
    layers: {
      fixedIntro: 'Consolidado tecnico de insalubridade e periculosidade por estabelecimento.',
      dynamicRules: 'Cruzar agentes, conclusoes e evidencias do ciclo publicado.',
      editableGuidance: 'Registrar ressalvas e delimitacoes da analise.'
    }
  },
  mapa_riscos: {
    documentType: 'Mapa de Riscos',
    title: 'Mapa de Riscos',
    layers: {
      fixedIntro: 'Representacao textual estruturada dos riscos por GHE e ambiente.',
      dynamicRules: 'Agrupar por ambiente, GHE e categoria de agente.',
      editableGuidance: 'Complementar instrucoes para representacao visual.'
    }
  },
  pae: {
    documentType: 'PAE',
    title: 'Plano de Atendimento a Emergencias',
    layers: {
      fixedIntro: 'Documento derivado dos cenarios criticos e controles de emergencia publicados.',
      dynamicRules: 'Consolidar riscos criticos, controles de emergencia e respostas previstas.',
      editableGuidance: 'Complementar fluxos e contingencias especificas do RT.'
    }
  }
};

const hashPayload = (payload) => crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

const countSummary = (snapshotPayload = {}) => ({
  environments: snapshotPayload?.completion?.counts?.environments || snapshotPayload?.environments?.length || 0,
  ghes: snapshotPayload?.completion?.counts?.ghes || 0,
  cargos: snapshotPayload?.completion?.counts?.cargos || 0,
  activities: snapshotPayload?.completion?.counts?.activities || 0,
  risks: snapshotPayload?.completion?.counts?.risks || 0,
  assessedRisks: snapshotPayload?.completion?.counts?.assessedRisks || 0,
  technicalConclusions: snapshotPayload?.completion?.counts?.technicalConclusions || 0,
  actionPlanItems: snapshotPayload?.completion?.counts?.actionPlanItems || 0
});

const buildDynamicText = (snapshotPayload = {}, templateCode = 'inventario_riscos') => {
  const environments = Array.isArray(snapshotPayload?.environments) ? snapshotPayload.environments : [];
  const lines = [];

  for (const environment of environments) {
    const ghes = Array.isArray(environment?.ghes) ? environment.ghes : [];
    lines.push(`Ambiente: ${environment.nome} (${environment.setor})`);
    for (const ghe of ghes) {
      lines.push(`  GHE: ${ghe.nomeTecnico} | Headcount: ${ghe.headcount}`);
      const cargos = Array.isArray(ghe?.cargos) ? ghe.cargos : [];
      for (const cargo of cargos) {
        lines.push(`    Cargo: ${cargo.nome}`);
        const activities = Array.isArray(cargo?.activities) ? cargo.activities : [];
        for (const activity of activities) {
          lines.push(`      Atividade: ${activity.nome}`);
          const risks = Array.isArray(activity?.risks) ? activity.risks : [];
          for (const risk of risks) {
            const assessment = risk?.assessment;
            const conclusion = risk?.technicalConclusion;
            lines.push(
              `        Risco: ${risk.perigo} | Agente: ${risk.riskType || risk.categoriaAgente} | Classificacao: ${assessment?.classificacao || 'sem_avaliacao'} | Resultado tecnico: ${conclusion?.resultadoTecnico || 'sem conclusao'}`
            );
          }
        }
      }
    }
  }

  if (templateCode === 'pae') {
    const critical = [];
    for (const environment of environments) {
      for (const ghe of environment?.ghes || []) {
        for (const cargo of ghe?.cargos || []) {
          for (const activity of cargo?.activities || []) {
            for (const risk of activity?.risks || []) {
              if (['alto', 'critico'].includes(risk?.assessment?.classificacao)) {
                critical.push(`${environment.nome} / ${ghe.nomeTecnico} / ${risk.perigo}`);
              }
            }
          }
        }
      }
    }
    lines.push('');
    lines.push(`Cenarios criticos mapeados: ${critical.length}`);
    if (critical.length) {
      lines.push(...critical.map((item) => `- ${item}`));
    }
  }

  return lines.join('\n');
};

const buildFixedText = ({ cycle, template }) =>
  [
    `${template.title}`,
    `Empresa: ${cycle.empresaId}`,
    `Unidade: ${cycle.unidade}`,
    `Estabelecimento: ${cycle.estabelecimento}`,
    `Versao do ciclo: ${cycle.version}`,
    `Responsavel tecnico: ${cycle.responsibleTechnical?.nome || 'Nao informado'} (${cycle.responsibleTechnical?.registro || 'sem registro'})`
  ].join('\n');

module.exports = {
  DEFAULT_TEMPLATES,
  buildDynamicText,
  buildFixedText,
  countSummary,
  hashPayload
};
