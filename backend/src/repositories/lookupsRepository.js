const empresasRepository = require('./empresasRepository');
const usersRepository = require('./usersRepository');

const getEmpresaNomeById = async (empresaId) => {
  if (!empresaId) return '';
  const empresa = await empresasRepository.findById(empresaId);
  return empresa?.nome || '';
};

const getUsuarioNomeById = async (usuarioId) => {
  if (!usuarioId) return '';
  const usuario = await usersRepository.findById(usuarioId);
  return usuario?.nome || '';
};

module.exports = {
  getEmpresaNomeById,
  getUsuarioNomeById
};
