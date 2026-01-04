// Sistema de registro de incidentes em memória (sem dados fictícios).

const incidents = [];

const incidentTypes = {
  quase_acidente: {
    name: 'Quase Acidente',
    description: 'Evento que poderia ter resultado em lesão ou dano',
    color: 'yellow',
    icon: 'alert-triangle'
  },
  acidente_leve: {
    name: 'Acidente Leve',
    description: 'Acidente com lesão leve, sem afastamento',
    color: 'orange',
    icon: 'alert-circle'
  },
  acidente_moderado: {
    name: 'Acidente Moderado',
    description: 'Acidente com lesão moderada, com afastamento temporário',
    color: 'red',
    icon: 'alert-octagon'
  },
  acidente_grave: {
    name: 'Acidente Grave',
    description: 'Acidente com lesão grave ou permanente',
    color: 'red',
    icon: 'alert-triangle'
  },
  acidente_fatal: {
    name: 'Acidente Fatal',
    description: 'Acidente que resultou em morte',
    color: 'red',
    icon: 'x-circle'
  }
};

const severityLevels = {
  baixa: {
    name: 'Baixa',
    color: 'green',
    description: 'Impacto mínimo, sem lesões ou danos significativos'
  },
  media: {
    name: 'Média',
    color: 'yellow',
    description: 'Impacto moderado, com lesões leves ou danos materiais'
  },
  alta: {
    name: 'Alta',
    color: 'orange',
    description: 'Impacto significativo, com lesões moderadas ou danos consideráveis'
  },
  critica: {
    name: 'Crítica',
    color: 'red',
    description: 'Impacto severo, com lesões graves ou danos extensos'
  }
};

const incidentStatus = {
  registrado: {
    name: 'Registrado',
    color: 'blue',
    description: 'Incidente registrado, aguardando investigação'
  },
  investigando: {
    name: 'Investigando',
    color: 'yellow',
    description: 'Investigação em andamento'
  },
  analisando: {
    name: 'Analisando',
    color: 'orange',
    description: 'Análise das causas e definição de ações'
  },
  implementando: {
    name: 'Implementando Ações',
    color: 'purple',
    description: 'Implementando ações corretivas'
  },
  concluido: {
    name: 'Concluído',
    color: 'green',
    description: 'Incidente concluído e ações implementadas'
  }
};

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

const updateIncidentStatus = (incidentId, newStatus) => {
  const incident = incidents.find((i) => i.id === incidentId);
  if (incident) {
    incident.status = newStatus;
    return incident;
  }
  return null;
};

const getIncidentsByEmpresa = (empresaId) => {
  return incidents
    .filter((incident) => incident.empresaId === parseInt(empresaId, 10))
    .sort((a, b) => new Date(b.dataOcorrencia) - new Date(a.dataOcorrencia));
};

const getIncidentsByResponsavel = (responsavelId) => {
  return incidents
    .filter((incident) => incident.responsavelRegistroId === parseInt(responsavelId, 10))
    .sort((a, b) => new Date(b.dataOcorrencia) - new Date(a.dataOcorrencia));
};

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

  incidents.forEach((incident) => {
    stats.porTipo[incident.tipo] = (stats.porTipo[incident.tipo] || 0) + 1;
    stats.porSeveridade[incident.severidade] = (stats.porSeveridade[incident.severidade] || 0) + 1;
    stats.porStatus[incident.status] = (stats.porStatus[incident.status] || 0) + 1;

    stats.custosTotais += incident.custos?.total || 0;
    stats.tempoPerdidoTotal += incident.tempoPerdido || 0;
    stats.afastamentosTotal += incident.afastamentos || 0;
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

