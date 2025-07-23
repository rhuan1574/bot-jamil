const mongoose = require('mongoose');

async function conectarMongo() {
    try {
        const connection = await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado ao MongoDB com sucesso!');
        return connection;
    } catch (error) {
        console.error('❌ Erro ao conectar ao MongoDB:', error);
        throw error;
    }
}

module.exports = { conectarMongo };