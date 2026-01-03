const fs = require('fs');
const path = require('path');
const { isDatabaseEnabled, withClient } = require('./index');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const MIGRATION_LOCK_ID = 835912341; // arbitrary constant for pg_advisory_lock

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
    .sort();
};

const migrate = async () => {
  if (!isDatabaseEnabled()) {
    return { skipped: true, applied: [] };
  }

  return withClient(async (client) => {
    const applied = [];

    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);

    try {
      await ensureMigrationsTable(client);

      const files = listMigrationFiles();
      for (const file of files) {
        const alreadyApplied = await client.query('SELECT 1 FROM schema_migrations WHERE id = $1', [file]);
        if (alreadyApplied.rowCount > 0) continue;

        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }

        applied.push(file);
        console.log(`Applied migration: ${file}`);
      }

      return { skipped: false, applied };
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]).catch(() => {});
    }
  });
};

module.exports = {
  migrate
};

