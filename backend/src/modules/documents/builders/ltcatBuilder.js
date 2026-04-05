const { createSstDocumentBuilder } = require('./baseSstBuilder');

module.exports = createSstDocumentBuilder({
  documentType: 'ltcat',
  title: 'LTCAT',
  formalTitle: 'Laudo Tecnico das Condicoes do Ambiente de Trabalho',
  subtitle: 'Base previdenciaria e ocupacional com rastreabilidade tecnica',
  description: 'Consolida avaliacoes ambientais, agentes, fontes, metodologia e conclusao assinada.',
  closingText: 'O LTCAT deve refletir as condicoes ambientais vigentes e ser atualizado diante de alteracoes relevantes de exposicao.',
  visualIdentity: {
    accentColor: '#0f4c81',
    accentSoftColor: '#dbeafe'
  }
});
