/*
  Reversible index migration for hierarchy upgrade:
  Empresa > Unidade > Setor > Ambiente > Cargo > Atividade > Risco
*/

const up = async (db) => {
  await db.collection('risksurveycargos').createIndex({ environmentId: 1, nome: 1 }, { unique: true });
  await db.collection('risklibraries').createIndex({ tipo: 1, titulo: 1 }, { unique: true });
  await db.collection('measurementdevices').createIndex({ serialNumber: 1 }, { unique: true });
  await db.collection('risksurveyitems').createIndex({ activityId: 1, riskType: 1 });
  await db.collection('riskassessments').createIndex({ activityId: 1 });
  await db.collection('riskmeasurements').createIndex({ deviceId: 1 });
};

const down = async (db) => {
  await db.collection('risksurveycargos').dropIndex({ environmentId: 1, nome: 1 });
  await db.collection('risklibraries').dropIndex({ tipo: 1, titulo: 1 });
  await db.collection('measurementdevices').dropIndex({ serialNumber: 1 });
  await db.collection('risksurveyitems').dropIndex({ activityId: 1, riskType: 1 });
  await db.collection('riskassessments').dropIndex({ activityId: 1 });
  await db.collection('riskmeasurements').dropIndex({ deviceId: 1 });
};

module.exports = {
  up,
  down
};
