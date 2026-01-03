const { Pool } = require('pg');
const { config } = require('../config');

let pool;

const isDatabaseEnabled = () => typeof config.db?.url === 'string' && config.db.url.trim() !== '';

const getPool = () => {
  if (!isDatabaseEnabled()) return null;

  if (!pool) {
    pool = new Pool({
      connectionString: config.db.url,
      ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined
    });

    pool.on('error', (error) => {
      console.error('Postgres pool error:', error);
    });
  }

  return pool;
};

const query = async (text, params) => {
  const currentPool = getPool();
  if (!currentPool) {
    throw new Error('Database is not configured (missing DATABASE_URL)');
  }
  return currentPool.query(text, params);
};

const withClient = async (fn) => {
  const currentPool = getPool();
  if (!currentPool) {
    throw new Error('Database is not configured (missing DATABASE_URL)');
  }

  const client = await currentPool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
};

module.exports = {
  isDatabaseEnabled,
  getPool,
  query,
  withClient
};

