const { resolveIssuedDocumentPdfData } = require('../../../sst/pdfDataResolver');
const { renderPdf } = require('../renderers/puppeteerPdfRenderer');
const { createDocumentStorage } = require('../renderers/documentStorageFactory');
const { DocumentRegistry } = require('./documentRegistry');
const { assertDocumentType, assertOutputFormat } = require('../types/contracts');

const pgrBuilder = require('../builders/pgrBuilder');
const ltcatBuilder = require('../builders/ltcatBuilder');
const inventoryBuilder = require('../builders/inventoryBuilder');
const workOrderBuilder = require('../builders/workOrderBuilder');
const technicalReportBuilder = require('../builders/technicalReportBuilder');
const insalubrityReportBuilder = require('../builders/insalubrityReportBuilder');
const periculosidadeReportBuilder = require('../builders/periculosidadeReportBuilder');

const pgrTemplate = require('../templates/pgrTemplate');
const ltcatTemplate = require('../templates/ltcatTemplate');
const inventoryTemplate = require('../templates/inventoryTemplate');
const workOrderTemplate = require('../templates/workOrderTemplate');
const technicalReportTemplate = require('../templates/technicalReportTemplate');
const insalubrityTemplate = require('../templates/insalubrityTemplate');
const periculosidadeTemplate = require('../templates/periculosidadeTemplate');

const normalizeFileName = (value) =>
  String(value || 'documento-tecnico')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const buildDocumentFileName = (document, version, extension = 'pdf') => {
  const base = normalizeFileName(document?.title || document?.documento?.titulo || 'documento-tecnico');
  const versionLabel = `v${version?.version || document?.latestVersion || document?.documento?.versao || 1}`;
  return `${base}-${versionLabel}.${extension}`;
};

const createDefaultRegistry = () =>
  new DocumentRegistry([
    { type: 'pgr', builder: pgrBuilder, template: pgrTemplate },
    { type: 'ltcat', builder: ltcatBuilder, template: ltcatTemplate },
    { type: 'inventario', builder: inventoryBuilder, template: inventoryTemplate },
    { type: 'ordem_servico', builder: workOrderBuilder, template: workOrderTemplate },
    { type: 'laudo_tecnico', builder: technicalReportBuilder, template: technicalReportTemplate },
    { type: 'laudo_insalubridade', builder: insalubrityReportBuilder, template: insalubrityTemplate },
    { type: 'laudo_periculosidade', builder: periculosidadeReportBuilder, template: periculosidadeTemplate }
  ]);

class DocumentGenerationService {
  constructor({ registry = createDefaultRegistry(), storage = createDocumentStorage(), renderer = renderPdf } = {}) {
    this.registry = registry;
    this.storage = storage;
    this.renderer = renderer;
  }

  listDefinitions() {
    return this.registry.list();
  }

  async buildIssuedSstDocument({ document, version, pdfData = null, deps = {} }) {
    const documentType = assertDocumentType(document?.documentType);
    const definition = this.registry.get(documentType);
    const resolvedPdfData = pdfData || (await resolveIssuedDocumentPdfData({ document, version, deps: deps.dataDeps || {} }));
    const documentModel = await definition.builder.build({
      document,
      version,
      pdfData: resolvedPdfData
    });

    return {
      definition,
      pdfData: resolvedPdfData,
      documentModel
    };
  }

  async renderIssuedSstDocumentHtml({ document, version, pdfData = null, deps = {} }) {
    const { definition, documentModel, pdfData: resolvedPdfData } = await this.buildIssuedSstDocument({
      document,
      version,
      pdfData,
      deps
    });
    const templateOutput = await definition.template.render({ documentModel, document, version, pdfData: resolvedPdfData });

    return {
      html: templateOutput.html,
      headerTemplate: templateOutput.headerTemplate || '',
      footerTemplate: templateOutput.footerTemplate || '',
      pdfOptions: templateOutput.pdfOptions || {},
      documentModel,
      definition
    };
  }

  async generateIssuedSstDocument({
    document,
    version,
    pdfData = null,
    outputFormat = 'pdf',
    persist = false,
    deps = {},
    rendererOptions = {}
  }) {
    const normalizedFormat = assertOutputFormat(outputFormat);
    const rendered = await this.renderIssuedSstDocumentHtml({ document, version, pdfData, deps });
    const fileName = buildDocumentFileName(document, version, normalizedFormat);

    if (normalizedFormat === 'html') {
      const htmlBuffer = Buffer.from(rendered.html, 'utf8');
      const storageResult = persist
        ? await this.storage.save({
            buffer: htmlBuffer,
            fileName,
            documentType: document?.documentType,
            assetType: 'html',
            metadata: {
              documentId: document?.id || document?._id?.toString?.() || '',
              version: version?.version || document?.latestVersion || 1
            }
          })
        : null;

      return {
        buffer: htmlBuffer,
        html: rendered.html,
        fileName,
        storage: storageResult,
        documentModel: rendered.documentModel
      };
    }

    const pdfBuffer = await this.renderer({
      html: rendered.html,
      headerTemplate: rendered.headerTemplate,
      footerTemplate: rendered.footerTemplate,
      pdfOptions: rendered.pdfOptions,
      options: rendererOptions,
      deps: deps.rendererDeps || {}
    });

    const storageResult = persist
      ? await this.storage.save({
          buffer: pdfBuffer,
          fileName,
          documentType: document?.documentType,
          assetType: 'pdf',
          metadata: {
            documentId: document?.id || document?._id?.toString?.() || '',
            version: version?.version || document?.latestVersion || 1
          }
        })
      : null;

    return {
      buffer: pdfBuffer,
      html: rendered.html,
      fileName,
      storage: storageResult,
      documentModel: rendered.documentModel
    };
  }
}

let defaultService = null;

const getDefaultDocumentGenerationService = () => {
  if (!defaultService) {
    defaultService = new DocumentGenerationService();
  }
  return defaultService;
};

module.exports = {
  DocumentGenerationService,
  buildDocumentFileName,
  createDefaultRegistry,
  getDefaultDocumentGenerationService
};
