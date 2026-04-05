const { composeDocumentPayload } = require('../../../sst/documentComposer');

const DEFAULT_VISUAL_IDENTITY = {
  brandName: 'SST SaaS',
  accentColor: '#0f766e',
  accentSoftColor: '#ccfbf1',
  inkColor: '#0f172a',
  mutedColor: '#475569',
  borderColor: '#cbd5e1'
};

const safeText = (value, fallback = 'Nao informado') => {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
};

const formatDate = (value, fallback = 'Nao informado') => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toLocaleDateString('pt-BR');
};

const uniq = (rows = []) => [...new Set(rows.filter(Boolean))];

const summarizeControls = (controls = []) => {
  const normalized = Array.isArray(controls)
    ? controls.map((item) => safeText(item?.description, '')).filter(Boolean)
    : [];
  return normalized.length ? normalized.join(' | ') : 'Sem controles registrados';
};

const summarizeActions = (actions = []) => {
  const normalized = Array.isArray(actions)
    ? actions
        .map((item) => {
          const title = safeText(item?.title, '');
          const responsible = safeText(item?.responsible, '');
          const status = safeText(item?.status, '');
          return [title, responsible ? `Resp. ${responsible}` : '', status ? `Status ${status}` : '']
            .filter(Boolean)
            .join(' / ');
        })
        .filter(Boolean)
    : [];
  return normalized.length ? normalized.join(' | ') : 'Sem plano de acao';
};

const buildRiskIndicators = (riskInventory = []) => ({
  total: riskInventory.length,
  criticos: riskInventory.filter((item) => String(item.level || '').toLowerCase() === 'critico').length,
  altos: riskInventory.filter((item) => String(item.level || '').toLowerCase() === 'alto').length,
  moderados: riskInventory.filter((item) => String(item.level || '').toLowerCase() === 'moderado').length,
  toleraveis: riskInventory.filter((item) => String(item.level || '').toLowerCase() === 'toleravel').length
});

const buildMasterRiskTable = (riskInventory = []) =>
  riskInventory.map((risk, index) => ({
    ordem: index + 1,
    setor: safeText(risk.sector),
    cargo: safeText(risk.role),
    perigo: safeText(risk.hazard),
    fator: safeText(risk.factor),
    agente: safeText(risk.agent),
    fonte: safeText(risk.source),
    dano: safeText(risk.damage),
    probabilidade: Number(risk.probability || 0) || 0,
    severidade: Number(risk.severity || 0) || 0,
    nivel: safeText(risk.level),
    controles: summarizeControls(risk.controls),
    acoes: summarizeActions(risk.actionPlanItems)
  }));

const buildPgrRiskSheets = (assessmentScopes = []) =>
  assessmentScopes.flatMap((scope) =>
    (Array.isArray(scope.risks) ? scope.risks : []).map((risk, index) => ({
      ordem: index + 1,
      avaliacaoId: scope.assessmentId,
      avaliacao: safeText(scope.title),
      estabelecimento: safeText(scope.establishment),
      setor: safeText(scope.sector),
      cargo: safeText(scope.role),
      perigo: safeText(risk.hazard),
      fator: safeText(risk.factor),
      agente: safeText(risk.agent, ''),
      fonte: safeText(risk.source, ''),
      dano: safeText(risk.damage),
      nivel: safeText(risk.level),
      probabilidade: Number(risk.probability || 0) || 0,
      severidade: Number(risk.severity || 0) || 0,
      descricao: [
        scope.context?.processoPrincipal ? `Processo principal: ${scope.context.processoPrincipal}.` : '',
        scope.context?.localAreaPosto ? `Local/area/posto: ${scope.context.localAreaPosto}.` : '',
        scope.context?.condicaoOperacional ? `Condicao operacional: ${scope.context.condicaoOperacional}.` : '',
        risk.source ? `Fonte geradora: ${risk.source}.` : '',
        risk.exposure ? `Exposicao: ${risk.exposure}.` : ''
      ]
        .filter(Boolean)
        .join(' '),
      sugestoesIniciais: summarizeControls(risk.controls),
      planoAcao: summarizeActions(risk.actionPlanItems),
      danosSaude: safeText(risk.damage),
      metodologia: safeText(scope.context?.metodologia, ''),
      instrumentos: safeText(scope.context?.instrumentosUtilizados, ''),
      criterios: safeText(scope.context?.criteriosAvaliacao, '')
    }))
  );

