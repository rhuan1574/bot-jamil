const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// Definição das metas diárias de farm
const metas = {
    plastico: 100,
    seda: 50,
    folha: 200,
    cascaSemente: 30
};

// Valor diário para pagamento em dinheiro
const VALOR_DIARIO = 16000;

// Mapa para armazenar os depósitos diários de cada usuário
const depositosDiarios = new Map();

// Função para lidar com o comprovante de farm
async function handleComprovanteFarm(interaction, attachment, depositosAtuais, userId) {
    // Verificar se o anexo é uma imagem PNG
    if (!attachment || !attachment.url.endsWith('.png')) {
        await interaction.reply({ content: "Por favor, envie uma imagem PNG como comprovante.", ephemeral: true });
        return;
    }

    // Calcular o número de dias de isenção com base nas quantidades acumuladas
    const ratios = [
        depositosAtuais.plastico / metas.plastico,
        depositosAtuais.seda / metas.seda,
        depositosAtuais.folha / metas.folha,
        depositosAtuais.cascaSemente / metas.cascaSemente
    ];
    const minRatio = Math.min(...ratios);
    const N = Math.floor(minRatio);

    // Calcular a nova data de isenção
    const agora = new Date();
    const isencaoAte = new Date(agora.getTime() + N * 24 * 60 * 60 * 1000);
    depositosAtuais.isencaoAte = isencaoAte;

    // Subtrair as quantidades usadas para conceder a isenção
    depositosAtuais.plastico -= N * metas.plastico;
    depositosAtuais.seda -= N * metas.seda;
    depositosAtuais.folha -= N * metas.folha;
    depositosAtuais.cascaSemente -= N * metas.cascaSemente;

    // Garantir que os valores não sejam negativos
    depositosAtuais.plastico = Math.max(0, depositosAtuais.plastico);
    depositosAtuais.seda = Math.max(0, depositosAtuais.seda);
    depositosAtuais.folha = Math.max(0, depositosAtuais.folha);
    depositosAtuais.cascaSemente = Math.max(0, depositosAtuais.cascaSemente);

    // Atualizar os dados do usuário
    depositosDiarios.set(userId, depositosAtuais);

    // Criar embed de celebração com a nova lógica
    const embedCelebracao = new EmbedBuilder()
        .setTitle("🎉 Farm Confirmado!")
        .setDescription(`Você confirmou o farm e agora está isento por ${N} dia(s) até ${isencaoAte.toLocaleString()}.`)
        .setImage(`attachment://${attachment.name}`)
        .setColor("#FFD700")
        .setTimestamp();

    // Enviar embed para o usuário
    await interaction.user.send({ embeds: [embedCelebracao], files: [attachment] });

    // Enviar para logs e notificações
    const canalLogs = interaction.guild.channels.cache.find(channel => channel.name === "logs-farm");
    const canalNotificacao = interaction.guild.channels.cache.find(channel => channel.name === "notificacoes-gerentes");
    await Promise.all([
        canalLogs?.send({ embeds: [embedCelebracao], files: [attachment] }),
        canalNotificacao?.send({ content: `<@&1370136458278604822>`, embeds: [embedCelebracao], files: [attachment] })
    ]);

    // Confirmar no canal original
    await interaction.editReply({ content: "✅ Comprovante recebido e farm confirmado!", ephemeral: true });
}

// Função para lidar com o pagamento em dinheiro
async function handlePagamentoDinheiro(interaction, attachment, depositosAtuais, userId, valor) {
    // Verificar se o anexo é uma imagem PNG
    if (!attachment || !attachment.url.endsWith('.png')) {
        await interaction.reply({ content: "Por favor, envie uma imagem PNG como comprovante.", ephemeral: true });
        return;
    }

    // Calcular isenção
    const agora = new Date();
    const diasPagos = Math.floor(valor / VALOR_DIARIO);
    const isencaoAte = new Date(agora.getTime() + diasPagos * 24 * 60 * 60 * 1000);
    depositosAtuais.dinheiro += valor;
    depositosAtuais.isencaoAte = isencaoAte;
    depositosDiarios.set(userId, depositosAtuais);

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
        interaction.user.send({ embeds: [embedConfirmacao], files: [attachment] }),
        canalLogs?.send({ embeds: [embedConfirmacao], files: [attachment] }),
        canalNotificacao?.send({ content: `<@&1370136458278604822>`, embeds: [embedConfirmacao], files: [attachment] })
    ]);

    // Confirmação no canal original
    await interaction.editReply({ content: "✅ Pagamento registrado com sucesso!", embeds: [embedConfirmacao], files: [attachment] });
}

