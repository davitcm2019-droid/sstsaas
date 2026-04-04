const mongoose = require('mongoose');

const GHE_STATUS_TYPES = ['ativo', 'inativo'];
const TECHNICAL_CONCLUSION_STATUS_TYPES = ['draft', 'signed'];
const SIGNATURE_REASON_TYPES = ['technical_conclusion', 'cycle_publish', 'document_issue'];
const ISSUED_DOCUMENT_STATUS_TYPES = ['active', 'invalidated', 'superseded'];
const DOCUMENT_TEMPLATE_CODES = [
  'pgr',
  'inventario_riscos',
  'ltcat',
  'laudo_insalubridade',
  'laudo_periculosidade',
  'ltip',
  'mapa_riscos',
  'pae'
];

const reviewHistorySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    actor: {
      id: { type: String, default: null },
      nome: { type: String, default: '' },
      email: { type: String, default: '' },
      perfil: { type: String, default: '' }
    },
    action: { type: String, default: '' },
    note: { type: String, default: '' }
  },
  { _id: false }
);

const gheSchema = new mongoose.Schema(
  {
    cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyCycle', required: true, index: true },
    environmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyEnvironment', required: true, index: true },
    empresaId: { type: String, required: true, index: true },
    unidade: { type: String, required: true },
    estabelecimento: { type: String, default: '' },
    setor: { type: String, required: true },
    nomeTecnico: { type: String, required: true },
    descricaoSimilaridade: { type: String, default: '' },
    headcount: { type: Number, default: 1, min: 1 },
    cargoIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    status: { type: String, enum: GHE_STATUS_TYPES, default: 'ativo', index: true },
    reviewHistory: { type: [reviewHistorySchema], default: [] }
  },
  { timestamps: true }
);

const technicalConclusionSchema = new mongoose.Schema(
  {
    cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyCycle', required: true, index: true },
    riskItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyItem', required: true, unique: true, index: true },
    gheId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyGhe', default: null, index: true },
    environmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyEnvironment', required: true, index: true },
    activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyActivity', required: true, index: true },
    empresaId: { type: String, required: true, index: true },
    habitualidade: { type: String, default: '' },
    enquadramentoNormativo: { type: String, default: '' },
    resultadoTecnico: { type: String, default: '' },
    justificativaTecnica: { type: String, default: '' },
    responsavelTecnico: {
      nome: { type: String, default: '' },
      email: { type: String, default: '' },
      registro: { type: String, default: '' }
    },
    status: { type: String, enum: TECHNICAL_CONCLUSION_STATUS_TYPES, default: 'draft', index: true },
    version: { type: Number, default: 1, min: 1 },
    signedAt: { type: Date, default: null },
    signedBy: {
      id: { type: String, default: null },
      nome: { type: String, default: '' },
      email: { type: String, default: '' },
      perfil: { type: String, default: '' }
    },
    signatureHash: { type: String, default: '' }
  },
  { timestamps: true }
);

const documentTemplateSchema = new mongoose.Schema(
  {
    code: { type: String, enum: DOCUMENT_TEMPLATE_CODES, required: true, unique: true, index: true },
    documentType: { type: String, required: true },
    title: { type: String, required: true },
    version: { type: Number, default: 1, min: 1 },
    active: { type: Boolean, default: true },
    builtIn: { type: Boolean, default: true },
    layers: {
      fixedIntro: { type: String, default: '' },
      dynamicRules: { type: String, default: '' },
      editableGuidance: { type: String, default: '' }
    },
    updatedBy: {
      id: { type: String, default: null },
      nome: { type: String, default: '' },
      email: { type: String, default: '' },
      perfil: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

const signatureRecordSchema = new mongoose.Schema(
  {
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    reason: { type: String, enum: SIGNATURE_REASON_TYPES, required: true },
    hash: { type: String, required: true },
    signer: {
      id: { type: String, default: null },
      nome: { type: String, default: '' },
      email: { type: String, default: '' },
      perfil: { type: String, default: '' }
    },
    signedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const issuedDocumentVersionSchema = new mongoose.Schema(
  {
    cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyCycle', required: true, index: true },
    snapshotId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSurveyCycleSnapshot', required: true, index: true },
    previousIssuedDocumentId: { type: mongoose.Schema.Types.ObjectId, ref: 'IssuedDocumentVersion', default: null, index: true },
    signatureRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'RTSignatureRecord', default: null, index: true },
    templateCode: { type: String, enum: DOCUMENT_TEMPLATE_CODES, required: true, index: true },
    documentType: { type: String, required: true, index: true },
    empresaId: { type: String, required: true, index: true },
    unidade: { type: String, required: true },
    estabelecimento: { type: String, required: true },
    title: { type: String, required: true },
    version: { type: Number, default: 1, min: 1 },
    status: { type: String, enum: ISSUED_DOCUMENT_STATUS_TYPES, default: 'active', index: true },
    hash: { type: String, required: true },
    contentLayers: {
      fixed: { type: String, default: '' },
      dynamic: { type: String, default: '' },
      editable: { type: String, default: '' }
    },
    sourceSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
    responsibleTechnical: {
      nome: { type: String, default: '' },
      email: { type: String, default: '' },
      registro: { type: String, default: '' }
    },
    issuedBy: {
      id: { type: String, default: null },
      nome: { type: String, default: '' },
      email: { type: String, default: '' },
      perfil: { type: String, default: '' }
    },
    issuedAt: { type: Date, default: Date.now },
    invalidatedAt: { type: Date, default: null },
    invalidatedBy: {
      id: { type: String, default: null },
      nome: { type: String, default: '' },
      email: { type: String, default: '' },
      perfil: { type: String, default: '' }
    },
    invalidationReason: { type: String, default: '' }
  },
  { timestamps: true }
);

gheSchema.index({ cycleId: 1, environmentId: 1, nomeTecnico: 1 }, { unique: true });
gheSchema.index({ environmentId: 1, status: 1, createdAt: -1 });
technicalConclusionSchema.index({ cycleId: 1, status: 1, updatedAt: -1 });
documentTemplateSchema.index({ active: 1, updatedAt: -1 });
signatureRecordSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
issuedDocumentVersionSchema.index({ cycleId: 1, documentType: 1, version: -1 });
issuedDocumentVersionSchema.index({ empresaId: 1, status: 1, issuedAt: -1 });

const RiskSurveyGhe = mongoose.models.RiskSurveyGhe || mongoose.model('RiskSurveyGhe', gheSchema);
const RiskTechnicalConclusion =
  mongoose.models.RiskTechnicalConclusion || mongoose.model('RiskTechnicalConclusion', technicalConclusionSchema);
const DocumentTemplate = mongoose.models.DocumentTemplate || mongoose.model('DocumentTemplate', documentTemplateSchema);
const RTSignatureRecord = mongoose.models.RTSignatureRecord || mongoose.model('RTSignatureRecord', signatureRecordSchema);
const IssuedDocumentVersion =
  mongoose.models.IssuedDocumentVersion || mongoose.model('IssuedDocumentVersion', issuedDocumentVersionSchema);

module.exports = {
  DOCUMENT_TEMPLATE_CODES,
  GHE_STATUS_TYPES,
  ISSUED_DOCUMENT_STATUS_TYPES,
  SIGNATURE_REASON_TYPES,
  TECHNICAL_CONCLUSION_STATUS_TYPES,
  models: {
    RiskSurveyGhe,
    RiskTechnicalConclusion,
    DocumentTemplate,
    RTSignatureRecord,
    IssuedDocumentVersion
  }
};
