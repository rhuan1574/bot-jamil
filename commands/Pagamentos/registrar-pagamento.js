const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { createWorker } = require('tesseract.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('registrar-pagamento')
        .setDescription('Registra um novo pagamento com reconhecimento automático')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addAttachmentOption(option =>
            option.setName('comprovante')
                .setDescription('Comprovante do pagamento')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('valor')
                .setDescription('Valor do pagamento')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('data')
                .setDescription('Data do pagamento (DD/MM/AAAA)')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const comprovante = interaction.options.getAttachment('comprovante');
            const valor = interaction.options.getString('valor');
            const data = interaction.options.getString('data');

            // Verifica se é uma imagem
            if (!comprovante.contentType.startsWith('image/')) {
                return interaction.editReply('❌ Por favor, envie uma imagem válida como comprovante.');
            }

            // Inicia o worker do Tesseract para OCR
            const worker = await createWorker('por');
            
            // Faz o reconhecimento do texto na imagem
            const { data: { text } } = await worker.recognize(comprovante.url);
            await worker.terminate();

            // Cria o embed com as informações
            const embed = new EmbedBuilder()
                .setTitle('💰 Novo Pagamento Registrado')
                .setColor('#00FF00')
                .addFields(
                    { name: '👤 Jogador', value: interaction.user.toString(), inline: true },
                    { name: '💵 Valor', value: `R$ ${valor}`, inline: true },
                    { name: '📅 Data', value: data, inline: true },
                    { name: '📝 Texto Reconhecido', value: text.substring(0, 1000) || 'Nenhum texto reconhecido' }
                )
                .setImage(comprovante.url)
                .setTimestamp();

            // Envia a confirmação
            await interaction.editReply({
                content: '✅ Pagamento registrado com sucesso!',
                embeds: [embed]
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Ocorreu um erro ao processar o pagamento. Por favor, tente novamente.');
        }
    },
}; 