// Sistema de documentos e relatórios

const documents = [
  {
    id: 1,
    nome: "Relatório de Conformidade - Q1 2024",
    tipo: "relatorio",
    categoria: "conformidade",
    empresaId: 1,
    empresaNome: "Indústria Metalúrgica ABC Ltda",
    arquivo: "relatorio_conformidade_q1_2024.pdf",
    tamanho: 2048576, // 2MB em bytes
    formato: "pdf",
    dataUpload: "2024-03-15T10:30:00Z",
    dataCriacao: "2024-03-15T10:00:00Z",
    uploadPor: "João Silva",
    uploadPorId: 2,
    status: "ativo",
    descricao: "Relatório trimestral de conformidade com as normas de segurança",
    tags: ["conformidade", "relatório", "q1-2024"],
    versao: "1.0",
    acessos: 15,
    downloads: 8
  },
  {
    id: 2,
    nome: "Certificado de EPI - Capacete",
    tipo: "certificado",
    categoria: "epi",
    empresaId: 1,
    empresaNome: "Indústria Metalúrgica ABC Ltda",
    arquivo: "certificado_capacete_2024.pdf",
    tamanho: 512000, // 512KB
    formato: "pdf",
    dataUpload: "2024-03-10T14:20:00Z",
    dataCriacao: "2024-03-01T09:00:00Z",
    uploadPor: "João Silva",
    uploadPorId: 2,
    status: "ativo",
    descricao: "Certificado de conformidade do capacete de segurança",
    tags: ["epi", "certificado", "capacete"],
    versao: "1.0",
    acessos: 12,
    downloads: 5
  },
  {
    id: 3,
    nome: "Plano de Emergência",
    tipo: "documento",
    categoria: "emergencia",
    empresaId: 2,
    empresaNome: "Construtora XYZ S.A.",
    arquivo: "plano_emergencia_2024.docx",
    tamanho: 1024000, // 1MB
    formato: "docx",
    dataUpload: "2024-03-08T16:45:00Z",
    dataCriacao: "2024-02-28T14:00:00Z",
    uploadPor: "Maria Santos",
    uploadPorId: 3,
    status: "ativo",
    descricao: "Plano de emergência e evacuação da obra",
    tags: ["emergencia", "plano", "evacuacao"],
    versao: "2.1",
    acessos: 25,
    downloads: 12
  },
  {
    id: 4,
    nome: "Relatório de Inspeção - Março 2024",
    tipo: "relatorio",
    categoria: "inspecao",
    empresaId: 1,
    empresaNome: "Indústria Metalúrgica ABC Ltda",
    arquivo: "relatorio_inspecao_marco_2024.pdf",
    tamanho: 1536000, // 1.5MB
    formato: "pdf",
    dataUpload: "2024-03-20T11:15:00Z",
    dataCriacao: "2024-03-20T10:30:00Z",
    uploadPor: "João Silva",
    uploadPorId: 2,
    status: "ativo",
    descricao: "Relatório mensal de inspeções de segurança",
    tags: ["inspecao", "relatório", "março-2024"],
    versao: "1.0",
    acessos: 8,
    downloads: 3
  }
];

const documentTypes = {
  'relatorio': {
    name: 'Relatório',
    icon: 'file-text',
    color: 'blue',
    description: 'Relatórios gerenciais e de conformidade'
  },
  'certificado': {
    name: 'Certificado',
    icon: 'award',
    color: 'green',
    description: 'Certificados de conformidade e treinamentos'
  },
  'documento': {
    name: 'Documento',
    icon: 'file',
    color: 'gray',
    description: 'Documentos gerais e procedimentos'
  },
  'manual': {
    name: 'Manual',
    icon: 'book',
    color: 'purple',
    description: 'Manuais e instruções de procedimentos'
  },
  'formulario': {
    name: 'Formulário',
    icon: 'clipboard',
    color: 'yellow',
    description: 'Formulários e checklists'
  }
};

const documentCategories = {
  'conformidade': {
    name: 'Conformidade',
    color: 'blue',
    description: 'Documentos relacionados à conformidade legal'
  },
  'epi': {
    name: 'EPI',
    color: 'green',
    description: 'Equipamentos de Proteção Individual'
  },
  'emergencia': {
    name: 'Emergência',
    color: 'red',
    description: 'Planos e procedimentos de emergência'
  },
  'inspecao': {
    name: 'Inspeção',
    color: 'yellow',
    description: 'Relatórios e registros de inspeções'
  },
  'treinamento': {
    name: 'Treinamento',
    color: 'purple',
    description: 'Materiais e certificados de treinamento'
  }
};

// Função para criar documento
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

// Função para buscar documentos por empresa
const getDocumentsByEmpresa = (empresaId) => {
  return documents.filter(doc => 
    doc.empresaId === parseInt(empresaId)
  ).sort((a, b) => new Date(b.dataUpload) - new Date(a.dataUpload));
};

// Função para buscar documentos por tipo
const getDocumentsByType = (tipo) => {
  return documents.filter(doc => 
    doc.tipo === tipo
  ).sort((a, b) => new Date(b.dataUpload) - new Date(a.dataUpload));
};

// Função para buscar documentos por categoria
const getDocumentsByCategory = (categoria) => {
  return documents.filter(doc => 
    doc.categoria === categoria
  ).sort((a, b) => new Date(b.dataUpload) - new Date(a.dataUpload));
};

// Função para incrementar downloads
const incrementDownloads = (documentId) => {
  const document = documents.find(doc => doc.id === documentId);
  if (document) {
    document.downloads += 1;
    return document;
  }
  return null;
};

// Função para incrementar acessos
const incrementAccess = (documentId) => {
  const document = documents.find(doc => doc.id === documentId);
  if (document) {
    document.acessos += 1;
    return document;
  }
  return null;
};

// Função para calcular estatísticas
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
  
  documents.forEach(doc => {
    // Por tipo
    stats.porTipo[doc.tipo] = (stats.porTipo[doc.tipo] || 0) + 1;
    
    // Por categoria
    stats.porCategoria[doc.categoria] = (stats.porCategoria[doc.categoria] || 0) + 1;
    
    // Por empresa
    stats.porEmpresa[doc.empresaNome] = (stats.porEmpresa[doc.empresaNome] || 0) + 1;
    
    // Totais
    stats.totalTamanho += doc.tamanho;
    stats.totalDownloads += doc.downloads;
    stats.totalAcessos += doc.acessos;
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
