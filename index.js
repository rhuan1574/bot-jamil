require('dotenv').config();
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
    ] 
});

client.commands = new Collection();
client.cooldowns = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

client.login(process.env.DISCORD_TOKEN)
    .then(() => console.log('Login iniciado...'))
    .catch(error => console.error('❌ Erro ao fazer login:', error));

client.on('guildMemberAdd', member => {
  // Código a ser executado quando um usuário entra no servidor
  console.log(`${member.user.tag} entrou no servidor.`);
  const welcomeEmbed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Bem-vindo!')
    .setDescription(`Olá ${member.user.tag}, bem-vindo ao servidor!`)
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp();
  // Exemplo: Enviar uma mensagem de boas-vindas
  member.guild.channels.cache.get('1386010443868541041').send(`${member.user.tag} entrou no servidor!`, { embeds: [welcomeEmbed] });
});

client.on('guildMemberRemove', member => {
  // Código a ser executado quando um usuário sai do servidor
  console.log(`${member.user.tag} saiu do servidor.`);
  // Exemplo: Enviar uma mensagem de despedida
  member.guild.channels.cache.get('1386010443868541042').send(`${member.user.tag} saiu do servidor.`);
});