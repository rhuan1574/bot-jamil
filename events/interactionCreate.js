const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, WebhookClient } = require('discord.js');
const Player = require('../database/models/Player');
const WebhookClientRegistro = new WebhookClient({ id: process.env.ID_WEBHOOK, token: process.env.TOKEN_WEBHOOK})

// Sistema de metas e controle diário
const metas = {
    cascaSemente: 120,
    folha: 120,
    seda: 120,
    plastico: 40
};

// Valor diário em dinheiro
const VALOR_DIARIO = 25000;

// Função para verificar isenção de cobrança
function isIsento(player) {
    if (!player || !player.isencaoAte) return false;
    return new Date() < new Date(player.isencaoAte);
}

// Função para processar comprovante de farm
const handleComprovanteFarm = async (msg, interaction, player, metas, deleteDelay = 60000) => {
    if (msg.attachments.size === 0) {
        await msg.channel.send({ content: "❌ Por favor, envie uma imagem como comprovante!" });
        return;
    }

    const attachment = msg.attachments.first();
    const embedMetaComprovante = new EmbedBuilder()
        .setTitle("🎉 Parabéns! Todas as metas foram atingidas!")
        .setDescription(`O membro <@${interaction.user.id}> atingiu todas as metas diárias! Os valores serão resetados à meia-noite.`)
        .addFields(
            { name: "🧪 Plástico", value: `${player.plastico}/${metas.plastico}` },
            { name: "📄 Seda", value: `${player.seda}/${metas.seda}` },
            { name: "🍃 Folha", value: `${player.folha}/${metas.folha}` },
            { name: "🌱 Casca de Semente", value: `${player.cascaSemente}/${metas.cascaSemente}` }
        )
        .setImage(`attachment://${attachment.name}`)
        .setColor("#00FF00")
        .setFooter({ text: `Gerado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    // Calcular isenção ao atingir todas as metas
    const agora = new Date();
    const isencaoAte = new Date(agora.getTime() + 24 * 60 * 60 * 1000); // 1 dia de isenção
    player.isencaoAte = isencaoAte;
    await player.save();

    const canalLogs = interaction.guild.channels.cache.find(channel => channel.name === "🔐・logs-farm");
    const canalNotificacao = interaction.guild.channels.cache.find(channel => channel.name === "📌・notificacoes-gerentes");
    await Promise.all([
        msg.channel.send({ content: "Imagem recebida com sucesso!", embeds: [embedMetaComprovante], files: [attachment] }),
        canalLogs?.send({ embeds: [embedMetaComprovante], files: [attachment] }),
        canalNotificacao?.send({ content: "<@&1370136458278604822>", embeds: [embedMetaComprovante], files: [attachment] })
    ]);

    setTimeout(() => msg.delete().catch(() => { }), deleteDelay);
};

// Função para processar pagamento em dinheiro
const handlePagamentoDinheiro = async (msg, interaction, valor, player) => {
    if (msg.attachments.size === 0) {
        await msg.channel.send({ content: "❌ Por favor, envie uma imagem como comprovante!" });
        return;
    }

    const attachment = msg.attachments.first();
    const userId = interaction.user.id;

    // Verificar se o valor é múltiplo de 16.000
    const diasPagos = Math.floor(valor / VALOR_DIARIO);
    if (valor % VALOR_DIARIO !== 0 || diasPagos === 0) {
        const embedErro = new EmbedBuilder()
            .setTitle("❌ Valor Inválido")
            .setDescription(`O valor pago (${valor}) não é um múltiplo de ${VALOR_DIARIO}. Por favor, envie o valor correto.`)
            .setColor("#FF0000");
        const canalNotificacao = interaction.guild.channels.cache.find(channel => channel.name === "notificacoes-gerentes");
        await Promise.all([
            msg.channel.send({ embeds: [embedErro] }),
            canalNotificacao?.send({ content: `<@&1370136458278604822> Usuário <@${userId}> enviou valor incorreto: ${valor}`, embeds: [embedErro] })
        ]);
        return;
    }

    // Calcular isenção
    const agora = new Date();
    const isencaoAte = new Date(agora.getTime() + diasPagos * 24 * 60 * 60 * 1000);
    player.dinheiro += valor;
    player.isencaoAte = isencaoAte;
    await player.save();

    // Embed de confirmação
    const embedConfirmacao = new EmbedBuilder()
        .setTitle("💵 Pagamento Confirmado")
        .setDescription(`O <@${interaction.user.id}> pagou ${valor} (equivalente a ${diasPagos} dia${diasPagos > 1 ? 's' : ''}). Ele está isento de cobranças até ${isencaoAte.toLocaleString()}.`)
        .setImage(`attachment://${attachment.name}`)
        .setColor("#00FF00")
        .setTimestamp();

    const canalLogs = interaction.guild.channels.cache.find(channel => channel.name === "logs-farm");
    const canalNotificacao = interaction.guild.channels.cache.find(channel => channel.name === "notificacoes-gerentes");
    await Promise.all([
        msg.channel.send({ embeds: [embedConfirmacao], files: [attachment] }),
        canalLogs?.send({ embeds: [embedConfirmacao], files: [attachment] }),
        canalNotificacao?.send({ embeds: [embedConfirmacao], files: [attachment] })
    ]);

    // Confirmação no canal original
    await interaction.editReply({ content: "✅ Pagamento registrado com sucesso!", embeds: [embedConfirmacao], files: [attachment] });
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
                        modalDinheiro.addComponents(new ActionRowBuilder().addComponents(inputValor));
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
                    case "registro":
                        const roleName = "┃Membros";
                        const member = interaction.member;
                        const role = member.roles.cache.find((r) => r.name === roleName);

                        if (role) {
                            if (!interaction.replied && !interaction.deferred) {
                                await interaction.reply({
                                    content: "Não foi possível se registrar, pois você já possui o cargo de Membro.",
                                    ephemeral: true,
                                });
                            }
                            return;
                        }

                        const modal = new ModalBuilder()
                            .setCustomId("modal-registro")
                            .setTitle("Registro do Usuário");

                        const inputsModal = [
                            {
                                id: "nome_prsn",
                                label: "Nome do personagem (iniciais em maiúscula):",
                            },
                            { id: "id_prsn", label: "ID do personagem:" },
                            {
                                id: "nome",
                                label: "Seu nome real (iniciais em maiúscula):",
                            },
                            {
                                id: "nome_indicacao",
                                label: "Nome de quem indicou (iniciais em maiúscula):",
                            },
                        ].map(({ id, label }) =>
                            new TextInputBuilder()
                                .setCustomId(id)
                                .setLabel(label)
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        );

                        modal.addComponents(
                            ...inputsModal.map((input) => new ActionRowBuilder().addComponents(input))
                        );

                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.showModal(modal);
                        }
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
            const { customId } = interaction;
            if (interaction.customId === "modal-farm") {
                try {
                    const userId = interaction.user.id;
                    const plastico = parseInt(interaction.fields.getTextInputValue("plastico")) || 0;
                    const seda = parseInt(interaction.fields.getTextInputValue("seda")) || 0;
                    const folha = parseInt(interaction.fields.getTextInputValue("folha")) || 0;
                    const cascaSemente = parseInt(interaction.fields.getTextInputValue("casca-de-semente")) || 0;

                    // Buscar ou criar o jogador no banco de dados
                    let player = await Player.findOne({ discordId: userId });
                    if (!player) {
                        player = new Player({
                            discordId: userId,
                            username: interaction.user.username
                        });
                    }

                    // Atualizar valores de farm
                    player.plastico += plastico;
                    player.seda += seda;
                    player.folha += folha;
                    player.cascaSemente += cascaSemente;
                    await player.save();

                    const progresso = {
                        plastico: (player.plastico / metas.plastico) * 100,
                        seda: (player.seda / metas.seda) * 100,
                        folha: (player.folha / metas.folha) * 100,
                        cascaSemente: (player.cascaSemente / metas.cascaSemente) * 100
                    };

                    const embedConfirmacao = new EmbedBuilder()
                        .setTitle("✅ Itens Registrados com Sucesso!")
                        .setDescription("Seus itens foram registrados no sistema.\n\n**Por favor, envie a imagem do comprovante em até 2 minutos respondendo esta mensagem no privado do bot.**")
                        .addFields(
                            { name: "🧪 Plástico", value: `${player.plastico}/${metas.plastico} (${progresso.plastico.toFixed(1)}%)`, inline: true },
                            { name: "📄 Seda", value: `${player.seda}/${metas.seda} (${progresso.seda.toFixed(1)}%)`, inline: true },
                            { name: "🍃 Folha", value: `${player.folha}/${metas.folha} (${progresso.folha.toFixed(1)}%)`, inline: true },
                            { name: "🌱 Casca de Semente", value: `${player.cascaSemente}/${metas.cascaSemente} (${progresso.cascaSemente.toFixed(1)}%)`, inline: true }
                        )
                        .setColor("#00FF00")
                        .setFooter({ text: "Sistema de Registro de Farms" })
                        .setTimestamp();

                    await interaction.reply({ embeds: [embedConfirmacao], ephemeral: true });

                    try {
                        const embedPrivado = new EmbedBuilder()
                            .setTitle("Envie seu comprovante")
                            .setDescription("Por favor, envie a imagem do comprovante respondendo esta mensagem. Você tem até 2 minutos.")
                            .setColor("#0099FF");
                        const dm = await interaction.user.createDM();
                        await dm.send({ embeds: [embedPrivado] });

                        const filter = m => m.author.id === userId && m.attachments.size > 0;
                        const collected = await dm.awaitMessages({ filter, max: 1, time: 2 * 60 * 1000, errors: ['time'] }).catch(() => null);

                        if (collected && collected.size > 0) {
                            const msg = collected.first();
                            const todasMetasAtingidas =
                                player.plastico >= metas.plastico &&
                                player.seda >= metas.seda &&
                                player.folha >= metas.folha &&
                                player.cascaSemente >= metas.cascaSemente;

                            if (todasMetasAtingidas) {
                                await handleComprovanteFarm(msg, interaction, player, metas, 60000);
                            } else {
                                const attachment = msg.attachments.first();
                                const embedComprovante = new EmbedBuilder()
                                    .setTitle("✅ Comprovante Recebido")
                                    .setDescription("Seu comprovante foi registrado com sucesso!")
                                    .setImage(`attachment://${attachment.name}`)
                                    .setColor("#00FF00")
                                    .setTimestamp();
                                await dm.send({ embeds: [embedComprovante], files: [attachment] });
                                setTimeout(() => msg.delete().catch(() => { }), 60000);
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
                try {
                    const userId = interaction.user.id;
                    const valor = parseInt(interaction.fields.getTextInputValue("valor-dinheiro")) || 0;

                    // Buscar ou criar o jogador no banco de dados
                    let player = await Player.findOne({ discordId: userId });
                    if (!player) {
                        player = new Player({
                            discordId: userId,
                            username: interaction.user.username
                        });
                    }

                    const embedPrivado = new EmbedBuilder()
                        .setTitle("Envie seu comprovante")
                        .setDescription("Por favor, envie a imagem do comprovante respondendo esta mensagem no privado. Você tem até 2 minutos.")
                        .setColor("#0099FF");

                    await interaction.reply({ content: "✅ Valor registrado! Envie a imagem do comprovante no privado.", ephemeral: true });

                    const dm = await interaction.user.createDM();
                    await dm.send({ embeds: [embedPrivado] });

                    const filter = m => m.author.id === userId && m.attachments.size > 0;
                    const collected = await dm.awaitMessages({ filter, max: 1, time: 2 * 60 * 1000, errors: ['time'] }).catch(() => null);

                    if (collected && collected.size > 0) {
                        const msg = collected.first();
                        await handlePagamentoDinheiro(msg, interaction, valor, player);
                        setTimeout(() => msg.delete().catch(() => { }), 60000);
                    } else {
                        await dm.send({ content: "⏰ Tempo esgotado! Você não enviou o comprovante a tempo. Por favor, repita o processo." });
                    }
                } catch (error) {
                    console.error('Erro ao processar modal de dinheiro:', error);
                    await interaction.reply({ content: "❌ Ocorreu um erro ao processar seu pagamento!", ephemeral: true });
                }
            }
            if (customId === "modal-registro") {
                await interaction.deferReply({ flags: 64 });

                const nomeRegistro = interaction.fields.getTextInputValue("nome_prsn");
                const idRegistro = interaction.fields.getTextInputValue("id_prsn");
                const nomeReal = interaction.fields.getTextInputValue("nome");
                const nomeIndicacao =
                    interaction.fields.getTextInputValue("nome_indicacao");
                const membro = interaction.guild.members.cache.get(interaction.user.id);

                if (!membro) {
                    return interaction.editReply({
                        content: "❌ Membro não encontrado no servidor.",
                    });
                }

                try {
                    await membro.setNickname(`${nomeRegistro} | ${idRegistro}`);
                } catch (error) {
                    console.error(error);
                    return interaction.editReply({
                        content:
                            "❌ Não foi possível alterar o apelido. Verifique minhas permissões.",
                    });
                }

                const cargo = interaction.guild.roles.cache.find(
                    (role) => role.name === "┃Membros"
                );

                if (cargo) {
                    try {
                        await membro.roles.add(cargo);
                    } catch (error) {
                        console.error(error);
                        return interaction.editReply({
                            content: "❌ Não foi possível atribuir o cargo.",
                        });
                    }
                }

                interaction.editReply({
                    content: `✅ O apelido foi atualizado para: ${nomeRegistro} | ${idRegistro} e recebeu o cargo de ┃Membros`,
                });

                const embed = new EmbedBuilder()
                    .setColor("#FF0000")
                    .setTitle("Novo Registro de Usuário")
                    .setImage(
                        "https://i.ibb.co/CBVRkXJ/BENNYS-TUNING-removebg-preview.png"
                    )
                    .addFields([
                        { name: "Nome do Personagem", value: nomeRegistro },
                        { name: "ID do Personagem", value: idRegistro },
                        { name: "Nome Real", value: nomeReal },
                        { name: "Nome de Indicação", value: nomeIndicacao },
                    ])
                    .setFooter({
                        text: `Registrado por ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    });

                WebhookClientRegistro.send({
                    content: `${membro} foi registrado!`,
                    embeds: [embed],
                });
            }
        }
    }
}