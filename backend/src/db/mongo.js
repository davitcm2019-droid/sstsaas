const mongoose = require('mongoose');
const { config } = require('../config');

const connectDb = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    await mongoose.connect(config.database.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: config.database.ssl
    });

    return mongoose.connection;
  } catch (error) {
    console.error('Falha ao conectar no MongoDB:', error);
    throw error;
  }
};

module.exports = {
  connectDb
};
