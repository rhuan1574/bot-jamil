const { Events } = require('discord.js');

module.exports = {
	name: Events.GuildMemberRemove,
	async execute(member) {
		if (member.user.bot) return;
		try {
			const channelId = '1386010443868541042';
			const channel = member.guild.channels.cache.get(channelId);
			if (channel) {
				await channel.send({ content: `<@${member.user.id}> saiu do servidor.`, allowedMentions: { users: [member.user.id] } });
			} else {
				console.warn(`Canal de despedida não encontrado: ${channelId}`);
			}
			console.log(`${member.user.tag} saiu do servidor.`);
		} catch (error) {
			console.error('Erro ao enviar mensagem de despedida:', error);
		}
	},
};


