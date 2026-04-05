const mongoose = require('mongoose');

const { sendSuccess, sendError } = require('../../../utils/response');
const {
  models: { SstIssuedTechnicalDocument, SstIssuedTechnicalDocumentVersion }
} = require('../../../sst/models');
const { getDefaultDocumentGenerationService } = require('../services/documentGenerationService');

const ensureObjectId = (value, message) => {
  const normalized = String(value || '').trim();
  if (!mongoose.isValidObjectId(normalized)) {
    const error = new Error(message);
    error.status = 400;
    throw error;
  }
  return normalized;
};

const service = getDefaultDocumentGenerationService();

const sanitizeAssetMetadata = (asset = null) => {
  if (!asset || typeof asset !== 'object') return null;
  return {
    provider: asset.provider || 'local',
    bucket: asset.bucket || '',
    key: asset.key || '',
    fileName: asset.fileName || '',
    contentType: asset.contentType || '',
    size: Number(asset.size || 0) || 0,
    etag: asset.etag || '',
    publicUrl: asset.publicUrl || '',
    absolutePath: asset.absolutePath || '',
    relativePath: asset.relativePath || '',
    createdAt: asset.createdAt || null
  };
};

const persistVersionAsset = async (versionId, assetType, asset) => {
  if (!versionId || !asset) return null;
  const normalized = sanitizeAssetMetadata(asset);
  await SstIssuedTechnicalDocumentVersion.updateOne(
    { _id: versionId },
    {
      $set: {
        [`assets.${assetType}`]: normalized,
        updatedAt: new Date()
      }
    }
  );
  return normalized;
};

const buildAssetLinks = async (version = {}) => {
  const assets = version?.assets || {};
  const response = {
    html: sanitizeAssetMetadata(assets.html),
    pdf: sanitizeAssetMetadata(assets.pdf)
  };

  for (const assetType of ['html', 'pdf']) {
    const asset = response[assetType];
    if (!asset) continue;
    if (asset.provider === 's3' && typeof service.storage?.getSignedUrl === 'function') {
      asset.url = await service.storage.getSignedUrl(asset);
    } else {
      asset.url = asset.publicUrl || '';
    }
  }

  return response;
};

const listSupportedDocumentTypes = async (req, res) => {
  try {
    const items = service.listDefinitions();
    return sendSuccess(res, {
      data: items,
      meta: { total: items.length }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao listar tipos documentais', meta: { details: error.message } }, error.status || 500);
  }
};

const previewIssuedDocumentHtml = async (req, res) => {
  try {
    const documentId = ensureObjectId(req.params.id, 'Documento invalido');
    const document = await SstIssuedTechnicalDocument.findById(documentId).lean();
    if (!document) return sendError(res, { message: 'Documento nao encontrado' }, 404);

    const version = await SstIssuedTechnicalDocumentVersion.findOne({ documentId }).sort({ version: -1 }).lean();
    if (!version) return sendError(res, { message: 'Nenhuma versao emitida encontrada para este documento' }, 404);

    const rendered = await service.generateIssuedSstDocument({
      document,
      version,
      outputFormat: 'html',
      persist: true
    });

    const storedAsset = await persistVersionAsset(version._id, 'html', rendered.storage);
    if (storedAsset?.publicUrl) {
      res.setHeader('X-Document-Storage-Url', storedAsset.publicUrl);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(rendered.html);
  } catch (error) {
    return sendError(res, { message: 'Erro ao gerar preview HTML do documento', meta: { details: error.message } }, error.status || 500);
  }
};

const downloadIssuedDocumentPdf = async (req, res) => {
  try {
    const documentId = ensureObjectId(req.params.id, 'Documento invalido');
    const document = await SstIssuedTechnicalDocument.findById(documentId).lean();
    if (!document) return sendError(res, { message: 'Documento nao encontrado' }, 404);

    const version = await SstIssuedTechnicalDocumentVersion.findOne({ documentId }).sort({ version: -1 }).lean();
    if (!version) return sendError(res, { message: 'Nenhuma versao emitida encontrada para este documento' }, 404);

    const rendered = await service.generateIssuedSstDocument({
      document,
      version,
      persist: true
    });

    const storedAsset = await persistVersionAsset(version._id, 'pdf', rendered.storage);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${rendered.fileName}"`);
    if (storedAsset?.absolutePath) {
      res.setHeader('X-Document-Storage-Path', storedAsset.absolutePath);
    }
    if (storedAsset?.publicUrl) {
      res.setHeader('X-Document-Storage-Url', storedAsset.publicUrl);
    }
    return res.status(200).send(rendered.buffer);
  } catch (error) {
    return sendError(res, { message: 'Erro ao gerar PDF do documento tecnico', meta: { details: error.message } }, error.status || 500);
  }
};

const getIssuedDocumentAssets = async (req, res) => {
  try {
    const documentId = ensureObjectId(req.params.id, 'Documento invalido');
    const document = await SstIssuedTechnicalDocument.findById(documentId).lean();
    if (!document) return sendError(res, { message: 'Documento nao encontrado' }, 404);

    const version = await SstIssuedTechnicalDocumentVersion.findOne({ documentId }).sort({ version: -1 }).lean();
    if (!version) return sendError(res, { message: 'Nenhuma versao emitida encontrada para este documento' }, 404);

    return sendSuccess(res, {
      data: {
        documentId,
        version: version.version,
        assets: await buildAssetLinks(version)
      }
    });
  } catch (error) {
    return sendError(res, { message: 'Erro ao consultar assets documentais', meta: { details: error.message } }, error.status || 500);
  }
};

module.exports = {
  listSupportedDocumentTypes,
  previewIssuedDocumentHtml,
  downloadIssuedDocumentPdf,
  getIssuedDocumentAssets
};
