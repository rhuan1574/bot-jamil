module.exports = function buscarCargo(guild, nomeCargo) {
  return guild.roles.cache.find(role => role.name === nomeCargo);
}; 