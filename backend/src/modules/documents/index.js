const { getDefaultDocumentGenerationService } = require('./services/documentGenerationService');
const controllers = require('./controllers/sstDocumentsController');

module.exports = {
  getDefaultDocumentGenerationService,
  controllers
};
