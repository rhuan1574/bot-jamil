const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits, AttachmentBuilder } = require("discord.js");
const buscarCanal = require("../../utils/buscarCanal");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("registrar-farm")
        .setDescription("Registra um novo farm no sistema")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const attachment = new AttachmentBuilder("./images/bennys.png");
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle("📝 Registro de FARM")
            .setImage("attachment://bennys.png")
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

            const canal = buscarCanal(interaction.guild, '📦・depositar-farm');
            if (canal) {
              await canal.send({ embeds: [embed], components: [row], files: [attachment] });
            }
    }
}