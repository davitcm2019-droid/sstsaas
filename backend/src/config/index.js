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
  security: {
    bcryptSaltRounds: parseOptionalInt('BCRYPT_SALT_ROUNDS', 10)
  },
  cnpja: {
    apiUrl: parseOptionalString('CNPJA_API_URL', 'https://api.cnpja.com/office'),
    timeoutMs: parseOptionalInt('CNPJA_TIMEOUT_MS', 8000)
  }
};

if (config.port <= 0) {
  throw new Error('PORT must be a positive integer');
}

if (config.cnpja.timeoutMs <= 0) {
  throw new Error('CNPJA_TIMEOUT_MS must be a positive integer');
}

if (isProduction && config.cors.origins.includes('*')) {
  throw new Error('CORS_ORIGIN cannot be "*" in production');
}

module.exports = {
  config
};
