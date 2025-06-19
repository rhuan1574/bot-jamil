const { Events } = require('discord.js');
const Player = require('../database/models/Player');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        if (member.user.bot) return;
        try {
            let player = await Player.findOne({ discordId: member.id });
            if (!player) {
                await Player.create({
                    discordId: member.id,
                    username: member.user.username
                });
                console.log(`Novo usuário registrado no banco: ${member.user.username} (${member.id})`);
            }
        } catch (error) {
            console.error('Erro ao registrar novo usuário no banco:', error);
        }
    },
}; 