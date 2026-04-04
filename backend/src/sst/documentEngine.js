const { buildHash, DOCUMENT_SCOPE_TYPES, DOCUMENT_TYPES } = require('./models');

const DOCUMENT_MODEL_CODES = {
  inventario: 'inventario_base',
  pgr: 'pgr_programa',
  ltcat: 'ltcat_base',
  laudo_insalubridade: 'laudo_insalubridade_base',
  laudo_periculosidade: 'laudo_periculosidade_base',
  laudo_tecnico: 'laudo_tecnico_base'
};

const DEFAULT_DOCUMENT_MODELS = [
  {
    code: DOCUMENT_MODEL_CODES.inventario,
    documentType: 'inventario',
    title: 'Inventario de Riscos',
    description: 'Modelo base para consolidacao de riscos publicados por empresa e escopo tecnico.',
    allowedScopeTypes: ['assessment', 'sector', 'establishment'],
    layers: {
      fixed: 'Conteudo automatico de identificacao da empresa, escopo, responsavel tecnico e hash documental.',
      editable: {
        resumo: 'Consolidacao executiva do inventario, pronta para revisao tecnica final.',
        notas: '',
        ressalvas: ''
      },
      annexes: [
        {
          title: 'Anexo - Matriz de priorizacao',
          content: 'Utilize este anexo para destacar criterios complementares de priorizacao e acompanhamento.',
          order: 1
        }
      ]
    }
  },
  {
    code: DOCUMENT_MODEL_CODES.pgr,
    documentType: 'pgr',
    title: 'Programa de Gerenciamento de Riscos',
    description: 'Modelo de PGR com consolidacao do inventario e direcionamento do plano de acao.',
    allowedScopeTypes: ['assessment', 'sector', 'establishment'],
    layers: {
      fixed: 'Conteudo automatico com dados da organizacao, escopo do programa e responsavel tecnico.',
      editable: {
        resumo: 'Diretrizes gerais do programa e escopo de aplicacao.',
        notas: '',
        ressalvas: 'Registrar ressalvas tecnicas sobre abrangencia, premissas e limitacoes.'
      },
      annexes: [
        {
          title: 'Anexo - Plano de acao consolidado',
          content: 'Este anexo complementa o documento principal com o encadeamento de prazos, responsaveis e evidencias.',
          order: 1
        }
      ]
    }
  },
  {
    code: DOCUMENT_MODEL_CODES.ltcat,
    documentType: 'ltcat',
    title: 'LTCAT',
    description: 'Modelo tecnico para consolidacao previdenciaria das avaliacoes publicadas.',
    allowedScopeTypes: ['assessment', 'sector', 'establishment'],
    layers: {
      fixed: 'Conteudo automatico com identificacao da empresa, estabelecimento e RT.',
      editable: {
        resumo: 'Resumo tecnico das condicoes ambientais do trabalho avaliadas.',
        notas: '',
        ressalvas: ''
      },
      annexes: []
    }
  },
  {
    code: DOCUMENT_MODEL_CODES.laudo_insalubridade,
    documentType: 'laudo_insalubridade',
    title: 'Laudo de Insalubridade',
    description: 'Modelo base para leitura insalubridade com rastreio da base tecnica publicada.',
    allowedScopeTypes: ['assessment', 'sector', 'establishment'],
    layers: {
      fixed: 'Conteudo automatico com identificacao do estabelecimento, RT e enquadramento base.',
      editable: {
        resumo: 'Sintese do entendimento tecnico do laudo.',
        notas: '',
        ressalvas: ''
      },
      annexes: []
    }
  },
  {
    code: DOCUMENT_MODEL_CODES.laudo_periculosidade,
    documentType: 'laudo_periculosidade',
    title: 'Laudo de Periculosidade',
    description: 'Modelo base para leitura periculosidade com base na avaliacao tecnica publicada.',
    allowedScopeTypes: ['assessment', 'sector', 'establishment'],
    layers: {
      fixed: 'Conteudo automatico com escopo, identificacao tecnica e RT.',
      editable: {
        resumo: 'Sintese executiva do entendimento tecnico.',
        notas: '',
        ressalvas: ''
      },
      annexes: []
    }
  },
  {
    code: DOCUMENT_MODEL_CODES.laudo_tecnico,
    documentType: 'laudo_tecnico',
    title: 'Laudo Tecnico',
    description: 'Modelo generico para consolidacoes tecnicas rastreaveis.',
    allowedScopeTypes: ['assessment', 'sector', 'establishment'],
    layers: {
      fixed: 'Conteudo automatico com identificacao, RT, escopo e base das avaliacoes utilizadas.',
      editable: {
        resumo: 'Resumo executivo do laudo.',
        notas: '',
        ressalvas: ''
      },
      annexes: []
    }
  }
];

const normalizeEditableLayer = (editable = {}) => ({
  resumo: String(editable?.resumo || '').trim(),
  notas: String(editable?.notas || '').trim(),
  ressalvas: String(editable?.ressalvas || '').trim()
});

const normalizeAnnexes = (annexes = []) =>
  Array.isArray(annexes)
    ? annexes
        .map((annex, index) => ({
          title: String(annex?.title || '').trim(),
          content: String(annex?.content || '').trim(),
          order: Number(annex?.order ?? index + 1) || index + 1
        }))
        .filter((annex) => annex.title || annex.content)
        .sort((left, right) => left.order - right.order)
    : [];

