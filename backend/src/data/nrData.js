// Dados das Normas Regulamentadoras (NRs) e checklists por CNAE.
//
// Nesta fase o sistema inicia vazio (sem seeds/mocks) e esses dados serão
// persistidos/configurados no banco quando a camada de domínio for evoluída.

const nrs = [];

const cnaeNrs = {};

const checklists = {};

const getNrsByCnae = () => {
  return [];
};

const getChecklistByNr = () => {
  return [];
};

const calculateCompliance = () => {
  return {
    percentual: 0,
    pontosObtidos: 0,
    totalPontos: 0,
    status: 'atrasado'
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
