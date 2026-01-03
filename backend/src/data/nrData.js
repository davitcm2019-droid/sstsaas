// Dados das Normas Regulamentadoras (NRs) e checklists por CNAE

const nrs = [
  {
    id: 1,
    codigo: 'NR-1',
    titulo: 'Disposições Gerais',
    descricao: 'Estabelece as disposições gerais, o campo de aplicação, os termos e definições, as responsabilidades do empregador e do empregado, e as competências dos órgãos públicos.',
    aplicavel: true,
    obrigatoria: true
  },
  {
    id: 2,
    codigo: 'NR-6',
    titulo: 'Equipamentos de Proteção Individual (EPI)',
    descricao: 'Estabelece e define os tipos de EPIs a que as empresas estão obrigadas a fornecer aos seus empregados.',
    aplicavel: true,
    obrigatoria: true
  },
  {
    id: 3,
    codigo: 'NR-7',
    titulo: 'Programa de Controle Médico de Saúde Ocupacional (PCMSO)',
    descricao: 'Estabelece a obrigatoriedade de elaboração e implementação do PCMSO por parte de todos os empregadores e instituições que admitam trabalhadores como empregados.',
    aplicavel: true,
    obrigatoria: true
  },
  {
    id: 4,
    codigo: 'NR-9',
    titulo: 'Programa de Prevenção de Riscos Ambientais (PPRA)',
    descricao: 'Estabelece a obrigatoriedade da elaboração e implementação do PPRA por parte de todos os empregadores e instituições que admitam trabalhadores como empregados.',
    aplicavel: true,
    obrigatoria: true
  },
  {
    id: 5,
    codigo: 'NR-10',
    titulo: 'Segurança em Instalações e Serviços em Eletricidade',
    descricao: 'Estabelece as condições mínimas e os requisitos de segurança para instalações elétricas e serviços em eletricidade.',
    aplicavel: false,
    obrigatoria: false
  },
  {
    id: 6,
    codigo: 'NR-12',
    titulo: 'Segurança no Trabalho em Máquinas e Equipamentos',
    descricao: 'Estabelece os requisitos mínimos para a prevenção de acidentes e doenças do trabalho nas fases de projeto e de utilização de máquinas e equipamentos.',
    aplicavel: true,
    obrigatoria: true
  },
  {
    id: 7,
    codigo: 'NR-15',
    titulo: 'Atividades e Operações Insalubres',
    descricao: 'Define as atividades e operações insalubres e os limites de tolerância para agentes físicos, químicos e biológicos.',
    aplicavel: false,
    obrigatoria: false
  },
  {
    id: 8,
    codigo: 'NR-18',
    titulo: 'Condições e Meio Ambiente de Trabalho na Indústria da Construção',
    descricao: 'Estabelece diretrizes de ordem administrativa, de planejamento e de organização para implementação e controle das condições e meio ambiente de trabalho na indústria da construção.',
    aplicavel: false,
    obrigatoria: false
  }
];

// Mapeamento de CNAEs para NRs aplicáveis
const cnaeNrs = {
  '2511-0/00': [1, 2, 3, 4, 6], // Fabricação de estruturas metálicas
  '4120-4/00': [1, 2, 3, 4, 6, 8], // Construção de edifícios
  '2101-6/00': [1, 2, 3, 4, 6, 7] // Fabricação de medicamentos
};

