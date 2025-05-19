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
                .setDescription(
                    `**Status Geral:**\n` +
                    `✅ Meta atingida: ${player.metGoal ? 'Sim' : 'Não'}\n` +
                    `🕒 Última verificação: ${player.lastChecked ? new Date(player.lastChecked).toLocaleString('pt-BR') : 'Nunca'}\n\n` +
                    `**Recursos Atuais:**\n` +
                    `💰 Dinheiro: ${player.dinheiro}\n` +
                    `🧪 Plástico: ${player.plastico}\n` +
                    `📄 Seda: ${player.seda}\n` +
                    `🌿 Folha: ${player.folha}\n` +
                    `🌱 Casca/Semente: ${player.cascaSemente}\n\n` +
                    `**Informações Adicionais:**\n` +
                    `📅 Último reset: ${player.lastReset ? new Date(player.lastReset).toLocaleString('pt-BR') : 'Nunca'}\n` +
                    `🎫 Isenção até: ${player.isencaoAte ? new Date(player.isencaoAte).toLocaleString('pt-BR') : 'Sem isenção'}`
                )
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
                    return `**${username}**\n` +
                           `Status: ${player.metGoal ? '✅ Meta atingida' : '❌ Meta não atingida'}\n` +
                           `💰 Dinheiro: ${player.dinheiro}\n` +
                           `🧪 Plástico: ${player.plastico}\n` +
                           `📄 Seda: ${player.seda}\n` +
                           `🌿 Folha: ${player.folha}\n` +
                           `🌱 Casca/Semente: ${player.cascaSemente}\n` +
                           `🕒 Última verificação: ${player.lastChecked ? new Date(player.lastChecked).toLocaleString('pt-BR') : 'Nunca'}\n` +
                           `📅 Último reset: ${player.lastReset ? new Date(player.lastReset).toLocaleString('pt-BR') : 'Nunca'}\n` +
                           `🎫 Isenção até: ${player.isencaoAte ? new Date(player.isencaoAte).toLocaleString('pt-BR') : 'Sem isenção'}\n`;
                }).join('\n'))
                .setColor(0x0099FF)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    },
}; 