const { EmbedBuilder } = require('discord.js');
const { acoes } = require('../../commands/acoes/criar-acao');

module.exports = async function handleAcoesButton(interaction) {
  const customId = interaction.customId;
  if (!customId.startsWith('participar-acao-')) return false;
  const acaoId = customId.replace('participar-acao-', '');
  const acao = acoes.get(acaoId);
  if (!acao) {
    await interaction.reply({ content: 'Ação não encontrada!', ephemeral: true });
    return true;
  }

  // Checa se já está inscrito
  if (acao.participantes.find(p => p.id === interaction.user.id) ||
      acao.reserva.find(p => p.id === interaction.user.id)) {
    await interaction.reply({ content: 'Você já está inscrito nesta ação!', ephemeral: true });
    return true;
  }

  // Simule aqui a verificação de prioridade (quem formou na semana)
  // Exemplo: const formouNaSemana = await checarFormacao(interaction.user.id);
  const formouNaSemana = true; // Troque pela sua lógica real

  if (acao.participantes.length < acao.vagas) {
    acao.participantes.push({ id: interaction.user.id, nome: interaction.user.username, formouNaSemana });
    await interaction.reply({ content: 'Você entrou na ação!', ephemeral: true });
  } else {
    acao.reserva.push({ id: interaction.user.id, nome: interaction.user.username, formouNaSemana });
    await interaction.reply({ content: 'A ação está cheia. Você entrou na lista de reserva!', ephemeral: true });
  }

  // Atualiza embed (opcional)
  const participantes = acao.participantes.map(p => `<@${p.id}>`).join('\n') || 'Ninguém';
  const reserva = acao.reserva.map(p => `<@${p.id}>`).join('\n') || 'Ninguém';
  const embed = new EmbedBuilder()
    .setTitle(`Ação: ${acao.nome}`)
    .setDescription(
      `**Data:** ${acao.data}\n**Materiais:** ${acao.materiais.join(', ')}\n**Vagas:** ${acao.vagas}\n\n` +
      `**Participantes:**\n${participantes}\n\n**Reserva:**\n${reserva}`
    )
    .setColor('#FFA500')
    .setFooter({ text: `ID da ação: ${acaoId}` });

  try {
    await interaction.message.edit({ embeds: [embed] });
  } catch (e) {
    // Ignore se não conseguir editar
  }
  return true;
};