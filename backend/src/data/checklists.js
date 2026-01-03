// Sistema de checklists interativos para inspeções

const inspectionChecklists = [
  {
    id: 1,
    name: 'Checklist de Segurança Geral',
    description: 'Verificação geral de condições de segurança no ambiente de trabalho',
    category: 'geral',
    version: '1.0',
    active: true,
    items: [
      {
        id: 1,
        question: 'Os extintores estão em localização adequada e sinalizados?',
        type: 'boolean',
        required: true,
        weight: 10,
        options: [
          { value: true, label: 'Sim', score: 10 },
          { value: false, label: 'Não', score: 0 }
        ],
        observations: 'Verificar se estão acessíveis e com sinalização visível'
      },
      {
        id: 2,
        question: 'As saídas de emergência estão desobstruídas?',
        type: 'boolean',
        required: true,
        weight: 15,
        options: [
          { value: true, label: 'Sim', score: 15 },
          { value: false, label: 'Não', score: 0 }
        ],
        observations: 'Verificar se não há obstáculos nas rotas de fuga'
      },
      {
        id: 3,
        question: 'A iluminação está adequada?',
        type: 'scale',
        required: true,
        weight: 8,
        options: [
          { value: 1, label: 'Muito inadequada', score: 0 },
          { value: 2, label: 'Inadequada', score: 2 },
          { value: 3, label: 'Regular', score: 5 },
          { value: 4, label: 'Adequada', score: 8 },
          { value: 5, label: 'Muito adequada', score: 10 }
        ],
        observations: 'Verificar iluminação natural e artificial'
      },
      {
        id: 4,
        question: 'Os equipamentos de proteção coletiva estão funcionando?',
        type: 'boolean',
        required: true,
        weight: 20,
        options: [
          { value: true, label: 'Sim', score: 20 },
          { value: false, label: 'Não', score: 0 }
        ],
        observations: 'Verificar ventilação, exaustão, guardas de proteção'
      }
    ]
  },
  {
    id: 2,
    name: 'Checklist de EPIs',
    description: 'Verificação do uso correto e disponibilidade de EPIs',
    category: 'epi',
    version: '1.0',
    active: true,
    items: [
      {
        id: 1,
        question: 'Os trabalhadores estão usando os EPIs obrigatórios?',
        type: 'boolean',
        required: true,
        weight: 25,
        options: [
          { value: true, label: 'Sim', score: 25 },
          { value: false, label: 'Não', score: 0 }
        ],
        observations: 'Verificar se todos os trabalhadores estão usando os EPIs corretos'
      },
      {
        id: 2,
        question: 'Os EPIs estão em bom estado de conservação?',
        type: 'boolean',
        required: true,
        weight: 15,
        options: [
          { value: true, label: 'Sim', score: 15 },
          { value: false, label: 'Não', score: 0 }
        ],
        observations: 'Verificar integridade, limpeza e validade'
      },
      {
        id: 3,
        question: 'Os EPIs estão armazenados adequadamente?',
        type: 'boolean',
        required: true,
        weight: 10,
        options: [
          { value: true, label: 'Sim', score: 10 },
          { value: false, label: 'Não', score: 0 }
        ],
        observations: 'Verificar local limpo, seco e organizado'
      }
    ]
  },
  {
    id: 3,
    name: 'Checklist de Máquinas e Equipamentos',
    description: 'Verificação de segurança em máquinas e equipamentos (NR-12)',
    category: 'maquinas',
    version: '1.0',
    active: true,
    items: [
      {
        id: 1,
        question: 'As guardas de proteção estão instaladas e funcionando?',
        type: 'boolean',
        required: true,
        weight: 30,
        options: [
          { value: true, label: 'Sim', score: 30 },
          { value: false, label: 'Não', score: 0 }
        ],
        observations: 'Verificar se todas as partes móveis estão protegidas'
      },
      {
        id: 2,
        question: 'Os dispositivos de parada de emergência estão funcionando?',
        type: 'boolean',
        required: true,
        weight: 25,
        options: [
          { value: true, label: 'Sim', score: 25 },
          { value: false, label: 'Não', score: 0 }
        ],
        observations: 'Testar botões de parada de emergência'
      },
      {
        id: 3,
        question: 'Os trabalhadores foram treinados para operar as máquinas?',
        type: 'boolean',
        required: true,
        weight: 20,
        options: [
          { value: true, label: 'Sim', score: 20 },
          { value: false, label: 'Não', score: 0 }
        ],
        observations: 'Verificar certificados de treinamento'
      }
    ]
  }
];

