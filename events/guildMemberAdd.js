const { Events, EmbedBuilder } = require('discord.js');
const Player = require('../database/models/Player');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        if (member.user.bot) return;
        try {
            let player = await Player.findOne({ discordId: member.user.id });
            if (!player) {
                await Player.create({
                    discordId: member.user.id,
                    username: member.user.username
                });
                console.log(`Novo usuário registrado no banco: ${member.user.username} (${member.user.id})`);
            }
        } catch (error) {
            console.error('Erro ao registrar novo usuário no banco:', error);
        }

        try {
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Bem-vindo!')
                .setDescription(`Olá <@${member.user.id}>, bem-vindo ao servidor!`)
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp();

            const welcomeChannelId = '1386010443868541041';
            const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
            if (welcomeChannel) {
                await welcomeChannel.send({
                    content: `<@${member.user.id}> entrou no servidor!`,
                    embeds: [welcomeEmbed],
                    allowedMentions: { users: [member.user.id] }
                });
            } else {
                console.warn(`Canal de boas-vindas não encontrado: ${welcomeChannelId}`);
            }
        } catch (error) {
            console.error('Erro ao enviar mensagem de boas-vindas:', error);
        }
    },
}; 