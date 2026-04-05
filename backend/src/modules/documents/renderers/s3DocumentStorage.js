const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

class S3DocumentStorage {
  constructor(options = {}) {
    this.bucket = options.bucket;
    this.publicBaseUrl = options.publicBaseUrl || '';
    this.signedUrlTtlSeconds = Number(options.signedUrlTtlSeconds || 900) || 900;
    this.client = new S3Client({
      region: options.region || 'us-east-1',
      endpoint: options.endpoint || undefined,
      forcePathStyle: options.forcePathStyle !== false,
      credentials:
        options.accessKeyId && options.secretAccessKey
          ? {
              accessKeyId: options.accessKeyId,
              secretAccessKey: options.secretAccessKey
            }
          : undefined
    });
  }

  isEnabled() {
    return Boolean(this.bucket);
  }

  buildPublicUrl(key) {
    if (!this.publicBaseUrl) return '';
    return `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }

  async save({ buffer, fileName, documentType, assetType = 'pdf', metadata = {} }) {
    const versionLabel = metadata.version ? `v${metadata.version}` : 'v1';
    const documentId = metadata.documentId || 'documento';
    const key = [
      'documents',
      documentType || 'generic',
      documentId,
      versionLabel,
      `${assetType}-${fileName}`
    ].join('/');

    const contentType = assetType === 'html' ? 'text/html; charset=utf-8' : 'application/pdf';

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: Object.entries({
        documentid: metadata.documentId || '',
        version: String(metadata.version || ''),
        documenttype: documentType || '',
        assettype: assetType
      }).reduce((acc, [entryKey, value]) => {
        if (value) acc[entryKey] = value;
        return acc;
      }, {})
    });

    const response = await this.client.send(command);

    return {
      provider: 's3',
      bucket: this.bucket,
      key,
      fileName,
      contentType,
      size: buffer.length,
      etag: response.ETag ? String(response.ETag).replace(/"/g, '') : '',
      publicUrl: this.buildPublicUrl(key),
      createdAt: new Date().toISOString()
    };
  }

  async getSignedUrl(asset = {}) {
    if (!asset?.bucket || !asset?.key) return '';
    if (asset.publicUrl) return asset.publicUrl;

    const command = new GetObjectCommand({
      Bucket: asset.bucket,
      Key: asset.key
    });

    return getSignedUrl(this.client, command, { expiresIn: this.signedUrlTtlSeconds });
  }
}

module.exports = {
  S3DocumentStorage
};
