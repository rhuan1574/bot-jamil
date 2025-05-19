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
        canalNotificacao?.send({ content: "<@&1292671789222334514>", embeds: [embedMetaComprovante], files: [attachment] })
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
    player.lastChecked = new Date();
    await player.save();

    // Embed de confirmação
    const embedConfirmacao = new EmbedBuilder()
        .setTitle("💵 Pagamento Confirmado")
        .setDescription(`O <@${interaction.user.id}> pagou ${valor} (equivalente a ${diasPagos} dia${diasPagos > 1 ? 's' : ''}). Ele está isento de cobranças até ${isencaoAte.toLocaleString()}.`)
        .setImage(`attachment://${attachment.name}`)
        .setColor("#00FF00")
        .setTimestamp();

    const canalLogs = interaction.guild.channels.cache.find(channel => channel.name === "🔐・logs-farm");
    const canalNotificacao = interaction.guild.channels.cache.find(channel => channel.name === "📌・notificacoes-gerentes");
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
            try {
                switch (customId) {
                    case "modal-dinheiro":
                        const valorDinheiro = parseInt(interaction.fields.getTextInputValue("valor-dinheiro"));
                        if (isNaN(valorDinheiro)) {
                            await interaction.reply({ content: "❌ Valor inválido! Por favor, digite um número.", ephemeral: true });
                            return;
                        }
                        const playerDinheiro = await Player.findOne({ discordId: interaction.user.id });
                        if (!playerDinheiro) {
                            await interaction.reply({ content: 'Jogador não encontrado!', ephemeral: true });
                            return;
                        }

                        // **Adicionar lógica para solicitar comprovante por DM para pagamento em dinheiro**
                        try {
                            await interaction.reply({ content: "✅ Valor registrado! Por favor, envie a imagem do comprovante no privado do bot.", ephemeral: true }); // Confirmação inicial

                            const embedPrivado = new EmbedBuilder()
                                .setTitle("Envie seu comprovante de Pagamento")
                                .setDescription("Por favor, envie a imagem do comprovante respondendo esta mensagem no privado. Você tem até 2 minutos.")
                                .setColor("#0099FF");
                                
                            const dm = await interaction.user.createDM();
                            await dm.send({ embeds: [embedPrivado] });

                            const filter = m => m.author.id === interaction.user.id && m.attachments.size > 0;
                            const collected = await dm.awaitMessages({ filter, max: 1, time: 2 * 60 * 1000, errors: ['time'] }).catch(() => null);

                            if (collected && collected.size > 0) {
                                const msg = collected.first();
                                // Chama handlePagamentoDinheiro com o objeto da mensagem recebida
                                await handlePagamentoDinheiro(msg, interaction, valorDinheiro, playerDinheiro); 
                                setTimeout(() => msg.delete().catch(() => { }), 60000); // Apaga a mensagem do comprovante após 1 minuto

                            } else {
                                await dm.send({ content: "⏰ Tempo esgotado! Você não enviou o comprovante a tempo. Por favor, repita o processo de pagamento." });
                            }

                        } catch (err) {
                            console.error('Erro ao solicitar/processar comprovante de pagamento por DM:', err);
                            await interaction.user.send({ content: "❌ Não foi possível solicitar o comprovante por DM. Por favor, certifique-se de que suas Mensagens Diretas estão abertas para este servidor." }).catch(() => {}); // Adiciona catch
                        }

                        break;
                    case "modal-farm":
                        const plastico = parseInt(interaction.fields.getTextInputValue("plastico"));
                        const seda = parseInt(interaction.fields.getTextInputValue("seda"));
                        const folha = parseInt(interaction.fields.getTextInputValue("folha"));
                        const cascaSemente = parseInt(interaction.fields.getTextInputValue("casca-de-semente"));

                        if (isNaN(plastico) || isNaN(seda) || isNaN(folha) || isNaN(cascaSemente)) {
                            await interaction.reply({ content: "❌ Valores inválidos! Por favor, digite números para todas as quantidades.", ephemeral: true });
                            return;
                        }

                        const playerFarm = await Player.findOne({ discordId: interaction.user.id });

                        if (!playerFarm) {
                            await interaction.reply({ content: 'Jogador não encontrado!', ephemeral: true });
                            return;
                        }

                        // Atualiza os recursos do jogador
                        playerFarm.plastico += plastico;
                        playerFarm.seda += seda;
                        playerFarm.folha += folha;
                        playerFarm.cascaSemente += cascaSemente;

                        // **Lógica para verificar e atualizar a meta de farm**
                        playerFarm.metGoal = 
                            playerFarm.plastico >= metas.plastico &&
                            playerFarm.seda >= metas.seda &&
                            playerFarm.folha >= metas.folha &&
                            playerFarm.cascaSemente >= metas.cascaSemente;

                        playerFarm.lastChecked = new Date(); // Atualiza a última verificação

                        console.log(`[DEBUG] ${playerFarm.username} - lastChecked definido para: ${playerFarm.lastChecked}`); // Log para depuração

                        await playerFarm.save();

                        // Envia a mensagem de confirmação com os recursos totais (ephemeral)
                        const embedConfirmacaoFarm = new EmbedBuilder()
                            .setTitle("📦 Farm Registrado com Sucesso!")
                            .setDescription(
                                `Seu farm foi registrado. Seus totais agora são:\n\n` +
                                `🧪 Plástico: ${playerFarm.plastico}\n` +
                                `📄 Seda: ${playerFarm.seda}\n` +
                                `🌿 Folha: ${playerFarm.folha}\n` +
                                `🌱 Casca/Semente: ${playerFarm.cascaSemente}\n\n` +
                                `Status da Meta: ${playerFarm.metGoal ? '✅ Meta atingida' : '❌ Meta não atingida'}`
                            )
                            .setColor(playerFarm.metGoal ? 0x00FF00 : 0xFF0000)
                            .setTimestamp();

                        await interaction.reply({ embeds: [embedConfirmacaoFarm], ephemeral: true });

                        // **Adicionar lógica para solicitar comprovante por DM**
                        try {
                            const embedPrivado = new EmbedBuilder()
                                .setTitle("Envie seu comprovante")
                                .setDescription("Por favor, envie a imagem do comprovante respondendo esta mensagem. Você tem até 2 minutos.")
                                .setColor("#0099FF");
                            
                            const dm = await interaction.user.createDM();
                            const message = await dm.send({ embeds: [embedPrivado] }); // Envia a mensagem e guarda a referência

                            const filter = m => m.author.id === interaction.user.id && m.attachments.size > 0;
                            const collected = await dm.awaitMessages({ filter, max: 1, time: 2 * 60 * 1000, errors: ['time'] }).catch(() => null);

                            if (collected && collected.size > 0) {
                                const msg = collected.first();
                                const attachment = msg.attachments.first();
                                
                                // Envia o comprovante para os canais de log/notificação, independentemente da meta ter sido atingida ou não
                                const embedComprovanteLog = new EmbedBuilder()
                                    .setTitle("📸 Comprovante Recebido")
                                    .setDescription(`Comprovante de farm de ${interaction.user.username}`)
                                    .setImage(`attachment://${attachment.name}`)
                                    .setColor("#0099FF")
                                    .setFooter({ text: `Enviado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                                    .setTimestamp();

                                const canalLogs = interaction.guild.channels.cache.find(channel => channel.name === "🔐・logs-farm");
                                const canalNotificacao = interaction.guild.channels.cache.find(channel => channel.name === "📌・notificacoes-gerentes");

                                if (canalLogs) {
                                    await canalLogs.send({ embeds: [embedComprovanteLog], files: [attachment] });
                                }
                                if (canalNotificacao) {
                                     await canalNotificacao.send({ embeds: [embedComprovanteLog], files: [attachment] });
                                }

                                await dm.send({ content: "✅ Comprovante recebido e registrado!" });
                                setTimeout(() => msg.delete().catch(() => { }), 60000); // Apaga a mensagem do comprovante após 1 minuto

                                // Se a meta for atingida, envia uma única embed combinada para logs/notificações AGORA
                                if (playerFarm.metGoal) { 
                                    const combinedEmbed = new EmbedBuilder()
                                        .setTitle("🎉 Parabéns! Todas as metas foram atingidas!") // Título da embed de parabéns
                                        .setDescription(`O membro <@${interaction.user.id}> atingiu todas as metas diárias! Os valores serão resetados à meia-noite.\n\n**Comprovante de Farm Anexado:**`) // Descrição combinada
                                        .addFields(
                                            { name: "🧪 Plástico", value: `${playerFarm.plastico}/${metas.plastico}` },
                                            { name: "📄 Seda", value: `${playerFarm.seda}/${metas.seda}` },
                                            { name: "🍃 Folha", value: `${playerFarm.folha}/${metas.folha}` },
                                            { name: "🌱 Casca de Semente", value: `${playerFarm.cascaSemente}/${metas.cascaSemente}` }
                                        )
                                        .setColor("#00FF00") // Cor verde
                                        .setFooter({ text: `Gerado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                                        .setTimestamp()
                                        .setImage(`attachment://${attachment.name}`); // Adiciona a imagem do comprovante

                                    const canalLogs = interaction.guild.channels.cache.find(channel => channel.name === "🔐・logs-farm");
                                    const canalNotificacao = interaction.guild.channels.cache.find(channel => channel.name === "📌・notificacoes-gerentes");

                                    // Envia a embed combinada COM a imagem para os canais
                                    if (canalLogs) {
                                        await canalLogs.send({ embeds: [combinedEmbed], files: [attachment] });
                                    }
                                    if (canalNotificacao) {
                                        await canalNotificacao.send({ content: "<@&1292671789222334514>", embeds: [combinedEmbed], files: [attachment] });
                                    }
                                }

                            } else {
                                await dm.send({ content: "⏰ Tempo esgotado! Você não enviou o comprovante a tempo. Por favor, repita o processo de registro de farm." });
                            }
                        } catch (err) {
                            console.error('Erro ao solicitar/processar comprovante por DM:', err);
                            await interaction.user.send({ content: "❌ Não foi possível solicitar o comprovante por DM. Por favor, certifique-se de que suas Mensagens Diretas estão abertas para este servidor." }).catch(() => {}); // Adiciona catch para evitar crash se DM for bloqueada
                        }

                        // Atualizar a isenção ao atingir a meta (mantido aqui, fora do if do comprovante)
                        if (playerFarm.metGoal) {
                            const agora = new Date();
                            // **Calcula os dias de isenção com base na quantidade de farm**
                            const diasIsencao = Math.min(
                                Math.floor(playerFarm.plastico / metas.plastico),
                                Math.floor(playerFarm.seda / metas.seda),
                                Math.floor(playerFarm.folha / metas.folha),
                                Math.floor(playerFarm.cascaSemente / metas.cascaSemente)
                            );
                            
                            // Garante que o mínimo seja 1 dia se a meta foi batida
                            const diasParaAdicionar = Math.max(1, diasIsencao);

                            const isencaoAte = new Date(agora.getTime() + diasParaAdicionar * 24 * 60 * 60 * 1000); // Adiciona os dias calculados
                            playerFarm.isencaoAte = isencaoAte;
                            await playerFarm.save(); // Salva com a isenção

                            // Opcional: Log para verificar os dias de isenção concedidos
                            console.log(`[DEBUG] ${playerFarm.username} - Concedidos ${diasParaAdicionar} dias de isenção.`);

                        }
                            
                            break;

                        case "modal-registro":
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
                            break;

                        default:
                            await interaction.reply({ content: "❌ Opção inválida!", ephemeral: true });
                }
            } catch (error) {
                console.error('Erro ao processar modal:', error);
                await interaction.reply({ content: "❌ Ocorreu um erro ao processar seus dados!", ephemeral: true });
            }
        }
    }
}