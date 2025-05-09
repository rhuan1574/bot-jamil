const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createWorker } = require('tesseract.js');

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

            // Inicia o worker do Tesseract para OCR
            const worker = await createWorker('por');
            
            // Faz o reconhecimento do texto na imagem
            const { data: { text } } = await worker.recognize(prova.url);
            await worker.terminate();

            // Expressão regular melhorada para encontrar padrões como '50000x', mesmo com espaços
            let valorExtraido = 'Não encontrado';
            const linhas = text.split(/\r?\n/);
            for (const linha of linhas) {
                const match = linha.match(/([\d.,]+)\s*x/i);
                if (match) {
                    valorExtraido = match[0].replace(/\s+/g, '');
                    break;
                }
            }
            const moedaMatch = text.match(/REAIS|REAL|R\$|DINHEIRO/i);
            let moedaExtraida = moedaMatch ? moedaMatch[0] : 'Não encontrado';

            // Cria o embed com as informações
            const embed = new EmbedBuilder()
                .setTitle('🌾 Verificação de Farm')
                .setColor('#FFA500')
                .addFields(
                    { name: '👤 Jogador', value: interaction.user.toString(), inline: true },
                    { name: '🎯 Meta', value: `${meta}M`, inline: true },
                    { name: '💵 Valor Detectado!!!', value: `${valorExtraido} ${moedaExtraida}`, inline: true },
                    { name: '📝 Texto Reconhecido', value: text.substring(0, 1000) || 'Nenhum texto reconhecido' }
                )
                .setImage(prova.url)
                .setTimestamp();

            // Envia a confirmação
            await interaction.editReply({
                content: '✅ Farm verificado com sucesso!',
                embeds: [embed]
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Ocorreu um erro ao verificar o Farm. Por favor, tente novamente.');
        }
    },
}; 