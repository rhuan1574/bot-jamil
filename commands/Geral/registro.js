const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("registro")
    .setDescription("Inicia o processo de registro automático de novos membros")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("📝 Sistema de Registro")
      .setDescription("Bem-vindo ao sistema de registro automático!\n\nPara se registrar, clique no botão abaixo e siga as instruções.")
      .setColor("#0099ff")
      .setFooter({ text: "Sistema de Registro • " + interaction.guild.name })
      .setTimestamp();

    await interaction.reply({ 
      embeds: [embed],
      flags: 64
    });
  },
};
