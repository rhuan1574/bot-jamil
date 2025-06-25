const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Player = require('../../database/models/Player.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verificar-farm')
        .setDescription('Verifica que o jogador bateu a meta de farm')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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

        // Checar se atingiu todas as metas
        const metas = {
            cascaSemente: 120,
            folha: 120,
            seda: 120,
            plastico: 40
        };
        const faltando = [];
        if (player.plastico < metas.plastico) faltando.push(`🧪 Plástico: ${player.plastico}/${metas.plastico}`);
        if (player.seda < metas.seda) faltando.push(`📄 Seda: ${player.seda}/${metas.seda}`);
        if (player.folha < metas.folha) faltando.push(`🌿 Folha: ${player.folha}/${metas.folha}`);
        if (player.cascaSemente < metas.cascaSemente) faltando.push(`🌱 Casca/Semente: ${player.cascaSemente}/${metas.cascaSemente}`);

        if (faltando.length > 0) {
            await interaction.reply({
                content: `❌ O jogador ainda não atingiu todas as metas de farm!\nFaltando:\n${faltando.join('\n')}`,
                ephemeral: true
            });
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