const normalizeDocumentModelSeed = (model = {}) => ({
  empresaId: '',
  code: String(model.code || '').trim(),
  title: String(model.title || '').trim(),
  description: String(model.description || '').trim(),
  documentType: DOCUMENT_TYPES.includes(model.documentType) ? model.documentType : 'inventario',
  allowedScopeTypes: Array.isArray(model.allowedScopeTypes) && model.allowedScopeTypes.length
    ? model.allowedScopeTypes.filter((scopeType) => DOCUMENT_SCOPE_TYPES.includes(scopeType))
    : ['assessment'],
  active: true,
  isSystem: true,
  layers: {
    fixed: String(model.layers?.fixed || '').trim(),
    editable: normalizeEditableLayer(model.layers?.editable || {}),
    annexes: normalizeAnnexes(model.layers?.annexes || [])
  }
});

const mapDocumentModel = (model = {}) => ({
  empresaId: String(model.empresaId || '').trim(),
  code: String(model.code || '').trim(),
  title: String(model.title || '').trim(),
  description: String(model.description || '').trim(),
  documentType: String(model.documentType || '').trim(),
  allowedScopeTypes: Array.isArray(model.allowedScopeTypes) ? model.allowedScopeTypes : ['assessment'],
  active: Boolean(model.active),
  isSystem: Boolean(model.isSystem),
  layers: {
    fixed: String(model.layers?.fixed || '').trim(),
    editable: normalizeEditableLayer(model.layers?.editable || {}),
    annexes: normalizeAnnexes(model.layers?.annexes || [])
  }
});

const getDefaultDocumentModels = () => DEFAULT_DOCUMENT_MODELS.map((model) => normalizeDocumentModelSeed(model));

const findDefaultDocumentModelByCode = (code) =>
  getDefaultDocumentModels().find((model) => model.code === code) || null;

const countAssessmentSummary = (assessment, risks = []) => ({
  assessmentId: assessment._id?.toString?.() || assessment.id || '',
  title: assessment.title,
  version: assessment.version,
  status: assessment.status,
  totalRisks: risks.length,
  criticalRisks: risks.filter((risk) => risk.level === 'critico').length,
  highRisks: risks.filter((risk) => risk.level === 'alto').length,
  actionItems: risks.reduce((total, risk) => total + (Array.isArray(risk.actionPlanItems) ? risk.actionPlanItems.length : 0), 0)
});

const buildDocumentContent = ({ documentType, model, assessment, establishment, sector, role, risks, conclusion, editable = {} }) => {
  const normalizedModel = mapDocumentModel(model);
  const mergedEditable = {
    ...normalizedModel.layers.editable,
    ...normalizeEditableLayer(editable)
  };

  return {
    model: {
      id: model?._id?.toString?.() || model?.id || null,
      code: normalizedModel.code,
      title: normalizedModel.title,
      documentType: normalizedModel.documentType,
      allowedScopeTypes: normalizedModel.allowedScopeTypes
    },
    fixed: {
      narrative: normalizedModel.layers.fixed,
      empresaId: assessment.empresaId,
      establishment: establishment
        ? {
            id: establishment._id?.toString?.() || establishment.id,
            nome: establishment.nome,
            codigo: establishment.codigo
          }
        : null,
      sector: sector
        ? {
            id: sector._id?.toString?.() || sector.id,
            nome: sector.nome
          }
        : null,
      role: role
        ? {
            id: role._id?.toString?.() || role.id,
            nome: role.nome
          }
        : null,
      assessment: {
        id: assessment._id?.toString?.() || assessment.id,
        title: assessment.title,
        version: assessment.version,
        status: assessment.status,
        responsibleTechnical: assessment.responsibleTechnical
      }
    },
    dynamic: {
      documentType,
      summary: countAssessmentSummary(assessment, risks),
      risks: risks.map((risk) => ({
        id: risk._id?.toString?.() || risk.id,
        category: risk.category,
        riskGroup: risk.riskGroup,
        factor: risk.factor,
        hazard: risk.hazard,
        agent: risk.agent,
        source: risk.source,
        damage: risk.damage,
        level: risk.level,
        probability: risk.probability,
        severity: risk.severity,
        normativeRefs: risk.normativeRefs || [],
        controls: risk.controls || [],
        actionPlanItems: risk.actionPlanItems || []
      })),
      conclusion: conclusion
        ? {
            result: conclusion.result,
            basis: conclusion.basis,
            normativeFrame: conclusion.normativeFrame,
            signedAt: conclusion.signedAt,
            signedBy: conclusion.signedBy
          }
        : null
    },
    editable: mergedEditable,
    annexes: normalizedModel.layers.annexes
  };
};

const hashDocumentPayload = (payload) => buildHash(payload);

module.exports = {
  DOCUMENT_MODEL_CODES,
  DEFAULT_DOCUMENT_MODELS,
  getDefaultDocumentModels,
  findDefaultDocumentModelByCode,
  mapDocumentModel,
  normalizeEditableLayer,
  normalizeAnnexes,
  countAssessmentSummary,
  buildDocumentContent,
  hashDocumentPayload
};
