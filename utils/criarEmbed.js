const { EmbedBuilder } = require('discord.js');

module.exports = function criarEmbed({ title, color, fields, footer, thumbnail, image, description }) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setFooter({ text: footer })
    .setTimestamp();
  if (fields) embed.addFields(...fields);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (description) embed.setDescription(description);
  return embed;
}; 