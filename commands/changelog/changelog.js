const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("changelog")
        .setDescription("Mostra as últimas atualizações do bot"),

    async execute(interaction) {
        const changelogEmbed = new EmbedBuilder()
            .setTitle("📋 Changelog - Bot Versalhes")
            .setDescription("Histórico das últimas atualizações do bot")
            .setColor("#00ff88")
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                {
                    name: "🆕 Versão 1.2.0",
                    value: "• Sistema de mensagens de boas-vindas e despedidas\n• Embeds personalizados para eventos\n• Comando de changelog adicionado\n• Melhorias na estrutura de eventos",
                    inline: false
                },
                {
                    name: "🔧 Versão 1.1.0",
                    value: "• Sistema de parcerias implementado\n• Comandos de farm otimizados\n• Sistema de ausências\n• Comandos administrativos",
                    inline: false
                },
                {
                    name: "🚀 Versão 1.0.0",
                    value: "• Lançamento inicial do bot\n• Sistema de registro de jogadores\n• Comandos básicos de administração\n• Integração com banco de dados",
                    inline: false
                }
            )
            .setFooter({ 
                text: `Solicitado por ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({ embeds: [changelogEmbed] });
    }
};
