const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    metGoal: { type: Boolean, default: false },
    lastChecked: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Player', playerSchema);