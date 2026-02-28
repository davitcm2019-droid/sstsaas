const mongoose = require('mongoose');

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

const userSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    senha_hash: { type: String, required: true },
    perfil: {
      type: String,
      enum: ['visualizador', 'tecnico_seguranca', 'administrador'],
      default: 'visualizador'
    },
    status: { type: String, default: 'ativo' },
    telefone: { type: String, default: '' },
    cargo: { type: String, default: '' },
    empresaId: { type: String, default: null }
  },
  {
    timestamps: true
  }
);

const User = mongoose.models.Usuario || mongoose.model('Usuario', userSchema);

const mapDocToUser = (doc) => {
  if (!doc) return null;
  return {
    id: doc._id?.toString(),
    nome: doc.nome,
    email: doc.email,
    senha: doc.senha_hash,
    perfil: doc.perfil,
    status: doc.status,
    telefone: doc.telefone,
    cargo: doc.cargo,
    empresaId: doc.empresaId,
    dataCadastro: doc.createdAt ? new Date(doc.createdAt).toISOString().split('T')[0] : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

const countUsers = async () => {
  return User.countDocuments();
};

const buildFilters = ({ perfil, status, search } = {}) => {
  const filters = {};

  if (perfil) {
    filters.perfil = perfil;
  }

  if (status) {
    filters.status = status;
  }

  if (search) {
    const term = new RegExp(search.trim(), 'i');
    filters.$or = [{ nome: term }, { email: term }];
  }

  return filters;
};

const findByEmail = async (email) => {
  const normalized = normalizeEmail(email);
  const user = await User.findOne({ email: normalized }).lean();
  return mapDocToUser(user);
};

const findById = async (id) => {
  if (!id) return null;
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const user = await User.findById(id).lean();
  return mapDocToUser(user);
};

const listUsers = async ({ perfil, status, search } = {}) => {
  const filters = buildFilters({ perfil, status, search });
  const users = await User.find(filters).sort({ createdAt: 1 }).lean();
  return users.map(mapDocToUser);
};

const createUser = async ({
  nome,
  email,
  senhaHash,
  perfil,
  status = 'ativo',
  telefone = null,
  cargo = null,
  empresaId = null
}) => {
  const normalizedEmail = normalizeEmail(email);
  const user = new User({
    nome,
    email: normalizedEmail,
    senha_hash: senhaHash,
    perfil,
    status,
    telefone,
    cargo,
    empresaId
  });
  await user.save();
  return mapDocToUser(user.toObject());
};

const updateUser = async (id, updates = {}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const mapped = {};

  if (updates.nome !== undefined) mapped.nome = updates.nome;
  if (updates.email !== undefined) mapped.email = normalizeEmail(updates.email);
  if (updates.senhaHash !== undefined) mapped.senha_hash = updates.senhaHash;
  if (updates.perfil !== undefined) mapped.perfil = updates.perfil;
  if (updates.status !== undefined) mapped.status = updates.status;
  if (updates.telefone !== undefined) mapped.telefone = updates.telefone;
  if (updates.cargo !== undefined) mapped.cargo = updates.cargo;
  if (updates.empresaId !== undefined) mapped.empresaId = updates.empresaId;

  const user = await User.findByIdAndUpdate(id, mapped, { new: true }).lean();
  return mapDocToUser(user);
};

const deleteUser = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  const result = await User.findByIdAndDelete(id);
  return Boolean(result);
};

module.exports = {
  normalizeEmail,
  countUsers,
  findByEmail,
  findById,
  listUsers,
  createUser,
  updateUser,
  deleteUser
};