const buildIssueFrame = ({ profile, documentView, establishments, riskInventory = [], actionPlan = [] }) => ({
  tipo: profile.formalTitle,
  emitidoEm: formatDate(documentView.documentMeta?.issuedAt),
  versao: documentView.documentMeta?.version || 1,
  hash: safeText(documentView.documentMeta?.hash, 'n/a'),
  empresa: safeText(documentView.companyProfile?.nome),
  vigencia: safeText(documentView.documentMeta?.coverageLabel, 'Sem abrangencia informada'),
  responsavelTecnico: safeText(documentView.technicalTeam?.[0]?.nome),
  registroResponsavel: safeText(documentView.technicalTeam?.[0]?.registro),
  escopo: `${safeText(documentView.documentMeta?.scopeType, 'n/a')} / ${safeText(documentView.documentMeta?.scopeRefId, 'n/a')}`,
  estabelecimentos: establishments.length,
  riscos: riskInventory.length,
  acoes: actionPlan.length
});

const groupAssessmentScopes = (assessmentScopes = []) => {
  const establishmentMap = new Map();

  assessmentScopes.forEach((scope) => {
    const establishmentKey = scope.establishment || 'Estabelecimento principal';
    const sectorKey = scope.sector || 'Setor nao informado';
    const roleKey = scope.role || 'Cargo nao informado';

    if (!establishmentMap.has(establishmentKey)) {
      establishmentMap.set(establishmentKey, {
        nome: establishmentKey,
        setores: []
      });
    }

    const establishment = establishmentMap.get(establishmentKey);
    let sector = establishment.setores.find((item) => item.nome === sectorKey);
    if (!sector) {
      sector = {
        nome: sectorKey,
        cargos: []
      };
      establishment.setores.push(sector);
    }

    let role = sector.cargos.find((item) => item.nome === roleKey);
    if (!role) {
      role = {
        nome: roleKey,
        atividades: [],
        riscos: [],
        avaliacoesQuantitativas: [],
        avaliacoes: []
      };
      sector.cargos.push(role);
    }

    role.atividades = uniq([
      ...role.atividades,
      scope.context?.processoPrincipal,
      scope.context?.localAreaPosto,
      scope.context?.condicaoOperacional
    ]);
    role.riscos.push(...(Array.isArray(scope.risks) ? scope.risks : []));
    role.avaliacoesQuantitativas.push(
      ...(Array.isArray(scope.risks)
        ? scope.risks
            .filter((risk) => risk.agent || risk.source || risk.exposure)
            .map((risk) => ({
              avaliacaoId: scope.assessmentId,
              agente: safeText(risk.agent, ''),
              fonte: safeText(risk.source, ''),
              exposicao: safeText(risk.exposure, ''),
              metodologia: safeText(scope.context?.metodologia, ''),
              instrumentos: safeText(scope.context?.instrumentosUtilizados, ''),
              probabilidade: Number(risk.probability || 0) || 0,
              severidade: Number(risk.severity || 0) || 0,
              nivel: safeText(risk.level, '')
            }))
        : [])
    );
    role.avaliacoes.push({
      id: scope.assessmentId,
      titulo: safeText(scope.title),
      abrangenciaInicio: safeText(scope.abrangenciaInicio, ''),
      abrangenciaFim: safeText(scope.abrangenciaFim, ''),
      quantidadeExpostos: Number(scope.context?.quantidadeExpostos || 0) || 0,
      metodologia: safeText(scope.context?.metodologia, ''),
      criteriosAvaliacao: safeText(scope.context?.criteriosAvaliacao, '')
    });
  });

  return [...establishmentMap.values()];
};

