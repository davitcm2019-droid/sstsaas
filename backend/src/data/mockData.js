// Mock data para a plataforma SST

const bcrypt = require('bcryptjs');

const empresas = [
  {
    id: 1,
    nome: "Indústria Metalúrgica ABC Ltda",
    cnpj: "12.345.678/0001-90",
    cnae: "2511-0/00",
    ramo: "Fabricação de estruturas metálicas",
    endereco: "Rua Industrial, 123 - São Paulo/SP",
    telefone: "(11) 99999-9999",
    email: "contato@metalurgicaabc.com.br",
    status: "ativo",
    conformidade: "em_dia",
    ultimaAuditoria: "2024-01-15",
    proximaAuditoria: "2024-07-15",
    pendencias: 2,
    alertas: 1,
    responsavel: "João Silva",
    dataCadastro: "2023-06-01"
  },
  {
    id: 2,
    nome: "Construtora XYZ S.A.",
    cnpj: "98.765.432/0001-10",
    cnae: "4120-4/00",
    ramo: "Construção de edifícios",
    endereco: "Av. Construtora, 456 - Rio de Janeiro/RJ",
    telefone: "(21) 88888-8888",
    email: "contato@construtoraxyz.com.br",
    status: "ativo",
    conformidade: "atrasado",
    ultimaAuditoria: "2023-11-20",
    proximaAuditoria: "2024-02-20",
    pendencias: 5,
    alertas: 3,
    responsavel: "Maria Santos",
    dataCadastro: "2023-03-15"
  },
  {
    id: 3,
    nome: "Farmacêutica DEF Ltda",
    cnpj: "11.222.333/0001-44",
    cnae: "2101-6/00",
    ramo: "Fabricação de medicamentos",
    endereco: "Rua Farmacêutica, 789 - Belo Horizonte/MG",
    telefone: "(31) 77777-7777",
    email: "contato@farmaceuticadef.com.br",
    status: "ativo",
    conformidade: "em_dia",
    ultimaAuditoria: "2024-02-01",
    proximaAuditoria: "2024-08-01",
    pendencias: 0,
    alertas: 0,
    responsavel: "Carlos Oliveira",
    dataCadastro: "2023-08-10"
  }
];

const cipas = [
  {
    id: 1,
    empresaId: 2,
    empresaNome: "Construtora XYZ S.A.",
    gestao: "2024/2025",
    dataInicio: "2024-01-01",
    dataFim: "2025-12-31",
    presidente: "Joao Silva",
    vicePresidente: "Maria Santos",
    secretario: "Pedro Costa",
    status: "ativa",
    membros: [
      { nome: "Ana Lima", cargo: "Membro", setor: "Producao" },
      { nome: "Carlos Oliveira", cargo: "Membro", setor: "Administrativo" }
    ],
    observacoes: "CIPA renovada para o ciclo atual."
  },
  {
    id: 2,
    empresaId: 1,
    empresaNome: "Industria Metalurgica ABC Ltda",
    gestao: "2023/2024",
    dataInicio: "2023-01-01",
    dataFim: "2024-12-31",
    presidente: "Roberto Alves",
    vicePresidente: "Fernanda Lima",
    secretario: "Lucas Pereira",
    status: "inativa",
    membros: [
      { nome: "Sandra Costa", cargo: "Membro", setor: "Qualidade" },
      { nome: "Marcos Silva", cargo: "Membro", setor: "Manutencao" }
    ],
    observacoes: "Gestao anterior finalizada aguardando nova eleicao."
  }
];

