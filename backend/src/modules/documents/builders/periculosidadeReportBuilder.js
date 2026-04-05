const { createSstDocumentBuilder } = require('./baseSstBuilder');

module.exports = createSstDocumentBuilder({
  documentType: 'laudo_periculosidade',
  title: 'Laudo de Periculosidade',
  formalTitle: 'Laudo Tecnico de Periculosidade',
  subtitle: 'Consolidacao formal para leitura de periculosidade',
  description: 'Consolida perigos, controles, base normativa e conclusao tecnica para periculosidade.',
  closingText: 'O laudo deve ser reemitido quando houver alteracao de processo, fonte de risco ou controles aplicados.',
  visualIdentity: {
    accentColor: '#be123c',
    accentSoftColor: '#ffe4e6'
  }
});
