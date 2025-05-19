// agendador.js
const schedule = require('node-schedule');
const { EmbedBuilder } = require('discord.js');

function setupAgendador(client) {
    // Canal onde os lembretes serão enviados
    const getCanais = (guild) => ({
        membros: guild.channels.cache.find(ch => ch.name === '📌・notificacoes-membros'),
        gerentes: guild.channels.cache.find(ch => ch.name === '📌・notificacoes-gerentes')
    });

    // Tarefa das 15h - Lembrete para membros
    schedule.scheduleJob('00 15 * * *', async () => {
        console.log(`[15h] Tarefa executada às ${new Date().toLocaleString()}`);
        client.guilds.cache.forEach(guild => {
            const { membros } = getCanais(guild);
            if (membros) {
                membros.send({
                    content: '<@&1115002717434298530>',
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('🕒 Lembrete das 15h')
                            .setDescription('Não se esqueçam de registrar os itens do farm!')
                            .setColor('#0099FF')
                            .setTimestamp()
                    ]
                });
            }
        });
    });

    // Tarefa das 23h - Relatório para gerentes
    schedule.scheduleJob('00 23 * * *', async () => {
        console.log(`[23h] Tarefa executada às ${new Date().toLocaleString()}`);
        client.guilds.cache.forEach(guild => {
            const { gerentes } = getCanais(guild);
            if (gerentes) {
                gerentes.send({
                    content: '<@&1292671789222334514>',
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('📊 Relatório das 23h')
                            .setDescription('Hora de revisar as metas do dia e enviar os relatórios.')
                            .setColor('#FF9900')
                            .setTimestamp()
                    ]
                });
            }
        });
    });

    console.log('⏳ Tarefas agendadas para 15h e 23h configuradas.');
}

module.exports = { setupAgendador };
