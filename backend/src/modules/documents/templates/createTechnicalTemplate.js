const { renderDocumentHtml, renderChromeTemplate } = require('./baseHtmlTemplate');

const createTechnicalTemplate = (meta = {}) => ({
  meta,
  render: async ({ documentModel }) => ({
    html: renderDocumentHtml(documentModel, meta),
    headerTemplate: renderChromeTemplate({ side: 'header', documentModel }),
    footerTemplate: renderChromeTemplate({ side: 'footer', documentModel }),
    pdfOptions: {
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      margin: {
        top: '110px',
        right: '24px',
        bottom: '80px',
        left: '24px'
      }
    }
  })
});

module.exports = {
  createTechnicalTemplate
};
