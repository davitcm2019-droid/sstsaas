const { pool } = require('../db/pool');

const getEmpresaNomeById = async (empresaId) => {
  if (!empresaId) return '';
  const id = parseInt(empresaId, 10);
  if (Number.isNaN(id)) return '';
  const result = await pool.query('SELECT nome FROM empresas WHERE id = $1', [id]);
  return result.rows[0]?.nome || '';
};

const getUsuarioNomeById = async (usuarioId) => {
  if (!usuarioId) return '';
  const id = parseInt(usuarioId, 10);
  if (Number.isNaN(id)) return '';
  const result = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [id]);
  return result.rows[0]?.nome || '';
};

module.exports = {
  getEmpresaNomeById,
  getUsuarioNomeById
};

