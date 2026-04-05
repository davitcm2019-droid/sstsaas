const { createSstDocumentBuilder } = require('./baseSstBuilder');

module.exports = createSstDocumentBuilder({
  documentType: 'laudo_tecnico',
  title: 'Laudo Tecnico',
  formalTitle: 'Laudo Tecnico SST',
  subtitle: 'Consolidacao tecnica com base versionada e auditavel',
  description: 'Modelo generico de laudo tecnico com consolidacao por escopo SST.',
  closingText: 'O laudo tecnico permanece vinculado a base publicada, hash documental e revisoes formais do modulo SST.',
  visualIdentity: {
    accentColor: '#334155',
    accentSoftColor: '#e2e8f0'
  }
});
