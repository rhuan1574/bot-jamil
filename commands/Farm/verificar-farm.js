const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../database/models/Player.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verificar-farm')
        .setDescription('Verifica que o jogador bateu a meta de farm')
        .addUserOption(option =>
            option.setName('jogador')
                .setDescription('Selecione o jogador')
                .setRequired(true)),
    async execute(interaction) {
        const target = interaction.options.getUser('jogador');
        const player = await Player.findOne({ discordId: target.id });

        if (!player) {
            await interaction.reply({ content: 'Jogador não encontrado!', ephemeral: true });
            return;
        }

        player.metGoal = true;
        await player.save();
        const embed = new EmbedBuilder()
            .setTitle('✅ Meta de Farm Verificada')
            .setDescription(`${target.username} bateu a meta de farm hoje!`)
            .setColor(0x00FF00)
            .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};