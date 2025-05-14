const { Events } = require('discord.js');
const schedule = require('node-schedule');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		await conectarMongo();
		// Agenda as cobranças para serem enviadas todos os dias às 10:00
		schedule.scheduleJob('0 10 * * *', async function() {
			try {
				// Aqui você pode adicionar a lógica para buscar os jogadores que devem ser cobrados
				// Por exemplo, de um banco de dados ou arquivo JSON
				
				// Exemplo de mensagem de cobrança
				const embed = {
					title: '⚠️ Lembrete de Farm',
					description: 'Você tem Farm pendente para hoje! Por favor, realize seu Farm e envie a prova usando o comando `/verificar-farm`.',
					color: 0xFF0000,
					timestamp: new Date()
				};

				// Aqui você pode adicionar a lógica para enviar a mensagem para os jogadores específicos
				// Por exemplo:
				// for (const player of playersToNotify) {
				//     const user = await client.users.fetch(player.id);
				//     await user.send({ embeds: [embed] });
				// }

			} catch (error) {
				console.error('Erro ao enviar cobranças:', error);
			}
		});
	},
};