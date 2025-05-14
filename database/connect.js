// database/connect.js
const mongoose = require('mongoose');

async function conectarMongo() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Conectado ao MongoDB');
  } catch (err) {
    console.error('❌ Erro ao conectar ao MongoDB:', err);
  }
}

module.exports = conectarMongo;
