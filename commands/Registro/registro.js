const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  AttachmentBuilder,
} = require("discord.js");

module.exports = {
  category: "Geral",
  data: new SlashCommandBuilder()
    .setName("registro")
    .setDescription("Comando utilizado para disparar uma embed de registro."),
  async execute(interaction) {
    if (!interaction.member.permissions.has("ADMINISTRATOR")) {
      return interaction.reply({
        content: "Você não tem permissão para usar este comando.",
        ephemeral: true,
      });
    }
    const attachment = new AttachmentBuilder("./images/versalhes.png");

    const embed = new EmbedBuilder()
      .setTitle("Registro Automático")
      .setDescription(
        "Bem vindo ao sistema de registro automático da Versalhes, para se registrar corretamente, clique no botão abaixo e siga os pasos a seguir."
      )
      .setColor("Aqua")
      .setImage("attachment://versalhes.png");

    const button = new ButtonBuilder()
      .setCustomId("registro")
      .setLabel("Registrar")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(button);

    interaction.reply({
      embeds: [embed],
      components: [row],
      files: [attachment],
    });
  },
};
