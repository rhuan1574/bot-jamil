const buscarCanal = require('../../utils/buscarCanal');
const criarEmbed = require('../../utils/criarEmbed');

module.exports = async function handleAusencias(interaction) {
  const nomeGameAusencias = interaction.fields.getTextInputValue('nome-game');
  const idAusencias = interaction.fields.getTextInputValue('id');
  const motivo = interaction.fields.getTextInputValue('motivo');
  const duracao = interaction.fields.getTextInputValue('duracao');

  // Buscar o canal de ausências
  const canalAusencias = buscarCanal(interaction.guild, '📅・ᴀᴜsᴇɴᴄɪᴀs');
  // Buscar o canal de logs de ausências
  const canalLogsAusencias = buscarCanal(interaction.guild, '🔓・logs-ausencias');

  // Enviar para o canal de ausências
  if (canalAusencias) {
    try {
      const embedAusencias = criarEmbed({
        title: '🚫 Ausência Registrada',
        color: '#ff0000',
        thumbnail: interaction.user.displayAvatarURL(),
        fields: [
          { name: '👤 Usuário', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
          { name: '🎮 Nome in Game', value: nomeGameAusencias, inline: true },
          { name: '🆔 ID in Game', value: idAusencias, inline: true },
          { name: '🤝 Motivo', value: motivo, inline: true },
          { name: '🕒 Duração', value: duracao, inline: true },
          { name: '⏰ Data/Hora', value: new Date().toLocaleString('pt-BR'), inline: false },
        ],
        footer: "Sistema de Ausências Benny's",
      });
      await canalAusencias.send({ embeds: [embedAusencias] });
    } catch (error) {
      console.error('Erro ao enviar para canal de ausências:', error);
    }
  }

  // Enviar para o canal de logs
  if (canalLogsAusencias) {
    try {
      const embedLogsAusencias = criarEmbed({
        title: '📝 Log de Ausência',
        color: '#ff6600',
        thumbnail: interaction.user.displayAvatarURL(),
        fields: [
          { name: '👤 Usuário', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
          { name: '🎮 Nome in Game', value: nomeGameAusencias, inline: true },
          { name: '🆔 ID in Game', value: idAusencias, inline: true },
          { name: '🤝 Motivo', value: motivo, inline: true },
          { name: '🕒 Duração', value: duracao, inline: true },
          { name: '⏰ Data/Hora', value: new Date().toLocaleString('pt-BR'), inline: false },
        ],
        footer: "Sistema de Logs Benny's",
      });
      await canalLogsAusencias.send({ embeds: [embedLogsAusencias] });
    } catch (error) {
      console.error('Erro ao enviar log de ausência:', error);
    }
  }

  await interaction.reply({
    content: `✅ **Ausência registrada com sucesso!**\n\n🚫 Sua ausência foi registrada no sistema.\n\n**Dados da ausência:**\n🎮 **Nome in Game:** ${nomeGameAusencias}\n🆔 **ID:** ${idAusencias}\n🤝 **Motivo:** ${motivo}\n🕒 **Duração:** ${duracao}\n⏰ **Data/Hora:** ${new Date().toLocaleString('pt-BR')}`,
    flags: 64,
  });
} 