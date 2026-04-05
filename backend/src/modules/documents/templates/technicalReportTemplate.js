const { createReportHtmlTemplate } = require('./createReportHtmlTemplate');

module.exports = createReportHtmlTemplate({
  type: 'laudo_tecnico',
  codeLabel: 'LAUDO TECNICO',
  defaultTitle: 'Laudo Tecnico SST',
  templateTitle: 'Template formal Laudo Tecnico',
  normativeRef: '',
  accentColor: '#334155',
  accentSoftColor: '#e2e8f0'
});
