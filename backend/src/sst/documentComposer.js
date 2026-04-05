const { buildDocumentSections } = require('./documentSectionBuilder');
const { getActiveNormativeBlocks } = require('./documentNormativeLibrary');

const FALLBACK = {
  naoInformado: 'Nao informado',
  semDados: 'Sem dados disponiveis'
};

const RISK_LEVEL_PRIORITY = {
  critico: 1,
  alto: 2,
  moderado: 3,
  toleravel: 4
};

const normalizeText = (value, fallback = FALLBACK.naoInformado) => {
  const normalized = String(value || '').trim();
  return normalized || fallback;
};

const sortRisksByCriticality = (risks = []) =>
  [...risks].sort((left, right) => {
    const leftWeight = RISK_LEVEL_PRIORITY[String(left?.level || '').toLowerCase()] || 99;
    const rightWeight = RISK_LEVEL_PRIORITY[String(right?.level || '').toLowerCase()] || 99;
    if (leftWeight !== rightWeight) return leftWeight - rightWeight;
    return String(left?.hazard || '').localeCompare(String(right?.hazard || ''));
  });

const collectTechnicalTeam = (assessments = []) => {
  const seen = new Set();
  const rows = [];
  assessments.forEach((assessment) => {
    const rt = assessment?.fixed?.assessment?.responsibleTechnical || {};
    const key = `${rt?.nome || ''}:${rt?.registro || ''}`;
    if (!key || seen.has(key)) return;
    seen.add(key);
    rows.push({
      nome: normalizeText(rt?.nome),
      email: normalizeText(rt?.email),
      registro: normalizeText(rt?.registro)
    });
  });
  return rows;
};

const collectAssessmentScopes = (assessments = [], assessmentContexts = new Map()) =>
  assessments.map((assessment) => {
    const assessmentId = String(assessment?.fixed?.assessment?.id || '');
    const contextRow = assessmentContexts.get(assessmentId) || {};
    const context = contextRow?.context || {};
    const risks = sortRisksByCriticality(Array.isArray(assessment?.dynamic?.risks) ? assessment.dynamic.risks : []);
    return {
      assessmentId,
      title: normalizeText(assessment?.fixed?.assessment?.title),
      version: assessment?.fixed?.assessment?.version || 1,
      establishment: normalizeText(assessment?.fixed?.establishment?.nome),
      sector: normalizeText(assessment?.fixed?.sector?.nome),
      role: normalizeText(assessment?.fixed?.role?.nome),
      context: {
        processoPrincipal: normalizeText(context?.processoPrincipal),
        localAreaPosto: normalizeText(context?.localAreaPosto),
        jornadaTurno: normalizeText(context?.jornadaTurno),
        quantidadeExpostos: Number(context?.quantidadeExpostos || 0) || 0,
        condicaoOperacional: normalizeText(context?.condicaoOperacional),
        metodologia: normalizeText(context?.metodologia),
        instrumentosUtilizados: normalizeText(context?.instrumentosUtilizados),
        criteriosAvaliacao: normalizeText(context?.criteriosAvaliacao),
        matrizRisco: normalizeText(context?.matrizRisco),
        observations: normalizeText(context?.observations, FALLBACK.semDados)
      },
      conclusion: {
        result: normalizeText(assessment?.dynamic?.conclusion?.result, FALLBACK.semDados),
        basis: normalizeText(assessment?.dynamic?.conclusion?.basis, FALLBACK.semDados),
        normativeFrame: normalizeText(assessment?.dynamic?.conclusion?.normativeFrame, FALLBACK.semDados),
        signedAt: assessment?.dynamic?.conclusion?.signedAt || null,
        signedBy: normalizeText(assessment?.dynamic?.conclusion?.signedBy?.nome)
      },
      risks
    };
  });

