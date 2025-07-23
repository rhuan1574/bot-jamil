const buscarCargo = require('../../utils/buscarCargo');
const buscarCanal = require('../../utils/buscarCanal');
const criarEmbed = require('../../utils/criarEmbed');
const { AttachmentBuilder } = require('discord.js');

module.exports = async function handleRegistro(interaction) {
  const nomeGame = interaction.fields.getTextInputValue('nome-game');
  const id = interaction.fields.getTextInputValue('id');
  const nomeReal = interaction.fields.getTextInputValue('nome-real');
  const telefone = interaction.fields.getTextInputValue('telefone');
  const recrutador = interaction.fields.getTextInputValue('recrutador');

  // Alterar o apelido do usuário
  try {
    const novoApelido = `${nomeGame} | ${id}`;
    await interaction.member.setNickname(novoApelido);
  } catch (error) {
    console.error('Erro ao alterar o apelido:', error);
  }

  // Buscar o cargo de Membro Benny's
  const cargoMembro = buscarCargo(interaction.guild, "🧰 | Membro Benny's");
  if (!cargoMembro) {
    await interaction.reply({
      content: "❌ Erro: Cargo '🧰 | Membro Benny's' não encontrado!",
      flags: 64,
    });
    return;
  }

  // Adicionar o cargo ao usuário
  try {
    await interaction.member.roles.add(cargoMembro);
  } catch (error) {
    console.error('Erro ao adicionar cargo:', error);
    await interaction.reply({
      content: '❌ Erro ao adicionar o cargo. Verifique as permissões do bot.',
      flags: 64,
    });
    return;
  }

  // Criar anexo uma vez para reutilizar
  const attachment = new AttachmentBuilder('./images/bennys.png');

  // Buscar o canal de logs
  const canalLogs = buscarCanal(interaction.guild, '🔓・logs-registro');
  if (canalLogs) {
    try {
      // Criar embed para o log
      const embedLog = criarEmbed({
        title: '📝 Novo Registro Realizado',
        color: '#00ff00',
        thumbnail: interaction.user.displayAvatarURL(),
        image: 'attachment://bennys.png',
        fields: [
          { name: '👤 Usuário', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
          { name: '🎮 Nome in Game', value: nomeGame, inline: true },
          { name: '🆔 ID in Game', value: id, inline: true },
          { name: '👨‍💼 Nome Real', value: nomeReal, inline: true },
          { name: '📱 Telefone', value: telefone, inline: true },
          { name: '🤝 Recrutador', value: recrutador, inline: true },
          { name: '⏰ Data/Hora', value: new Date().toLocaleString('pt-BR'), inline: false },
        ],
        footer: "Sistema de Registro Benny's",
      });
      await canalLogs.send({ embeds: [embedLog], files: [attachment] });
    } catch (error) {
      console.error('Erro ao enviar webhook para logs:', error);
    }
  }

  // Enviar mensagem de boas-vindas no chat geral
  const canalChatGeral = buscarCanal(interaction.guild, '💬・ᴄʜᴀᴛ-ɢᴇʀᴀʟ');
  if (canalChatGeral) {
    try {
      await canalChatGeral.send({
        content: `👋 Bem-vindo(a) ${interaction.user} à Benny's!`,
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem de boas-vindas:', error);
    }
  }

  await interaction.reply({
    content: `✅ **Registro realizado com sucesso!**\n\n🎮 **Nome in Game:** ${nomeGame}\n🆔 **ID:** ${id}\n👨‍💼 **Nome Real:** ${nomeReal}\n📱 **Telefone:** ${telefone}\n🤝 **Recrutador:** ${recrutador}`,
    flags: 64,
  });
} 