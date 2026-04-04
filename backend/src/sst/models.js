const crypto = require('crypto');
const mongoose = require('mongoose');

const { Schema } = mongoose;

const objectId = Schema.Types.ObjectId;

const ACTIVITY_STATUS = ['ativo', 'inativo'];
const CONTROL_TYPES = ['eliminacao', 'substituicao', 'engenharia', 'administrativo', 'epi', 'epc'];
const EFFECTIVENESS_TYPES = ['nao_avaliada', 'adequado', 'parcial', 'ineficaz'];
const ACTION_STATUS = ['pendente', 'em_andamento', 'concluida', 'cancelada'];
const DOCUMENT_TYPES = ['inventario', 'pgr', 'ltcat', 'laudo_insalubridade', 'laudo_periculosidade', 'laudo_tecnico'];
const DOCUMENT_STATUS = ['draft', 'issued', 'superseded', 'invalidated'];
const CATALOG_TYPES = ['hazard', 'risk_factor', 'agent', 'control', 'normative_reference'];

const actorSchema = new Schema(
  {
    id: { type: String, default: null },
    nome: { type: String, default: '' },
    email: { type: String, default: '' },
    perfil: { type: String, default: '' }
  },
  { _id: false }
);

const controlSchema = new Schema(
  {
    type: { type: String, enum: CONTROL_TYPES, required: true },
    description: { type: String, required: true },
    hierarchyLevel: { type: Number, default: 1 },
    effectiveness: { type: String, enum: EFFECTIVENESS_TYPES, default: 'nao_avaliada' },
    caNumber: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  { _id: true }
);

const actionPlanItemSchema = new Schema(
  {
    title: { type: String, required: true },
    responsible: { type: String, default: '' },
    dueDate: { type: Date, default: null },
    status: { type: String, enum: ACTION_STATUS, default: 'pendente' },
    acceptanceCriteria: { type: String, default: '' }
  },
  { _id: true }
);

const assessmentContextSchema = new Schema(
  {
    processoPrincipal: { type: String, default: '' },
    localAreaPosto: { type: String, default: '' },
    jornadaTurno: { type: String, default: '' },
    quantidadeExpostos: { type: Number, default: 1 },
    condicaoOperacional: { type: String, default: '' },
    atividadesBase: { type: [String], default: [] },
    observations: { type: String, default: '' }
  },
  { _id: false }
);

const establishmentSchema = new Schema(
  {
    empresaId: { type: String, required: true, index: true },
    nome: { type: String, required: true },
    codigo: { type: String, default: '' },
    endereco: { type: String, default: '' },
    status: { type: String, enum: ACTIVITY_STATUS, default: 'ativo' },
    createdBy: { type: actorSchema, default: () => ({}) },
    updatedBy: { type: actorSchema, default: () => ({}) }
  },
  { timestamps: true, collection: 'sst_establishments' }
);
establishmentSchema.index({ empresaId: 1, nome: 1 }, { unique: true });

const sectorSchema = new Schema(
  {
    empresaId: { type: String, required: true, index: true },
    establishmentId: { type: objectId, ref: 'SstEstablishment', required: true, index: true },
    nome: { type: String, required: true },
    descricao: { type: String, default: '' },
    status: { type: String, enum: ACTIVITY_STATUS, default: 'ativo' },
    createdBy: { type: actorSchema, default: () => ({}) },
    updatedBy: { type: actorSchema, default: () => ({}) }
  },
  { timestamps: true, collection: 'sst_sectors' }
);
sectorSchema.index({ establishmentId: 1, nome: 1 }, { unique: true });

const roleSchema = new Schema(
  {
    empresaId: { type: String, required: true, index: true },
    establishmentId: { type: objectId, ref: 'SstEstablishment', required: true, index: true },
    sectorId: { type: objectId, ref: 'SstSector', required: true, index: true },
    nome: { type: String, required: true },
    descricao: { type: String, default: '' },
    atividadesBase: { type: [String], default: [] },
    exposicaoBase: { type: String, default: '' },
    status: { type: String, enum: ACTIVITY_STATUS, default: 'ativo' },
    createdBy: { type: actorSchema, default: () => ({}) },
    updatedBy: { type: actorSchema, default: () => ({}) }
  },
  { timestamps: true, collection: 'sst_roles' }
);
roleSchema.index({ sectorId: 1, nome: 1 }, { unique: true });

const riskAssessmentSchema = new Schema(
  {
    empresaId: { type: String, required: true, index: true },
    establishmentId: { type: objectId, ref: 'SstEstablishment', required: true, index: true },
    sectorId: { type: objectId, ref: 'SstSector', required: true, index: true },
    roleId: { type: objectId, ref: 'SstRole', required: true, index: true },
    title: { type: String, required: true },
    version: { type: Number, required: true, default: 1 },
    status: { type: String, enum: ['draft', 'in_review', 'published', 'superseded'], default: 'draft', index: true },
    reviewReason: { type: String, default: 'implantacao_inicial' },
    revisionRequired: { type: Boolean, default: false, index: true },
    revisionReason: { type: String, default: '' },
    context: { type: assessmentContextSchema, default: () => ({}) },
    responsibleTechnical: {
      nome: { type: String, default: '' },
      email: { type: String, default: '' },
      registro: { type: String, default: '' }
    },
    publicationHash: { type: String, default: '' },
    publishedAt: { type: Date, default: null },
    publishedBy: { type: actorSchema, default: () => ({}) },
    createdBy: { type: actorSchema, default: () => ({}) },
    updatedBy: { type: actorSchema, default: () => ({}) }
  },
  { timestamps: true, collection: 'sst_assessments' }
);
riskAssessmentSchema.index({ roleId: 1, version: 1 }, { unique: true });

const assessmentRiskSchema = new Schema(
  {
    assessmentId: { type: objectId, ref: 'SstRiskAssessment', required: true, index: true },
    empresaId: { type: String, required: true, index: true },
    establishmentId: { type: objectId, ref: 'SstEstablishment', required: true, index: true },
    sectorId: { type: objectId, ref: 'SstSector', required: true, index: true },
    roleId: { type: objectId, ref: 'SstRole', required: true, index: true },
    category: { type: String, default: '' },
    riskGroup: { type: String, default: '' },
    factor: { type: String, required: true },
    hazard: { type: String, required: true },
    agent: { type: String, default: '' },
    source: { type: String, default: '' },
    exposure: { type: String, default: '' },
    damage: { type: String, required: true },
    probability: { type: Number, min: 1, max: 5, default: 1 },
    severity: { type: Number, min: 1, max: 5, default: 1 },
    level: { type: String, default: 'toleravel' },
    normativeRefs: { type: [String], default: [] },
    treatmentStatus: { type: String, default: 'identificado' },
    highRiskJustification: { type: String, default: '' },
    controls: { type: [controlSchema], default: [] },
    actionPlanItems: { type: [actionPlanItemSchema], default: [] },
    createdBy: { type: actorSchema, default: () => ({}) },
    updatedBy: { type: actorSchema, default: () => ({}) }
  },
  { timestamps: true, collection: 'sst_assessment_risks' }
);

const assessmentConclusionSchema = new Schema(
  {
    assessmentId: { type: objectId, ref: 'SstRiskAssessment', required: true, unique: true, index: true },
    result: { type: String, required: true },
    basis: { type: String, default: '' },
    normativeFrame: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'signed'], default: 'draft' },
    signedBy: { type: actorSchema, default: () => ({}) },
    signedAt: { type: Date, default: null },
    hash: { type: String, default: '' }
  },
  { timestamps: true, collection: 'sst_assessment_conclusions' }
);

