const { createReportHtmlTemplate } = require('./createReportHtmlTemplate');

module.exports = createReportHtmlTemplate({
  type: 'laudo_insalubridade',
  codeLabel: 'LAUDO DE INSALUBRIDADE',
  defaultTitle: 'Laudo Tecnico de Insalubridade',
  templateTitle: 'Template formal Laudo de Insalubridade',
  normativeRef: 'NR-15 — Atividades e Operacoes Insalubres',
  accentColor: '#9333ea',
  accentSoftColor: '#f3e8ff'
});
