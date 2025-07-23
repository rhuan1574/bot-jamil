const buscarCanal = require('../../utils/buscarCanal');
const criarEmbed = require('../../utils/criarEmbed');
const ParceriasManager = require('../../utils/parceriasManager');
const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = async function handleParcerias(interaction) {
  const nomeOrganizacao = interaction.fields.getTextInputValue('nome-organizacao');
  const nomeDono = interaction.fields.getTextInputValue('nome-dono');
  const localizacao = interaction.fields.getTextInputValue('localizacao');
  const produto = interaction.fields.getTextInputValue('produto');
  const contato = interaction.fields.getTextInputValue('contato');

  // Buscar o canal de parcerias
  const canalParcerias = buscarCanal(interaction.guild, '🫂・parcerias');

  // Enviar para o canal de parcerias
  if (canalParcerias) {
    try {
      const embedParcerias = criarEmbed({
        title: '🤝 Nova Parceria Registrada',
        color: '#00ff00',
        fields: [
          { name: '👤 Registrado por', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
          { name: '🤝 Organização/FAC', value: nomeOrganizacao, inline: true },
          { name: '🤝 Dono da Organização/FAC', value: nomeDono, inline: true },
          { name: '⏰ Data/Hora', value: new Date().toLocaleString('pt-BR'), inline: false },
        ],
        footer: "Sistema de Parcerias Benny's",
      });
      // Criar botão de remoção
      const removeButton = new ButtonBuilder()
        .setCustomId('remove-parceria')
        .setLabel('🗑️ Remover Parceria')
        .setStyle(ButtonStyle.Danger);
      const row = new ActionRowBuilder().addComponents(removeButton);
      // Enviar mensagem com botão
      const message = await canalParcerias.send({
        embeds: [embedParcerias],
        components: [row],
      });
      // Salvar parceria no banco de dados
      const parceriasManager = new ParceriasManager();
      await parceriasManager.addParceria({
        messageId: message.id,
        channelId: message.channel.id,
        nomeOrganizacao,
        nomeDono,
        localizacao,
        produto,
        contato,
        registradoPor: interaction.user.tag,
        dataRegistro: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Erro ao enviar para canal de parcerias:', error);
    }
  }

  await interaction.reply({
    content: `✅ **Parceria registrada com sucesso!**\n\n🤝 A nova parceria foi registrada no sistema.\n\n**Dados da parceria:**\n🤝 **Organização/FAC:** ${nomeOrganizacao}\n🤝 **Dono da Organização/FAC:** ${nomeDono}\n📍 **Localização:** ${localizacao}\n📦 **Produto/Serviço:** ${produto}\n👤 **Contato Principal:** ${contato}\n⏰ **Data/Hora:** ${new Date().toLocaleString('pt-BR')}\n\n**Registrado por:** ${interaction.user} (🧰 | Lider)`,
    flags: 64,
  });
} 