const assessmentRevisionSchema = new Schema(
  {
    assessmentId: { type: objectId, ref: 'SstRiskAssessment', required: true, index: true },
    version: { type: Number, required: true },
    status: { type: String, enum: ['published'], required: true },
    publishedAt: { type: Date, required: true },
    publishedBy: { type: actorSchema, default: () => ({}) },
    hash: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true }
  },
  { timestamps: true, collection: 'sst_assessment_revisions' }
);

const issuedTechnicalDocumentSchema = new Schema(
  {
    documentType: { type: String, enum: DOCUMENT_TYPES, required: true, index: true },
    scopeType: { type: String, enum: ['assessment', 'sector', 'establishment'], required: true, index: true },
    scopeRefId: { type: String, required: true, index: true },
    empresaId: { type: String, required: true, index: true },
    establishmentId: { type: objectId, ref: 'SstEstablishment', required: true, index: true },
    sectorId: { type: objectId, ref: 'SstSector', default: null, index: true },
    title: { type: String, required: true },
    latestVersion: { type: Number, default: 1 },
    status: { type: String, enum: DOCUMENT_STATUS, default: 'issued' }
  },
  { timestamps: true, collection: 'sst_issued_documents' }
);
issuedTechnicalDocumentSchema.index({ documentType: 1, scopeType: 1, scopeRefId: 1 }, { unique: true });