// Inspeções realizadas
const inspections = [
  {
    id: 1,
    checklistId: 1,
    empresaId: 1,
    empresaNome: 'Indústria Metalúrgica ABC Ltda',
    inspectorId: 2,
    inspectorName: 'João Silva',
    date: '2024-03-10T09:00:00Z',
    status: 'completed',
    score: 85,
    maxScore: 100,
    observations: 'Inspeção geral realizada, alguns pontos de melhoria identificados',
    items: [
      {
        itemId: 1,
        answer: true,
        score: 10,
        observations: 'Extintores em boas condições'
      },
      {
        itemId: 2,
        answer: true,
        score: 15,
        observations: 'Saídas desobstruídas'
      },
      {
        itemId: 3,
        answer: 4,
        score: 8,
        observations: 'Iluminação adequada, mas pode melhorar'
      },
      {
        itemId: 4,
        answer: true,
        score: 20,
        observations: 'EPCs funcionando corretamente'
      }
    ]
  },
  {
    id: 2,
    checklistId: 2,
    empresaId: 2,
    empresaNome: 'Construtora XYZ S.A.',
    inspectorId: 3,
    inspectorName: 'Maria Santos',
    date: '2024-03-08T14:00:00Z',
    status: 'completed',
    score: 40,
    maxScore: 50,
    observations: 'Uso inadequado de EPIs identificado, treinamento necessário',
    items: [
      {
        itemId: 1,
        answer: false,
        score: 0,
        observations: 'Alguns trabalhadores não usando capacetes'
      },
      {
        itemId: 2,
        answer: true,
        score: 15,
        observations: 'EPIs em bom estado'
      },
      {
        itemId: 3,
        answer: true,
        score: 10,
        observations: 'Armazenamento adequado'
      }
    ]
  }
];

// Função para calcular pontuação
const calculateScore = (items) => {
  let totalScore = 0;
  let maxScore = 0;
  
  items.forEach(item => {
    const checklistItem = inspectionChecklists
      .flatMap(checklist => checklist.items)
      .find(ci => ci.id === item.itemId);
    
    if (checklistItem) {
      maxScore += checklistItem.weight;
      totalScore += item.score || 0;
    }
  });
  
  return {
    score: totalScore,
    maxScore,
    percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
  };
};

// Função para criar inspeção
const createInspection = (inspectionData) => {
  const newInspection = {
    id: inspections.length + 1,
    date: new Date().toISOString(),
    status: 'in_progress',
    ...inspectionData
  };
  
  // Calcular pontuação
  const scoreData = calculateScore(inspectionData.items || []);
  newInspection.score = scoreData.score;
  newInspection.maxScore = scoreData.maxScore;
  
  inspections.push(newInspection);
  return newInspection;
};

// Função para buscar inspeções por empresa
const getInspectionsByEmpresa = (empresaId) => {
  return inspections.filter(inspection => 
    inspection.empresaId === parseInt(empresaId)
  ).sort((a, b) => new Date(b.date) - new Date(a.date));
};

// Função para buscar inspeções por inspetor
const getInspectionsByInspector = (inspectorId) => {
  return inspections.filter(inspection => 
    inspection.inspectorId === parseInt(inspectorId)
  ).sort((a, b) => new Date(b.date) - new Date(a.date));
};

module.exports = {
  inspectionChecklists,
  inspections,
  calculateScore,
  createInspection,
  getInspectionsByEmpresa,
  getInspectionsByInspector
};
