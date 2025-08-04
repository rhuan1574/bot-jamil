const { Events, EmbedBuilder } = require('discord.js');
const schedule = require('node-schedule');
const { conectarMongo } = require("../database/connect.js");
const { setupAgendador } = require('../agendador/agendador.js');
const Player = require('../database/models/Player');

const metas = {
  aluminio: 220, // 123 DIARIO
  borracha: 180, // 93 DIARIO
  cobre: 180, // 93 DIARIO
  ferro: 220, // 123 DIARIO
  plastico: 180,// 93 DIARIO
};
const IDS_ISENTOS = [
    '1259732363810701359', // Substitua por IDs reais
    '1017805814473445377',
    '204806017442250753',
    '470005740812238848',
    '1328138205588885525',
    '703029368829509752',
    '335193548565774337',
    // ...
];
module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
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

            // Reset diário às 00:00 (UTC-3 = 03:00 UTC)
            schedule.scheduleJob('0 3 * * *', async function() {
                try {
                    const jogadores = await Player.find();
                    const now = new Date();
                    let updates = [];
                    for (const player of jogadores) {
                        let tempoSemMeta = 0;
                        if (!player.metGoal && player.lastChecked) {
                            tempoSemMeta = Math.floor((now - player.lastChecked) / 60000); // minutos
                        }
                        updates.push({
                            updateOne: {
                                filter: { discordId: player.discordId },
                                update: {
                                    plastico: 0,
                                    borracha: 0,
                                    cobre: 0,
                                    aluminio: 0,
                                    ferro: 0,
                                    lastReset: now,
                                    metGoal: false,
                                    tempoSemMeta: tempoSemMeta
                                }
                            }
                        });
                    }
                    if (updates.length > 0) {
                        await Player.bulkWrite(updates);
                    }
                    console.log(`Reset diário às 00:00 realizado para ${updates.length} jogadores.`);
                } catch (error) {
                    console.error('Erro ao resetar valores diários às 00:00:', error);
                }
            });

            // Notificação ajustada para 11:31 AM (UTC-3 = 14:31 UTC)
            schedule.scheduleJob('00 20 * * 1-6', async function() {
                try {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Início do dia
                    console.log('Iniciando busca por jogadores que não bateram a meta...');

                    // Buscar jogadores que não bateram a meta e não estão isentos
                    const players = await Player.find({
                        $or: [
                            { plastico: { $lt: metas.plastico } },
                            { cobre: { $lt: metas.cobre } },
                            { aluminio: { $lt: metas.aluminio } },
                            { ferro: { $lt: metas.ferro } },
                            { borracha: { $lt: metas.borracha } }
                        ],
                        lastReset: { $gte: today }
                    });
                    console.log(`Total de jogadores encontrados que não bateram a meta: ${players.length}`);

                    const nonCompliantPlayers = players.filter(player => {
                        const isento = player.isencaoAte && new Date(player.isencaoAte) > new Date();
                        const isIdIsento = IDS_ISENTOS.includes(player.discordId);
                        console.log(`Jogador ${player.username} (ID: ${player.discordId}) - Isento: ${isento} - ID Isento: ${isIdIsento} - Valores: plastico=${player.plastico}, cobre=${player.cobre}, aluminio=${player.aluminio}, ferro=${player.ferro}, borracha=${player.borracha}`);
                        return !isento && !isIdIsento;
                    });
                    console.log(`Jogadores não conformes após filtro de isenção: ${nonCompliantPlayers.length}`);

                    if (nonCompliantPlayers.length > 0) {
                        const embed = new EmbedBuilder()
                            .setTitle('⚠️ Aviso: Jogadores sem Meta')
                            .setDescription('Os seguintes jogadores não bateram a meta da semana:\n' +
                                nonCompliantPlayers.map(p => `- <@${p.discordId}> (${p.username})`).join('\n'))
                            .setColor(0xFF0000)
                            .setTimestamp();

                        const channelId = '1398019456675876864'; // ID do canal notificacoes-membros
                        const channel = client.channels.cache.get(channelId);
                        if (channel) {
                            await channel.send({content: `Atenção <@&1292974126386122865>!`, embeds: [embed] });
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