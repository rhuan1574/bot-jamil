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

            // Reset diário ajustado para 11:17 AM (UTC-3 = 14:17 UTC)
            schedule.scheduleJob('17 11 * * *', async function() {
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

            // Notificação ajustada para 11:18 AM (UTC-3 = 14:18 UTC)
            schedule.scheduleJob('18 11 * * *', async function() {
                try {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Início do dia
                    console.log('Buscando jogadores que não bateram a meta...');

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
                    console.log(`Encontrados ${players.length} jogadores que não bateram a meta.`);

                    const nonCompliantPlayers = players.filter(player => {
                        const isento = player.isencaoAte && new Date(player.isencaoAte) > new Date();
                        console.log(`Jogador ${player.username} (ID: ${player.discordId}) - Isento: ${isento}`);
                        return !isento;
                    });
                    console.log(`Após filtro de isenção, ${nonCompliantPlayers.length} jogadores não conformes.`);

                    if (nonCompliantPlayers.length > 0) {
                        const embed = new EmbedBuilder()
                            .setTitle('⚠️ Aviso: Jogadores sem Meta')
                            .setDescription('Os seguintes jogadores não bateram a meta hoje:\n' +
                                nonCompliantPlayers.map(p => `- <@${p.discordId}> (${p.username})`).join('\n'))
                            .setColor(0xFF0000)
                            .setTimestamp();

                        const channel = client.channels.cache.get('1371460411521503332');
                        if (channel) {
                            await channel.send({ embeds: [embed] });
                            console.log('Notificação enviada ao canal 1371460411521503332.');
                        } else {
                            console.error('Canal 1371460411521503332 não encontrado.');
                        }
                    } else {
                        console.log('Nenhum jogador sem meta hoje às 11:18 AM.');
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