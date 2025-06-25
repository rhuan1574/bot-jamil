const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Player = require('../../database/models/Player.js');

// Definir as metas aqui também para uso neste comando
const metas = {
    cascaSemente: 120,
    folha: 120,
    seda: 120,
    plastico: 40
};

// **IDs de jogadores a serem excluídos da análise geral**
// Adicione os IDs dos usuários que você não quer que apareçam na lista geral aqui.
// Exemplo: const excludedPlayerIds = ['ID_DO_USUARIO_1', 'ID_DO_USUARIO_2'];
const excludedPlayerIds = ["511895119784443914", "509841862350077960"]; // Adicione os IDs aqui, entre as aspas e separados por vírgula

function formatarTempo(minutos) {
    if (!minutos || minutos <= 0) return 'Agora pouco';
    const dias = Math.floor(minutos / 1440);
    const horas = Math.floor((minutos % 1440) / 60);
    const mins = minutos % 60;
    let str = '';
    if (dias > 0) str += `${dias}d `;
    if (horas > 0) str += `${horas}h `;
    if (mins > 0) str += `${mins}m`;
    return str.trim() + ' atrás';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('analisar-farm')
        .setDescription('Analisa quanto cada jogador deve farmar')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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
                    `🕒 Última verificação: ${player.lastChecked ? new Date(player.lastChecked).toLocaleString('pt-BR') : 'Nunca'}\n` +
                    (!player.metGoal && player.tempoSemMeta ? `⏳ Tempo sem bater a meta: ${formatarTempo(player.tempoSemMeta)}\n` : '') +
                    `\n**Recursos Atuais:**\n` +
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

            await interaction.reply({ embeds: [embed] ,ephemeral: true});
        } else {
            // Análise de todos os jogadores em uma única embed, com paginação
            const players = await Player.find().sort({ metGoal: 1, lastChecked: 1 });
            
            // **Filtrar jogadores excluídos**
            const filteredPlayers = players.filter(player => !excludedPlayerIds.includes(player.discordId));

            if (filteredPlayers.length === 0) {
                await interaction.reply({ content: 'Nenhum jogador encontrado para análise!', ephemeral: true });
                return;
            }

            const playersPerPage = 10;
            const totalPages = Math.ceil(filteredPlayers.length / playersPerPage);
            let replySent = false;

            for (let i = 0; i < totalPages; i++) {
                const start = i * playersPerPage;
                const end = start + playersPerPage;
                const currentPlayers = filteredPlayers.slice(start, end);

                const embedDescription = currentPlayers.map(player => {
                    const discordUser = interaction.guild.members.cache.get(player.discordId);
                    const username = discordUser ? discordUser.user.username : 'Jogador Desconhecido';

                    if (player.metGoal) {
                        return `✅ <@${player.discordId}>`; // Bateu a meta, só mostra a menção com ✅
                    } else {
                        // Não bateu a meta, mostra o tempo sem meta
                        let tempo = player.tempoSemMeta ? formatarTempo(player.tempoSemMeta) : 'Nunca registrado';
                        return `❌ <@${player.discordId}> - ${tempo}`;
                    }
                }).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle(`📊 Análise de Farm - Todos os Jogadores - Página ${i + 1}/${totalPages}`)
                    .setDescription(embedDescription)
                    .setColor(0x0099FF) // Cor neutra para a lista geral
                    .setTimestamp();

                if (!replySent) {
                    await interaction.reply({ embeds: [embed] ,ephemeral: true});
                    replySent = true;
                } else {
                    await interaction.followUp({ embeds: [embed] ,ephemeral: true});
                }
            }
        }
    },
}; 