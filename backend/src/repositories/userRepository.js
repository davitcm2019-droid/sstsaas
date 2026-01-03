const { usuarios } = require('../data/mockData');
const { isDatabaseEnabled, query } = require('../db');

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

const mapRowToUser = (row) => ({
  id: row.id,
  nome: row.nome,
  email: row.email,
  senha: row.senha_hash,
  perfil: row.perfil,
  status: row.status,
  dataCadastro: row.data_cadastro
});

const list = async (filters = {}) => {
  const { perfil, status } = filters;

  if (!isDatabaseEnabled()) {
    let filteredUsuarios = [...usuarios];

    if (perfil) {
      filteredUsuarios = filteredUsuarios.filter((usuario) => usuario.perfil === perfil);
    }

    if (status) {
      filteredUsuarios = filteredUsuarios.filter((usuario) => usuario.status === status);
    }

    return filteredUsuarios;
  }

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

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `
      SELECT id, nome, email, senha_hash, perfil, status, data_cadastro
      FROM users
      ${whereClause}
      ORDER BY id ASC
    `,
    params
  );

  return result.rows.map(mapRowToUser);
};

const findById = async (id) => {
  const parsedId = Number.parseInt(id, 10);
  if (!Number.isFinite(parsedId)) return null;

  if (!isDatabaseEnabled()) {
    return usuarios.find((user) => user.id === parsedId) || null;
  }

  const result = await query(
    `
      SELECT id, nome, email, senha_hash, perfil, status, data_cadastro
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [parsedId]
  );

  return result.rowCount ? mapRowToUser(result.rows[0]) : null;
};

const findByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  if (!isDatabaseEnabled()) {
    return usuarios.find((user) => normalizeEmail(user.email) === normalizedEmail) || null;
  }

  const result = await query(
    `
      SELECT id, nome, email, senha_hash, perfil, status, data_cadastro
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [normalizedEmail]
  );

  return result.rowCount ? mapRowToUser(result.rows[0]) : null;
};

const create = async ({ nome, email, senhaHash, perfil, status, dataCadastro }) => {
  const normalizedEmail = normalizeEmail(email);

  if (!isDatabaseEnabled()) {
    const nextId = usuarios.length ? Math.max(...usuarios.map((usr) => usr.id)) + 1 : 1;
    const newUser = {
      id: nextId,
      nome,
      email: normalizedEmail,
      senha: senhaHash,
      perfil: perfil || 'visualizador',
      status: status || 'ativo',
      dataCadastro: dataCadastro || new Date().toISOString().split('T')[0]
    };
    usuarios.push(newUser);
    return newUser;
  }

  try {
    const result = await query(
      `
        INSERT INTO users (nome, email, senha_hash, perfil, status, data_cadastro)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, nome, email, senha_hash, perfil, status, data_cadastro
      `,
      [
        nome,
        normalizedEmail,
        senhaHash,
        perfil || 'visualizador',
        status || 'ativo',
        dataCadastro || new Date().toISOString().split('T')[0]
      ]
    );

    return mapRowToUser(result.rows[0]);
  } catch (error) {
    if (error && error.code === '23505') {
      const err = new Error('Email já cadastrado');
      err.statusCode = 400;
      throw err;
    }
    throw error;
  }
};

const update = async (id, patch = {}) => {
  const parsedId = Number.parseInt(id, 10);
  if (!Number.isFinite(parsedId)) return null;

  if (!isDatabaseEnabled()) {
    const index = usuarios.findIndex((usr) => usr.id === parsedId);
    if (index === -1) return null;

    const { senhaHash, ...rest } = patch;

    usuarios[index] = {
      ...usuarios[index],
      ...rest,
      email: rest.email ? normalizeEmail(rest.email) : usuarios[index].email,
      senha: senhaHash ? senhaHash : usuarios[index].senha,
      id: parsedId
    };

    return usuarios[index];
  }

  const updates = [];
  const params = [];

  if (patch.nome) {
    params.push(patch.nome);
    updates.push(`nome = $${params.length}`);
  }

  if (patch.email) {
    params.push(normalizeEmail(patch.email));
    updates.push(`email = $${params.length}`);
  }

  if (patch.senhaHash) {
    params.push(patch.senhaHash);
    updates.push(`senha_hash = $${params.length}`);
  }

  if (patch.perfil) {
    params.push(patch.perfil);
    updates.push(`perfil = $${params.length}`);
  }

  if (patch.status) {
    params.push(patch.status);
    updates.push(`status = $${params.length}`);
  }

  if (!updates.length) {
    return findById(parsedId);
  }

  params.push(parsedId);
  const idParam = params.length;

  try {
    const result = await query(
      `
        UPDATE users
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${idParam}
        RETURNING id, nome, email, senha_hash, perfil, status, data_cadastro
      `,
      params
    );

    return result.rowCount ? mapRowToUser(result.rows[0]) : null;
  } catch (error) {
    if (error && error.code === '23505') {
      const err = new Error('Email já cadastrado');
      err.statusCode = 400;
      throw err;
    }
    throw error;
  }
};

const remove = async (id) => {
  const parsedId = Number.parseInt(id, 10);
  if (!Number.isFinite(parsedId)) return false;

  if (!isDatabaseEnabled()) {
    const index = usuarios.findIndex((usr) => usr.id === parsedId);
    if (index === -1) return false;
    usuarios.splice(index, 1);
    return true;
  }

  const result = await query('DELETE FROM users WHERE id = $1', [parsedId]);
  return result.rowCount > 0;
};

module.exports = {
  list,
  findById,
  findByEmail,
  create,
  update,
  remove
};
