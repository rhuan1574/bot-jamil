const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');
const Player = require('../../database/models/Player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('atualizar-usuario')
        .setDescription('Atualiza informações de um usuário no banco de dados')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('individual')
                .setDescription('Atualiza um usuário específico')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('O usuário para atualizar')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('campo')
                        .setDescription('O campo para atualizar')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Dinheiro', value: 'dinheiro' },
                            { name: 'Plástico', value: 'plastico' },
                            { name: 'Seda', value: 'seda' },
                            { name: 'Folha', value: 'folha' },
                            { name: 'Casca de Semente', value: 'cascaSemente' },
                            { name: 'Meta Alcançada', value: 'metGoal' }
                        ))
                .addStringOption(option =>
                    option.setName('valor')
                        .setDescription('O novo valor')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('lote')
                .setDescription('Atualiza múltiplos usuários')
                .addStringOption(option =>
                    option.setName('campo')
                        .setDescription('O campo para atualizar')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Dinheiro', value: 'dinheiro' },
                            { name: 'Plástico', value: 'plastico' },
                            { name: 'Seda', value: 'seda' },
                            { name: 'Folha', value: 'folha' },
                            { name: 'Casca de Semente', value: 'cascaSemente' },
                            { name: 'Meta Alcançada', value: 'metGoal' }
                        ))
                .addStringOption(option =>
                    option.setName('valor')
                        .setDescription('O novo valor')
                        .setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();

        const subcommand = interaction.options.getSubcommand();
        const campo = interaction.options.getString('campo');
        const valor = interaction.options.getString('valor');

        try {
            if (subcommand === 'individual') {
                const usuario = interaction.options.getUser('usuario');
                
                let player = await Player.findOne({ discordId: usuario.id });
                if (!player) {
                    // Cria um novo jogador se não existir
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
                }

                // Converte o valor para o tipo apropriado
                let valorConvertido = valor;
                if (campo === 'metGoal') {
                    valorConvertido = valor.toLowerCase() === 'true';
                } else {
                    valorConvertido = parseInt(valor);
                    if (isNaN(valorConvertido)) {
                        return interaction.editReply('❌ Valor inválido! Por favor, digite um número válido.');
                    }
                }

                // Atualiza o campo específico
                player[campo] = valorConvertido;
                await player.save();

                return interaction.editReply(`Usuário ${usuario.username} ${!player ? 'criado e ' : ''}atualizado com sucesso!`);
            } else if (subcommand === 'lote') {
                // Converte o valor para o tipo apropriado
                let valorConvertido = valor;
                if (campo === 'metGoal') {
                    valorConvertido = valor.toLowerCase() === 'true';
                } else {
                    valorConvertido = parseInt(valor);
                    if (isNaN(valorConvertido)) {
                        return interaction.editReply('❌ Valor inválido! Por favor, digite um número válido.');
                    }
                }

                // Atualiza todos os usuários
                const result = await Player.updateMany({}, { [campo]: valorConvertido });
                
                return interaction.editReply(`Atualização em lote concluída! ${result.modifiedCount} usuários foram atualizados.`);
            }
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            return interaction.editReply('Ocorreu um erro ao atualizar o usuário.');
        }
    },
}; 