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
            // Análise de todos os jogadores (agora separada por meta)
            const players = await Player.find();
            
            if (players.length === 0) {
                await interaction.reply({ content: 'Nenhum jogador encontrado!', ephemeral: true });
                return;
            }

            const playersMetGoal = players.filter(player => player.metGoal);
            const playersNotMetGoal = players.filter(player => !player.metGoal);

            const playersPerPage = 10;
            let replySent = false;

            // Embeds para jogadores que NÃO bateram a meta
            if (playersNotMetGoal.length > 0) {
                const totalPagesNotMet = Math.ceil(playersNotMetGoal.length / playersPerPage);
                for (let i = 0; i < totalPagesNotMet; i++) {
                    const start = i * playersPerPage;
                    const end = start + playersPerPage;
                    const currentPlayers = playersNotMetGoal.slice(start, end);

                    const embed = new EmbedBuilder()
                        .setTitle(`❌ Metas Não Atingidas - Página ${i + 1}/${totalPagesNotMet}`)
                        .setDescription(currentPlayers.map(player => {
                            const discordUser = interaction.guild.members.cache.get(player.discordId);
                            const username = discordUser ? discordUser.user.username : 'Jogador Desconhecido';

                            // Calcular quanto falta de cada recurso
                            const faltaPlastico = Math.max(0, metas.plastico - player.plastico);
                            const faltaSeda = Math.max(0, metas.seda - player.seda);
                            const faltaFolha = Math.max(0, metas.folha - player.folha);
                            const faltaCascaSemente = Math.max(0, metas.cascaSemente - player.cascaSemente);

                            return `**${username}**\n` +
                                   `🧪 Falta Plástico: ${faltaPlastico}\n` +
                                   `📄 Falta Seda: ${faltaSeda}\n` +
                                   `🌿 Falta Folha: ${faltaFolha}\n` +
                                   `🌱 Falta Casca/Semente: ${faltaCascaSemente}\n`;
                        }).join('\n'))
                        .setColor(0xFF0000) // Vermelho para quem não atingiu
                        .setTimestamp();

                    if (!replySent) {
                        await interaction.reply({ embeds: [embed] });
                        replySent = true;
                    } else {
                        await interaction.followUp({ embeds: [embed] });
                    }
                }
            }

            // Embeds para jogadores que bateram a meta
            if (playersMetGoal.length > 0) {
                const totalPagesMet = Math.ceil(playersMetGoal.length / playersPerPage);
                for (let i = 0; i < totalPagesMet; i++) {
                    const start = i * playersPerPage;
                    const end = start + playersPerPage;
                    const currentPlayers = playersMetGoal.slice(start, end);

                    const embed = new EmbedBuilder()
                        .setTitle(`✅ Metas Atingidas - Página ${i + 1}/${totalPagesMet}`)
                        .setDescription(currentPlayers.map(player => {
                            const discordUser = interaction.guild.members.cache.get(player.discordId);
                            const username = discordUser ? discordUser.user.username : 'Jogador Desconhecido';
                            // Exibe apenas o nome para quem atingiu a meta
                            return `**${username}**`;
                        }).join('\n'))
                        .setColor(0x00FF00) // Verde para quem atingiu
                        .setTimestamp();

                    if (!replySent) {
                        await interaction.reply({ embeds: [embed] });
                        replySent = true;
                    } else {
                        await interaction.followUp({ embeds: [embed] });
                    }
                }
            }

            // Mensagem caso nenhuma lista tenha jogadores (improvável, mas para segurança)
            if (playersMetGoal.length === 0 && playersNotMetGoal.length === 0 && !replySent) {
                await interaction.reply({ content: 'Nenhum jogador encontrado!', ephemeral: true });
            }
        }
    },
}; 