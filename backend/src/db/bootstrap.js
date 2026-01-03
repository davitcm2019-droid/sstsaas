const { isDatabaseEnabled, withClient } = require('./index');
const { migrate } = require('./migrate');
const { hashPassword } = require('../middleware/auth');

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

const getInitialAdminSpec = () => {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const nome = process.env.INITIAL_ADMIN_NAME;

  const hasEmail = typeof email === 'string' && email.trim() !== '';
  const hasPassword = typeof password === 'string' && password.trim() !== '';

  if (!hasEmail && !hasPassword) return null;

  if (!hasEmail || !hasPassword) {
    throw new Error('To bootstrap an admin user set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD');
  }

  return {
    nome: typeof nome === 'string' && nome.trim() ? nome.trim() : 'Administrador',
    email: normalizeEmail(email),
    password
  };
};

const upsertInitialAdmin = async (client, adminSpec) => {
  const senhaHash = await hashPassword(adminSpec.password);

  await client.query(
    `
      INSERT INTO users (nome, email, senha_hash, perfil, status, data_cadastro)
      VALUES ($1, $2, $3, 'administrador', 'ativo', CURRENT_DATE)
      ON CONFLICT (email) DO UPDATE
        SET nome = EXCLUDED.nome,
            senha_hash = EXCLUDED.senha_hash,
            perfil = 'administrador',
            status = 'ativo',
            updated_at = NOW()
    `,
    [adminSpec.nome, adminSpec.email, senhaHash]
  );
};

const bootstrapDatabase = async () => {
  if (!isDatabaseEnabled()) {
    return { skipped: true };
  }

  await migrate();

  const initialAdmin = getInitialAdminSpec();
  if (!initialAdmin) {
    return { skipped: false, adminSeeded: false };
  }

  await withClient(async (client) => {
    await upsertInitialAdmin(client, initialAdmin);
  });

  return { skipped: false, adminSeeded: true };
};

module.exports = {
  bootstrapDatabase
};
