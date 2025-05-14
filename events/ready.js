const { Events } = require('discord.js');
const schedule = require('node-schedule');
const { conectarMongo } = require("../database/connect.js");
const { setupAgendador } = require('../agendador/agendador.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        setupAgendador(client);

        // Agenda as cobranças para serem enviadas todos os dias às 10:00
        schedule.scheduleJob('0 10 * * *', async function() {
            try {
                const embed = {
                    title: '⚠️ Lembrete de Farm',
                    description: 'Você tem Farm pendente para hoje! Por favor, realize seu Farm e envie a prova usando o comando `/verificar-farm`.',
                    color: 0xFF0000,
                    timestamp: new Date()
                };
                // Implemente a lógica para enviar mensagens aqui
            } catch (error) {
                console.error('Erro ao enviar cobranças:', error);
            }
        });

        try {
            await conectarMongo();
        } catch (error) {
            console.error('❌ Falha ao conectar ao MongoDB, mas o bot continuará funcionando:', error);
        }
    },
};