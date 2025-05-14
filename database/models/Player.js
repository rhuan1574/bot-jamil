const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    metGoal: { type: Boolean, default: false },
    lastChecked: { type: Date, default: Date.now },
    plastico: { type: Number, default: 0 },
    seda: { type: Number, default: 0 },
    folha: { type: Number, default: 0 },
    cascaSemente: { type: Number, default: 0 },
    dinheiro: { type: Number, default: 0 },
    isencaoAte: { type: Date },
    lastReset: { type: Date },
    endereco: { type: String }, // Farm address
    contato: { type: String }, // Contact phone number
    horario: { type: String } // Operating hours
});

module.exports = mongoose.model('Player', playerSchema);