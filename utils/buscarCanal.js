module.exports = function buscarCanal(guild, nomeCanal) {
  return guild.channels.cache.find(channel => channel.name === nomeCanal);
}; 