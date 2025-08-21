const { ButtonBuilder, ButtonStyle } = require("discord.js");
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder } = require("discord.js");


module.exports = {
    data: new SlashCommandBuilder()
    .setName("ausencias")
    .setDescription("descrição do comando de ausencias"),

    async execute(interaction) {
        const embed = new EmbedBuilder()
        .setTitle("Menu de Ausencias")
        .setDescription("Clique no botão para informar suas ausencias")
        .setColor("Green")
        .setImage("attachment://versalhes.png")

        const button = new ButtonBuilder()
        .setCustomId("button-ausencias")
        .setLabel("Abrir Ausencias🚫")
        .setStyle(ButtonStyle.Success)

        const row = new ActionRowBuilder()
        .addComponents(button)

        await interaction.reply({embeds: [embed], components: [row]})
    }
}