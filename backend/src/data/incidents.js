// Sistema de registro de incidentes

const incidents = [
  {
    id: 1,
    empresaId: 1,
    empresaNome: 'Indústria Metalúrgica ABC Ltda',
    titulo: 'Queda de material durante solda',
    descricao: 'Pedaço de metal caiu de altura de 2 metros durante operação de solda, sem vítimas',
    tipo: 'quase_acidente',
    severidade: 'media',
    dataOcorrencia: '2024-03-05T14:30:00Z',
    dataRegistro: '2024-03-05T15:00:00Z',
    local: 'Setor de solda - Linha 2',
    responsavelRegistro: 'João Silva',
    responsavelRegistroId: 2,
    status: 'investigando',
    causas: [
      'Falta de sinalização de área de risco',
      'EPI inadequado para a operação'
    ],
    acoesCorretivas: [
      'Implementar sinalização de área de risco',
      'Fornecer capacete com proteção facial',
      'Treinar equipe sobre procedimentos de segurança'
    ],
    fotos: [
      {
        id: 1,
        url: '/uploads/incidents/incident_1_photo_1.jpg',
        descricao: 'Local do incidente - área de solda',
        dataUpload: '2024-03-05T15:15:00Z'
      },
      {
        id: 2,
        url: '/uploads/incidents/incident_1_photo_2.jpg',
        descricao: 'Material que caiu',
        dataUpload: '2024-03-05T15:20:00Z'
      }
    ],
    documentos: [
      {
        id: 1,
        nome: 'Relatório de Investigação',
        url: '/uploads/incidents/incident_1_report.pdf',
        tipo: 'pdf',
        dataUpload: '2024-03-06T10:00:00Z'
      }
    ],
    custos: {
      diretos: 0,
      indiretos: 500,
      total: 500
    },
    tempoPerdido: 0, // em horas
    afastamentos: 0,
    testemunhas: [
      {
        nome: 'Carlos Oliveira',
        cargo: 'Soldador',
        contato: 'carlos.oliveira@empresa.com'
      }
    ]
  },
  {
    id: 2,
    empresaId: 2,
    empresaNome: 'Construtora XYZ S.A.',
    titulo: 'Corte superficial em mão',
    descricao: 'Trabalhador cortou a mão com ferramenta inadequada durante construção',
    tipo: 'acidente_leve',
    severidade: 'baixa',
    dataOcorrencia: '2024-03-08T10:15:00Z',
    dataRegistro: '2024-03-08T10:30:00Z',
    local: 'Obra - Andar 3',
    responsavelRegistro: 'Maria Santos',
    responsavelRegistroId: 3,
    status: 'concluido',
    causas: [
      'Uso de ferramenta inadequada',
      'Falta de treinamento específico'
    ],
    acoesCorretivas: [
      'Fornecer ferramentas adequadas',
      'Realizar treinamento específico',
      'Implementar checklist de ferramentas'
    ],
    fotos: [
      {
        id: 3,
        url: '/uploads/incidents/incident_2_photo_1.jpg',
        descricao: 'Ferramenta que causou o corte',
        dataUpload: '2024-03-08T10:45:00Z'
      }
    ],
    documentos: [],
    custos: {
      diretos: 200,
      indiretos: 300,
      total: 500
    },
    tempoPerdido: 2,
    afastamentos: 0,
    testemunhas: [
      {
        nome: 'Pedro Silva',
        cargo: 'Pedreiro',
        contato: 'pedro.silva@construtora.com'
      }
    ]
  }
];

// Tipos de incidentes
const incidentTypes = {
  'quase_acidente': {
    name: 'Quase Acidente',
    description: 'Evento que poderia ter resultado em lesão ou dano',
    color: 'yellow',
    icon: 'alert-triangle'
  },
  'acidente_leve': {
    name: 'Acidente Leve',
    description: 'Acidente com lesão leve, sem afastamento',
    color: 'orange',
    icon: 'alert-circle'
  },
  'acidente_moderado': {
    name: 'Acidente Moderado',
    description: 'Acidente com lesão moderada, com afastamento temporário',
    color: 'red',
    icon: 'alert-octagon'
  },
  'acidente_grave': {
    name: 'Acidente Grave',
    description: 'Acidente com lesão grave ou permanente',
    color: 'red',
    icon: 'alert-triangle'
  },
  'acidente_fatal': {
    name: 'Acidente Fatal',
    description: 'Acidente que resultou em morte',
    color: 'red',
    icon: 'x-circle'
  }
};