const normalizeSection = (section = {}) => ({
  chave: section.key,
  titulo: section.title,
  textoNormativo: section?.normativeBlock?.normativeText || '',
  paragrafos: Array.isArray(section.paragraphs) ? section.paragraphs.filter(Boolean) : []
});

const buildClosingBlock = (documentView, profile) => {
  const signedBy = documentView.technicalTeam?.[0] || documentView.raw?.version?.issuedBy || {};
  return {
    texto: profile.closingText,
    emitidoEm: formatDate(documentView.documentMeta?.issuedAt),
    hash: safeText(documentView.documentMeta?.hash, 'n/a'),
    assinatura: {
      nome: safeText(signedBy.nome),
      email: safeText(signedBy.email, ''),
      registro: safeText(signedBy.registro, '')
    }
  };
};

const createSstDocumentBuilder = (profile) => ({
  type: profile.documentType,
  meta: {
    type: profile.documentType,
    title: profile.title,
    formalTitle: profile.formalTitle,
    description: profile.description,
    category: 'sst'
  },
  build: async ({ document, version, pdfData = {} }) => {
    const documentView = composeDocumentPayload({ document, version, pdfData });
    const establishments = groupAssessmentScopes(documentView.assessmentScope);
    const riskInventory = documentView.riskInventory || [];
    const actionPlan = documentView.actionPlan || [];
    const pgrRiskSheets = buildPgrRiskSheets(documentView.assessmentScope || []);

    return {
      empresa: documentView.companyProfile,
      documento: {
        tipo: profile.documentType,
        titulo: documentView.documentMeta?.title || profile.title,
        tituloFormal: profile.formalTitle,
        subtitulo: profile.subtitle || '',
        codigoTemplate: version?.templateCode || document?.documentModelCode || '',
        vigencia: documentView.documentMeta?.coverageLabel || 'Sem abrangencia informada',
        versao: documentView.documentMeta?.version || 1,
        hash: documentView.documentMeta?.hash || 'n/a',
        emitidoEm: formatDate(documentView.documentMeta?.issuedAt),
        emitidoPor: safeText(documentView.documentMeta?.issuedBy?.nome || documentView.documentMeta?.issuedBy?.email),
        scopeType: documentView.documentMeta?.scopeType || '',
        scopeRefId: documentView.documentMeta?.scopeRefId || ''
      },
      identidadeVisual: {
        ...DEFAULT_VISUAL_IDENTITY,
        ...profile.visualIdentity
      },
      resumo: {
        executivo: documentView.summary?.overview || 'Sem resumo executivo.',
        prontidao: documentView.readiness
      },
      emissao: buildIssueFrame({
        profile,
        documentView,
        establishments,
        riskInventory,
        actionPlan
      }),
      indicadoresRisco: buildRiskIndicators(riskInventory),
      quadroRiscos: buildMasterRiskTable(riskInventory),
      fichasRiscosPgr: pgrRiskSheets,
      estabelecimentos: establishments,
      setores: establishments.flatMap((item) => item.setores),
      inventarioRiscos: riskInventory,
      planoAcao: actionPlan,
      metodologia: documentView.methodology || {},
      equipeTecnica: documentView.technicalTeam || [],
      responsavelTecnico: documentView.technicalTeam?.[0] || {},
      secoes: Array.isArray(documentView.sections) ? documentView.sections.map(normalizeSection) : [],
      anexos: Array.isArray(documentView.annexes) ? documentView.annexes : [],
      fechamentoTecnico: buildClosingBlock(documentView, profile),
      notasEditaveis: documentView.editable || {},
      raw: documentView
    };
  }
});

module.exports = {
  DEFAULT_VISUAL_IDENTITY,
  createSstDocumentBuilder
};