const collectRiskInventory = (assessmentScopes = []) =>
  assessmentScopes.flatMap((scope) =>
    scope.risks.map((risk) => ({
      assessmentId: scope.assessmentId,
      assessmentTitle: scope.title,
      sector: scope.sector,
      role: scope.role,
      category: normalizeText(risk?.category),
      riskGroup: normalizeText(risk?.riskGroup),
      factor: normalizeText(risk?.factor),
      hazard: normalizeText(risk?.hazard),
      agent: normalizeText(risk?.agent),
      source: normalizeText(risk?.source),
      exposure: normalizeText(risk?.exposure),
      damage: normalizeText(risk?.damage),
      level: normalizeText(risk?.level),
      probability: Number(risk?.probability || 0) || 0,
      severity: Number(risk?.severity || 0) || 0,
      normativeRefs: Array.isArray(risk?.normativeRefs) ? risk.normativeRefs : [],
      controls: Array.isArray(risk?.controls) ? risk.controls : [],
      actionPlanItems: Array.isArray(risk?.actionPlanItems) ? risk.actionPlanItems : [],
      highRiskJustification: normalizeText(risk?.highRiskJustification, '')
    }))
  );

const collectActionPlan = (riskInventory = []) =>
  riskInventory.flatMap((risk) =>
    risk.actionPlanItems.map((item) => ({
      title: normalizeText(item?.title),
      responsible: normalizeText(item?.responsible),
      status: normalizeText(item?.status),
      dueDate: item?.dueDate || null,
      acceptanceCriteria: normalizeText(item?.acceptanceCriteria, FALLBACK.semDados),
      assessmentTitle: risk.assessmentTitle,
      sector: risk.sector,
      role: risk.role,
      hazard: risk.hazard
    }))
  );

const buildMethodology = (assessmentScopes = []) => {
  const processList = [...new Set(assessmentScopes.map((scope) => scope.context.processoPrincipal).filter(Boolean))];
  const methodList = [...new Set(assessmentScopes.map((scope) => scope.context.metodologia).filter(Boolean))];
  const criteriaList = [...new Set(assessmentScopes.map((scope) => scope.context.criteriosAvaliacao).filter(Boolean))];
  const matrixList = [...new Set(assessmentScopes.map((scope) => scope.context.matrizRisco).filter(Boolean))];
  const instrumentsList = [...new Set(assessmentScopes.map((scope) => scope.context.instrumentosUtilizados).filter(Boolean))];
  return {
    processos: processList.length ? processList : [FALLBACK.semDados],
    metodologia: methodList.length ? methodList : [FALLBACK.semDados],
    criterios: criteriaList.length ? criteriaList : [FALLBACK.semDados],
    matriz: matrixList.length ? matrixList : [FALLBACK.semDados],
    instrumentos: instrumentsList.length ? instrumentsList : [FALLBACK.semDados]
  };
};

const buildNarrativeBySection = ({ sectionKey, readiness, summary, methodology, technicalTeam, actionPlan, assessmentScopes }) => {
  switch (sectionKey) {
    case 'identificacao_empresa':
      return [summary.overview];
    case 'avaliadores':
      return technicalTeam.length
        ? technicalTeam.map((item, index) => `${index + 1}. ${item.nome} / Registro: ${item.registro} / Email: ${item.email}`)
        : [FALLBACK.semDados];
    case 'apresentacao':
      return ['Este documento consolida a base tecnica publicada no modulo SST para emissao formal e rastreavel.'];
    case 'objetivos':
      return ['Apresentar os riscos ocupacionais, criterios de classificacao e medidas de controle do escopo selecionado.'];
    case 'consideracoes_preliminares':
      return ['A qualidade da emissao depende da completude dos registros tecnicos em avaliacao, riscos, controles e conclusao.'];
    case 'area_abrangencia':
      return assessmentScopes.length
        ? assessmentScopes.map((scope) => `${scope.sector} / ${scope.role} / ${scope.title} (v${scope.version})`)
        : [FALLBACK.semDados];
    case 'criterios_risco':
    case 'criterios_avaliacoes':
      return [`Criterios: ${methodology.criterios.join(' | ')}`];
    case 'matriz_risco':
      return [`Matriz de risco: ${methodology.matriz.join(' | ')}`];
    case 'instrumentos_utilizados':
    case 'equipamentos_utilizados':
      return [`Instrumentos: ${methodology.instrumentos.join(' | ')}`];
    case 'metodologia':
    case 'metodologia_avaliacoes':
      return [`Metodologia: ${methodology.metodologia.join(' | ')}`, `Processos avaliados: ${methodology.processos.join(' | ')}`];
    case 'metas_prioridades_controle':
      return actionPlan.length
        ? [`Foram identificadas ${actionPlan.length} acao(oes) no plano de controle priorizado por criticidade.`]
        : ['Nao foram encontradas acoes de plano de controle no escopo emitido.'];
    case 'registro_divulgacao_dados':
      return ['Os registros desta versao permanecem vinculados ao hash documental e trilha de auditoria do modulo SST.'];
    case 'recomendacoes_empresa':
      return ['As recomendacoes devem considerar os riscos criticos/altos e o status de implementacao das acoes vinculadas.'];
    case 'consideracoes_finais':
      return ['Este documento deve ser revisado sempre que houver alteracoes de processo, exposicao ou estrutura operacional.'];
    case 'encerramento':
      return readiness.missingFields.length
        ? ['Emissao concluida com dados complementares nao criticos. Verifique pendencias no bloco de dados complementares.']
        : ['Emissao concluida com completude tecnica para o escopo selecionado.'];
    case 'introducao':
      return ['O LTCAT foi consolidado com base nas avaliacoes publicadas e conclusoes tecnicas assinadas no escopo vigente.'];
    case 'elementos_construtivos_ltcat':
      return ['Elementos construtivos: estrutura organizacional, contexto operacional, riscos registrados, controles e conclusoes assinadas.'];
    case 'legislacao_trabalhista':
      return ['A leitura trabalhista foi consolidada a partir da base tecnica publicada no modulo SST.'];
    case 'legislacao_previdenciaria':
      return ['A leitura previdenciaria depende da coerencia entre risco, metodologia e conclusao tecnica do escopo emitido.'];
    case 'iniciais':
      return ['As siglas, premissas e delimitacoes tecnicas adotadas seguem os registros do escopo selecionado.'];
    case 'nota_tecnica':
      return ['A nota tecnica decorre estritamente dos dados versionados nesta emissao, sem sobreposicao manual de base.'];
    case 'referencias_bibliograficas':
      return ['- NR-01 GRO/PGR', '- Lei 8.213 e Decreto 3.048', '- Base tecnica publicada no modulo SST'];
    default:
      return [];
  }
};

