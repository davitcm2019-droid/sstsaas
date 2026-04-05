const DEFAULT_VERSION = '1.0.0';
const DEFAULT_EFFECTIVE_FROM = '2026-04-05';

const entry = (sectionKey, title, normativeText) => ({
  sectionKey,
  title,
  normativeText,
  version: DEFAULT_VERSION,
  effectiveFrom: DEFAULT_EFFECTIVE_FROM,
  active: true
});

const NORMATIVE_LIBRARY = {
  pgr: [
    entry('identificacao_empresa', 'Identificacao', 'Documento tecnico emitido a partir da base publicada do modulo SST, com rastreabilidade por hash e versao.'),
    entry('apresentacao', 'Apresentacao', 'O PGR deve refletir o gerenciamento de riscos ocupacionais com base em informacoes tecnicas auditaveis.'),
    entry('objetivos', 'Objetivos', 'Este documento consolida inventario, criterios de avaliacao e diretrizes de tratamento de riscos no escopo selecionado.'),
    entry('consideracoes_preliminares', 'Consideracoes preliminares', 'A leitura do documento depende da qualidade e completude das avaliacoes tecnicas publicadas.'),
    entry('avaliacao_riscos', 'Avaliacao dos riscos', 'A avaliacao considera o contexto operacional por setor, cargo, atividade e riscos da avaliacao.'),
    entry('criterios_risco', 'Criterios de risco', 'A classificacao considera probabilidade, severidade e nivel de risco registrados na base tecnica publicada.'),
    entry('matriz_risco', 'Matriz de risco', 'A matriz de risco utilizada no escopo deve estar explicitada na avaliacao tecnica para emissao formal do PGR.'),
    entry('metodologia', 'Metodologia', 'A metodologia apresentada aqui decorre dos registros tecnicos por avaliacao no modulo SST.'),
    entry('inventario_riscos', 'Inventario de riscos', 'O inventario consolida riscos identificados, seus danos potenciais, controles existentes e status de tratamento.'),
    entry('metas_prioridades_controle', 'Metas e prioridades', 'As acoes de controle sao priorizadas pela criticidade dos riscos e pelo impacto operacional do escopo avaliado.'),
    entry('registro_divulgacao_dados', 'Registro e divulgacao', 'Os dados tecnicos devem permanecer rastreaveis e disponiveis para auditoria interna e revisoes documentais.'),
    entry('recomendacoes_empresa', 'Recomendacoes', 'As recomendacoes refletem lacunas tecnicas registradas e acoes propostas para reducao de risco residual.'),
    entry('consideracoes_finais', 'Consideracoes finais', 'O documento depende de revisao periodica sempre que houver mudanca de processo, estrutura ou exposicao.')
  ],
  ltcat: [
    entry('identificacao_empresa', 'Identificacao', 'LTCAT emitido com base nas avaliacoes tecnicas publicadas e conclusoes assinadas no modulo SST.'),
    entry('introducao', 'Introducao', 'Este documento consolida as condicoes ambientais de trabalho para analise tecnica no escopo selecionado.'),
    entry('elementos_construtivos_ltcat', 'Elementos construtivos', 'A base documental considera estrutura organizacional, contexto operacional, riscos e conclusoes tecnicas assinadas.'),
    entry('legislacao_trabalhista', 'Legislacao trabalhista', 'A leitura trabalhista considera os registros tecnicos da avaliacao e os enquadramentos declarados pelo responsavel tecnico.'),
    entry('legislacao_previdenciaria', 'Legislacao previdenciaria', 'A leitura previdenciaria depende da coerencia entre riscos, metodologia, conclusao e fundamentacao tecnica registrada.'),
    entry('criterios_avaliacoes', 'Criterios', 'Os criterios utilizados devem ser explicitados na base da avaliacao para manter consistencia tecnica e documental.'),
    entry('metodologia_avaliacoes', 'Metodologia', 'A metodologia apresentada deve detalhar processo, instrumentos e premissas aplicadas no escopo avaliado.'),
    entry('equipamentos_utilizados', 'Equipamentos', 'Quando houver medicao, os instrumentos e evidencias tecnicas devem estar vinculados a avaliacao correspondente.'),
    entry('analise_riscos_ambiente_trabalho', 'Analise tecnica', 'A analise considera riscos, agentes, fontes, danos e controles por setor, cargo e avaliacao.'),
    entry('nota_tecnica', 'Nota tecnica', 'As observacoes tecnicas devem refletir estritamente a base publicada do sistema, sem contradicoes internas.'),
    entry('conclusao', 'Conclusao', 'A conclusao formal depende de assinatura tecnica valida e enquadramento normativo devidamente registrado.'),
    entry('consideracoes_finais', 'Consideracoes finais', 'A manutencao do LTCAT exige revisoes sempre que houver alteracao de condicao ambiental ou de exposicao.'),
    entry('referencias_bibliograficas', 'Referencias', 'As referencias listadas combinam base normativa aplicavel e rastreio da versao emitida.')
  ],
  ordem_servico: [
    entry('identificacao_empresa', 'Identificacao', 'Ordem de servico emitida a partir da base publicada do modulo SST, com rastreabilidade por escopo e versao.'),
    entry('area_abrangencia', 'Escopo', 'A abrangencia da ordem de servico decorre do escopo tecnico consolidado por estabelecimento, setor e cargo.'),
    entry('inventario_riscos', 'Riscos e orientacoes', 'As orientacoes operacionais devem refletir os riscos, agentes, controles e medidas registradas na base tecnica.'),
    entry('metas_prioridades_controle', 'Responsabilidades e controles', 'As responsabilidades e medidas de controle precisam ser comunicadas e mantidas atualizadas conforme o risco residual.')
  ]
};

const getActiveNormativeBlocks = (documentType = '') =>
  (NORMATIVE_LIBRARY[documentType] || [])
    .filter((item) => item.active)
    .reduce((acc, item) => {
      acc[item.sectionKey] = item;
      return acc;
    }, {});

module.exports = {
  NORMATIVE_LIBRARY,
  getActiveNormativeBlocks
};
