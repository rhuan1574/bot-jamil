const mongoose = require('mongoose');

// Função que retorna a hora atual ajustada para o fuso de Brasília
function getBrasiliaDate() {
    const now = new Date();
    const brasiliaOffset = -3 * 60; // UTC-3 em minutos
    const localOffset = now.getTimezoneOffset();
    const offsetDiff = brasiliaOffset - localOffset;
    now.setMinutes(now.getMinutes() + offsetDiff);
    return now;
}

const playerSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    metGoal: { type: Boolean, default: false },
    lastChecked: { type: Date, default: getBrasiliaDate },
    plastico: { type: Number, default: 0 },
    seda: { type: Number, default: 0 },
    folha: { type: Number, default: 0 },
    cascaSemente: { type: Number, default: 0 },
    dinheiro: { type: Number, default: 0 },
    isencaoAte: { type: Date },
    lastReset: { type: Date },
});

module.exports = mongoose.model('Player', playerSchema);
