const { Events } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`Comando ${interaction.commandName} não encontrado.`);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(`Erro ao executar o comando ${interaction.commandName}:`, error);
			
			const errorMessage = {
				content: '❌ Houve um erro ao executar este comando!',
				flags: 64
			};

			try {
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp(errorMessage);
				} else if (!interaction.acknowledged) {
					await interaction.reply(errorMessage);
				}
			} catch (err) {
				console.error('Erro ao enviar mensagem de erro:', err);
			}
		}
	},
};