const composeDocumentPayload = ({ document, version, pdfData = {} }) => {
  const content = version?.content || {};
  const assessments = Array.isArray(content.assessments) ? content.assessments : [];
  const annexes = Array.isArray(content.annexes) ? content.annexes : [];
  const sections = buildDocumentSections(document?.documentType, { includeAnnexes: annexes.length > 0 });
  const normativeBlocks = getActiveNormativeBlocks(document?.documentType);
  const assessmentScopes = collectAssessmentScopes(assessments, pdfData?.assessmentContexts || new Map());
  const riskInventory = collectRiskInventory(assessmentScopes);
  const actionPlan = collectActionPlan(riskInventory);
  const methodology = buildMethodology(assessmentScopes);
  const technicalTeam = collectTechnicalTeam(assessments);
  const readiness = {
    emitible: !(pdfData?.missingData || []).length,
    missingFields: Array.isArray(pdfData?.missingData) ? pdfData.missingData : []
  };

  const sectionsWithContent = sections.map((section) => ({
    ...section,
    normativeBlock: normativeBlocks[section.key] || null,
    paragraphs: buildNarrativeBySection({
      sectionKey: section.key,
      readiness,
      summary: pdfData?.summary || { overview: FALLBACK.semDados },
      methodology,
      technicalTeam,
      actionPlan,
      assessmentScopes
    })
  }));

  return {
    documentMeta: {
      documentType: document?.documentType || '',
      documentTypeLabel: pdfData?.labels?.documentTypeLabel || document?.documentType || 'Documento Tecnico',
      title: document?.title || 'Documento Tecnico',
      scopeType: document?.scopeType || '',
      scopeRefId: document?.scopeRefId || '',
      version: version?.version || document?.latestVersion || 1,
      hash: version?.hash || 'n/a',
      issuedAt: version?.issuedAt || null,
      issuedBy: version?.issuedBy || {}
    },
    companyProfile: pdfData?.empresa || null,
    technicalTeam,
    assessmentScope: assessmentScopes,
    riskInventory,
    actionPlan,
    methodology,
    normativeBlocks,
    readiness,
    editable: content?.editable || {},
    annexes,
    sections: sectionsWithContent,
    summary: pdfData?.summary || { overview: FALLBACK.semDados },
    raw: {
      document,
      version,
      content
    }
  };
};

module.exports = {
  composeDocumentPayload,
  sortRisksByCriticality
};
