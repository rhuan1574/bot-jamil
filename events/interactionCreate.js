const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		// Tratamento de comandos slash
		if (interaction.isChatInputCommand()) {
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
					ephemeral: true
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
		}

		// Tratamento de botões
		if (interaction.isButton()) {
			const { customId } = interaction;

			try {
				switch (customId) {
					case "button-dinheiro":
						const embedDinheiro = new EmbedBuilder()
							.setTitle("💵 Pagamento em Dinheiro")
							.setDescription("Para pagamento em dinheiro, siga as instruções abaixo:")
							.addFields(
								{ name: "📋 Instruções", value: "1. Realize a transferência bancária\n2. Envie o comprovante\n3. Aguarde a confirmação" },
								{ name: "⏰ Prazo", value: "O pagamento deve ser realizado em até 24 horas" },
								{ name: "⚠️ Importante", value: "Mantenha o comprovante da transferência" }
							)
							.setColor("#00FF00")
							.setFooter({ text: "Sistema de Pagamento" })
							.setTimestamp();

						await interaction.reply({ embeds: [embedDinheiro], ephemeral: true });
						break;

					case "button-farm":
						const embedFarm = new EmbedBuilder()
							.setTitle("📦 Registro de Farm")
							.setDescription("Para registrar sua farm, preencha as informações abaixo:")
							.addFields(
								{ name: "🏠 Endereço", value: "Informe o endereço completo da farm" },
								{ name: "📱 Contato", value: "Telefone para contato" },
								{ name: "⏰ Horário", value: "Horário de funcionamento" }
							)
							.setColor("#0099FF")
							.setFooter({ text: "Sistema de Registro de Farms" })
							.setTimestamp();

							const buttonFarm = new ButtonBuilder()
							.setCustomId("info-farm")
							.setLabel("Depositar")
							.setStyle(ButtonStyle.Success);

							const row = new ActionRowBuilder().addComponents(buttonFarm)

						await interaction.reply({ embeds: [embedFarm],components: [row], ephemeral: true });
							
						break;

					default:
						await interaction.reply({ 
							content: "❌ Opção inválida!", 
							ephemeral: true 
						});
				}

				if(customId === "info-farm") {
					const modalFarm = new ModalBuilder()
							.setCustomId("modal-farm")
							.setTitle("Coloque os itens do farm")
							
							const input1 = new TextInputBuilder()
							.setCustomId("plastico")
							.setLabel("Plástico")
							.setStyle(TextInputStyle.Short)

							const input2 = new TextInputBuilder()
							.setCustomId("seda")
							.setLabel("Seda")
							.setStyle(TextInputStyle.Short)

							const input3 = new TextInputBuilder()
							.setCustomId("folha")
							.setLabel("Folha")
							.setStyle(TextInputStyle.Short)

							const input4 = new TextInputBuilder()
							.setCustomId("casca-de-semente")
							.setLabel("Casca de Semente")
							.setStyle(TextInputStyle.Short)

							const rowModal = new ActionRowBuilder().addComponents(input1,input2,input3,input4)

							modalFarm.addComponents(rowModal);
				}
			} catch (error) {
				console.error('Erro ao processar interação do botão:', error);
				await interaction.reply({ 
					content: "❌ Ocorreu um erro ao processar sua solicitação!", 
					ephemeral: true 
				});
			}
		}
	},
};