// Exportar o evento de interação
module.exports = async (interaction) => {
    if (interaction.isButton()) {
        if (interaction.customId === 'button-farm') {
            // Enviar embed com as metas diárias e botão "Depositar"
            const embed = new EmbedBuilder()
                .setTitle('Metas Diárias de Farm')
                .setDescription(`Plástico: ${metas.plastico}\nSeda: ${metas.seda}\nFolha: ${metas.folha}\nCasca de Semente: ${metas.cascaSemente}`)
                .setColor('#00FF00');

            const buttonDepositar = new ButtonBuilder()
                .setCustomId('depositar-farm')
                .setLabel('Depositar')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(buttonDepositar);

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        } else if (interaction.customId === 'depositar-farm') {
            // Mostrar modal para depositar farm
            const modal = new ModalBuilder()
                .setCustomId('modal-farm')
                .setTitle('Depositar Farm');

            const plasticoInput = new TextInputBuilder()
                .setCustomId('plastico')
                .setLabel('Quantidade de Plástico')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const sedaInput = new TextInputBuilder()
                .setCustomId('seda')
                .setLabel('Quantidade de Seda')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const folhaInput = new TextInputBuilder()
                .setCustomId('folha')
                .setLabel('Quantidade de Folha')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const cascaInput = new TextInputBuilder()
                .setCustomId('cascaSemente')
                .setLabel('Quantidade de Casca de Semente')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(plasticoInput);
            const secondActionRow = new ActionRowBuilder().addComponents(sedaInput);
            const thirdActionRow = new ActionRowBuilder().addComponents(folhaInput);
            const fourthActionRow = new ActionRowBuilder().addComponents(cascaInput);

            modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow);

            await interaction.showModal(modal);
        } else if (interaction.customId === 'button-dinheiro') {
            // Mostrar modal para pagamento em dinheiro
            const modal = new ModalBuilder()
                .setCustomId('modal-dinheiro')
                .setTitle('Pagamento em Dinheiro');

            const valorInput = new TextInputBuilder()
                .setCustomId('valor')
                .setLabel('Valor do Pagamento (em R$)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const actionRow = new ActionRowBuilder().addComponents(valorInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        }
    } else if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal-farm') {
            // Processar submissão do modal para farm
            const plastico = parseInt(interaction.fields.getTextInputValue('plastico'));
            const seda = parseInt(interaction.fields.getTextInputValue('seda'));
            const folha = parseInt(interaction.fields.getTextInputValue('folha'));
            const cascaSemente = parseInt(interaction.fields.getTextInputValue('cascaSemente'));

            const userId = interaction.user.id;

            let depositosAtuais = depositosDiarios.get(userId) || { plastico: 0, seda: 0, folha: 0, cascaSemente: 0, dinheiro: 0, isencaoAte: new Date(0) };

            depositosAtuais.plastico += plastico;
            depositosAtuais.seda += seda;
            depositosAtuais.folha += folha;
            depositosAtuais.cascaSemente += cascaSemente;

            depositosDiarios.set(userId, depositosAtuais);

            const todasMetasAtingidas = depositosAtuais.plastico >= metas.plastico &&
                                       depositosAtuais.seda >= metas.seda &&
                                       depositosAtuais.folha >= metas.folha &&
                                       depositosAtuais.cascaSemente >= metas.cascaSemente;

            if (todasMetasAtingidas) {
                // Enviar DM solicitando comprovante
                const dmChannel = await interaction.user.createDM();
                await dmChannel.send('Envie o comprovante de farm (imagem PNG) dentro de 2 minutos.');

                // Configurar coletor para DM
                const filter = m => m.author.id === userId && m.attachments.size > 0 && m.attachments.first().url.endsWith('.png');
                const collector = dmChannel.createMessageCollector({ filter, time: 120000, max: 1 });

                collector.on('collect', async (m) => {
                    const attachment = m.attachments.first();
                    await handleComprovanteFarm(interaction, attachment, depositosAtuais, userId);
                });

                collector.on('end', collected => {
                    if (collected.size === 0) {
                        dmChannel.send('Tempo esgotado ou anexo inválido. Por favor, tente novamente.');
                    }
                });

                await interaction.reply({ content: 'Verifique sua DM para enviar o comprovante.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Você ainda não atingiu todas as metas diárias.', ephemeral: true });
            }
        } else if (interaction.customId === 'modal-dinheiro') {
            // Processar submissão do modal para pagamento em dinheiro
            const valor = parseFloat(interaction.fields.getTextInputValue('valor'));
            const userId = interaction.user.id;

            let depositosAtuais = depositosDiarios.get(userId) || { plastico: 0, seda: 0, folha: 0, cascaSemente: 0, dinheiro: 0, isencaoAte: new Date(0) };

            // Enviar DM solicitando comprovante
            const dmChannel = await interaction.user.createDM();
            await dmChannel.send('Envie o comprovante de pagamento (imagem PNG) dentro de 2 minutos.');

            // Configurar coletor para DM
            const filter = m => m.author.id === userId && m.attachments.size > 0 && m.attachments.first().url.endsWith('.png');
            const collector = dmChannel.createMessageCollector({ filter, time: 120000, max: 1 });

            collector.on('collect', async (m) => {
                const attachment = m.attachments.first();
                await handlePagamentoDinheiro(interaction, attachment, depositosAtuais, userId, valor);
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    dmChannel.send('Tempo esgotado ou anexo inválido. Por favor, tente novamente.');
                }
            });

            await interaction.reply({ content: 'Verifique sua DM para enviar o comprovante.', ephemeral: true });
        }
    }
};