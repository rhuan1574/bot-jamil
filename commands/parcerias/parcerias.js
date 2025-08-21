const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder,  EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
    .setName("parcerias")
    .setDescription("Comando para ver as parcerias da Versalhes")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const embed = new EmbedBuilder()
        .setTitle("Parcerias da Versalhes")
        .setDescription("Clique no botão abaixo para ver as parcerias da Versalhes")
        .setColor("Aqua")

        const button = new ButtonBuilder()
        .setCustomId("parcerias")
        .setLabel("Adicionar Parcerias")
        .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder()
        .addComponents(button)

        interaction.reply({ embeds: [embed], components: [row] });  
    }
}