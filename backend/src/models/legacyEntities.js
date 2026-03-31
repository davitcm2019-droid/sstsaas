const mongoose = require('mongoose');

const { Schema } = mongoose;

const createLooseSchema = (definition = {}, options = {}) =>
  new Schema(definition, {
    strict: false,
    timestamps: true,
    ...options
  });

const createModel = (name, collection, schema) => mongoose.models[name] || mongoose.model(name, schema, collection);

const taskSchema = createLooseSchema({
  titulo: { type: String, required: true, trim: true },
  descricao: { type: String, default: '' },
  prioridade: { type: String, default: 'media' },
  status: { type: String, default: 'pendente' },
  empresaId: { type: String, default: null, index: true },
  empresaNome: { type: String, default: '' },
  responsavel: { type: String, default: '' },
  categoria: { type: String, default: '' },
  dataVencimento: { type: String, default: '' }
});
taskSchema.index({ status: 1, prioridade: 1, empresaId: 1 });

const eventSchema = createLooseSchema({
  titulo: { type: String, required: true, trim: true },
  descricao: { type: String, default: '' },
  empresaId: { type: String, default: null, index: true },
  responsavel: { type: String, default: '' },
  prioridade: { type: String, default: 'media' },
  tipo: { type: String, default: 'evento' },
  status: { type: String, default: 'pendente' },
  dataEvento: { type: String, default: '' },
  horaEvento: { type: String, default: '' }
});
eventSchema.index({ empresaId: 1, dataEvento: 1, tipo: 1 });

const alertSchema = createLooseSchema({
  titulo: { type: String, required: true, trim: true },
  descricao: { type: String, default: '' },
  empresaId: { type: String, default: null, index: true },
  tipo: { type: String, default: '' },
  prioridade: { type: String, default: 'media' },
  status: { type: String, default: 'ativo' },
  dataCriacao: { type: String, default: '' }
});
alertSchema.index({ empresaId: 1, status: 1, tipo: 1 });

const legacyRiskSchema = createLooseSchema({
  empresaId: { type: String, default: null, index: true },
  tipo: { type: String, default: '' },
  descricao: { type: String, default: '' },
  classificacao: { type: String, default: '' },
  probabilidade: { type: String, default: '' },
  consequencia: { type: String, default: '' },
  medidasPreventivas: { type: String, default: '' },
  responsavel: { type: String, default: '' },
  dataIdentificacao: { type: String, default: '' },
  status: { type: String, default: 'ativo' }
});
legacyRiskSchema.index({ empresaId: 1, status: 1, tipo: 1 });

const actionSchema = createLooseSchema({
  titulo: { type: String, required: true, trim: true },
  descricao: { type: String, default: '' },
  empresaId: { type: String, default: null, index: true },
  empresaNome: { type: String, default: '' },
  responsavelId: { type: String, default: null, index: true },
  responsavelNome: { type: String, default: '' },
  tipo: { type: String, default: 'preventiva' },
  prioridade: { type: String, default: 'media' },
  status: { type: String, default: 'pendente' },
  dataInicio: { type: String, default: '' },
  dataFim: { type: String, default: '' },
  custo: { type: Number, default: 0 },
  observacoes: { type: String, default: '' }
});
actionSchema.index({ empresaId: 1, responsavelId: 1, status: 1 });

const cipaSchema = createLooseSchema({
  empresaId: { type: String, default: null, index: true },
  empresaNome: { type: String, default: '' },
  gestao: { type: String, default: '' },
  dataInicio: { type: String, default: '' },
  dataFim: { type: String, default: '' },
  presidente: { type: String, default: '' },
  vicePresidente: { type: String, default: '' },
  secretario: { type: String, default: '' },
  membros: { type: [Schema.Types.Mixed], default: [] },
  status: { type: String, default: 'ativa' },
  observacoes: { type: String, default: '' }
});
cipaSchema.index({ empresaId: 1, status: 1, gestao: 1 });

const trainingSchema = createLooseSchema({
  titulo: { type: String, required: true, trim: true },
  descricao: { type: String, default: '' },
  empresaId: { type: String, default: null, index: true },
  empresaNome: { type: String, default: '' },
  tipo: { type: String, default: 'obrigatorio' },
  duracao: { type: Number, default: 0 },
  instrutor: { type: String, default: '' },
  dataInicio: { type: String, default: '' },
  dataFim: { type: String, default: '' },
  local: { type: String, default: '' },
  maxParticipantes: { type: Number, default: 0 },
  participantes: { type: Number, default: 0 },
  status: { type: String, default: 'agendado' },
  observacoes: { type: String, default: '' }
});
trainingSchema.index({ empresaId: 1, status: 1, tipo: 1 });

