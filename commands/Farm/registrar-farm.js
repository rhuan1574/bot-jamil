const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } =require("discord.js");


module.exports = {
    data: new SlashCommandBuilder()
    .setName("registrar-farm")
    .setDescription("Dispara comando para registar farm"),
    async execute(interaction) {
        const embed = new EmbedBuilder()
        .setTitle("Registro de FARM")
        .setDescription("Para poder registrar seu farm indique a forma de pagamento.")
        .setColor("Aqua")
        
        const buttonPagament = new ButtonBuilder()
        .setCustomId("button-dinheiro")
        .setLabel("Dinheiro")
        .setStyle(ButtonStyle.Success)

        const buttonFarm = new ButtonBuilder()
        .setCustomId("button-dinheiro")
        .setLabel("Dinheiro")
        .setStyle(ButtonStyle.Success)

        const row = new ActionRowBuilder().addComponents(buttonPagament,buttonFarm)

        await interaction.reply({ embeds: [embed], components: [row]})
    }
}