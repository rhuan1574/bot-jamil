const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Player = require('../../database/models/Player.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-farm-status')
        .setDescription('Reseta a última verificação de farm para todos os jogadores.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Apenas administradores podem usar este comando

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true }); // Deixa o bot pensando enquanto processa

        try {
            // Atualiza apenas o lastChecked para a data e hora atual para todos os jogadores
            const result = await Player.updateMany(
                {},
                { $set: { lastChecked: new Date() } }
            );

            await interaction.editReply(`✅ Última verificação de farm resetada para ${result.modifiedCount} jogadores.`);

        } catch (error) {
            console.error('Erro ao resetar última verificação de farm:', error);
            await interaction.editReply('❌ Ocorreu um erro ao resetar a última verificação de farm.');
        }
    },
}; 