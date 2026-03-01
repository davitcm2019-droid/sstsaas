#!/usr/bin/env node
require('dotenv').config();

const { connectDb } = require('../db/mongo');
const riskSurveyRouter = require('../routes/riskSurvey');

const run = async () => {
  await connectDb();
  const internals = riskSurveyRouter.__internals;
  if (!internals?.runLegacyMigration) {
    throw new Error('Nao foi possivel localizar rotina de migracao de legado');
  }

  const result = await internals.runLegacyMigration({
    id: 'script',
    nome: 'migration-script',
    email: 'system@localhost',
    perfil: 'administrador'
  });

  // eslint-disable-next-line no-console
  console.log('Migracao concluida:', JSON.stringify(result, null, 2));
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Falha na migracao de legado:', error);
    process.exit(1);
  });
