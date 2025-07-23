const { REST, Routes } = require('discord.js');
require('dotenv').config(); // Carrega variáveis do .env
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    // Verifica se é uma pasta
    if (!fs.lstatSync(commandsPath).isDirectory()) continue;
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`\x1b[33m[WARNING]\x1b[0m O comando em ${filePath} está sem a propriedade obrigatória 'data' ou 'execute'.`);
        }
    }
}
// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// and deploy your commands!
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // Registrar comandos no guild específico (mais rápido para testes)
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands for guild ${process.env.GUILD_ID}.`);
    } catch (error) {
        console.error('Error reloading commands:', error);
    }
})();