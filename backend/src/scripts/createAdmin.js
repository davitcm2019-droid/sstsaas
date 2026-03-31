require('dotenv').config();

const { connectDb } = require('../db/mongo');
const usersRepository = require('../repositories/usersRepository');
const { hashPassword } = require('../middleware/auth');

const readArg = (flag) => {
  const index = process.argv.indexOf(flag);
  if (index === -1) return '';
  return String(process.argv[index + 1] || '').trim();
};

const readValue = (flag, envKey) => readArg(flag) || String(process.env[envKey] || '').trim();

const main = async () => {
  const nome = readValue('--nome', 'ADMIN_NOME');
  const email = readValue('--email', 'ADMIN_EMAIL').toLowerCase();
  const senha = readValue('--senha', 'ADMIN_SENHA');

  if (!nome || !email || !senha) {
    console.error('Uso: node src/scripts/createAdmin.js --nome "Admin" --email admin@empresa.com --senha "senha-forte"');
    process.exit(1);
  }

  if (senha.length < 8) {
    console.error('A senha do administrador deve ter pelo menos 8 caracteres.');
    process.exit(1);
  }

  await connectDb();

  const existingUser = await usersRepository.findByEmail(email);
  if (existingUser) {
    const updated = await usersRepository.updateUser(existingUser.id, {
      nome,
      perfil: 'administrador',
      status: 'ativo',
      senhaHash: await hashPassword(senha)
    });
    console.log(`Administrador atualizado: ${updated.email}`);
    process.exit(0);
  }

  const created = await usersRepository.createUser({
    nome,
    email,
    senhaHash: await hashPassword(senha),
    perfil: 'administrador',
    status: 'ativo'
  });

  console.log(`Administrador criado: ${created.email}`);
  process.exit(0);
};

void main().catch((error) => {
  console.error('Falha ao criar administrador:', error);
  process.exit(1);
});
