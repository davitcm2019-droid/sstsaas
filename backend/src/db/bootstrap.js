const { isDatabaseEnabled, withClient } = require('./index');
const { migrate } = require('./migrate');
const { hashPassword } = require('../middleware/auth');

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

const demoUsers = [
  {
    nome: 'Administrador Sistema',
    email: 'admin@sst.com.br',
    perfil: 'administrador',
    envKey: 'DEMO_ADMIN_PASSWORD'
  },
  {
    nome: 'João Silva',
    email: 'joao.silva@sst.com.br',
    perfil: 'tecnico_seguranca',
    envKey: 'DEMO_TECH_1_PASSWORD'
  },
  {
    nome: 'Maria Santos',
    email: 'maria.santos@sst.com.br',
    perfil: 'tecnico_seguranca',
    envKey: 'DEMO_TECH_2_PASSWORD'
  },
  {
    nome: 'Carlos Oliveira',
    email: 'carlos.oliveira@sst.com.br',
    perfil: 'visualizador',
    envKey: 'DEMO_VIEWER_PASSWORD'
  }
];

const upsertDemoUser = async (client, spec) => {
  const password = process.env[spec.envKey];
  if (typeof password !== 'string' || password.trim() === '') return;

  const senhaHash = await hashPassword(password);

  await client.query(
    `
      INSERT INTO users (nome, email, senha_hash, perfil, status, data_cadastro)
      VALUES ($1, $2, $3, $4, 'ativo', CURRENT_DATE)
      ON CONFLICT (email) DO UPDATE
        SET nome = EXCLUDED.nome,
            senha_hash = EXCLUDED.senha_hash,
            perfil = EXCLUDED.perfil,
            status = 'ativo',
            updated_at = NOW()
    `,
    [spec.nome, normalizeEmail(spec.email), senhaHash, spec.perfil]
  );
};

const bootstrapDatabase = async () => {
  if (!isDatabaseEnabled()) {
    return { skipped: true };
  }

  await migrate();

  await withClient(async (client) => {
    for (const spec of demoUsers) {
      await upsertDemoUser(client, spec);
    }
  });

  return { skipped: false };
};

module.exports = {
  bootstrapDatabase
};
