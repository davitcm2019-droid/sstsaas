/*
  Reversible migration scaffold for structured risk survey module.
  Usage depends on your migration runner.
*/

const up = async (db) => {
  await db.collection('risksurveyenvironments').createIndex({ empresaId: 1, unidade: 1, setor: 1, nome: 1 });
  await db.collection('risksurveyactivities').createIndex({ environmentId: 1, nome: 1 });
  await db.collection('risksurveyitems').createIndex({ activityId: 1, categoriaAgente: 1 });
  await db.collection('riskmeasurements').createIndex({ riskItemId: 1, dataMedicao: -1 });
  await db.collection('risksurveysnapshots').createIndex({ environmentId: 1, createdAt: -1 });
};

const down = async (db) => {
  await db.collection('risksurveyenvironments').dropIndex({ empresaId: 1, unidade: 1, setor: 1, nome: 1 });
  await db.collection('risksurveyactivities').dropIndex({ environmentId: 1, nome: 1 });
  await db.collection('risksurveyitems').dropIndex({ activityId: 1, categoriaAgente: 1 });
  await db.collection('riskmeasurements').dropIndex({ riskItemId: 1, dataMedicao: -1 });
  await db.collection('risksurveysnapshots').dropIndex({ environmentId: 1, createdAt: -1 });
};

module.exports = {
  up,
  down
};
