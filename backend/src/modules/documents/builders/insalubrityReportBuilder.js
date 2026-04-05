const { createSstDocumentBuilder } = require('./baseSstBuilder');

module.exports = createSstDocumentBuilder({
  documentType: 'laudo_insalubridade',
  title: 'Laudo de Insalubridade',
  formalTitle: 'Laudo Tecnico de Insalubridade',
  subtitle: 'Analise tecnica consolidada a partir do escopo SST publicado',
  description: 'Consolida riscos, agentes, base normativa e conclusao tecnica para insalubridade.',
  closingText: 'A validade do laudo depende da manutencao das condicoes ambientais e da coerencia da base tecnica publicada.',
  visualIdentity: {
    accentColor: '#9333ea',
    accentSoftColor: '#f3e8ff'
  }
});
