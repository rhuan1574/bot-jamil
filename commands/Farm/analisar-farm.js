const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../database/models/Player.js');

// Definir as metas aqui também para uso neste comando
const metas = {
    cascaSemente: 120,
    folha: 120,
    seda: 120,
    plastico: 40
};

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
            // Análise de todos os jogadores em uma única embed, com paginação
            const players = await Player.find().sort({ metGoal: 1, lastChecked: 1 }); // Ordena: não bateram meta primeiro, depois por última verificação
            
            if (players.length === 0) {
                await interaction.reply({ content: 'Nenhum jogador encontrado!', ephemeral: true });
                return;
            }

            const playersPerPage = 10;
            const totalPages = Math.ceil(players.length / playersPerPage);
            let replySent = false;

            for (let i = 0; i < totalPages; i++) {
                const start = i * playersPerPage;
                const end = start + playersPerPage;
                const currentPlayers = players.slice(start, end);

                const embedDescription = currentPlayers.map(player => {
                    const discordUser = interaction.guild.members.cache.get(player.discordId);
                    const username = discordUser ? discordUser.user.username : 'Jogador Desconhecido';

                    if (player.metGoal) {
                        return `✅ **${username}**`; // Bateu a meta, só mostra o nome com ✅
                    } else {
                        // Não bateu a meta, calcula o tempo sem farm
                        let timeWithoutFarm = 'Nunca registrado';
                        if (player.lastChecked) {
                            const now = new Date();
                            const lastCheckedDate = new Date(player.lastChecked);
                            const diffMs = now.getTime() - lastCheckedDate.getTime();

                            const diffMinutes = Math.floor(diffMs / (1000 * 60));
                            const diffHours = Math.floor(diffMinutes / 60);
                            const diffDays = Math.floor(diffHours / 24);

                            const remainingHours = diffHours % 24;
                            const remainingMinutes = diffMinutes % 60;

                            if (diffDays > 0) {
                                timeWithoutFarm = `${diffDays}d ${remainingHours}h ${remainingMinutes}m atrás`;
                            } else if (diffHours > 0) {
                                timeWithoutFarm = `${diffHours}h ${remainingMinutes}m atrás`;
                            } else if (diffMinutes > 0) { // Mostrar minutos apenas se for > 0
                                timeWithoutFarm = `${diffMinutes}m atrás`;
                            } else {
                                timeWithoutFarm = 'Agora pouco'; // Adiciona um status para farms muito recentes
                            }
                        }

                        return `❌ **${username}** - ${timeWithoutFarm}`; // Não bateu, mostra nome com ❌ e tempo sem farm
                    }
                }).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle(`📊 Análise de Farm - Todos os Jogadores - Página ${i + 1}/${totalPages}`)
                    .setDescription(embedDescription)
                    .setColor(0x0099FF) // Cor neutra para a lista geral
                    .setTimestamp();

                if (!replySent) {
                    await interaction.reply({ embeds: [embed] });
                    replySent = true;
                } else {
                    await interaction.followUp({ embeds: [embed] });
                }
            }
        }
    },
}; 