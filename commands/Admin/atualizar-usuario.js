const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');
const Player = require('../../database/models/Player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('atualizar-usuario')
        .setDescription('Adiciona ou atualiza um usuário no banco de dados')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('O usuário para adicionar/atualizar')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const usuario = interaction.options.getUser('usuario');
            
            let player = await Player.findOne({ discordId: usuario.id });
            if (!player) {
                // Cria um novo jogador com valores padrão
                player = new Player({
                    discordId: usuario.id,
                    username: usuario.username,
                    metGoal: false,
                    lastChecked: new Date(),
                    plastico: 0,
                    seda: 0,
                    folha: 0,
                    cascaSemente: 0,
                    dinheiro: 0
                });
                await player.save();
                return interaction.editReply(`✅ Usuário ${usuario.username} foi adicionado ao banco de dados com sucesso!`);
            } else {
                return interaction.editReply(`ℹ️ Usuário ${usuario.username} já existe no banco de dados.`);
            }
        } catch (error) {
            console.error('Erro ao adicionar usuário:', error);
            return interaction.editReply('❌ Ocorreu um erro ao adicionar o usuário.');
        }
    },
}; 