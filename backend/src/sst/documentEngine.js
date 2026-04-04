const { buildHash, DOCUMENT_TYPES } = require('./models');

const DOCUMENT_TEMPLATE_CODES = {
  inventario: 'inventario_base',
  pgr: 'pgr_programa',
  ltcat: 'ltcat_base',
  laudo_insalubridade: 'laudo_insalubridade_base',
  laudo_periculosidade: 'laudo_periculosidade_base',
  laudo_tecnico: 'laudo_tecnico_base'
};

const DOCUMENT_TEMPLATES = [
  {
    code: DOCUMENT_TEMPLATE_CODES.inventario,
    documentType: 'inventario',
    title: 'Inventario de Riscos',
    layers: {
      fixed: 'Conteudo automatico: empresa, estabelecimento, setor, cargo, versao e RT.',
      dynamic: 'Resumo dos riscos publicados por avaliacao.',
      editable: 'Complementacoes tecnicas controladas.'
    }
  },
  {
    code: DOCUMENT_TEMPLATE_CODES.pgr,
    documentType: 'pgr',
    title: 'Programa de Gerenciamento de Riscos',
    layers: {
      fixed: 'Conteudo automatico: identificacao da organizacao, RT e versao.',
      dynamic: 'Consolidacao do inventario e do plano de acao.',
      editable: 'Diretrizes e observacoes especificas.'
    }
  },
  {
    code: DOCUMENT_TEMPLATE_CODES.ltcat,
    documentType: 'ltcat',
    title: 'LTCAT',
    layers: {
      fixed: 'Conteudo automatico: escopo previdenciario, RT e identificacao.',
      dynamic: 'Consolidacao de agentes e conclusoes tecnicas aplicaveis.',
      editable: 'Ressalvas tecnicas do responsavel.'
    }
  },
  {
    code: DOCUMENT_TEMPLATE_CODES.laudo_insalubridade,
    documentType: 'laudo_insalubridade',
    title: 'Laudo de Insalubridade',
    layers: {
      fixed: 'Conteudo automatico: empresa, estabelecimento e RT.',
      dynamic: 'Leitura dos riscos e conclusoes com base tecnica publicada.',
      editable: 'Complementacoes especificas do laudo.'
    }
  },
  {
    code: DOCUMENT_TEMPLATE_CODES.laudo_periculosidade,
    documentType: 'laudo_periculosidade',
    title: 'Laudo de Periculosidade',
    layers: {
      fixed: 'Conteudo automatico: empresa, estabelecimento e RT.',
      dynamic: 'Leitura dos riscos e conclusoes com base tecnica publicada.',
      editable: 'Complementacoes especificas do laudo.'
    }
  },
  {
    code: DOCUMENT_TEMPLATE_CODES.laudo_tecnico,
    documentType: 'laudo_tecnico',
    title: 'Laudo Tecnico',
    layers: {
      fixed: 'Conteudo automatico: empresa, estabelecimento, RT e versao.',
      dynamic: 'Sintese tecnica das avaliacoes publicadas.',
      editable: 'Observacoes controladas.'
    }
  }
];

const mapTemplate = (template) => ({
  code: template.code,
  documentType: template.documentType,
  title: template.title,
  layers: template.layers
});

const getTemplates = () => DOCUMENT_TEMPLATES.map(mapTemplate);

const findTemplateByCode = (code) => DOCUMENT_TEMPLATES.find((template) => template.code === code) || null;

const ensureDocumentType = (documentType) => DOCUMENT_TYPES.includes(documentType);

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

const buildDocumentContent = ({ documentType, assessment, establishment, sector, role, risks, conclusion, editable = {} }) => ({
  fixed: {
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
  editable: {
    resumo: String(editable.resumo || '').trim(),
    notas: String(editable.notas || '').trim(),
    ressalvas: String(editable.ressalvas || '').trim()
  }
});

const hashDocumentPayload = (payload) => buildHash(payload);

module.exports = {
  DOCUMENT_TEMPLATE_CODES,
  DOCUMENT_TEMPLATES,
  getTemplates,
  findTemplateByCode,
  ensureDocumentType,
  countAssessmentSummary,
  buildDocumentContent,
  hashDocumentPayload
};