// Níveis de severidade
const severityLevels = {
  'baixa': {
    name: 'Baixa',
    color: 'green',
    description: 'Impacto mínimo, sem lesões ou danos significativos'
  },
  'media': {
    name: 'Média',
    color: 'yellow',
    description: 'Impacto moderado, com lesões leves ou danos materiais'
  },
  'alta': {
    name: 'Alta',
    color: 'orange',
    description: 'Impacto significativo, com lesões moderadas ou danos consideráveis'
  },
  'critica': {
    name: 'Crítica',
    color: 'red',
    description: 'Impacto severo, com lesões graves ou danos extensos'
  }
};

// Status dos incidentes
const incidentStatus = {
  'registrado': {
    name: 'Registrado',
    color: 'blue',
    description: 'Incidente registrado, aguardando investigação'
  },
  'investigando': {
    name: 'Investigando',
    color: 'yellow',
    description: 'Investigação em andamento'
  },
  'analisando': {
    name: 'Analisando',
    color: 'orange',
    description: 'Análise das causas e definição de ações'
  },
  'implementando': {
    name: 'Implementando Ações',
    color: 'purple',
    description: 'Implementando ações corretivas'
  },
  'concluido': {
    name: 'Concluído',
    color: 'green',
    description: 'Incidente concluído e ações implementadas'
  }
};

// Função para criar incidente
const createIncident = (incidentData) => {
  const newIncident = {
    id: incidents.length + 1,
    dataRegistro: new Date().toISOString(),
    status: 'registrado',
    fotos: [],
    documentos: [],
    custos: {
      diretos: 0,
      indiretos: 0,
      total: 0
    },
    tempoPerdido: 0,
    afastamentos: 0,
    testemunhas: [],
    ...incidentData
  };
  
  incidents.push(newIncident);
  return newIncident;
};

// Função para atualizar status do incidente
const updateIncidentStatus = (incidentId, newStatus) => {
  const incident = incidents.find(i => i.id === incidentId);
  if (incident) {
    incident.status = newStatus;
    return incident;
  }
  return null;
};

// Função para buscar incidentes por empresa
const getIncidentsByEmpresa = (empresaId) => {
  return incidents.filter(incident => 
    incident.empresaId === parseInt(empresaId)
  ).sort((a, b) => new Date(b.dataOcorrencia) - new Date(a.dataOcorrencia));
};

// Função para buscar incidentes por responsável
const getIncidentsByResponsavel = (responsavelId) => {
  return incidents.filter(incident => 
    incident.responsavelRegistroId === parseInt(responsavelId)
  ).sort((a, b) => new Date(b.dataOcorrencia) - new Date(a.dataOcorrencia));
};

// Função para calcular estatísticas
const getIncidentStats = () => {
  const stats = {
    total: incidents.length,
    porTipo: {},
    porSeveridade: {},
    porStatus: {},
    custosTotais: 0,
    tempoPerdidoTotal: 0,
    afastamentosTotal: 0
  };
  
  incidents.forEach(incident => {
    // Por tipo
    stats.porTipo[incident.tipo] = (stats.porTipo[incident.tipo] || 0) + 1;
    
    // Por severidade
    stats.porSeveridade[incident.severidade] = (stats.porSeveridade[incident.severidade] || 0) + 1;
    
    // Por status
    stats.porStatus[incident.status] = (stats.porStatus[incident.status] || 0) + 1;
    
    // Custos
    stats.custosTotais += incident.custos.total;
    
    // Tempo perdido
    stats.tempoPerdidoTotal += incident.tempoPerdido;
    
    // Afastamentos
    stats.afastamentosTotal += incident.afastamentos;
  });
  
  return stats;
};

module.exports = {
  incidents,
  incidentTypes,
  severityLevels,
  incidentStatus,
  createIncident,
  updateIncidentStatus,
  getIncidentsByEmpresa,
  getIncidentsByResponsavel,
  getIncidentStats
};
