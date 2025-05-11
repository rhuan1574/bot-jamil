const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// Sistema de metas e controle diário
const metas = {
    cascaSemente: 120,
    folha: 120,
    seda: 120,
    plastico: 40
};

// Valor diário em dinheiro
const VALOR_DIARIO = 16000;

// Armazenamento temporário dos valores diários e pagamentos
let depositosDiarios = new Map();

// Função para resetar os valores diários
function resetarValoresDiarios() {
    depositosDiarios.forEach((value, userId) => {
        // Mantém apenas informações de isenção de cobrança
        depositosDiarios.set(userId, {
            plastico: 0,
            seda: 0,
            folha: 0,
            cascaSemente: 0,
            comprovanteEnviado: false,
            linkComprovante: null,
            dinheiro: value.dinheiro || 0,
            isencaoAte: value.isencaoAte || null
        });
    });
}

// Configurar reset diário (meia-noite)
setInterval(() => {
    const agora = new Date();
    if (agora.getHours() === 0 && agora.getMinutes() === 0) {
        resetarValoresDiarios();
    }
}, 60000);

// Função para verificar isenção de cobrança
function isIsento(userId) {
    const dados = depositosDiarios.get(userId);
    if (!dados || !dados.isencaoAte) return false;
    return new Date() < new Date(dados.isencaoAte);
}

