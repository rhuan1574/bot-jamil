const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');

const { armas, flippers, municoes, itensDiversos } = require('../../constants/items');

// Simulação de banco de dados em memória (troque por MongoDB se quiser)
const acoes = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('criar-acao')
    .setDescription('Cria uma nova ação/atividade'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Criar Ação')
      .setDescription('Selecione uma opção para criar uma nova ação/atividade')

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('acao_select')
          .setPlaceholder('Selecione uma opção')
          .addOptions(
            { label: 'Banco Central 💰', value: 'banco_central' },
            { label: 'Banco Fleeca 💰', value: 'banco_fleeca' },
            { label: 'Ammu-Nation 🔫', value: 'ammu_nation' },
            { label: 'Galinheiro 🐔', value: 'galinheiro' },
            { label: 'Concessionária 🚗', value: 'concessionaria' },
            { label: 'Joalheria 💎', value: 'joalheria' },
            { label: 'Açougue 🥩', value: 'acougue' },
            { label: 'Nióbio 💰', value: 'niobio' },
          ),
      );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