const issuedTechnicalDocumentVersionSchema = new Schema(
  {
    documentId: { type: objectId, ref: 'SstIssuedTechnicalDocument', required: true, index: true },
    documentType: { type: String, enum: DOCUMENT_TYPES, required: true, index: true },
    version: { type: Number, required: true },
    status: { type: String, enum: DOCUMENT_STATUS, default: 'issued' },
    sourceAssessmentIds: { type: [objectId], default: [] },
    hash: { type: String, required: true },
    templateCode: { type: String, required: true },
    summary: { type: Schema.Types.Mixed, default: {} },
    content: { type: Schema.Types.Mixed, required: true },
    issuedAt: { type: Date, default: Date.now },
    issuedBy: { type: actorSchema, default: () => ({}) }
  },
  { timestamps: true, collection: 'sst_issued_document_versions' }
);
issuedTechnicalDocumentVersionSchema.index({ documentId: 1, version: 1 }, { unique: true });

const technicalCatalogItemSchema = new Schema(
  {
    catalogType: { type: String, enum: CATALOG_TYPES, required: true, index: true },
    code: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: actorSchema, default: () => ({}) },
    updatedBy: { type: actorSchema, default: () => ({}) }
  },
  { timestamps: true, collection: 'sst_technical_catalog_items' }
);
technicalCatalogItemSchema.index({ catalogType: 1, code: 1 }, { unique: true });

const technicalAuditSchema = new Schema(
  {
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    action: { type: String, required: true, index: true },
    summary: { type: String, default: '' },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    meta: { type: Schema.Types.Mixed, default: {} },
    actor: { type: actorSchema, default: () => ({}) },
    origin: { type: String, default: 'manual' }
  },
  { timestamps: true, collection: 'sst_technical_audit' }
);
technicalAuditSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

const buildHash = (payload) => crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

const SstEstablishment = mongoose.models.SstEstablishment || mongoose.model('SstEstablishment', establishmentSchema);
const SstSector = mongoose.models.SstSector || mongoose.model('SstSector', sectorSchema);
const SstRole = mongoose.models.SstRole || mongoose.model('SstRole', roleSchema);
const SstRiskAssessment = mongoose.models.SstRiskAssessment || mongoose.model('SstRiskAssessment', riskAssessmentSchema);
const SstAssessmentRisk = mongoose.models.SstAssessmentRisk || mongoose.model('SstAssessmentRisk', assessmentRiskSchema);
const SstAssessmentConclusion =
  mongoose.models.SstAssessmentConclusion || mongoose.model('SstAssessmentConclusion', assessmentConclusionSchema);
const SstAssessmentRevision =
  mongoose.models.SstAssessmentRevision || mongoose.model('SstAssessmentRevision', assessmentRevisionSchema);
const SstIssuedTechnicalDocument =
  mongoose.models.SstIssuedTechnicalDocument || mongoose.model('SstIssuedTechnicalDocument', issuedTechnicalDocumentSchema);
const SstIssuedTechnicalDocumentVersion =
  mongoose.models.SstIssuedTechnicalDocumentVersion ||
  mongoose.model('SstIssuedTechnicalDocumentVersion', issuedTechnicalDocumentVersionSchema);
const SstTechnicalCatalogItem =
  mongoose.models.SstTechnicalCatalogItem || mongoose.model('SstTechnicalCatalogItem', technicalCatalogItemSchema);
const SstTechnicalAudit = mongoose.models.SstTechnicalAudit || mongoose.model('SstTechnicalAudit', technicalAuditSchema);

module.exports = {
  ACTIVITY_STATUS,
  CONTROL_TYPES,
  EFFECTIVENESS_TYPES,
  ACTION_STATUS,
  DOCUMENT_TYPES,
  DOCUMENT_STATUS,
  CATALOG_TYPES,
  buildHash,
  models: {
    SstEstablishment,
    SstSector,
    SstRole,
    SstRiskAssessment,
    SstAssessmentRisk,
    SstAssessmentConclusion,
    SstAssessmentRevision,
    SstIssuedTechnicalDocument,
    SstIssuedTechnicalDocumentVersion,
    SstTechnicalCatalogItem,
    SstTechnicalAudit
  }
};
