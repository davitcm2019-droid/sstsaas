// In-memory stores (starts empty).
//
// Persistência real para esses domínios será implementada na Fase 15+ (PostgreSQL).
// Por enquanto, o objetivo é evitar dados fictícios/seed em produção.

const empresas = [];
const cipas = [];
const treinamentos = [];
const acoes = [];
const tarefas = [];
const riscos = [];
const alertas = [];

// Fallback local (apenas quando DATABASE_URL não está configurado).
const usuarios = [];

// Não usado atualmente (mantido para compatibilidade de exports)
const obrigacoes = [];

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

