const { createSstDocumentBuilder } = require('./baseSstBuilder');

module.exports = createSstDocumentBuilder({
  documentType: 'pgr',
  title: 'PGR',
  formalTitle: 'Programa de Gerenciamento de Riscos',
  subtitle: 'Documento tecnico consolidado a partir da base SST',
  description: 'Consolida inventario de riscos, metodologia, criterios e plano de acao por escopo.',
  closingText: 'O PGR deve ser revisado sempre que houver mudanca de processo, exposicao, layout ou organizacao do trabalho.',
  visualIdentity: {
    accentColor: '#0f766e',
    accentSoftColor: '#ccfbf1'
  }
});
