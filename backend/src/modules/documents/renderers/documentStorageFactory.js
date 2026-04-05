const { LocalDocumentStorage } = require('./localDocumentStorage');
const { S3DocumentStorage } = require('./s3DocumentStorage');

const parseBoolean = (value, fallback = false) => {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'y', 'on'].includes(value.trim().toLowerCase());
};

const createDocumentStorage = () => {
  const storageConfig = {
    provider: String(process.env.DOCUMENT_STORAGE_PROVIDER || 'local').trim().toLowerCase() || 'local',
    bucket: String(process.env.DOCUMENT_STORAGE_BUCKET || '').trim(),
    region: String(process.env.DOCUMENT_STORAGE_REGION || 'us-east-1').trim(),
    endpoint: String(process.env.DOCUMENT_STORAGE_ENDPOINT || '').trim(),
    accessKeyId: String(process.env.DOCUMENT_STORAGE_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: String(process.env.DOCUMENT_STORAGE_SECRET_ACCESS_KEY || '').trim(),
    publicBaseUrl: String(process.env.DOCUMENT_STORAGE_PUBLIC_BASE_URL || '').trim(),
    forcePathStyle: parseBoolean(process.env.DOCUMENT_STORAGE_FORCE_PATH_STYLE, true),
    signedUrlTtlSeconds: Number(process.env.DOCUMENT_STORAGE_SIGNED_URL_TTL_SECONDS || 900) || 900
  };

  if (storageConfig.provider === 's3' && storageConfig.bucket) {
    return new S3DocumentStorage(storageConfig);
  }

  return new LocalDocumentStorage();
};

module.exports = {
  createDocumentStorage
};