const treinamentos = [
  {
    id: 1,
    titulo: "Treinamento de Seguranca do Trabalho",
    descricao: "Capacitacao sobre procedimentos gerais de seguranca do trabalho.",
    empresaId: 2,
    empresaNome: "Construtora XYZ S.A.",
    tipo: "obrigatorio",
    duracao: 8,
    instrutor: "Joao Silva",
    dataInicio: "2024-02-15",
    dataFim: "2024-02-15",
    local: "Sala de Treinamentos - Sede",
    maxParticipantes: 20,
    participantes: 15,
    status: "agendado",
    observacoes: "Treinamento anual de integracao."
  },
  {
    id: 2,
    titulo: "Reciclagem de EPIs",
    descricao: "Revisao de uso e conservacao de equipamentos de protecao individual.",
    empresaId: 1,
    empresaNome: "Industria Metalurgica ABC Ltda",
    tipo: "reciclagem",
    duracao: 4,
    instrutor: "Maria Santos",
    dataInicio: "2024-03-05",
    dataFim: "2024-03-05",
    local: "Auditorio Principal",
    maxParticipantes: 30,
    participantes: 22,
    status: "em_andamento",
    observacoes: "Sessao focada em atualizacoes normativas."
  },
  {
    id: 3,
    titulo: "Primeiros Socorros",
    descricao: "Treinamento pratico de primeiros socorros para equipes operacionais.",
    empresaId: 2,
    empresaNome: "Construtora XYZ S.A.",
    tipo: "obrigatorio",
    duracao: 16,
    instrutor: "Pedro Costa",
    dataInicio: "2024-01-10",
    dataFim: "2024-01-11",
    local: "Centro de Treinamento",
    maxParticipantes: 15,
    participantes: 12,
    status: "concluido",
    observacoes: "Certificados emitidos para todos os participantes."
  }
];

const acoes = [
  {
    id: 1,
    titulo: "Implementacao de EPIs para soldadores",
    descricao: "Aquisição e distribuicao de EPIs adequados para a equipe de solda.",
    empresaId: 2,
    empresaNome: "Construtora XYZ S.A.",
    responsavelId: 2,
    responsavelNome: "Maria Santos",
    tipo: "preventiva",
    prioridade: "alta",
    status: "em_andamento",
    dataInicio: "2024-02-01",
    dataFim: "2024-02-28",
    custo: 5000,
    observacoes: "Monitorar adesao ao uso correto dos EPIs."
  },
  {
    id: 2,
    titulo: "Correcao de guarda-corpos",
    descricao: "Reparo e adequacao de guarda-corpos nos andares superiores.",
    empresaId: 1,
    empresaNome: "Industria Metalurgica ABC Ltda",
    responsavelId: 3,
    responsavelNome: "Carlos Oliveira",
    tipo: "corretiva",
    prioridade: "critica",
    status: "pendente",
    dataInicio: "2024-02-15",
    dataFim: "2024-03-15",
    custo: 2500,
    observacoes: "Prioridade maxima devido a risco de queda."
  },
  {
    id: 3,
    titulo: "Treinamento de segurança operacional",
    descricao: "Treinamento focado em procedimentos seguros para operacoes de maquinas.",
    empresaId: 2,
    empresaNome: "Construtora XYZ S.A.",
    responsavelId: 4,
    responsavelNome: "Pedro Costa",
    tipo: "treinamento",
    prioridade: "media",
    status: "concluida",
    dataInicio: "2024-01-10",
    dataFim: "2024-01-15",
    custo: 1200,
    observacoes: "Reaplicar no proximo semestre."
  }
];

const tarefas = [
  {
    id: 1,
    titulo: "Renovar certificado de EPI",
    descricao: "Verificar e renovar certificados de EPIs vencidos",
    empresaId: 1,
    empresaNome: "Indústria Metalúrgica ABC Ltda",
    prioridade: "alta",
    status: "pendente",
    dataVencimento: "2024-03-15",
    responsavel: "João Silva",
    dataCriacao: "2024-02-01",
    categoria: "EPI"
  },
  {
    id: 2,
    titulo: "Realizar treinamento de CIPA",
    descricao: "Conduzir treinamento anual da CIPA",
    empresaId: 2,
    empresaNome: "Construtora XYZ S.A.",
    prioridade: "media",
    status: "em_andamento",
    dataVencimento: "2024-04-20",
    responsavel: "Maria Santos",
    dataCriacao: "2024-01-15",
    categoria: "Treinamento"
  },
  {
    id: 3,
    titulo: "Atualizar PGR",
    descricao: "Revisar e atualizar Programa de Gerenciamento de Riscos",
    empresaId: 1,
    empresaNome: "Indústria Metalúrgica ABC Ltda",
    prioridade: "alta",
    status: "concluido",
    dataVencimento: "2024-01-30",
    responsavel: "João Silva",
    dataCriacao: "2023-12-01",
    categoria: "PGR"
  }
];

