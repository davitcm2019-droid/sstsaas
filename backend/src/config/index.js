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

const parseOptionalBoolean = (name, fallback = false) => {
  const raw = process.env[name];
  if (typeof raw !== 'string' || raw.trim() === '') {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  throw new Error(`Invalid boolean environment variable: ${name}`);
};

const parseOptionalEnum = (name, allowedValues = [], fallback = '') => {
  const raw = process.env[name];
  if (typeof raw !== 'string' || raw.trim() === '') {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  if (!allowedValues.includes(normalized)) {
    throw new Error(`Invalid value for ${name}. Allowed values: ${allowedValues.join(', ')}`);
  }

  return normalized;
};

const parseCorsOrigins = (rawOrigins) =>
  rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const nodeEnv = parseOptionalString('NODE_ENV', 'development');
const isProduction = nodeEnv === 'production';
const isRender = String(process.env.RENDER || '').trim().toLowerCase() === 'true';

const databaseUrl = parseOptionalString('MONGO_URI') || parseOptionalString('DATABASE_URL');
if (!databaseUrl) {
  throw new Error('Missing required environment variable: MONGO_URI');
}

const config = {
  nodeEnv,
  isProduction,
  port: parseOptionalInt('PORT', isProduction ? 10000 : 5000),
  database: {
    url: databaseUrl
  },
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
  documents: {
    storage: {
      provider: parseOptionalEnum('DOCUMENT_STORAGE_PROVIDER', ['local', 's3'], 'local'),
      bucket: parseOptionalString('DOCUMENT_STORAGE_BUCKET', ''),
      region: parseOptionalString('DOCUMENT_STORAGE_REGION', 'us-east-1'),
      endpoint: parseOptionalString('DOCUMENT_STORAGE_ENDPOINT', ''),
      accessKeyId: parseOptionalString('DOCUMENT_STORAGE_ACCESS_KEY_ID', ''),
      secretAccessKey: parseOptionalString('DOCUMENT_STORAGE_SECRET_ACCESS_KEY', ''),
      publicBaseUrl: parseOptionalString('DOCUMENT_STORAGE_PUBLIC_BASE_URL', ''),
      forcePathStyle: parseOptionalBoolean('DOCUMENT_STORAGE_FORCE_PATH_STYLE', true),
      signedUrlTtlSeconds: parseOptionalInt('DOCUMENT_STORAGE_SIGNED_URL_TTL_SECONDS', 900)
    }
  },
  features: {
    structuredRiskSurvey: parseOptionalBoolean('FEATURE_STRUCTURED_RISK_SURVEY', true)
  }
};

if (config.port <= 0) {
  throw new Error('PORT must be a positive integer');
}

if ((isProduction || isRender) && config.cors.origins.includes('*')) {
  throw new Error('CORS_ORIGIN cannot be "*" in production');
}

module.exports = {
  config
};
