// Sistema de documentos e relatórios em memória (sem dados fictícios).

const documents = [];

const documentTypes = {
  relatorio: {
    name: 'Relatório',
    icon: 'file-text',
    color: 'blue',
    description: 'Relatórios gerenciais e de conformidade'
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
    description: 'Manuais e instruções de procedimentos'
  },
  formulario: {
    name: 'Formulário',
    icon: 'clipboard',
    color: 'yellow',
    description: 'Formulários e checklists'
  }
};

const documentCategories = {
  conformidade: {
    name: 'Conformidade',
    color: 'blue',
    description: 'Documentos relacionados à conformidade legal'
  },
  epi: {
    name: 'EPI',
    color: 'green',
    description: 'Equipamentos de Proteção Individual'
  },
  emergencia: {
    name: 'Emergência',
    color: 'red',
    description: 'Planos e procedimentos de emergência'
  },
  inspecao: {
    name: 'Inspeção',
    color: 'yellow',
    description: 'Relatórios e registros de inspeções'
  },
  treinamento: {
    name: 'Treinamento',
    color: 'purple',
    description: 'Materiais e certificados de treinamento'
  }
};

const createDocument = (documentData) => {
  const newDocument = {
    id: documents.length + 1,
    dataUpload: new Date().toISOString(),
    status: 'ativo',
    versao: '1.0',
    acessos: 0,
    downloads: 0,
    ...documentData
  };

  documents.push(newDocument);
  return newDocument;
};

const getDocumentsByEmpresa = (empresaId) => {
  return documents
    .filter((doc) => doc.empresaId === parseInt(empresaId, 10))
    .sort((a, b) => new Date(b.dataUpload) - new Date(a.dataUpload));
};

const getDocumentsByType = (tipo) => {
  return documents.filter((doc) => doc.tipo === tipo).sort((a, b) => new Date(b.dataUpload) - new Date(a.dataUpload));
};

const getDocumentsByCategory = (categoria) => {
  return documents
    .filter((doc) => doc.categoria === categoria)
    .sort((a, b) => new Date(b.dataUpload) - new Date(a.dataUpload));
};

const incrementDownloads = (documentId) => {
  const document = documents.find((doc) => doc.id === documentId);
  if (document) {
    document.downloads += 1;
    return document;
  }
  return null;
};

const incrementAccess = (documentId) => {
  const document = documents.find((doc) => doc.id === documentId);
  if (document) {
    document.acessos += 1;
    return document;
  }
  return null;
};

const getDocumentStats = () => {
  const stats = {
    total: documents.length,
    porTipo: {},
    porCategoria: {},
    porEmpresa: {},
    totalTamanho: 0,
    totalDownloads: 0,
    totalAcessos: 0
  };

  documents.forEach((doc) => {
    stats.porTipo[doc.tipo] = (stats.porTipo[doc.tipo] || 0) + 1;
    stats.porCategoria[doc.categoria] = (stats.porCategoria[doc.categoria] || 0) + 1;
    stats.porEmpresa[doc.empresaNome] = (stats.porEmpresa[doc.empresaNome] || 0) + 1;

    stats.totalTamanho += doc.tamanho || 0;
    stats.totalDownloads += doc.downloads || 0;
    stats.totalAcessos += doc.acessos || 0;
  });

  return stats;
};

module.exports = {
  documents,
  documentTypes,
  documentCategories,
  createDocument,
  getDocumentsByEmpresa,
  getDocumentsByType,
  getDocumentsByCategory,
  incrementDownloads,
  incrementAccess,
  getDocumentStats
};

