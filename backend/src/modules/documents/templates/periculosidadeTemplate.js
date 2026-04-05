const { createReportHtmlTemplate } = require('./createReportHtmlTemplate');

module.exports = createReportHtmlTemplate({
  type: 'laudo_periculosidade',
  codeLabel: 'LAUDO DE PERICULOSIDADE',
  defaultTitle: 'Laudo Tecnico de Periculosidade',
  templateTitle: 'Template formal Laudo de Periculosidade',
  normativeRef: 'NR-16 — Atividades e Operacoes Perigosas',
  accentColor: '#be123c',
  accentSoftColor: '#ffe4e6'
});
