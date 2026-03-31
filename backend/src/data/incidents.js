// Catalogo estatico de incidentes.

const incidentTypes = {
  quase_acidente: {
    name: 'Quase Acidente',
    description: 'Evento que poderia ter resultado em lesao ou dano',
    color: 'yellow',
    icon: 'alert-triangle'
  },
  acidente_leve: {
    name: 'Acidente Leve',
    description: 'Acidente com lesao leve, sem afastamento',
    color: 'orange',
    icon: 'alert-circle'
  },
  acidente_moderado: {
    name: 'Acidente Moderado',
    description: 'Acidente com lesao moderada, com afastamento temporario',
    color: 'red',
    icon: 'alert-octagon'
  },
  acidente_grave: {
    name: 'Acidente Grave',
    description: 'Acidente com lesao grave ou permanente',
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
    description: 'Impacto minimo, sem lesoes ou danos significativos'
  },
  media: {
    name: 'Media',
    color: 'yellow',
    description: 'Impacto moderado, com lesoes leves ou danos materiais'
  },
  alta: {
    name: 'Alta',
    color: 'orange',
    description: 'Impacto significativo, com lesoes moderadas ou danos consideraveis'
  },
  critica: {
    name: 'Critica',
    color: 'red',
    description: 'Impacto severo, com lesoes graves ou danos extensos'
  }
};

const incidentStatus = {
  registrado: {
    name: 'Registrado',
    color: 'blue',
    description: 'Incidente registrado, aguardando investigacao'
  },
  investigando: {
    name: 'Investigando',
    color: 'yellow',
    description: 'Investigacao em andamento'
  },
  analisando: {
    name: 'Analisando',
    color: 'orange',
    description: 'Analise das causas e definicao de acoes'
  },
  implementando: {
    name: 'Implementando Acoes',
    color: 'purple',
    description: 'Implementando acoes corretivas'
  },
  concluido: {
    name: 'Concluido',
    color: 'green',
    description: 'Incidente concluido e acoes implementadas'
  }
};

module.exports = {
  incidentTypes,
  severityLevels,
  incidentStatus
};
