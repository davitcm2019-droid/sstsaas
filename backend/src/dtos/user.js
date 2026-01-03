const toUserDTO = (user) => {
  if (!user) return null;

  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    perfil: user.perfil,
    status: user.status,
    dataCadastro: user.dataCadastro,
    telefone: user.telefone,
    cargo: user.cargo,
    empresaId: user.empresaId
  };
};

module.exports = {
  toUserDTO
};

