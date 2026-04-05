const { createSstDocumentBuilder } = require('./baseSstBuilder');

module.exports = createSstDocumentBuilder({
  documentType: 'inventario',
  title: 'Inventario de Riscos',
  formalTitle: 'Inventario de Riscos Ocupacionais',
  subtitle: 'Mapa consolidado de perigos, danos, controles e priorizacao',
  description: 'Apresenta o inventario consolidado de riscos por estabelecimento, setor e cargo.',
  closingText: 'O inventario precisa permanecer aderente a base tecnica publicada, com revisao sempre que houver alteracoes no escopo.',
  visualIdentity: {
    accentColor: '#7c3aed',
    accentSoftColor: '#ede9fe'
  }
});