const incidentSchema = createLooseSchema({
  titulo: { type: String, required: true, trim: true },
  descricao: { type: String, default: '' },
  empresaId: { type: String, default: null, index: true },
  empresaNome: { type: String, default: '' },
  local: { type: String, default: '' },
  tipo: { type: String, default: 'quase_acidente' },
  severidade: { type: String, default: 'baixa' },
  status: { type: String, default: 'registrado' },
  dataRegistro: { type: String, default: '' },
  dataOcorrencia: { type: String, default: '' },
  responsavelRegistroId: { type: String, default: null, index: true },
  responsavelRegistro: { type: String, default: '' },
  fotos: { type: [Schema.Types.Mixed], default: [] },
  documentos: { type: [Schema.Types.Mixed], default: [] },
  custos: {
    diretos: { type: Number, default: 0 },
    indiretos: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  tempoPerdido: { type: Number, default: 0 },
  afastamentos: { type: Number, default: 0 },
  testemunhas: { type: [Schema.Types.Mixed], default: [] },
  causas: { type: [String], default: [] },
  acoesCorretivas: { type: [String], default: [] }
});
incidentSchema.index({ empresaId: 1, status: 1, tipo: 1 });

const documentSchema = createLooseSchema({
  nome: { type: String, required: true, trim: true },
  descricao: { type: String, default: '' },
  empresaId: { type: String, default: null, index: true },
  empresaNome: { type: String, default: '' },
  tipo: { type: String, default: 'documento' },
  categoria: { type: String, default: 'conformidade' },
  tags: { type: [String], default: [] },
  url: { type: String, default: '' },
  tamanho: { type: Number, default: 0 },
  dataUpload: { type: String, default: '' },
  status: { type: String, default: 'ativo' },
  versao: { type: String, default: '1.0' },
  acessos: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 }
});
documentSchema.index({ empresaId: 1, tipo: 1, categoria: 1, status: 1 });

const notificationSchema = createLooseSchema({
  userId: { type: String, default: null, index: true },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  type: { type: String, default: '' },
  priority: { type: String, default: 'medium' },
  read: { type: Boolean, default: false, index: true },
  expiresAt: { type: String, default: '' }
});
notificationSchema.index({ userId: 1, type: 1, read: 1 });

const auditLogSchema = createLooseSchema(
  {
    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, required: true, trim: true, index: true },
    userId: { type: String, default: null, index: true },
    userName: { type: String, default: '' },
    action: { type: String, required: true, trim: true, index: true },
    changes: { type: [Schema.Types.Mixed], default: [] },
    details: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: String, default: () => new Date().toISOString(), index: true }
  },
  { timestamps: false }
);
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });

const inspectionSchema = createLooseSchema({
  checklistId: { type: Number, required: true, index: true },
  empresaId: { type: String, required: true, index: true },
  empresaNome: { type: String, default: '' },
  inspectorId: { type: String, default: null, index: true },
  inspectorName: { type: String, default: '' },
  items: { type: [Schema.Types.Mixed], default: [] },
  notes: { type: String, default: '' },
  status: { type: String, default: 'completed', index: true },
  score: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  date: { type: String, default: () => new Date().toISOString() }
});
inspectionSchema.index({ empresaId: 1, checklistId: 1, date: -1 });

const Task = createModel('Task', 'tasks', taskSchema);
const Event = createModel('Event', 'events', eventSchema);
const Alert = createModel('Alert', 'alerts', alertSchema);
const LegacyRisk = createModel('LegacyRisk', 'legacy_risks', legacyRiskSchema);
const Acao = createModel('Acao', 'actions', actionSchema);
const Cipa = createModel('Cipa', 'cipas', cipaSchema);
const Training = createModel('Training', 'trainings', trainingSchema);
const Incident = createModel('Incident', 'incidents', incidentSchema);
const Document = createModel('Document', 'documents', documentSchema);
const Notification = createModel('Notification', 'notifications', notificationSchema);
const AuditLog = createModel('AuditLog', 'audit_logs', auditLogSchema);
const Inspection = createModel('Inspection', 'inspections', inspectionSchema);

module.exports = {
  Task,
  Event,
  Alert,
  LegacyRisk,
  Acao,
  Cipa,
  Training,
  Incident,
  Document,
  Notification,
  AuditLog,
  Inspection
};
