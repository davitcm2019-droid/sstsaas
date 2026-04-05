const {
  getDefaultDocumentGenerationService,
  buildDocumentFileName
} = require('../modules/documents/services/documentGenerationService');

const buildIssuedDocumentPdfFilename = (document, version) => buildDocumentFileName(document, version, 'pdf');

const renderIssuedDocumentPdfBuffer = async ({ document, version, pdfData = null, options = {} }) => {
  const service = getDefaultDocumentGenerationService();
  const result = await service.generateIssuedSstDocument({
    document,
    version,
    pdfData,
    outputFormat: 'pdf',
    deps: {
      rendererDeps: options.rendererDeps || {}
    },
    rendererOptions: options
  });

  return result.buffer;
};

module.exports = {
  buildIssuedDocumentPdfFilename,
  renderIssuedDocumentPdfBuffer
};
