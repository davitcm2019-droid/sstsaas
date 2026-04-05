const SECTION_BLUEPRINTS = {
  pgr: [
    { key: 'identificacao_empresa', title: '1 - IDENTIFICACAO DA EMPRESA' },
    { key: 'avaliadores', title: '2 - AVALIADORES' },
    { key: 'apresentacao', title: '3 - APRESENTACAO' },
    { key: 'objetivos', title: '4 - OBJETIVOS' },
    { key: 'consideracoes_preliminares', title: '5 - CONSIDERACOES PRELIMINARES' },
    { key: 'area_abrangencia', title: '6 - AREA DE ABRANGENCIA' },
    { key: 'avaliacao_riscos', title: '7 - AVALIACAO DOS RISCOS' },
    { key: 'criterios_risco', title: '8 - CRITERIOS DE RISCO' },
    { key: 'matriz_risco', title: '9 - MATRIZ DE RISCO' },
    { key: 'instrumentos_utilizados', title: '10 - INSTRUMENTOS UTILIZADOS' },
    { key: 'metodologia', title: '11 - METODOLOGIA' },
    { key: 'antecipacao_riscos', title: '12 - ANTECIPACAO DOS RISCOS' },
    { key: 'inventario_riscos', title: '13 - INVENTARIO DE RISCOS' },
    { key: 'reconhecimento_analise_riscos', title: '14 - RECONHECIMENTO E ANALISE DOS RISCOS DO AMBIENTE DE TRABALHO' },
    { key: 'metas_prioridades_controle', title: '15 - METAS E PRIORIDADES DE CONTROLE' },
    { key: 'registro_divulgacao_dados', title: '16 - REGISTRO E DIVULGACAO DOS DADOS' },
    { key: 'recomendacoes_empresa', title: '17 - RECOMENDACOES A EMPRESA' },
    { key: 'consideracoes_finais', title: '18 - CONSIDERACOES FINAIS' },
    { key: 'encerramento', title: '19 - ENCERRAMENTO' }
  ],
  ltcat: [
    { key: 'identificacao_empresa', title: '1 - IDENTIFICACAO DA EMPRESA' },
    { key: 'avaliadores', title: '2 - AVALIADORES' },
    { key: 'introducao', title: '3 - INTRODUCAO' },
    { key: 'elementos_construtivos_ltcat', title: '4 - ELEMENTOS CONSTRUTIVOS DO LTCAT' },
    { key: 'legislacao_trabalhista', title: '5 - LEGISLACAO TRABALHISTA' },
    { key: 'legislacao_previdenciaria', title: '6 - LEGISLACAO PREVIDENCIARIA' },
    { key: 'iniciais', title: '7 - INICIAIS' },
    { key: 'criterios_avaliacoes', title: '8 - CRITERIOS DAS AVALIACOES' },
    { key: 'metodologia_avaliacoes', title: '9 - METODOLOGIA DAS AVALIACOES' },
    { key: 'equipamentos_utilizados', title: '10 - EQUIPAMENTOS UTILIZADOS' },
    { key: 'analise_riscos_ambiente_trabalho', title: '11 - RECONHECIMENTO E ANALISE DOS RISCOS DO AMBIENTE DE TRABALHO' },
    { key: 'nota_tecnica', title: '12 - NOTA TECNICA' },
    { key: 'conclusao', title: '13 - CONCLUSAO' },
    { key: 'consideracoes_finais', title: '14 - CONSIDERACOES FINAIS' },
    { key: 'encerramento', title: '15 - ENCERRAMENTO' },
    { key: 'referencias_bibliograficas', title: '16 - REFERENCIAS BIBLIOGRAFICAS' }
  ],
  inventario: [
    { key: 'identificacao_empresa', title: '1 - IDENTIFICACAO DA EMPRESA' },
    { key: 'inventario_riscos', title: '2 - INVENTARIO DE RISCOS' },
    { key: 'metas_prioridades_controle', title: '3 - PLANO DE ACAO' },
    { key: 'encerramento', title: '4 - ENCERRAMENTO' }
  ],
  ordem_servico: [
    { key: 'identificacao_empresa', title: '1 - IDENTIFICACAO DA EMPRESA' },
    { key: 'area_abrangencia', title: '2 - ESCOPO E ABRANGENCIA' },
    { key: 'inventario_riscos', title: '3 - RISCOS E ORIENTACOES OPERACIONAIS' },
    { key: 'metas_prioridades_controle', title: '4 - RESPONSABILIDADES E CONTROLES' },
    { key: 'encerramento', title: '5 - ENCERRAMENTO' }
  ],
  laudo_insalubridade: [
    { key: 'identificacao_empresa', title: '1 - IDENTIFICACAO DA EMPRESA' },
    { key: 'analise_riscos_ambiente_trabalho', title: '2 - ANALISE TECNICA' },
    { key: 'conclusao', title: '3 - CONCLUSAO' },
    { key: 'encerramento', title: '4 - ENCERRAMENTO' }
  ],
  laudo_periculosidade: [
    { key: 'identificacao_empresa', title: '1 - IDENTIFICACAO DA EMPRESA' },
    { key: 'analise_riscos_ambiente_trabalho', title: '2 - ANALISE TECNICA' },
    { key: 'conclusao', title: '3 - CONCLUSAO' },
    { key: 'encerramento', title: '4 - ENCERRAMENTO' }
  ],
  laudo_tecnico: [
    { key: 'identificacao_empresa', title: '1 - IDENTIFICACAO DA EMPRESA' },
    { key: 'analise_riscos_ambiente_trabalho', title: '2 - ANALISE TECNICA' },
    { key: 'conclusao', title: '3 - CONCLUSAO' },
    { key: 'encerramento', title: '4 - ENCERRAMENTO' }
  ]
};

const getBlueprint = (documentType = '') => SECTION_BLUEPRINTS[documentType] || SECTION_BLUEPRINTS.inventario;

const buildDocumentSections = (documentType = '', options = {}) => {
  const includeAnnexes = Boolean(options.includeAnnexes);
  const base = getBlueprint(documentType).map((section) => ({ ...section, required: true }));
  if (!includeAnnexes) return base;
  const hasAnnexes = base.some((section) => section.key === 'anexos');
  if (hasAnnexes) return base;
  return [...base, { key: 'anexos', title: `${base.length + 1} - ANEXOS`, required: false }];
};

module.exports = {
  SECTION_BLUEPRINTS,
  buildDocumentSections
};
