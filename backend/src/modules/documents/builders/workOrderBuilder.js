const { createSstDocumentBuilder } = require('./baseSstBuilder');

module.exports = createSstDocumentBuilder({
  documentType: 'ordem_servico',
  title: 'Ordem de Servico',
  formalTitle: 'Ordem de Servico de Seguranca e Saude no Trabalho',
  subtitle: 'Instrucao formal por setor, cargo e riscos associados',
  description: 'Formaliza responsabilidades, riscos, controles e orientacoes operacionais por cargo.',
  closingText: 'A ordem de servico deve ser comunicada aos envolvidos e revista sempre que houver mudanca de atividade, risco ou procedimento.',
  visualIdentity: {
    accentColor: '#b45309',
    accentSoftColor: '#fef3c7'
  }
});