// Checklists por NR
const checklists = {
  'NR-1': [
    {
      id: 1,
      item: 'Política de Segurança e Saúde no Trabalho definida',
      descricao: 'A empresa possui política de SST documentada e comunicada aos trabalhadores',
      obrigatorio: true,
      peso: 10
    },
    {
      id: 2,
      item: 'Comissão Interna de Prevenção de Acidentes (CIPA) constituída',
      descricao: 'CIPA formada conforme NR-5 com representantes dos empregados e empregador',
      obrigatorio: true,
      peso: 15
    },
    {
      id: 3,
      item: 'Serviço Especializado em Engenharia de Segurança e Medicina do Trabalho (SESMT)',
      descricao: 'SESMT dimensionado conforme grau de risco da empresa',
      obrigatorio: true,
      peso: 20
    }
  ],
  'NR-6': [
    {
      id: 1,
      item: 'Análise de riscos para definição de EPIs',
      descricao: 'Análise realizada para identificar necessidades de EPIs por função',
      obrigatorio: true,
      peso: 15
    },
    {
      id: 2,
      item: 'Fornecimento gratuito de EPIs',
      descricao: 'EPIs fornecidos gratuitamente aos trabalhadores',
      obrigatorio: true,
      peso: 20
    },
    {
      id: 3,
      item: 'Treinamento para uso de EPIs',
      descricao: 'Trabalhadores treinados para uso correto dos EPIs',
      obrigatorio: true,
      peso: 15
    },
    {
      id: 4,
      item: 'Controle de validade de EPIs',
      descricao: 'Sistema de controle de validade e substituição de EPIs',
      obrigatorio: true,
      peso: 10
    }
  ],
  'NR-7': [
    {
      id: 1,
      item: 'PCMSO elaborado e implementado',
      descricao: 'Programa elaborado por médico do trabalho e implementado',
      obrigatorio: true,
      peso: 25
    },
    {
      id: 2,
      item: 'Exames médicos periódicos',
      descricao: 'Exames realizados conforme periodicidade estabelecida',
      obrigatorio: true,
      peso: 20
    },
    {
      id: 3,
      item: 'Controle de saúde dos trabalhadores',
      descricao: 'Acompanhamento da saúde dos trabalhadores expostos a riscos',
      obrigatorio: true,
      peso: 15
    }
  ],
  'NR-9': [
    {
      id: 1,
      item: 'PPRA elaborado e implementado',
      descricao: 'Programa elaborado por profissional habilitado e implementado',
      obrigatorio: true,
      peso: 30
    },
    {
      id: 2,
      item: 'Identificação de riscos ambientais',
      descricao: 'Riscos físicos, químicos e biológicos identificados e avaliados',
      obrigatorio: true,
      peso: 25
    },
    {
      id: 3,
      item: 'Medidas de controle implementadas',
      descricao: 'Medidas de controle coletivo e individual implementadas',
      obrigatorio: true,
      peso: 20
    },
    {
      id: 4,
      item: 'Revisão anual do PPRA',
      descricao: 'Programa revisado anualmente ou quando houver mudanças',
      obrigatorio: true,
      peso: 15
    }
  ]
};

// Função para obter NRs aplicáveis por CNAE
const getNrsByCnae = (cnae) => {
  const nrIds = cnaeNrs[cnae] || [];
  return nrs.filter(nr => nrIds.includes(nr.id));
};

// Função para obter checklist por NR
const getChecklistByNr = (nrCodigo) => {
  return checklists[nrCodigo] || [];
};

// Função para calcular conformidade
const calculateCompliance = (empresaId, cnae) => {
  const nrsAplicaveis = getNrsByCnae(cnae);
  let totalPontos = 0;
  let pontosObtidos = 0;
  
  nrsAplicaveis.forEach(nr => {
    const checklist = getChecklistByNr(nr.codigo);
    checklist.forEach(item => {
      totalPontos += item.peso;
      // Simular pontuação baseada em dados mock
      if (Math.random() > 0.3) { // 70% de chance de estar conforme
        pontosObtidos += item.peso;
      }
    });
  });
  
  const percentual = totalPontos > 0 ? (pontosObtidos / totalPontos) * 100 : 0;
  
  return {
    percentual: Math.round(percentual),
    pontosObtidos,
    totalPontos,
    status: percentual >= 90 ? 'em_dia' : percentual >= 70 ? 'atencao' : 'atrasado'
  };
};

module.exports = {
  nrs,
  cnaeNrs,
  checklists,
  getNrsByCnae,
  getChecklistByNr,
  calculateCompliance
};
