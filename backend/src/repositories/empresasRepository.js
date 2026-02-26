const mongoose = require('mongoose');

const empresaSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true },
    cnpj: { type: String, required: true, unique: true },
    cnae: { type: String, required: true },
    ramo: { type: String, default: '' },
    endereco: { type: String, default: '' },
    cidade: { type: String, default: '' },
    estado: { type: String, default: '' },
    cep: { type: String, default: '' },
    telefone: { type: String, default: '' },
    email: { type: String, default: '' },
    responsavel: { type: String, default: '' },
    status: { type: String, default: 'ativo' },
    conformidade: { type: String, default: 'em_dia' },
    pendencias: { type: Number, default: 0 },
    alertas: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);

const Empresa = mongoose.models.Empresa || mongoose.model('Empresa', empresaSchema);

const mapDocToEmpresa = (doc) => {
  if (!doc) return null;
  return {
    id: doc._id?.toString(),
    nome: doc.nome,
    cnpj: doc.cnpj,
    cnae: doc.cnae,
    ramo: doc.ramo,
    endereco: doc.endereco,
    cidade: doc.cidade,
    estado: doc.estado,
    cep: doc.cep,
    telefone: doc.telefone,
    email: doc.email,
    responsavel: doc.responsavel,
    status: doc.status,
    conformidade: doc.conformidade,
    pendencias: doc.pendencias,
    alertas: doc.alertas,
    dataCadastro: doc.createdAt ? new Date(doc.createdAt).toISOString().split('T')[0] : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const findById = async (id) => {
  if (!id) return null;
  const doc = await Empresa.findById(id).lean();
  return mapDocToEmpresa(doc);
};

const findByCnpj = async (cnpj) => {
  if (!cnpj) return null;
  const doc = await Empresa.findOne({ cnpj: String(cnpj).trim() }).lean();
  return mapDocToEmpresa(doc);
};

const listEmpresas = async ({ cnae, status, conformidade, search } = {}) => {
  const filters = {};

  if (cnae) filters.cnae = new RegExp(cnae.trim(), 'i');
  if (status) filters.status = status;
  if (conformidade) filters.conformidade = conformidade;
  if (search) {
    const term = new RegExp(search.trim(), 'i');
    filters.$or = [{ nome: term }, { ramo: term }, { cnpj: term }];
  }

  const empresas = await Empresa.find(filters).sort({ createdAt: 1 }).lean();
  return empresas.map(mapDocToEmpresa);
};

const createEmpresa = async (payload) => {
  const doc = new Empresa(payload);
  await doc.save();
  return mapDocToEmpresa(doc.toObject());
};

const updateEmpresa = async (id, updates = {}) => {
  const updated = await Empresa.findByIdAndUpdate(id, updates, { new: true }).lean();
  return mapDocToEmpresa(updated);
};

const deleteEmpresa = async (id) => {
  const result = await Empresa.findByIdAndDelete(id);
  return Boolean(result);
};

module.exports = {
  findById,
  findByCnpj,
  listEmpresas,
  createEmpresa,
  updateEmpresa,
  deleteEmpresa
};
