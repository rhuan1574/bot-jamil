const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  AttachmentBuilder,
} = require("discord.js");
const criarEmbed = require("../../utils/criarEmbed");
const buscarCanal = require("../../utils/buscarCanal");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("meta-elite")
    .setDescription("Verifique a meta do Elite")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const attachment = new AttachmentBuilder("./images/bennys.png");
    
    const embed = criarEmbed({
      title: "Bem Vindo ao sistema de Metas da Elite Bennys",
      color: "#00ff00",
      image: "attachment://bennys.png",
      description: "Aqui irá adicionar suas metas referente as ações",
      footer: "Sistema de Metas da Bennys Tunning"
    });
    
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('button-elite')
          .setLabel('Depositar')
          .setStyle(ButtonStyle.Success)
      );

    const canal = buscarCanal(interaction.guild, '📊・ᴍᴇᴛᴀꜱ');
    if (canal) {
      await canal.send({ embeds: [embed], components: [row], files: [attachment] });
    }
  },
};
