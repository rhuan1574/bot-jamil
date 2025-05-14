const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("registrar-farm")
        .setDescription("Registra um novo farm no sistema"),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle("📝 Registro de FARM")
            .setDescription("Para registrar sua farm, selecione o método de pagamento preferido abaixo.")
            .addFields(
                { name: "💡 Informações", value: "Após selecionar o método de pagamento, você receberá instruções detalhadas para completar o registro." },
                { name: "⏰ Prazo", value: "O registro deve ser completado em até 24 horas após a seleção do método de pagamento." }
            )
            .setColor("#00FFFF")
            .setFooter({ text: "Sistema de Registro de Farms" })  

        const buttonDinheiro = new ButtonBuilder()
            .setCustomId("button-dinheiro")
            .setLabel("Dinheiro")
            .setStyle(ButtonStyle.Success)
            .setEmoji("💵");

        const buttonPix = new ButtonBuilder()
            .setCustomId("button-farm")
            .setLabel("Farm")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("📦");


        const row = new ActionRowBuilder()
            .addComponents(buttonDinheiro, buttonPix);

        await interaction.reply({ 
            embeds: [embed], 
            components: [row],
        });
    }
}