// Função para processar comprovante de farm
const handleComprovanteFarm = async (msg, interaction, depositosAtuais, metas, deleteDelay = 60000) => {
    let linkComprovante = msg.attachments.size > 0 ? msg.attachments.first().url : msg.content;
    const embedMetaComprovante = new EmbedBuilder()
        .setTitle("🎉 Parabéns! Todas as metas foram atingidas!")
        .setDescription("Você atingiu todas as metas diárias! Os valores serão resetados à meia-noite.")
        .addFields(
            { name: "🧪 Plástico", value: `${depositosAtuais.plastico}/${metas.plastico}` },
            { name: "📄 Seda", value: `${depositosAtuais.seda}/${metas.seda}` },
            { name: "🍃 Folha", value: `${depositosAtuais.folha}/${metas.folha}` },
            { name: "🌱 Casca de Semente", value: `${depositosAtuais.cascaSemente}/${metas.cascaSemente}` },
            { name: "📸 Comprovante", value: linkComprovante }
        )
        .setColor("#00FF00")
        .setFooter({ text: `Gerado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    const canalLogs = interaction.guild.channels.cache.find(channel => channel.name === "logs-farm");
    const canalNotificacao = interaction.guild.channels.cache.find(channel => channel.name === "notificacoes-gerentes");
    await Promise.all([
        msg.channel.send({ content: "Imagem/link recebido com sucesso!", embeds: [embedMetaComprovante] }),
        canalLogs?.send({ embeds: [embedMetaComprovante] }),
        canalNotificacao?.send({ content: "<@&1370136458278604822>", embeds: [embedMetaComprovante] })
    ]);

    setTimeout(() => msg.delete().catch(() => {}), deleteDelay);
};

// Função para processar pagamento em dinheiro
const handlePagamentoDinheiro = async (interaction, valor, linkComprovante) => {
    const userId = interaction.user.id;
    const depositosAtuais = depositosDiarios.get(userId) || {
        plastico: 0,
        seda: 0,
        folha: 0,
        cascaSemente: 0,
        comprovanteEnviado: false,
        linkComprovante: null,
        dinheiro: 0,
        isencaoAte: null
    };

    // Verificar se o valor é múltiplo de 16.000
    const diasPagos = Math.floor(valor / VALOR_DIARIO);
    if (valor % VALOR_DIARIO !== 0 || diasPagos === 0) {
        const embedErro = new EmbedBuilder()
            .setTitle("❌ Valor Inválido")
            .setDescription(`O valor pago (${valor}) não é um múltiplo de ${VALOR_DIARIO}. Por favor, envie o valor correto.`)
            .setColor("#FF0000");
        const canalNotificacao = interaction.guild.channels.cache.find(channel => channel.name === "notificacoes-gerentes");
        await Promise.all([
            interaction.reply({ embeds: [embedErro], ephemeral: true }),
            canalNotificacao?.send({ content: `<@&1370136458278604822> Usuário <@${userId}> enviou valor incorreto: ${valor}`, embeds: [embedErro] })
        ]);
        return;
    }

    // Calcular isenção
    const agora = new Date();
    const isencaoAte = new Date(agora.getTime() + diasPagos * 24 * 60 * 60 * 1000);
    depositosAtuais.dinheiro += valor;
    depositosAtuais.isencaoAte = isencaoAte;
    depositosDiarios.set(userId, depositosAtuais);

    // Embed de confirmação
    const embedConfirmacao = new EmbedBuilder()
        .setTitle("💵 Pagamento Confirmado")
        .setDescription(`Você pagou ${valor} (equivalente a ${diasPagos} dia${diasPagos > 1 ? 's' : ''}). Você está isento de cobranças até ${isencaoAte.toLocaleString()}.`)
        .addFields({ name: "📸 Comprovante", value: linkComprovante })
        .setColor("#00FF00")
        .setTimestamp();

    const canalLogs = interaction.guild.channels.cache.find(channel => channel.name === "logs-farm");
    const canalNotificacao = interaction.guild.channels.cache.find(channel => channel.name === "notificacoes-gerentes");
    await Promise.all([
        interaction.reply({ embeds: [embedConfirmacao], ephemeral: true }),
        canalLogs?.send({ embeds: [embedConfirmacao] }),
        canalNotificacao?.send({ content: `<@&1370136458278604822>`, embeds: [embedConfirmacao] })
    ]);
};

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
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
                const errorMessage = { content: '❌ Houve um erro ao executar este comando!', ephemeral: true };
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

        if (interaction.isButton()) {
            const { customId } = interaction;
            try {
                switch (customId) {
                    case "button-dinheiro":
                        const modalDinheiro = new ModalBuilder()
                            .setCustomId("modal-dinheiro")
                            .setTitle("💵 Pagamento em Dinheiro");
                        const inputValor = new TextInputBuilder()
                            .setCustomId("valor-dinheiro")
                            .setLabel("Valor do Pagamento")
                            .setPlaceholder(`Digite o valor (múltiplo de ${VALOR_DIARIO})`)
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true);
                        const inputComprovante = new TextInputBuilder()
                            .setCustomId("link-comprovante")
                            .setLabel("Link do Comprovante")
                            .setPlaceholder("Cole o link da imagem do comprovante")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true);
                        modalDinheiro.addComponents(
                            new ActionRowBuilder().addComponents(inputValor),
                            new ActionRowBuilder().addComponents(inputComprovante)
                        );
                        await interaction.showModal(modalDinheiro);
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
                        const rowFarm = new ActionRowBuilder().addComponents(buttonFarm);
                        await interaction.reply({ embeds: [embedFarm], components: [rowFarm], ephemeral: true });
                        break;

                    case "info-farm":
                        const modalFarm = new ModalBuilder()
                            .setCustomId("modal-farm")
                            .setTitle("📝 Registro de Itens do Farm");
                        const inputs = [
                            { id: "plastico", label: "Quantidade de Plástico", placeholder: "Digite a quantidade de plástico" },
                            { id: "seda", label: "Quantidade de Seda", placeholder: "Digite a quantidade de seda" },
                            { id: "folha", label: "Quantidade de Folha", placeholder: "Digite a quantidade de folha" },
                            { id: "casca-de-semente", label: "Quantidade de Casca de Semente", placeholder: "Digite a quantidade de casca de semente" }
                        ].map(input => new TextInputBuilder()
                            .setCustomId(input.id)
                            .setLabel(input.label)
                            .setPlaceholder(input.placeholder)
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                        );
                        modalFarm.addComponents(inputs.map(input => new ActionRowBuilder().addComponents(input)));
                        await interaction.showModal(modalFarm);
                        break;

                    default:
                        await interaction.reply({ content: "❌ Opção inválida!", ephemeral: true });
                }
            } catch (error) {
                console.error('Erro ao processar interação do botão:', error);
                await interaction.reply({ content: "❌ Ocorreu um erro ao processar sua solicitação!", ephemeral: true });
            }
        }

        if (interaction.isModalSubmit()) {
            if (interaction.customId === "modal-farm") {
                try {
                    const userId = interaction.user.id;
                    const plastico = parseInt(interaction.fields.getTextInputValue("plastico")) || 0;
                    const seda = parseInt(interaction.fields.getTextInputValue("seda")) || 0;
                    const folha = parseInt(interaction.fields.getTextInputValue("folha")) || 0;
                    const cascaSemente = parseInt(interaction.fields.getTextInputValue("casca-de-semente")) || 0;

                    const depositosAtuais = depositosDiarios.get(userId) || {
                        plastico: 0,
                        seda: 0,
                        folha: 0,
                        cascaSemente: 0,
                        comprovanteEnviado: false,
                        linkComprovante: null,
                        dinheiro: 0,
                        isencaoAte: null
                    };

                    depositosAtuais.plastico += plastico;
                    depositosAtuais.seda += seda;
                    depositosAtuais.folha += folha;
                    depositosAtuais.cascaSemente += cascaSemente;
                    depositosAtuais.comprovanteEnviado = false;
                    depositosAtuais.linkComprovante = null;
                    depositosDiarios.set(userId, depositosAtuais);

                    const progresso = {
                        plastico: (depositosAtuais.plastico / metas.plastico) * 100,
                        seda: (depositosAtuais.seda / metas.seda) * 100,
                        folha: (depositosAtuais.folha / metas.folha) * 100,
                        cascaSemente: (depositosAtuais.cascaSemente / metas.cascaSemente) * 100
                    };

                    const embedConfirmacao = new EmbedBuilder()
                        .setTitle("✅ Itens Registrados com Sucesso!")
                        .setDescription("Seus itens foram registrados no sistema.\n\n**Por favor, envie o comprovante (imagem ou link) em até 2 minutos respondendo esta mensagem no privado do bot.**")
                        .addFields(
                            { name: "🧪 Plástico", value: `${depositosAtuais.plastico}/${metas.plastico} (${progresso.plastico.toFixed(1)}%)`, inline: true },
                            { name: "📄 Seda", value: `${depositosAtuais.seda}/${metas.seda} (${progresso.seda.toFixed(1)}%)`, inline: true },
                            { name: "🍃 Folha", value: `${depositosAtuais.folha}/${metas.folha} (${progresso.folha.toFixed(1)}%)`, inline: true },
                            { name: "🌱 Casca de Semente", value: `${depositosAtuais.cascaSemente}/${metas.cascaSemente} (${progresso.cascaSemente.toFixed(1)}%)`, inline: true }
                        )
                        .setColor("#00FF00")
                        .setFooter({ text: "Sistema de Registro de Farms" })
                        .setTimestamp();

                    await interaction.reply({ embeds: [embedConfirmacao], ephemeral: true });

                    try {
                        const embedPrivado = new EmbedBuilder()
                            .setTitle("Envie seu comprovante")
                            .setDescription("Por favor, envie uma imagem ou link do comprovante respondendo esta mensagem. Você tem até 2 minutos.")
                            .setColor("#0099FF");
                        const dm = await interaction.user.createDM();
                        await dm.send({ embeds: [embedPrivado] });

                        const filter = m => m.author.id === userId && (m.attachments.size > 0 || m.content.match(/https?:\/\//));
                        const collected = await dm.awaitMessages({ filter, max: 1, time: 2 * 60 * 1000, errors: ['time'] }).catch(() => null);

                        if (collected && collected.size > 0) {
                            const msg = collected.first();
                            depositosAtuais.comprovanteEnviado = true;
                            depositosAtuais.linkComprovante = msg.attachments.size > 0 ? msg.attachments.first().url : msg.content;
                            depositosDiarios.set(userId, depositosAtuais);

                            const todasMetasAtingidas = 
                                depositosAtuais.plastico >= metas.plastico &&
                                depositosAtuais.seda >= metas.seda &&
                                depositosAtuais.folha >= metas.folha &&
                                depositosAtuais.cascaSemente >= metas.cascaSemente;

                            if (todasMetasAtingidas) {
                                await handleComprovanteFarm(msg, interaction, depositosAtuais, metas, 60000);
                            } else {
                                const embedComprovante = new EmbedBuilder()
                                    .setTitle("✅ Comprovante Recebido")
                                    .setDescription("Seu comprovante foi registrado com sucesso!")
                                    .addFields({ name: "📸 Comprovante", value: depositosAtuais.linkComprovante })
                                    .setColor("#00FF00")
                                    .setTimestamp();
                                await dm.send({ embeds: [embedComprovante] });
                                setTimeout(() => msg.delete().catch(() => {}), 60000);
                            }
                        } else {
                            await dm.send({ content: "⏰ Tempo esgotado! Você não enviou o comprovante a tempo. Por favor, repita o processo." });
                        }
                    } catch (err) {
                        await interaction.user.send({ content: "❌ Não foi possível abrir o privado. Ative suas DMs para enviar o comprovante." });
                    }
                } catch (error) {
                    console.error('Erro ao processar modal:', error);
                    await interaction.reply({ content: "❌ Ocorreu um erro ao processar seus dados!", ephemeral: true });
                }
            }

            if (interaction.customId === "modal-dinheiro") {
                const valor = parseInt(interaction.fields.getTextInputValue("valor-dinheiro")) || 0;
                const linkComprovante = interaction.fields.getTextInputValue("link-comprovante");
                await handlePagamentoDinheiro(interaction, valor, linkComprovante);
            }
        }
    },
};