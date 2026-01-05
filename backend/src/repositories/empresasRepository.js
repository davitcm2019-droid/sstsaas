const { pool } = require('../db/pool');

const mapRowToEmpresa = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    nome: row.nome,
    cnpj: row.cnpj,
    cnae: row.cnae,
    ramo: row.ramo,
    endereco: row.endereco,
    cidade: row.cidade,
    estado: row.estado,
    cep: row.cep,
    telefone: row.telefone,
    email: row.email,
    responsavel: row.responsavel,
    status: row.status,
    conformidade: row.conformidade,
    pendencias: row.pendencias,
    alertas: row.alertas,
    dataCadastro: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const findById = async (id) => {
  const result = await pool.query(
    `
      SELECT
        id,
        nome,
        cnpj,
        cnae,
        ramo,
        endereco,
        cidade,
        estado,
        cep,
        telefone,
        email,
        responsavel,
        status,
        conformidade,
        pendencias,
        alertas,
        created_at,
        updated_at
      FROM empresas
      WHERE id = $1
    `,
    [id]
  );

  return mapRowToEmpresa(result.rows[0]);
};

const findByCnpj = async (cnpj) => {
  const result = await pool.query(
    `
      SELECT
        id,
        nome,
        cnpj,
        cnae,
        ramo,
        endereco,
        cidade,
        estado,
        cep,
        telefone,
        email,
        responsavel,
        status,
        conformidade,
        pendencias,
        alertas,
        created_at,
        updated_at
      FROM empresas
      WHERE cnpj = $1
    `,
    [String(cnpj)]
  );

  return mapRowToEmpresa(result.rows[0]);
};

const listEmpresas = async ({ cnae, status, conformidade, search } = {}) => {
  const conditions = [];
  const params = [];

  if (cnae) {
    params.push(`%${String(cnae).trim()}%`);
    conditions.push(`cnae ILIKE $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (conformidade) {
    params.push(conformidade);
    conditions.push(`conformidade = $${params.length}`);
  }

  if (search) {
    const term = `%${String(search).trim().toLowerCase()}%`;
    params.push(term);
    params.push(`%${String(search).trim()}%`);
    params.push(term);
    conditions.push(
      `(LOWER(nome) LIKE $${params.length - 2} OR cnpj LIKE $${params.length - 1} OR LOWER(COALESCE(ramo, '')) LIKE $${params.length})`
    );
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `
      SELECT
        id,
        nome,
        cnpj,
        cnae,
        ramo,
        endereco,
        cidade,
        estado,
        cep,
        telefone,
        email,
        responsavel,
        status,
        conformidade,
        pendencias,
        alertas,
        created_at,
        updated_at
      FROM empresas
      ${whereClause}
      ORDER BY id ASC
    `,
    params
  );

  return result.rows.map(mapRowToEmpresa);
};

const createEmpresa = async ({
  nome,
  cnpj,
  cnae,
  ramo = null,
  endereco = null,
  cidade = null,
  estado = null,
  cep = null,
  telefone = null,
  email = null,
  responsavel = null,
  status = 'ativo',
  conformidade = 'em_dia',
  pendencias = 0,
  alertas = 0
}) => {
  const result = await pool.query(
    `
      INSERT INTO empresas (
        nome,
        cnpj,
        cnae,
        ramo,
        endereco,
        cidade,
        estado,
        cep,
        telefone,
        email,
        responsavel,
        status,
        conformidade,
        pendencias,
        alertas
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING
        id,
        nome,
        cnpj,
        cnae,
        ramo,
        endereco,
        cidade,
        estado,
        cep,
        telefone,
        email,
        responsavel,
        status,
        conformidade,
        pendencias,
        alertas,
        created_at,
        updated_at
    `,
    [
      nome,
      String(cnpj),
      cnae,
      ramo,
      endereco,
      cidade,
      estado,
      cep,
      telefone,
      email,
      responsavel,
      status,
      conformidade,
      pendencias,
      alertas
    ]
  );

  return mapRowToEmpresa(result.rows[0]);
};

const updateEmpresa = async (id, updates = {}) => {
  const setClauses = [];
  const params = [];

  const fields = [
    ['nome', 'nome'],
    ['cnpj', 'cnpj', (value) => String(value)],
    ['cnae', 'cnae'],
    ['ramo', 'ramo'],
    ['endereco', 'endereco'],
    ['cidade', 'cidade'],
    ['estado', 'estado'],
    ['cep', 'cep'],
    ['telefone', 'telefone'],
    ['email', 'email'],
    ['responsavel', 'responsavel'],
    ['status', 'status'],
    ['conformidade', 'conformidade'],
    ['pendencias', 'pendencias'],
    ['alertas', 'alertas']
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
      UPDATE empresas
      SET ${setClauses.join(', ')}
      WHERE id = $${params.length}
      RETURNING
        id,
        nome,
        cnpj,
        cnae,
        ramo,
        endereco,
        cidade,
        estado,
        cep,
        telefone,
        email,
        responsavel,
        status,
        conformidade,
        pendencias,
        alertas,
        created_at,
        updated_at
    `,
    params
  );

  return mapRowToEmpresa(result.rows[0]);
};

const deleteEmpresa = async (id) => {
  const result = await pool.query('DELETE FROM empresas WHERE id = $1 RETURNING id', [id]);
  return Boolean(result.rows[0]);
};

module.exports = {
  findById,
  findByCnpj,
  listEmpresas,
  createEmpresa,
  updateEmpresa,
  deleteEmpresa
};

