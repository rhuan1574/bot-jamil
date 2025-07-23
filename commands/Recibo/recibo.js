const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    category: "Geral",
    data: new SlashCommandBuilder()
        .setName('recibo') // Nome do comando em minúsculas
        .setDescription('Comando para startar bot de registro'),
    async execute(interaction) {
        if (!interaction.member.permissions.has("ADMINISTRATOR")) {
            return interaction.reply({
                content: "Você não tem permissão para usar este comando.",
                ephemeral: true,
            });
        }  
        const embed = new EmbedBuilder()
            .setColor('Aqua')
            .setAuthor({ name: 'BENNYS TUNNING' }) // Corrigido o método setAuthor
            .setTitle('Recibo de Tunagem Bennys Tunning')
            .setDescription('Recibo de tunagem Bennys Tunning. Clique nos botões abaixo para iniciar o processo.')
            .setImage('https://i.ibb.co/CBVRkXJ/BENNYS-TUNING-removebg-preview.png');

        const button = new ButtonBuilder()
            .setCustomId('recibo')
            .setLabel('Gerar Recibo')
            .setStyle(ButtonStyle.Success);


        const row = new ActionRowBuilder().addComponents(button);

        await interaction.reply({
            embeds: [embed], // Incluindo o embed na resposta
            components: [row],
        });
    }
};
