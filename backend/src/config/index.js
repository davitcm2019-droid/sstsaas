const parseRequiredString = (name) => {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
};

const parseOptionalString = (name, fallback) => {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback;
  }
  return value.trim();
};

const parseOptionalInt = (name, fallback) => {
  const raw = process.env[name];
  if (typeof raw !== 'string' || raw.trim() === '') {
    return fallback;
  }

  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid integer environment variable: ${name}`);
  }

  return parsed;
};

const parseOptionalBool = (name, fallback) => {
  const raw = process.env[name];
  if (typeof raw !== 'string' || raw.trim() === '') {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;

  throw new Error(`Invalid boolean environment variable: ${name}`);
};

const parseCorsOrigins = (rawOrigins) =>
  rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const nodeEnv = parseOptionalString('NODE_ENV', 'development');
const isProduction = nodeEnv === 'production';

const config = {
  nodeEnv,
  isProduction,
  port: parseOptionalInt('PORT', isProduction ? 10000 : 5000),
  jwt: {
    secret: parseRequiredString('JWT_SECRET'),
    expiresIn: parseOptionalString('JWT_EXPIRES_IN', '24h')
  },
  cors: {
    origins: parseCorsOrigins(parseRequiredString('CORS_ORIGIN'))
  },
  db: {
    url: parseOptionalString('DATABASE_URL', ''),
    ssl: parseOptionalBool('DATABASE_SSL', isProduction)
  },
  conectaGov: {
    tokenUrl: parseOptionalString('CONECTA_GOV_TOKEN_URL', ''),
    cnpjUrl: parseOptionalString('CONECTA_GOV_CNPJ_URL', ''),
    clientId: parseOptionalString('CONECTA_GOV_CLIENT_ID', ''),
    clientSecret: parseOptionalString('CONECTA_GOV_CLIENT_SECRET', ''),
    scope: parseOptionalString('CONECTA_GOV_SCOPE', ''),
    timeoutMs: parseOptionalInt('CONECTA_GOV_TIMEOUT_MS', 10000)
  },
  security: {
    bcryptSaltRounds: parseOptionalInt('BCRYPT_SALT_ROUNDS', 10)
  }
};

if (config.port <= 0) {
  throw new Error('PORT must be a positive integer');
}

if (isProduction && config.cors.origins.includes('*')) {
  throw new Error('CORS_ORIGIN cannot be "*" in production');
}

module.exports = {
  config
};
