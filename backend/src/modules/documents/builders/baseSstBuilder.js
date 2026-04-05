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
      estabelecimentos: establishments,
      setores: establishments.flatMap((item) => item.setores),
      inventarioRiscos: documentView.riskInventory || [],
      planoAcao: documentView.actionPlan || [],
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
