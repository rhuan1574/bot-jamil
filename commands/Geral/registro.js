const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    category: 'Geral',
    data: new SlashCommandBuilder()
    .setName('registro')
    .setDescription('Comando utilizado para disparar uma embed de registro.'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
        .setTitle('Registro Automático')
        .setDescription('Bem vindo ao sistema de registro automático da Aliança Sinistra, para se registrar corretamente, clique no botão abaixo e siga os pasos a seguir.')
        .setColor('Aqua')
        

        const button = new ButtonBuilder()
        .setCustomId('registro')
        .setLabel('Registrar')
        .setStyle(ButtonStyle.Success)

        const row = new ActionRowBuilder()
        .addComponents(button)

        interaction.reply({embeds: [embed], components: [row]})
    }
}