const riscos = [
  {
    id: 1,
    empresaId: 1,
    empresaNome: "Indústria Metalúrgica ABC Ltda",
    tipo: "Físico",
    descricao: "Ruído excessivo na área de solda",
    classificacao: "alto",
    probabilidade: "alta",
    consequencia: "alta",
    medidasPreventivas: "Uso de EPI auditivo, isolamento acústico",
    status: "ativo",
    dataIdentificacao: "2024-01-10",
    responsavel: "João Silva"
  },
  {
    id: 2,
    empresaId: 2,
    empresaNome: "Construtora XYZ S.A.",
    tipo: "Químico",
    descricao: "Exposição a poeira de cimento",
    classificacao: "medio",
    probabilidade: "media",
    consequencia: "media",
    medidasPreventivas: "Uso de máscara P2, ventilação local exaustora",
    status: "ativo",
    dataIdentificacao: "2024-01-15",
    responsavel: "Maria Santos"
  }
];

const usuarios = [
  {
    id: 1,
    nome: "Administrador Sistema",
    email: "admin@sst.com.br",
    senha: process.env.DEMO_ADMIN_PASSWORD, // configurado via env
    perfil: "administrador",
    status: "ativo",
    dataCadastro: "2023-01-01"
  },
  {
    id: 2,
    nome: "João Silva",
    email: "joao.silva@sst.com.br",
    senha: process.env.DEMO_TECH_1_PASSWORD, // configurado via env
    perfil: "tecnico_seguranca",
    status: "ativo",
    dataCadastro: "2023-02-15"
  },
  {
    id: 3,
    nome: "Maria Santos",
    email: "maria.santos@sst.com.br",
    senha: process.env.DEMO_TECH_2_PASSWORD, // configurado via env
    perfil: "tecnico_seguranca",
    status: "ativo",
    dataCadastro: "2023-03-01"
  },
  {
    id: 4,
    nome: "Carlos Oliveira",
    email: "carlos.oliveira@sst.com.br",
    senha: process.env.DEMO_VIEWER_PASSWORD, // configurado via env
    perfil: "visualizador",
    status: "ativo",
    dataCadastro: "2023-04-01"
  }
];

const bcryptSaltRounds = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

const ensurePasswordHash = (user) => {
  if (!user || typeof user.senha !== 'string') return;
  if (user.senha.startsWith('$2a$') || user.senha.startsWith('$2b$') || user.senha.startsWith('$2y$')) return;
  user.senha = bcrypt.hashSync(user.senha, bcryptSaltRounds);
};

usuarios.forEach(ensurePasswordHash);

const obrigacoes = [
  {
    id: 1,
    cnae: "2511-0/00",
    descricao: "EPI - Capacete de segurança",
    tipo: "EPI",
    obrigatorio: true,
    frequencia: "anual"
  },
  {
    id: 2,
    cnae: "2511-0/00",
    descricao: "EPI - Luvas de proteção",
    tipo: "EPI",
    obrigatorio: true,
    frequencia: "anual"
  },
  {
    id: 3,
    cnae: "4120-4/00",
    descricao: "Treinamento de altura",
    tipo: "Treinamento",
    obrigatorio: true,
    frequencia: "anual"
  },
  {
    id: 4,
    cnae: "2101-6/00",
    descricao: "PPRA - Programa de Prevenção de Riscos Ambientais",
    tipo: "Programa",
    obrigatorio: true,
    frequencia: "anual"
  }
];

const alertas = [
  {
    id: 1,
    empresaId: 1,
    empresaNome: "Indústria Metalúrgica ABC Ltda",
    tipo: "vencimento",
    titulo: "Certificado de EPI vence em 30 dias",
    descricao: "Certificado de capacete de segurança vence em 15/03/2024",
    prioridade: "alta",
    status: "ativo",
    dataCriacao: "2024-02-14"
  },
  {
    id: 2,
    empresaId: 2,
    empresaNome: "Construtora XYZ S.A.",
    tipo: "conformidade",
    titulo: "PGR em atraso",
    descricao: "Programa de Gerenciamento de Riscos não foi atualizado há 6 meses",
    prioridade: "alta",
    status: "ativo",
    dataCriacao: "2024-01-20"
  }
];

module.exports = {
  empresas,
  cipas,
  treinamentos,
  acoes,
  tarefas,
  riscos,
  usuarios,
  obrigacoes,
  alertas
};
