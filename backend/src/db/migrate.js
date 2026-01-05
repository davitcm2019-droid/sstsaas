const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

const ensureMigrationsTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

const listMigrationFiles = () => {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
};

const readMigrationSql = (fileName) => {
  const fullPath = path.join(MIGRATIONS_DIR, fileName);
  return fs.readFileSync(fullPath, 'utf8');
};

const getAppliedMigrationIds = async (client) => {
  const result = await client.query('SELECT id FROM schema_migrations');
  return new Set(result.rows.map((row) => row.id));
};

const applyMigration = async (client, fileName) => {
  const sql = readMigrationSql(fileName);
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations(id) VALUES ($1)', [fileName]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

const runMigrations = async () => {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrationIds(client);
    const files = listMigrationFiles();

    for (const fileName of files) {
      if (applied.has(fileName)) continue;
      await applyMigration(client, fileName);
    }
  } finally {
    client.release();
  }
};

module.exports = {
  runMigrations
};

