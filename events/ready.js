const { Events, EmbedBuilder } = require('discord.js');
const schedule = require('node-schedule');
const { conectarMongo } = require("../database/connect.js");
const { setupAgendador } = require('../agendador/agendador.js');
const Player = require('../database/models/Player');

const metas = {
    cascaSemente: 120,
    folha: 120,
    seda: 120,
    plastico: 40
};

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        setupAgendador(client);

        try {
            await conectarMongo();

            // Inicializar jogadores no banco
            const guild = client.guilds.cache.get(process.env.GUILD_ID);
            if (guild) {
                const members = await guild.members.fetch();
                for (const [id, member] of members) {
                    if (!member.user.bot) {
                        let player = await Player.findOne({ discordId: id });
                        if (!player) {
                            await Player.create({
                                discordId: id,
                                username: member.user.username
                            });
                        }
                    }
                }
                console.log(`Inicializados ${members.size} membros no banco de dados.`);
            } else {
                console.error('Guild não encontrada. Verifique o GUILD_ID no .env.');
            }

            // Reset diário ajustado para 11:30 AM (UTC-3 = 14:30 UTC)
            schedule.scheduleJob('43 11 * * *', async function() {
                try {
                    const updatedCount = await Player.updateMany(
                        {},
                        {
                            plastico: 0,
                            seda: 0,
                            folha: 0,
                            cascaSemente: 0,
                            lastReset: new Date()
                        }
                    );
                    console.log(`Valores de farm resetados para ${updatedCount.modifiedCount} jogadores.`);
                } catch (error) {
                    console.error('Erro ao resetar valores diários:', error);
                }
            });

            // Notificação ajustada para 11:31 AM (UTC-3 = 14:31 UTC)
            schedule.scheduleJob('45 11 * * *', async function() {
                try {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Início do dia
                    console.log('Iniciando busca por jogadores que não bateram a meta...');

                    // Buscar jogadores que não bateram a meta e não estão isentos
                    const players = await Player.find({
                        $or: [
                            { plastico: { $lt: metas.plastico } },
                            { seda: { $lt: metas.seda } },
                            { folha: { $lt: metas.folha } },
                            { cascaSemente: { $lt: metas.cascaSemente } }
                        ],
                        lastReset: { $gte: today }
                    });
                    console.log(`Total de jogadores encontrados que não bateram a meta: ${players.length}`);

                    const nonCompliantPlayers = players.filter(player => {
                        const isento = player.isencaoAte && new Date(player.isencaoAte) > new Date();
                        console.log(`Jogador ${player.username} (ID: ${player.discordId}) - Isento: ${isento} - Valores: plastico=${player.plastico}, seda=${player.seda}, folha=${player.folha}, cascaSemente=${player.cascaSemente}`);
                        return !isento;
                    });
                    console.log(`Jogadores não conformes após filtro de isenção: ${nonCompliantPlayers.length}`);

                    if (nonCompliantPlayers.length > 0) {
                        const embed = new EmbedBuilder()
                            .setTitle('⚠️ Aviso: Jogadores sem Meta')
                            .setDescription('Os seguintes jogadores não bateram a meta hoje:\n' +
                                nonCompliantPlayers.map(p => `- <@${p.discordId}> (${p.username})`).join('\n'))
                            .setColor(0xFF0000)
                            .setTimestamp();

                        const channelId = '1372062603563765760'; // ID do canal notificacoes-membros
                        const channel = client.channels.cache.get(channelId);
                        if (channel) {
                            await channel.send({ embeds: [embed] });
                            console.log(`Notificação enviada ao canal ${channelId} com sucesso.`);
                        } else {
                            console.error(`Canal ${channelId} não encontrado. Verifique o ID ou permissões do bot.`);
                        }
                    } else {
                        console.log('Nenhum jogador sem meta hoje às 11:31 AM.');
                    }
                } catch (error) {
                    console.error('Erro ao processar agendamento:', error);
                }
            });

        } catch (error) {
            console.error('❌ Falha ao conectar ao MongoDB ou inicializar jogadores:', error);
        }
    },
};