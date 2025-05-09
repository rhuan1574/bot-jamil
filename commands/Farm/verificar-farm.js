const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verificar-farm')
        .setDescription('Verifica o Farm com reconhecimento automático')
        .addAttachmentOption(option =>
            option.setName('prova')
                .setDescription('Prova do Farm realizado')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('meta')
                .setDescription('Meta de Farm (em milhões)')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const prova = interaction.options.getAttachment('prova');
            const meta = interaction.options.getString('meta');

            // Verifica se é uma imagem
            if (!prova.contentType.startsWith('image/')) {
                return interaction.editReply('❌ Por favor, envie uma imagem válida como prova.');
            }

            // Cria o embed
            const embed = new EmbedBuilder()
                .setTitle('🌾 Verificação de Farm')
                .setColor('#FFA500')
                .addFields(
                    { name: '👤 Jogador', value: interaction.user.toString(), inline: true },
                    { name: '🎯 Meta', value: `${meta}`, inline: true },
                    { name: '💵 Valor Detectado!!!', value: 'OCR desativado', inline: true },
                    { name: '📝 Texto Reconhecido', value: 'Reconhecimento de texto desativado.' }
                )
                .setImage(prova.url)
                .setTimestamp();

            // Cria os botões
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('dinheiro')
                    .setLabel('Dinheiro')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('farm')
                    .setLabel('Farm')
                    .setStyle(ButtonStyle.Success)
            );

            // Envia a confirmação com os botões na DM do usuário
            try {
                await interaction.user.send({
                    content: 'Escolha uma opção:',
                    embeds: [embed],
                    components: [row]
                });
                await interaction.editReply('✅ Verificação enviada na sua DM!');
            } catch (dmError) {
                await interaction.editReply('❌ Não foi possível enviar a DM. Verifique se suas DMs estão abertas.');
            }

        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Ocorreu um erro ao verificar o Farm. Por favor, tente novamente.');
        }
    },
}; 