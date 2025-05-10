const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// Sistema de metas e controle diário
const metas = {
	cascaSemente: 120,
	folha: 120,
	seda: 120,
	plastico: 40
};

// Armazenamento temporário dos valores diários
let depositosDiarios = new Map();

// Função para resetar os valores diários
function resetarValoresDiarios() {
	depositosDiarios.clear();
}

// Configurar reset diário (meia-noite)
setInterval(() => {
	const agora = new Date();
	if (agora.getHours() === 0 && agora.getMinutes() === 0) {
		resetarValoresDiarios();
	}
}, 60000); // Verifica a cada minuto

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
							.setStyle(ButtonStyle.Success)
							.setEmoji("📥");

						const row = new ActionRowBuilder()
							.addComponents(buttonFarm);

						await interaction.reply({ 
							embeds: [embedFarm],
							components: [row], 
							ephemeral: true 
						});
						break;

					case "info-farm":
						const modalFarm = new ModalBuilder()
							.setCustomId("modal-farm")
							.setTitle("📝 Registro de Itens do Farm");

						const input1 = new TextInputBuilder()
							.setCustomId("plastico")
							.setLabel("Quantidade de Plástico")
							.setPlaceholder("Digite a quantidade de plástico")
							.setStyle(TextInputStyle.Short)
							.setRequired(true);

						const input2 = new TextInputBuilder()
							.setCustomId("seda")
							.setLabel("Quantidade de Seda")
							.setPlaceholder("Digite a quantidade de seda")
							.setStyle(TextInputStyle.Short)
							.setRequired(true);

						const input3 = new TextInputBuilder()
							.setCustomId("folha")
							.setLabel("Quantidade de Folha")
							.setPlaceholder("Digite a quantidade de folha")
							.setStyle(TextInputStyle.Short)
							.setRequired(true);

						const input4 = new TextInputBuilder()
							.setCustomId("casca-de-semente")
							.setLabel("Quantidade de Casca de Semente")
							.setPlaceholder("Digite a quantidade de casca de semente")
							.setStyle(TextInputStyle.Short)
							.setRequired(true);

						const row1 = new ActionRowBuilder().addComponents(input1);
						const row2 = new ActionRowBuilder().addComponents(input2);
						const row3 = new ActionRowBuilder().addComponents(input3);
						const row4 = new ActionRowBuilder().addComponents(input4);

						modalFarm.addComponents(row1, row2, row3, row4);

						await interaction.showModal(modalFarm);
						break;

					default:
						await interaction.reply({ 
							content: "❌ Opção inválida!", 
							ephemeral: true 
						});
				}
			} catch (error) {
				console.error('Erro ao processar interação do botão:', error);
				await interaction.reply({ 
					content: "❌ Ocorreu um erro ao processar sua solicitação!", 
					ephemeral: true 
				});
			}
		}

		// Tratamento de modais
		if (interaction.isModalSubmit()) {
			if (interaction.customId === "modal-farm") {
				try {
					const userId = interaction.user.id;
					const plastico = parseInt(interaction.fields.getTextInputValue("plastico")) || 0;
					const seda = parseInt(interaction.fields.getTextInputValue("seda")) || 0;
					const folha = parseInt(interaction.fields.getTextInputValue("folha")) || 0;
					const cascaSemente = parseInt(interaction.fields.getTextInputValue("casca-de-semente")) || 0;

					// Atualizar ou inicializar valores diários
					const depositosAtuais = depositosDiarios.get(userId) || {
						plastico: 0,
						seda: 0,
						folha: 0,
						cascaSemente: 0
					};

					depositosAtuais.plastico += plastico;
					depositosAtuais.seda += seda;
					depositosAtuais.folha += folha;
					depositosAtuais.cascaSemente += cascaSemente;

					depositosDiarios.set(userId, depositosAtuais);

					// Calcular progresso
					const progresso = {
						plastico: (depositosAtuais.plastico / metas.plastico) * 100,
						seda: (depositosAtuais.seda / metas.seda) * 100,
						folha: (depositosAtuais.folha / metas.folha) * 100,
						cascaSemente: (depositosAtuais.cascaSemente / metas.cascaSemente) * 100
					};

					// Criar embed de confirmação com progresso
					const embedConfirmacao = new EmbedBuilder()
						.setTitle("✅ Itens Registrados com Sucesso!")
						.setDescription("Seus itens foram registrados no sistema.")
						.addFields(
							{ 
								name: "🧪 Plástico", 
								value: `${depositosAtuais.plastico}/${metas.plastico} (${progresso.plastico.toFixed(1)}%)`,
								inline: true 
							},
							{ 
								name: "📄 Seda", 
								value: `${depositosAtuais.seda}/${metas.seda} (${progresso.seda.toFixed(1)}%)`,
								inline: true 
							},
							{ 
								name: "🍃 Folha", 
								value: `${depositosAtuais.folha}/${metas.folha} (${progresso.folha.toFixed(1)}%)`,
								inline: true 
							},
							{ 
								name: "🌱 Casca de Semente", 
								value: `${depositosAtuais.cascaSemente}/${metas.cascaSemente} (${progresso.cascaSemente.toFixed(1)}%)`,
								inline: true 
							}
						)
						.setColor("#00FF00")
						.setFooter({ text: "Sistema de Registro de Farms" })
						.setTimestamp();

					// Verificar se todas as metas foram atingidas
					const todasMetasAtingidas = 
						depositosAtuais.plastico >= metas.plastico &&
						depositosAtuais.seda >= metas.seda &&
						depositosAtuais.folha >= metas.folha &&
						depositosAtuais.cascaSemente >= metas.cascaSemente;

					if (todasMetasAtingidas) {
						embedConfirmacao
							.setTitle("🎉 Parabéns! Todas as metas foram atingidas!")
							.setDescription("Você atingiu todas as metas diárias! Os valores serão resetados à meia-noite.");
					}

					await interaction.reply({ 
						embeds: [embedConfirmacao], 
						ephemeral: true 
					});

					// Enviar mensagem privada com o que falta
					if (!todasMetasAtingidas) {
						const embedFaltante = new EmbedBuilder()
							.setTitle("📊 Progresso das Metas")
							.setDescription("Ainda faltam itens para completar as metas diárias:")
							.addFields(
								{
									name: "🧪 Plástico",
									value: depositosAtuais.plastico >= metas.plastico 
										? "✅ Meta atingida!" 
										: `Faltam ${metas.plastico - depositosAtuais.plastico} unidades`,
									inline: true
								},
								{
									name: "📄 Seda",
									value: depositosAtuais.seda >= metas.seda 
										? "✅ Meta atingida!" 
										: `Faltam ${metas.seda - depositosAtuais.seda} unidades`,
									inline: true
								},
								{
									name: "🍃 Folha",
									value: depositosAtuais.folha >= metas.folha 
										? "✅ Meta atingida!" 
										: `Faltam ${metas.folha - depositosAtuais.folha} unidades`,
									inline: true
								},
								{
									name: "🌱 Casca de Semente",
									value: depositosAtuais.cascaSemente >= metas.cascaSemente 
										? "✅ Meta atingida!" 
										: `Faltam ${metas.cascaSemente - depositosAtuais.cascaSemente} unidades`,
									inline: true
								}
							)
							.setColor("#FFA500")
							.setFooter({ text: "Lembre-se: Os valores são resetados à meia-noite" })
							.setTimestamp();

						try {
							await interaction.user.send({ embeds: [embedFaltante] });
						} catch (error) {
							console.error('Erro ao enviar mensagem privada:', error);
							await interaction.followUp({ 
								content: "⚠️ Não foi possível enviar a mensagem privada. Verifique se você tem as mensagens diretas habilitadas.", 
								ephemeral: true 
							});
						}
					}

				} catch (error) {
					console.error('Erro ao processar modal:', error);
					await interaction.reply({ 
						content: "❌ Ocorreu um erro ao processar seus dados!", 
						ephemeral: true 
					});
				}
			}
		}
	},
};
