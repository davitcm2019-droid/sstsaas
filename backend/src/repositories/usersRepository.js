const { pool } = require('../db/pool');

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

const mapRowToUser = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    senha: row.senha_hash,
    perfil: row.perfil,
    status: row.status,
    telefone: row.telefone,
    cargo: row.cargo,
    empresaId: row.empresa_id,
    dataCadastro: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const countUsers = async () => {
  const result = await pool.query('SELECT COUNT(*)::int AS count FROM usuarios');
  return result.rows[0]?.count ?? 0;
};

const findByEmail = async (email) => {
  const normalized = normalizeEmail(email);
  const result = await pool.query(
    `
      SELECT id, nome, email, senha_hash, perfil, status, telefone, cargo, empresa_id, created_at, updated_at
      FROM usuarios
      WHERE email = $1
    `,
    [normalized]
  );
  return mapRowToUser(result.rows[0]);
};

const findById = async (id) => {
  const result = await pool.query(
    `
      SELECT id, nome, email, senha_hash, perfil, status, telefone, cargo, empresa_id, created_at, updated_at
      FROM usuarios
      WHERE id = $1
    `,
    [id]
  );
  return mapRowToUser(result.rows[0]);
};

const listUsers = async ({ perfil, status, search } = {}) => {
  const conditions = [];
  const params = [];

  if (perfil) {
    params.push(perfil);
    conditions.push(`perfil = $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (search) {
    const term = `%${String(search).trim().toLowerCase()}%`;
    params.push(term);
    params.push(term);
    conditions.push(`(LOWER(nome) LIKE $${params.length - 1} OR LOWER(email) LIKE $${params.length})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `
      SELECT id, nome, email, senha_hash, perfil, status, telefone, cargo, empresa_id, created_at, updated_at
      FROM usuarios
      ${whereClause}
      ORDER BY id ASC
    `,
    params
  );

  return result.rows.map(mapRowToUser);
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
  const normalized = normalizeEmail(email);
  const result = await pool.query(
    `
      INSERT INTO usuarios (nome, email, senha_hash, perfil, status, telefone, cargo, empresa_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, nome, email, senha_hash, perfil, status, telefone, cargo, empresa_id, created_at, updated_at
    `,
    [nome, normalized, senhaHash, perfil, status, telefone, cargo, empresaId]
  );

  return mapRowToUser(result.rows[0]);
};

const updateUser = async (id, updates = {}) => {
  const setClauses = [];
  const params = [];

  const fields = [
    ['nome', 'nome'],
    ['email', 'email', normalizeEmail],
    ['senhaHash', 'senha_hash'],
    ['perfil', 'perfil'],
    ['status', 'status'],
    ['telefone', 'telefone'],
    ['cargo', 'cargo'],
    ['empresaId', 'empresa_id']
  ];

  fields.forEach(([inputKey, column, mapper]) => {
    if (updates[inputKey] === undefined) return;
    const rawValue = updates[inputKey];
    const value = mapper ? mapper(rawValue) : rawValue;
    params.push(value);
    setClauses.push(`${column} = $${params.length}`);
  });

  if (!setClauses.length) {
    return findById(id);
  }

  params.push(id);

  const result = await pool.query(
    `
      UPDATE usuarios
      SET ${setClauses.join(', ')}
      WHERE id = $${params.length}
      RETURNING id, nome, email, senha_hash, perfil, status, telefone, cargo, empresa_id, created_at, updated_at
    `,
    params
  );

  return mapRowToUser(result.rows[0]);
};

const deleteUser = async (id) => {
  const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [id]);
  return Boolean(result.rows[0]);
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

