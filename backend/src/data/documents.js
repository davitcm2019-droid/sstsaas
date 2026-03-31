// Catalogo estatico de documentos.

const documentTypes = {
  relatorio: {
    name: 'Relatorio',
    icon: 'file-text',
    color: 'blue',
    description: 'Relatorios gerenciais e de conformidade'
  },
  certificado: {
    name: 'Certificado',
    icon: 'award',
    color: 'green',
    description: 'Certificados de conformidade e treinamentos'
  },
  documento: {
    name: 'Documento',
    icon: 'file',
    color: 'gray',
    description: 'Documentos gerais e procedimentos'
  },
  manual: {
    name: 'Manual',
    icon: 'book',
    color: 'purple',
    description: 'Manuais e instrucoes de procedimentos'
  },
  formulario: {
    name: 'Formulario',
    icon: 'clipboard',
    color: 'yellow',
    description: 'Formularios e checklists'
  }
};

const documentCategories = {
  conformidade: {
    name: 'Conformidade',
    color: 'blue',
    description: 'Documentos relacionados a conformidade legal'
  },
  epi: {
    name: 'EPI',
    color: 'green',
    description: 'Equipamentos de Protecao Individual'
  },
  emergencia: {
    name: 'Emergencia',
    color: 'red',
    description: 'Planos e procedimentos de emergencia'
  },
  inspecao: {
    name: 'Inspecao',
    color: 'yellow',
    description: 'Relatorios e registros de inspecoes'
  },
  treinamento: {
    name: 'Treinamento',
    color: 'purple',
    description: 'Materiais e certificados de treinamento'
  }
};

module.exports = {
  documentTypes,
  documentCategories
};
