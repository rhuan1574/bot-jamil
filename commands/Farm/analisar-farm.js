const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../database/models/Player.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('analisar-farm')
        .setDescription('Analisa quanto cada jogador deve farmar')
        .addUserOption(option =>
            option.setName('jogador')
                .setDescription('Selecione o jogador (opcional)')
                .setRequired(false)),
    async execute(interaction) {
        const target = interaction.options.getUser('jogador');
        
        if (target) {
            // Análise individual
            const player = await Player.findOne({ discordId: target.id });
            
            if (!player) {
                await interaction.reply({ content: 'Jogador não encontrado!', ephemeral: true });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(`📊 Análise de Farm - ${target.username}`)
                .setDescription(`**Meta Diária:** ${player.dailyGoal || 'Não definida'}\n**Farm Atual:** ${player.currentFarm || 0}\n**Status:** ${player.metGoal ? '✅ Meta atingida' : '❌ Meta não atingida'}`)
                .setColor(player.metGoal ? 0x00FF00 : 0xFF0000)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } else {
            // Análise de todos os jogadores
            const players = await Player.find();
            
            if (players.length === 0) {
                await interaction.reply({ content: 'Nenhum jogador encontrado!', ephemeral: true });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('📊 Análise de Farm - Todos os Jogadores')
                .setDescription(players.map(player => {
                    const discordUser = interaction.guild.members.cache.get(player.discordId);
                    const username = discordUser ? discordUser.user.username : 'Jogador Desconhecido';
                    return `**${username}**\nMeta: ${player.dailyGoal || 'Não definida'}\nFarm Atual: ${player.currentFarm || 0}\nStatus: ${player.metGoal ? '✅' : '❌'}\n`;
                }).join('\n'))
                .setColor(0x0099FF)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    },
}; 