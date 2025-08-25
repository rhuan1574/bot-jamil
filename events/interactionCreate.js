const {
  Events,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  WebhookClient,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  AttachmentBuilder,
} = require("discord.js");
const Player = require("../database/models/Player");
const WebhookClientRegistro = new WebhookClient({
  id: process.env.ID_WEBHOOK,
  token: process.env.TOKEN_WEBHOOK,
});
const webhookClientRecibo = new WebhookClient({
  id: process.env.ID_WEBHOOK_RECIBO,
  token: process.env.TOKEN_WEBHOOK_RECIBO,
});
const webhookClientLog = new WebhookClient({
  id: process.env.ID_WEBHOOK_LOG,
  token: process.env.TOKEN_WEBHOOK_LOG,
});
const { conectarMongo } = require("../database/connect.js");
const handleParcerias = require("./interaction/parcerias.js");
const ParceriasManager = require("../utils/parceriasManager");
const handleAusencias = require("./interaction/ausencias");
const handleRegistro = require("./interaction/registro");
const tunagemObj = require("../constants/items.js");
const tunagem = tunagemObj.tunagem;
const reciboTunagemStates = new Map();

// Sistema de metas e controle diário
const metas = {
  aluminio: 120, // 123 DIARIO | MAXIMO 5000 | MEDIA DE 208 POR PESSOA | 400 por pessoa
  borracha: 150, // 93 DIARIO | MAXIMO 1666 | MEDIA DE 70 POR PESSOA | 300 por pessoa
  cobre: 150, // 93 DIARIO | MAXIMO 5000 | MEDIA DE 208 POR PESSOA | 400 por pessoa
  ferro: 150, // 123 DIARIO | MAXIMO 2500 | MEDIA DE 105 POR PESSOA | 200 por pessoa
  plastico: 130, // 93 DIARIO | MAXIMO 5000 | MEDIA DE 208 POR PESSOA | 400 por pessoa
};

const acaoStates = new Map();

// Valor diário em dinheiro
const VALOR_DIARIO = 12000;

// Função para verificar isenção de cobrança
function isIsento(player) {
  if (!player || !player.isencaoAte) return false;
  return new Date() < new Date(player.isencaoAte);
}

// Função para processar comprovante de farm
const handleComprovanteFarm = async (
  msg,
  interaction,
  player,
  metas,
  deleteDelay = 60000
) => {
  if (msg.attachments.size === 0) {
    await msg.channel.send({
      content: "❌ Por favor, envie uma imagem como comprovante!",
    });
    return;
  }

  const attachment = msg.attachments.first();
  const embedMetaComprovante = new EmbedBuilder()
    .setTitle("🎉 Parabéns! Todas as metas foram atingidas!")
    .setDescription(
      `O membro <@${interaction.user.id}> atingiu todas as metas diárias! Os valores serão resetados à meia-noite.`
    )
    .addFields(
      { name: "🧪 Plástico", value: `${player.plastico}/${metas.plastico}` },
      { name: "🍃 Borracha", value: `${player.borracha}/${metas.borracha}` },
      { name: "🍃 Ferro", value: `${player.ferro}/${metas.ferro}` },
      { name: "🌱 Alumínio", value: `${player.aluminio}/${metas.aluminio}` },
      { name: "🍃 Cobre", value: `${player.cobre}/${metas.cobre}` }
    )
    .setImage(`attachment://${attachment.name}`)
    .setColor("#00FF00")
    .setFooter({
      text: `Gerado por ${interaction.user.tag}`,
      iconURL: interaction.user.displayAvatarURL(),
    })
    .setTimestamp();

  // Calcular isenção ao atingir todas as metas
  const agora = new Date();
  const isencaoAte = new Date(agora.getTime() + 24 * 60 * 60 * 1000); // 1 dia de isenção
  player.isencaoAte = isencaoAte;
  await player.save();

  const canalLogs = interaction.guild.channels.cache.find(
    (channel) => channel.name === "🔐・logs-farm"
  );
  const canalNotificacao = interaction.guild.channels.cache.find(
    (channel) => channel.name === "📌・notificacoes-gerentes"
  );
  await Promise.all([
    msg.channel.send({
      content: "Imagem recebida com sucesso!",
      embeds: [embedMetaComprovante],
      files: [attachment],
    }),
    canalNotificacao?.send({
      content: "<@&1292671789222334514>",
      embeds: [embedMetaComprovante],
      files: [attachment],
    }),
  ]);

  setTimeout(() => msg.delete().catch(() => {}), deleteDelay);
};

// Função para processar pagamento em dinheiro
const handlePagamentoDinheiro = async (msg, interaction, valor, player) => {
  if (msg.attachments.size === 0) {
    await msg.channel.send({
      content: "❌ Por favor, envie uma imagem como comprovante!",
    });
    return;
  }

  const attachment = msg.attachments.first();
  const userId = interaction.user.id;

  // Verificar se o valor é múltiplo de 16.000
  const diasPagos = Math.floor(valor / VALOR_DIARIO);
  if (valor % VALOR_DIARIO !== 0 || diasPagos === 0) {
    const embedErro = new EmbedBuilder()
      .setTitle("❌ Valor Inválido")
      .setDescription(
        `O valor pago (${valor}) não é um múltiplo de ${VALOR_DIARIO}. Por favor, envie o valor correto.`
      )
      .setColor("#FF0000");
    const canalNotificacao = interaction.guild.channels.cache.find(
      (channel) => channel.name === "notificacoes-gerentes"
    );
    await Promise.all([
      msg.channel.send({ embeds: [embedErro] }),
      canalNotificacao?.send({
        content: `<@&1370136458278604822> Usuário <@${userId}> enviou valor incorreto: ${valor}`,
        embeds: [embedErro],
      }),
    ]);
    return;
  }

  // Calcular isenção
  const agora = new Date();
  const isencaoAte = new Date(
    agora.getTime() + diasPagos * 24 * 60 * 60 * 1000
  );
  player.dinheiro += valor;
  player.isencaoAte = isencaoAte;
  player.lastChecked = new Date();
  player.metGoal = true;
  await player.save();

  // Embed de confirmação
  const embedConfirmacao = new EmbedBuilder()
    .setTitle("💵 Pagamento Confirmado")
    .setDescription(
      `O <@${
        interaction.user.id
      }> pagou ${valor} (equivalente a ${diasPagos} dia${
        diasPagos > 1 ? "s" : ""
      }). Ele está isento de cobranças até ${isencaoAte.toLocaleString()}.`
    )
    .setImage(`attachment://${attachment.name}`)
    .setColor("#00FF00")
    .setTimestamp();

  const canalLogs = interaction.guild.channels.cache.find(
    (channel) => channel.name === "🔐・logs-farm"
  );
  const canalNotificacao = interaction.guild.channels.cache.find(
    (channel) => channel.name === "📌・notificacoes-gerentes"
  );
  await Promise.all([
    msg.channel.send({ embeds: [embedConfirmacao], files: [attachment] }),
    canalLogs?.send({ embeds: [embedConfirmacao], files: [attachment] }),
    canalNotificacao?.send({ embeds: [embedConfirmacao], files: [attachment] }),
  ]);

  // Confirmação no canal original
  await interaction.editReply({
    content: "✅ Pagamento registrado com sucesso!",
    embeds: [embedConfirmacao],
    files: [attachment],
  });
};
const createServiceSelectMenu = (tunagemParam) => {
  const lista = Array.isArray(tunagemParam) ? tunagemParam : [];
  return new StringSelectMenuBuilder()
    .setCustomId("tunagem_menu")
    .setMinValues(1)
    .setMaxValues(6)
    .setPlaceholder("Selecione até 6 serviços...")
    .addOptions(
      lista.map((item) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(item.label)
          .setDescription(item.description)
          .setValue(item.value)
      )
    );
};
const createConfirmButton = () => {
  return new ButtonBuilder()
    .setCustomId("confirmar")
    .setLabel("Confirmar")
    .setStyle(ButtonStyle.Success)
    .setEmoji("✅");
};

const createEmbed = ({ title, description, color }) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color);
};

const handleServiceSelection = async (
  interaction,
  selectedServices,
  tunagem,
  rows
) => {
  const description =
    selectedServices
      .map(
        (value) =>
          tunagem.find((item) => item.value === value)?.label ||
          "Serviço desconhecido"
      )
      .join("\n") || "Nenhum serviço selecionado.";

  const updatedEmbed = createEmbed({
    title: "Serviços Selecionados",
    description,
    color: "#0099ff",
  });

  await interaction.update({
    embeds: [updatedEmbed],
    components: rows,
  });
};

const handleImageSubmission = async (
  message,
  interaction,
  selectedServices,
  deleteDelay
) => {
  const attachment = message.attachments.first();
  if (!attachment) {
    await interaction.followUp({
      content:
        "❌ Nenhuma imagem foi enviada. Envie uma imagem de comprovante neste canal.",
      flags: 64,
    });
    return;
  }

  const embedRecebido = createEmbed({
    title: "Comprovante gerado com sucesso!",
    description: `Serviços realizados:\n${selectedServices.join("\n")}`,
    color: "#00ff00",
  })
    .setImage(attachment.url)
    .setFooter({
      text: `Gerado por ${interaction.user.tag}`,
      iconURL: interaction.user.displayAvatarURL(),
    })
    .setTimestamp();

  // Envia confirmações e registros
  await Promise.all([
    interaction.followUp({
      content: "Imagem recebida com sucesso!",
      embeds: [embedRecebido],
      flags: 64,
    }),
    webhookClientRecibo.send({ embeds: [embedRecebido] }),
    webhookClientLog.send({ embeds: [embedRecebido] }),
  ]);

  // Agenda a deleção da mensagem
  setTimeout(() => message.delete().catch(console.error), deleteDelay);
};
// Função auxiliar para atualizar componentes do menu de tunagem
function updateTunagemComponents(selectedServices, rows) {
  // Habilita o botão só se houver seleção
  if (rows[1] && rows[1].components[0]) {
    rows[1].components[0].setDisabled(selectedServices.length === 0);
  }
  return rows;
}
// Constantes
const TIMEOUT_INTERACTION = 60_000;
const TIMEOUT_MODAL = 120_000;

// Configurações do Modal
const createItemModal = () => {
  const modal = new ModalBuilder()
    .setCustomId("catalogar_itens")
    .setTitle("📦 Catalogar Itens Ilegais");

  const inputs = {
    quantidade: new TextInputBuilder()
      .setCustomId("quantidade_itens")
      .setLabel("📊 Quantidade de Itens:")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder("Digite apenas números"),

    tipo: new TextInputBuilder()
      .setCustomId("tipo_item")
      .setLabel("📌 Tipo de Item:")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder("Ex: Drogas, Armas, etc"),
  };

  return modal.addComponents(
    new ActionRowBuilder().addComponents(inputs.quantidade),
    new ActionRowBuilder().addComponents(inputs.tipo)
  );
};

// Componentes UI
const createUIComponents = () => {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("itens_ilegais_menu")
    .setMinValues(1)
    .setMaxValues(6)
    .setPlaceholder("Selecione até 6 itens...")
    .addOptions(
      itensIlegais.map((item) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(item.label)
          .setDescription(item.description)
          .setValue(item.value)
      )
    );

  const confirmButton = new ButtonBuilder()
    .setCustomId("confirmar_bau")
    .setLabel("Confirmar")
    .setStyle(ButtonStyle.Success)
    .setEmoji("✅")
    .setDisabled(true);

  return {
    rows: [
      new ActionRowBuilder().addComponents(selectMenu),
      new ActionRowBuilder().addComponents(confirmButton),
    ],
    updateButton: (disabled = false) => confirmButton.setDisabled(disabled),
  };
};
module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`Comando ${interaction.commandName} não encontrado.`);
        return;
      }
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(
          `Erro ao executar o comando ${interaction.commandName}:`,
          error
        );
        const errorMessage = {
          content: "❌ Houve um erro ao executar este comando!",
          flags: MessageFlags.Ephemeral,
        };
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
          } else if (!interaction.acknowledged) {
            await interaction.reply(errorMessage);
          }
        } catch (err) {
          console.error("Erro ao enviar mensagem de erro:", err);
        }
      }
    }

    if (interaction.isButton()) {
      const { customId } = interaction;
      try {
        switch (customId) {
          case "button-dinheiro":
            try {
              const modalDinheiro = new ModalBuilder()
                .setCustomId("modal-dinheiro")
                .setTitle("💵 Pagamento em Dinheiro");
              const inputValor = new TextInputBuilder()
                .setCustomId("valor-dinheiro")
                .setLabel("Valor do Pagamento")
                .setPlaceholder(`Digite o valor (múltiplo de ${VALOR_DIARIO})`)
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
              modalDinheiro.addComponents(
                new ActionRowBuilder().addComponents(inputValor)
              );
              await interaction.showModal(modalDinheiro);
            } catch (modalError) {
              console.error("Erro ao mostrar modal dinheiro:", modalError);
              if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                  content: "❌ Erro ao abrir o formulário. Tente novamente.",
                  flags: MessageFlags.Ephemeral,
                });
              }
            }
            break;

          case "button-farm":
            const embedFarm = new EmbedBuilder()
              .setTitle("📦 Registro de Farm")
              .setDescription(
                "Para registrar sua farm, preencha as informações abaixo:"
              )
              .addFields(
                {
                  name: "🏠 Endereço",
                  value: "Informe o endereço completo da farm",
                },
                { name: "📱 Contato", value: "Telefone para contato" },
                { name: "⏰ Horário", value: "Horário de funcionamento" }
              )
              .setColor("#0099FF")
              .setFooter({ text: "Sistema de Registro de Farms" })
              .setTimestamp();
            const buttonFarm = new ButtonBuilder()
              .setCustomId("info-farm")
              .setLabel("Depositar")
              .setStyle(ButtonStyle.Success)
              .setEmoji("📥");
            const rowFarm = new ActionRowBuilder().addComponents(buttonFarm);
            await interaction.reply({
              embeds: [embedFarm],
              components: [rowFarm],
              flags: MessageFlags.Ephemeral,
            });
            break;

          case "info-farm":
            try {
              const modalFarm = new ModalBuilder()
                .setCustomId("modal-farm")
                .setTitle("📝 Registro de Itens do Farm");
              
              const inputs = [
                {
                  id: "eter",
                  label: "Quantidade de Éter",
                  placeholder: "Digite a quantidade de Éter",
                },
                {
                  id: "efedrina",
                  label: "Quantidade de Efedrina",
                  placeholder: "Digite a quantidade de Efedrina",
                },
                {
                  id: "opio",
                  label: "Quantidade de Ópio",
                  placeholder: "Digite a quantidade de Ópio",
                },
                {
                  id: "folha",
                  label: "Quantidade de Folha",
                  placeholder: "Digite a quantidade de Folha",
                },
                {
                  id: "seringa",
                  label: "Quantidade de Seringa",
                  placeholder: "Digite a quantidade de Seringa",
                },
              ].map((input) =>
                new TextInputBuilder()
                  .setCustomId(input.id)
                  .setLabel(input.label)
                  .setPlaceholder(input.placeholder)
                  .setStyle(TextInputStyle.Short)
                  .setRequired(true)
              );
              modalFarm.addComponents(
                inputs.map((input) => new ActionRowBuilder().addComponents(input))
              );
              await interaction.showModal(modalFarm);
            } catch (modalError) {
              console.error("Erro ao mostrar modal farm:", modalError);
              if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                  content: "❌ Erro ao abrir o formulário. Tente novamente.",
                  flags: MessageFlags.Ephemeral,
                });
              }
            }
            break;

          case "registro":
            // Verificar se o usuário já tem o cargo de Membro Benny's
            const cargoMembro = interaction.guild.roles.cache.find(
              (role) => role.name === "🧰 | Membro Versalhes"
            );

            if (!cargoMembro) {
              await interaction.reply({
                content:
                  "❌ Erro: Cargo '🧰 | Membro Versalhes' não encontrado no servidor!",
                flags: MessageFlags.Ephemeral,
              });
              return;
            }

            const usuarioTemCargo = interaction.member.roles.cache.has(
              cargoMembro.id
            );

            if (usuarioTemCargo) {
              await interaction.reply({
                content:
                  "❌ Você já possui o cargo de 🧰 | Membro Versalhes e não pode se registrar novamente!",
                flags: MessageFlags.Ephemeral,
              });
              return;
            }

            const modal = new ModalBuilder()
              .setCustomId("registro")
              .setTitle("Registro");

            const input = new TextInputBuilder()
              .setCustomId("nome-game")
              .setLabel("Nome in game")
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const input2 = new TextInputBuilder()
              .setCustomId("id")
              .setLabel("ID in Game")
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const input3 = new TextInputBuilder()
              .setCustomId("nome-real")
              .setLabel("Nome Real")
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const input4 = new TextInputBuilder()
              .setCustomId("telefone")
              .setLabel("Telefone(Adicionar o traço. Ex: 123-123)")
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const input5 = new TextInputBuilder()
              .setCustomId("recrutador")
              .setLabel("Quem te recrutou?")
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            // Criar múltiplas ActionRow para distribuir os inputs
            const row1 = new ActionRowBuilder().addComponents(input);
            const row2 = new ActionRowBuilder().addComponents(input2);
            const row3 = new ActionRowBuilder().addComponents(input3);
            const row4 = new ActionRowBuilder().addComponents(input4);
            const row5 = new ActionRowBuilder().addComponents(input5);

            modal.addComponents(row1, row2, row3, row4, row5);
            try {
              await interaction.showModal(modal);
            } catch (modalError) {
              console.error("Erro ao mostrar modal registro:", modalError);
              if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                  content: "❌ Erro ao abrir o formulário. Tente novamente.",
                  flags: MessageFlags.Ephemeral,
                });
              }
            }
            break;

          case "parcerias":
            // Verificar se o usuário tem o cargo de Líder
            const cargoLiderParcerias = interaction.guild.roles.cache.find(
              (role) => role.name === "🧰 | Lider"
            );

            if (!cargoLiderParcerias) {
              await interaction.reply({
                content:
                  "❌ Erro: Cargo '🧰 | Lider' não encontrado no servidor!",
                flags: MessageFlags.Ephemeral,
              });
              return;
            }

            const usuarioTemCargoLiderParcerias =
              interaction.member.roles.cache.has(cargoLiderParcerias.id);

            if (!usuarioTemCargoLiderParcerias) {
              await interaction.reply({
                content:
                  "❌ **Acesso Negado!**\n\nVocê precisa ter o cargo **🧰 | Lider** para registrar parcerias.",
                flags: MessageFlags.Ephemeral,
              });
              return;
            }

            const modalParcerias = new ModalBuilder()
              .setCustomId("modal-parcerias")
              .setTitle("Parcerias da Benny's");

            const inputParcerias1 = new TextInputBuilder()
              .setCustomId("nome-organizacao")
              .setLabel("🤝Nome da Organização/FAC")
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const inputParcerias2 = new TextInputBuilder()
              .setCustomId("nome-dono")
              .setLabel("🤝Dono da Organização/FAC")
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const inputParcerias3 = new TextInputBuilder()
              .setCustomId("localizacao")
              .setLabel("📍Localização da Organização/FAC")
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const inputParcerias4 = new TextInputBuilder()
              .setCustomId("produto")
              .setLabel("📦 Produto/Serviço")
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const inputParcerias5 = new TextInputBuilder()
              .setCustomId("contato")
              .setLabel("👤Contato Principal")
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const rowParcerias1 = new ActionRowBuilder().addComponents(
              inputParcerias1
            );
            const rowParcerias2 = new ActionRowBuilder().addComponents(
              inputParcerias2
            );
            const rowParcerias3 = new ActionRowBuilder().addComponents(
              inputParcerias3
            );
            const rowParcerias4 = new ActionRowBuilder().addComponents(
              inputParcerias4
            );
            const rowParcerias5 = new ActionRowBuilder().addComponents(
              inputParcerias5
            );

            modalParcerias.addComponents(
              rowParcerias1,
              rowParcerias2,
              rowParcerias3,
              rowParcerias4,
              rowParcerias5
            );

            try {
              await interaction.showModal(modalParcerias);
            } catch (modalError) {
              console.error("Erro ao mostrar modal parcerias:", modalError);
              if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                  content: "❌ Erro ao abrir o formulário. Tente novamente.",
                  flags: MessageFlags.Ephemeral,
                });
              }
            }
            break;

          case "remove-parceria":
            try {
              // Verificar se o usuário tem o cargo de Líder
              const cargoLider = interaction.guild.roles.cache.find(
                (role) => role.name === "🧰 | Lider"
              );

              if (!cargoLider) {
                await interaction.reply({
                  content:
                    "❌ Erro: Cargo '🧰 | Lider' não encontrado no servidor!",
                  flags: MessageFlags.Ephemeral,
                });
                return;
              }

              const usuarioTemCargoLider = interaction.member.roles.cache.has(
                cargoLider.id
              );

              if (!usuarioTemCargoLider) {
                await interaction.reply({
                  content:
                    "❌ **Acesso Negado!**\n\nVocê precisa ter o cargo **🧰 | Lider** para remover parcerias.",
                  flags: MessageFlags.Ephemeral,
                });
                return;
              }

              const parceriasManager = new ParceriasManager();
              const parceria = await parceriasManager.getParceria(
                interaction.message.id
              );

              if (!parceria) {
                await interaction.reply({
                  content: "❌ Parceria não encontrada no banco de dados.",
                  flags: MessageFlags.Ephemeral,
                });
                return;
              }

              // Remover parceria do banco de dados
              await parceriasManager.removeParceria(interaction.message.id);

              // Deletar a mensagem
              await interaction.message.delete();

              // Buscar o canal de logs de parcerias
              const canalLogsParcerias = interaction.guild.channels.cache.find(
                (channel) => channel.name === "🔓・logs-parcerias"
              );

              // Enviar log de remoção
              if (canalLogsParcerias) {
                const embedRemocao = new EmbedBuilder()
                  .setTitle("🗑️ Parceria Removida")
                  .setColor("#ff0000")
                  .setThumbnail(interaction.user.displayAvatarURL())
                  .addFields(
                    {
                      name: "👤 Removido por",
                      value: `${interaction.user} (${interaction.user.tag})`,
                      inline: true,
                    },
                    { name: "🏆 Cargo", value: "🧰 | Lider", inline: true },
                    {
                      name: "🤝 Organização/FAC",
                      value: parceria.nomeOrganizacao,
                      inline: true,
                    },
                    {
                      name: "🤝 Dono da Organização/FAC",
                      value: parceria.nomeDono,
                      inline: true,
                    },
                    {
                      name: "📍 Localização",
                      value: parceria.localizacao,
                      inline: true,
                    },
                    {
                      name: "📦 Produto/Serviço",
                      value: parceria.produto,
                      inline: true,
                    },
                    {
                      name: "👤 Contato Principal",
                      value: parceria.contato,
                      inline: true,
                    },
                    {
                      name: "📅 Data de Registro",
                      value: new Date(parceria.dataRegistro).toLocaleString(
                        "pt-BR"
                      ),
                      inline: true,
                    },
                    {
                      name: "⏰ Data de Remoção",
                      value: new Date().toLocaleString("pt-BR"),
                      inline: false,
                    }
                  )
                  .setFooter({ text: "Sistema de Logs Versalhes" })
                  .setTimestamp();

                await canalLogsParcerias.send({ embeds: [embedRemocao] });
              }

              await interaction.reply({
                content: `✅ **Parceria removida com sucesso!**\n\n🗑️ A parceria com **${parceria.nomeOrganizacao}** foi removida do sistema.\n\n**Removido por:** ${interaction.user} (🧰 | Lider)`,
                flags: MessageFlags.Ephemeral,
              });
            } catch (error) {
              console.error("Erro ao remover parceria:", error);
              await interaction.reply({
                content: "❌ Erro ao remover a parceria. Tente novamente.",
                flags: MessageFlags.Ephemeral,
              });
            }
            break;

          case "button-ausencias":
            const modalAusencias = new ModalBuilder()
              .setCustomId("modal-ausências")
              .setTitle("Painel de ausências");

            const inputAusencias1 = new TextInputBuilder()
              .setCustomId("nome-game")
              .setLabel("Nome in game")
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const inputAusencias2 = new TextInputBuilder()
              .setCustomId("id")
              .setLabel("ID in game")
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const inputAusencias3 = new TextInputBuilder()
              .setCustomId("motivo")
              .setLabel("Motivo da ausência")
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setPlaceholder("Descreva o motivo da sua ausência...");

            const inputAusencias4 = new TextInputBuilder()
              .setCustomId("duracao")
              .setLabel("Duração estimada")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder("Ex: 2 dias, 1 semana, etc.");

            const rowAusencias1 = new ActionRowBuilder().addComponents(
              inputAusencias1
            );
            const rowAusencias2 = new ActionRowBuilder().addComponents(
              inputAusencias2
            );
            const rowAusencias3 = new ActionRowBuilder().addComponents(
              inputAusencias3
            );
            const rowAusencias4 = new ActionRowBuilder().addComponents(
              inputAusencias4
            );

            modalAusencias.addComponents(
              rowAusencias1,
              rowAusencias2,
              rowAusencias3,
              rowAusencias4
            );

            try {
              await interaction.showModal(modalAusencias);
            } catch (modalError) {
              console.error("Erro ao mostrar modal ausencias:", modalError);
              if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                  content: "❌ Erro ao abrir o formulário. Tente novamente.",
                  flags: MessageFlags.Ephemeral,
                });
              }
            }
            break;

          case "recibo":
            try {
              const TIMEOUT_MENU = 30_000;
              const TIMEOUT_IMAGE = 120_000;
              const DELETE_DELAY = 10_000;

              // Criação dos componentes UI
              const selectMenu = createServiceSelectMenu(tunagem);
              const buttonConfirma = createConfirmButton();
              buttonConfirma.setDisabled(true); // Começa desabilitado

              const rows = [
                new ActionRowBuilder().addComponents(selectMenu),
                new ActionRowBuilder().addComponents(buttonConfirma),
              ];

              const initialEmbed = new EmbedBuilder()
                .setTitle("Serviços Selecionados")
                .setDescription("Nenhum serviço selecionado ainda.")
                .setColor("#0099ff");

              // Estado compartilhado
              let selectedServices = [];
              let servicesDescription = "";

              // Envia mensagem inicial
              await interaction.reply({
                embeds: [initialEmbed],
                components: rows,
                flags: 64,
              });
              const replyMsg = await interaction.fetchReply();

              // Remover o trecho do menuCollector.on('collect', ...) e o menuCollector.on('end', ...) relacionado ao tunagem_menu, pois agora o tratamento está centralizado no switch/case 'tunagem_menu'.
              // Salva estado no Map global
              reciboTunagemStates.set(replyMsg.id, {
                rows,
                selectedServices,
                servicesDescription,
                tunagem,
                TIMEOUT_IMAGE,
                DELETE_DELAY,
                userId: interaction.user.id,
              });

              return;
            } catch (error) {
              console.error("Erro no processamento do recibo:", error);
              try {
                if (interaction.replied || interaction.deferred) {
                  await interaction.followUp({
                    content:
                      "Ocorreu um erro ao processar sua solicitação. Tente novamente.",
                    flags: 64,
                  });
                } else {
                  await interaction.reply({
                    content:
                      "Ocorreu um erro ao processar sua solicitação. Tente novamente.",
                    flags: 64,
                  });
                }
              } catch (err) {
                console.error("Falha ao enviar mensagem de erro:", err);
              }
            }
            break;

          case "confirmar":
            {
              // Recupera estado do Map global
              const state = reciboTunagemStates.get(interaction.message.id);
              if (!state || state.userId !== interaction.user.id) {
                await interaction.reply({
                  content:
                    "❌ Não foi possível recuperar o estado do recibo. Tente novamente.",
                  flags: MessageFlags.Ephemeral,
                });
                return;
              }
              const {
                rows,
                selectedServices,
                servicesDescription,
                TIMEOUT_IMAGE,
                DELETE_DELAY,
              } = state;
              if (!selectedServices || selectedServices.length === 0) {
                await interaction.reply({
                  content:
                    "❌ Você precisa selecionar pelo menos um serviço antes de confirmar.",
                  flags: MessageFlags.Ephemeral,
                });
                return;
              }
              // Desabilita componentes após confirmação
              rows.forEach((row) =>
                row.components.forEach((comp) => comp.setDisabled(true))
              );
              const desc =
                servicesDescription && servicesDescription.trim().length > 0
                  ? servicesDescription
                  : "Nenhum serviço selecionado.";
              const confirmEmbed = new EmbedBuilder()
                .setTitle("Recibo Confirmado!")
                .setDescription(
                  `Serviços confirmados:\n${desc}\n\nSelecione o tipo de tunagem para continuar.`
                )
                .setColor("#00ff00");

              // Select menu para tipo de tunagem
              const tipoMenu = new StringSelectMenuBuilder()
                .setCustomId("tipo_tunagem")
                .setPlaceholder("Selecione o tipo de tunagem...")
                .addOptions([
                  {
                    label: "Comum",
                    value: "comum",
                    description: "Tunagem comum para clientes normais",
                    emoji: "🚗",
                  },
                  {
                    label: "Policial/VIP",
                    value: "policial_vip",
                    description:
                      "Tunagem para policial ou VIP (exige 2 comprovantes)",
                    emoji: "🚓",
                  },
                ]);
              const tipoRow = new ActionRowBuilder().addComponents(tipoMenu);

              await interaction.update({
                embeds: [confirmEmbed],
                components: [tipoRow],
              });
              // Atualiza estado para próxima etapa
              state.rows = [tipoRow];
              reciboTunagemStates.set(interaction.message.id, state);
              return;
            }
            break;

          case "button-elite":
            if (interaction.replied || interaction.deferred) {
              // Já foi respondida, não tente mostrar o modal
              return;
            }
            const modalElite = new ModalBuilder()
              .setCustomId("modal-elite")
              .setTitle("Metas da Elite Bennys");

            const inputDinheiroSujo = new TextInputBuilder()
              .setCustomId("dinheiro-elite")
              .setLabel("Meta do Dinheiro sujo")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(20)
              .setPlaceholder('Somente valores inteiros. Ex: "10.000, 27.000"');

            const rowModalElite = new ActionRowBuilder().addComponents(
              inputDinheiroSujo
            );

            modalElite.addComponents(rowModalElite);
            await interaction.showModal(modalElite);
            break;

          default:
            await interaction.reply({
              content: "❌ Opção inválida!",
              flags: MessageFlags.Ephemeral,
            });
        }
      } catch (error) {
        console.error("Erro ao processar interação do botão:", error);
        
        // Se o erro for relacionado a interação já reconhecida, não tentamos responder novamente
        if (error.code === 40060 || error.code === 10062) {
          console.log("Interação já foi processada ou expirou, ignorando erro.");
          return;
        }
        
        try {
          // Verifica se a interação já foi respondida
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: "❌ Ocorreu um erro ao processar sua solicitação!",
              flags: MessageFlags.Ephemeral,
            });
          } else if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              content: "❌ Ocorreu um erro ao processar sua solicitação!",
              flags: MessageFlags.Ephemeral,
            });
          }
          // Se a interação já foi respondida com showModal, não podemos responder novamente
        } catch (err) {
          console.error("Erro ao enviar mensagem de erro:", err);
        }
      }
    }
    if (interaction.isStringSelectMenu()) {
      const { customId } = interaction;
      try {
        switch (customId) {
          case "tipo_tunagem": {
            // Handler do select menu do tipo de tunagem
            const state = reciboTunagemStates.get(interaction.message.id);
            if (!state || state.userId !== interaction.user.id) {
              await interaction.reply({
                content:
                  "❌ Não foi possível recuperar o estado do recibo. Tente novamente.",
                flags: MessageFlags.Ephemeral,
              });
              return;
            }
            const { servicesDescription, TIMEOUT_IMAGE, DELETE_DELAY } = state;
            const tipo = interaction.values[0];
            // Remove o select menu
            await interaction.update({
              embeds: [interaction.message.embeds[0]],
              components: [],
            });
            // Envia mensagem no privado solicitando os comprovantes
            try {
              const dm = await interaction.user.createDM();
              if (tipo === "comum") {
                const embedPrivado = new EmbedBuilder()
                  .setTitle("Envie seu comprovante de serviço")
                  .setDescription(
                    `Por favor, envie a imagem do comprovante respondendo esta mensagem. Você tem até 2 minutos.`
                  )
                  .setColor("#0099FF");
                await dm.send({ embeds: [embedPrivado] });
                const instructionMsg = (
                  await dm.messages.fetch({ limit: 1 })
                ).first();
                const imageFilter = (m) =>
                  m.author.id === interaction.user.id && m.attachments.size > 0;
                const collected = await dm
                  .awaitMessages({
                    filter: imageFilter,
                    max: 1,
                    time: TIMEOUT_IMAGE,
                    errors: ["time"],
                  })
                  .catch(() => null);
                if (collected && collected.size > 0) {
                  const msg = collected.first();
                  const attachment = msg.attachments.first();
                  const receiptEmbed = new EmbedBuilder()
                    .setTitle("Comprovante gerado com sucesso!!!")
                    .setDescription(
                      `Serviços realizados:\n${servicesDescription}`
                    )
                    .setFields([
                      {
                        name: "👤 Gerado por",
                        value: `${interaction.user} (${interaction.user.tag})`,
                        inline: true,
                      },
                    ])
                    .setImage(attachment.url)
                    .setFooter({ text: "Sistema de Tunagem Benny's" })
                    .setColor("#00ff00")
                    .setTimestamp();
                  await dm.send({
                    content:
                      "✅ Imagem recebida com sucesso! Seu recibo foi registrado.",
                    embeds: [receiptEmbed],
                  });
                  await Promise.all([
                    webhookClientRecibo.send({ embeds: [receiptEmbed] }),
                    webhookClientLog.send({
                      content: `👤Comprovante Gerado por ${interaction.user} (${interaction.user.tag}):`,
                      embeds: [receiptEmbed],
                    }),
                  ]);
                  setTimeout(() => {
                    msg.delete().catch(() => {});
                    if (instructionMsg) instructionMsg.delete().catch(() => {});
                  }, DELETE_DELAY);
                  reciboTunagemStates.delete(interaction.message.id);
                } else {
                  await dm.send({
                    content:
                      "⏰ Tempo esgotado! Você não enviou o comprovante a tempo. Por favor, repita o processo.",
                  });
                  reciboTunagemStates.delete(interaction.message.id);
                }
              } else if (tipo === "policial_vip") {
                // Primeiro comprovante: pagamento
                const embedPagamento = new EmbedBuilder()
                  .setTitle("Envie o comprovante de pagamento")
                  .setDescription(
                    `Por favor, envie a imagem do comprovante de pagamento respondendo esta mensagem. Você tem até 2 minutos.`
                  )
                  .setColor("#0099FF");
                await dm.send({ embeds: [embedPagamento] });
                const instructionMsg1 = (
                  await dm.messages.fetch({ limit: 1 })
                ).first();
                const imageFilter = (m) =>
                  m.author.id === interaction.user.id && m.attachments.size > 0;
                const collected1 = await dm
                  .awaitMessages({
                    filter: imageFilter,
                    max: 1,
                    time: TIMEOUT_IMAGE,
                    errors: ["time"],
                  })
                  .catch(() => null);
                if (!collected1 || collected1.size === 0) {
                  await dm.send({
                    content:
                      "⏰ Tempo esgotado! Você não enviou o comprovante de pagamento a tempo. Por favor, repita o processo.",
                  });
                  reciboTunagemStates.delete(interaction.message.id);
                  return;
                }
                const msg1 = collected1.first();
                const attachment1 = msg1.attachments.first();
                // Segundo comprovante: placa do carro
                const embedPlaca = new EmbedBuilder()
                  .setTitle("Envie o comprovante da placa do carro")
                  .setDescription(
                    `Agora, envie a imagem da placa do carro respondendo esta mensagem. Você tem até 2 minutos.`
                  )
                  .setColor("#0099FF");
                await dm.send({ embeds: [embedPlaca] });
                const instructionMsg2 = (
                  await dm.messages.fetch({ limit: 1 })
                ).first();
                const collected2 = await dm
                  .awaitMessages({
                    filter: imageFilter,
                    max: 1,
                    time: TIMEOUT_IMAGE,
                    errors: ["time"],
                  })
                  .catch(() => null);
                if (!collected2 || collected2.size === 0) {
                  await dm.send({
                    content:
                      "⏰ Tempo esgotado! Você não enviou o comprovante da placa a tempo. Por favor, repita o processo.",
                  });
                  setTimeout(() => {
                    msg1.delete().catch(() => {});
                    if (instructionMsg1)
                      instructionMsg1.delete().catch(() => {});
                    if (instructionMsg2)
                      instructionMsg2.delete().catch(() => {});
                  }, DELETE_DELAY);
                  reciboTunagemStates.delete(interaction.message.id);
                  return;
                }
                const msg2 = collected2.first();
                const attachment2 = msg2.attachments.first();
                // Envia recibo com os dois comprovantes
                const receiptEmbed = new EmbedBuilder()
                  .setTitle("Comprovantes gerados com sucesso!!!")
                  .setDescription(
                    `Serviços realizados:\n${servicesDescription}\n\nAbaixo: Comprovante de pagamento (imagem principal) e comprovante da placa do carro (thumbnail).`
                  )
                  .setFields([
                    {
                      name: "👤 Gerado por",
                      value: `${interaction.user} (${interaction.user.tag})`,
                      inline: true,
                    },
                  ])
                  .setImage(attachment1.url)
                  .setThumbnail(attachment2.url)
                  .setFooter("Sistema de Tunagem Benny's")
                  .setColor("#00ff00")
                  .setTimestamp();
                await dm.send({
                  content:
                    "✅ Imagens recebidas com sucesso! Seu recibo foi registrado.",
                  embeds: [receiptEmbed],
                });
                await Promise.all([
                  webhookClientRecibo.send({ embeds: [receiptEmbed] }),
                  webhookClientLog.send({
                    content: `👤Comprovante Gerado por ${interaction.user} (${interaction.user.tag}):`,
                    embeds: [receiptEmbed],
                  }),
                ]);
                setTimeout(() => {
                  msg1.delete().catch(() => {});
                  msg2.delete().catch(() => {});
                  if (instructionMsg1) instructionMsg1.delete().catch(() => {});
                  if (instructionMsg2) instructionMsg2.delete().catch(() => {});
                }, DELETE_DELAY);
                reciboTunagemStates.delete(interaction.message.id);
              }
            } catch (err) {
              console.error(
                "Erro ao solicitar/processar comprovante por DM:",
                err
              );
              await interaction.user
                .send({
                  content:
                    "❌ Não foi possível solicitar o comprovante por DM. Por favor, certifique-se de que suas Mensagens Diretas estão abertas para este servidor.",
                })
                .catch(() => {});
              reciboTunagemStates.delete(interaction.message.id);
            }
            return;
          }
          case "tunagem_menu": {
            // Handler do select menu de tunagem
            const state = reciboTunagemStates.get(interaction.message.id);
            if (!state || state.userId !== interaction.user.id) {
              await interaction.reply({
                content: "❌ Não foi possível recuperar o estado do recibo. Tente novamente.",
                flags: MessageFlags.Ephemeral,
              });
              return;
            }
            // Atualiza os serviços selecionados
            state.selectedServices = interaction.values;
            state.servicesDescription = interaction.values
              .map(
                (value) =>
                  tunagem.find((item) => item.value === value)?.label || "Serviço desconhecido"
              )
              .join("\n");
            reciboTunagemStates.set(interaction.message.id, state);

            // Atualiza embed e componentes
            const updatedEmbed = new EmbedBuilder()
              .setTitle("Confirme se as opções estão corretas, caso esteja, pressione o botão abaixo para confirmar.")
              .setFields([
                {
                  name: "Serviços Selecionados",
                  value: state.servicesDescription || "Nenhum serviço selecionado.",
                  inline: false,
                },
              ])
              .setColor("#0099ff");

            // Habilita/desabilita botão de confirmar
            state.rows[1].components[0].setDisabled(state.selectedServices.length === 0);

            await interaction.update({
              embeds: [updatedEmbed],
              components: state.rows,
            });
            break;
          }
          case "acao_select": {
            const state = acaoStates.get(interaction.message.id);
            if (!state || state.userId !== interaction.user.id) {
              await interaction.reply({
                content: "❌ Não foi possível recuperar o estado da ação. Tente novamente.",
                flags: MessageFlags.Ephemeral,
              });
              return;
            }
            const { acao } = state;
            const { customId } = interaction;
            const { value } = interaction.values[0];
            const { label } = interaction.options.find(option => option.value === value); 
            const embed = new EmbedBuilder()
              .setColor('#0099ff')
              .setTitle('Ação/Atividade')
              .setDescription(`Você selecionou: ${label}`)
              .setFooter({ text: 'Sistema de Ações/Atividades' });
            await interaction.reply({ embeds: [embed] }); 
            return;
          }
          default:
            await interaction.reply({
              content: "❌ Opção inválida!",
              flags: MessageFlags.Ephemeral,
            });         
        }
      } catch (error) {
        console.error("Erro ao processar interação do select menu:", error);
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: "❌ Ocorreu um erro ao processar sua solicitação!",
              flags: MessageFlags.Ephemeral,
            });
          } else {
            await interaction.followUp({
              content: "❌ Ocorreu um erro ao processar sua solicitação!",
              flags: MessageFlags.Ephemeral,
            });
          }
        } catch (err) {
          console.error("Erro ao enviar mensagem de erro:", err);
        }
      }
    }

    if (interaction.isModalSubmit()) {
      const { customId } = interaction;
      try {
        switch (customId) {
          case "modal-dinheiro":
            const valorDinheiro = parseInt(
              interaction.fields.getTextInputValue("valor-dinheiro")
            );
            if (isNaN(valorDinheiro)) {
              await interaction.reply({
                content: "❌ Valor inválido! Por favor, digite um número.",
                flags: MessageFlags.Ephemeral,
              });
              return;
            }
            const playerDinheiro = await Player.findOne({
              discordId: interaction.user.id,
            });
            if (!playerDinheiro) {
              await interaction.reply({
                content: "Jogador não encontrado!",
                flags: MessageFlags.Ephemeral,
              });
              return;
            }

            // **Adicionar lógica para solicitar comprovante por DM para pagamento em dinheiro**
            try {
              await interaction.reply({
                content:
                  "✅ Valor registrado! Por favor, envie a imagem do comprovante no privado do bot.",
                ephemeral: true,
              }); // Confirmação inicial

              const embedPrivado = new EmbedBuilder()
                .setTitle("Envie seu comprovante de Pagamento")
                .setDescription(
                  "Por favor, envie a imagem do comprovante respondendo esta mensagem no privado. Você tem até 2 minutos."
                )
                .setColor("#0099FF");

              const dm = await interaction.user.createDM();
              await dm.send({ embeds: [embedPrivado] });

              const filter = (m) =>
                m.author.id === interaction.user.id && m.attachments.size > 0;
              const collected = await dm
                .awaitMessages({
                  filter,
                  max: 1,
                  time: 2 * 60 * 1000,
                  errors: ["time"],
                })
                .catch(() => null);

              if (collected && collected.size > 0) {
                const msg = collected.first();
                // Chama handlePagamentoDinheiro com o objeto da mensagem recebida
                await handlePagamentoDinheiro(
                  msg,
                  interaction,
                  valorDinheiro,
                  playerDinheiro
                );
                setTimeout(() => msg.delete().catch(() => {}), 60000); // Apaga a mensagem do comprovante após 1 minuto
              } else {
                await dm.send({
                  content:
                    "⏰ Tempo esgotado! Você não enviou o comprovante a tempo. Por favor, repita o processo de pagamento.",
                });
              }
            } catch (err) {
              console.error(
                "Erro ao solicitar/processar comprovante de pagamento por DM:",
                err
              );
              await interaction.user
                .send({
                  content:
                    "❌ Não foi possível solicitar o comprovante por DM. Por favor, certifique-se de que suas Mensagens Diretas estão abertas para este servidor.",
                })
                .catch(() => {}); // Adiciona catch
            }

            break;
          case "modal-farm":
            const eter = parseInt(
              interaction.fields.getTextInputValue("eter")
            );
            const efedrina = parseInt(
              interaction.fields.getTextInputValue("efedrina")
            );
            const opio = parseInt(
              interaction.fields.getTextInputValue("opio")
            );
            const folha = parseInt(
              interaction.fields.getTextInputValue("folha")
            );
            const seringa = parseInt(
              interaction.fields.getTextInputValue("seringa")
            );

            if (
              isNaN(eter) ||
              isNaN(efedrina) ||
              isNaN(opio) ||
              isNaN(folha) ||
              isNaN(seringa)
            ) {
              await interaction.reply({
                content:
                  "❌ Valores inválidos! Por favor, digite números para todas as quantidades.",
                ephemeral: true,
              });
              return;
            }

            const playerFarm = await Player.findOne({
              discordId: interaction.user.id,
            });

            if (!playerFarm) {
              await interaction.reply({
                content: "Jogador não encontrado!",
                ephemeral: true,
              });
              return;
            }

            // Atualiza os recursos do jogador
            playerFarm.plastico += plastico;
            playerFarm.borracha += borracha;
            playerFarm.ferro += ferro;
            playerFarm.aluminio += aluminio;
            playerFarm.cobre += cobre;

            // Lógica para verificar e atualizar a meta de farm (ajuste conforme necessário)
            playerFarm.metGoal =
              playerFarm.plastico >= metas.plastico &&
              playerFarm.borracha >= metas.borracha &&
              playerFarm.ferro >= metas.ferro &&
              playerFarm.aluminio >= metas.aluminio &&
              playerFarm.cobre >= metas.cobre;

            playerFarm.lastChecked = new Date(); // Atualiza a última verificação

            console.log(
              `[DEBUG] ${playerFarm.username} - lastChecked definido para: ${playerFarm.lastChecked}`
            ); // Log para depuração

            await playerFarm.save();

            // Envia a mensagem de confirmação com os recursos totais (ephemeral)
            const embedConfirmacaoFarm = new EmbedBuilder()
              .setTitle("📦 Farm Registrado com Sucesso!")
              .setDescription(
                `Seu farm foi registrado. Seus totais agora são:\n\n` +
                  `🧪 Plástico: ${playerFarm.plastico}\n` +
                  `🍃 Borracha: ${playerFarm.borracha}\n` +
                  `🍃 Ferro: ${playerFarm.ferro}\n` +
                  `🌱 Aluminio: ${playerFarm.aluminio}\n` +
                  `🍃 Cobre: ${playerFarm.cobre}\n\n` +
                  `Status da Meta: ${
                    playerFarm.metGoal
                      ? "✅ Meta atingida"
                      : "❌ Meta não atingida"
                  }`
              )
              .setColor(playerFarm.metGoal ? 0x00ff00 : 0xff0000)
              .setTimestamp();

            await interaction.reply({
              embeds: [embedConfirmacaoFarm],
              ephemeral: true,
            });

            // Solicitar comprovante por DM (mantendo a lógica anterior)
            try {
              const embedPrivado = new EmbedBuilder()
                .setTitle("Envie seu comprovante")
                .setDescription(
                  "Por favor, envie a imagem do comprovante respondendo esta mensagem. Você tem até 2 minutos."
                )
                .setColor("#0099FF");

              const dm = await interaction.user.createDM();
              const message = await dm.send({ embeds: [embedPrivado] });

              const filter = (m) =>
                m.author.id === interaction.user.id && m.attachments.size > 0;
              const collected = await dm
                .awaitMessages({
                  filter,
                  max: 1,
                  time: 2 * 60 * 1000,
                  errors: ["time"],
                })
                .catch(() => null);

              if (collected && collected.size > 0) {
                const msg = collected.first();
                const attachment = msg.attachments.first();

                await dm.send({
                  content: "✅ Comprovante recebido e registrado!",
                });
                setTimeout(() => msg.delete().catch(() => {}), 60000);

                // Se a meta for atingida, envia uma única embed combinada para logs/notificações AGORA
                if (playerFarm.metGoal) {
                  const combinedEmbed = new EmbedBuilder()
                    .setTitle("🎉 Parabéns! Todas as metas foram atingidas!")
                    .setDescription(
                      `O membro <@${interaction.user.id}> atingiu todas as metas diárias! Os valores serão resetados à meia-noite.\n\n**Comprovante de Farm Anexado:**`
                    )
                    .addFields(
                      {
                        name: "🧪 Plástico",
                        value: `${playerFarm.plastico}/${metas.plastico}`,
                      },
                      {
                        name: "🍃 Borracha",
                        value: `${playerFarm.borracha}/${metas.borracha}`,
                      },
                      {
                        name: "🍃 Ferro",
                        value: `${playerFarm.ferro}/${metas.ferro}`,
                      },
                      {
                        name: "🌱 Aluminio",
                        value: `${playerFarm.aluminio}/${metas.aluminio}`,
                      },
                      {
                        name: "🍃 Cobre",
                        value: `${playerFarm.cobre}/${metas.cobre}`,
                      }
                    )
                    .setColor("#00FF00")
                    .setFooter({
                      text: `Gerado por ${interaction.user.tag}`,
                      iconURL: interaction.user.displayAvatarURL(),
                    })
                    .setTimestamp()
                    .setImage(`attachment://${attachment.name}`);

                    const canalLogs = interaction.guild.channels.cache.get("1330352165599838218");
                  const canalNotificacao =
                    interaction.guild.channels.cache.find(
                      (channel) => channel.name === "📌・notificacoes-gerentes"
                    );

                  if (canalLogs) {
                    await canalLogs.send({
                      embeds: [combinedEmbed],
                      files: [attachment],
                    });
                  }
                  if (canalNotificacao) {
                    await canalNotificacao.send({
                      content: "<@&1292974126386122865>",
                      embeds: [combinedEmbed],
                      files: [attachment],
                    });
                  }
                }
              } else {
                await dm.send({
                  content:
                    "⏰ Tempo esgotado! Você não enviou o comprovante a tempo. Por favor, repita o processo de registro de farm.",
                });
              }
            } catch (err) {
              console.error(
                "Erro ao solicitar/processar comprovante por DM:",
                err
              );
              await interaction.user
                .send({
                  content:
                    "❌ Não foi possível solicitar o comprovante por DM. Por favor, certifique-se de que suas Mensagens Diretas estão abertas para este servidor.",
                })
                .catch(() => {});
            }

            // Atualizar a isenção ao atingir a meta (mantido aqui, fora do if do comprovante)
            if (playerFarm.metGoal) {
              const agora = new Date();
              // Calcula os dias de isenção com base na quantidade de farm
              const diasIsencao = Math.min(
                Math.floor(playerFarm.plastico / metas.plastico),
                Math.floor(playerFarm.borracha / metas.borracha),
                Math.floor(playerFarm.ferro / metas.ferro),
                Math.floor(playerFarm.aluminio / metas.aluminio),
                Math.floor(playerFarm.cobre / metas.cobre)
              );

              // Garante que o mínimo seja 1 dia se a meta foi batida
              const diasParaAdicionar = Math.max(1, diasIsencao);

              const isencaoAte = new Date(
                agora.getTime() + diasParaAdicionar * 24 * 60 * 60 * 1000
              );
              playerFarm.isencaoAte = isencaoAte;
              await playerFarm.save();
              console.log(
                `[DEBUG] ${playerFarm.username} - Concedidos ${diasParaAdicionar} dias de isenção.`
              );
            }

            break;

          case "registro":
            await interaction.deferReply({ flags: 64 });

            const nomeGame = interaction.fields.getTextInputValue("nome-game");
            const id = interaction.fields.getTextInputValue("id");
            const nomeReal = interaction.fields.getTextInputValue("nome-real");
            const telefone = interaction.fields.getTextInputValue("telefone");
            const recrutador =
              interaction.fields.getTextInputValue("recrutador");
            const membro = interaction.guild.members.cache.get(
              interaction.user.id
            );

            if (!membro) {
              return interaction.editReply({
                content: "❌ Membro não encontrado no servidor.",
              });
            }

            try {
              await membro.setNickname(`${nomeGame} | ${id}`);
            } catch (error) {
              console.error(error);
              return interaction.editReply({
                content:
                  "❌ Não foi possível alterar o apelido. Verifique minhas permissões.",
              });
            }

            const cargo = interaction.guild.roles.cache.find(
              (role) => role.name === "🧰 | Membro Versalhes"
            );

            if (cargo) {
              try {
                await membro.roles.add(cargo);
              } catch (error) {
                console.error(error);
                return interaction.editReply({
                  content: "❌ Não foi possível atribuir o cargo.",
                });
              }
            }

            // Criar anexo uma vez para reutilizar
            const buscarCanal = require("../utils/buscarCanal");
            const criarEmbed = require("../utils/criarEmbed");
            const attachment = new AttachmentBuilder("./images/versalhes.png");

            // Buscar o canal de logs
            const canalLogs = buscarCanal(
              interaction.guild,
              "🔓・logs-registro"
            );
            if (canalLogs) {
              try {
                const embedLog = criarEmbed({
                  title: "📝 Novo Registro Realizado",
                  color: "#00ff00",
                  thumbnail: interaction.user.displayAvatarURL(),
                  image: "attachment://versalhes.png",
                  fields: [
                    {
                      name: "👤 Usuário",
                      value: `${interaction.user} (${interaction.user.tag})`,
                      inline: true,
                    },
                    { name: "🎮 Nome in Game", value: nomeGame, inline: true },
                    { name: "🆔 ID in Game", value: id, inline: true },
                    { name: "👨‍💼 Nome Real", value: nomeReal, inline: true },
                    { name: "📱 Telefone", value: telefone, inline: true },
                    { name: "🤝 Recrutador", value: recrutador, inline: true },
                    {
                      name: "⏰ Data/Hora",
                      value: new Date().toLocaleString("pt-BR"),
                      inline: false,
                    },
                  ],
                  footer: "Sistema de Registro Versalhes",
                });
                await canalLogs.send({
                  embeds: [embedLog],
                  files: [attachment],
                });
              } catch (error) {
                console.error("Erro ao enviar webhook para logs:", error);
              }
            }

            // Enviar mensagem de boas-vindas no chat geral
            const canalChatGeral = buscarCanal(
              interaction.guild,
              "💬・ᴄʜᴀᴛ-ɢᴇʀᴀʟ"
            );
            if (canalChatGeral) {
              try {
                await canalChatGeral.send({
                  content: `👋 Um(a) novo(a) integrante chegou! Bem-vindo(a), ${interaction.user}, à família Versalhes! @everyone`,
                });
              } catch (error) {
                console.error("Erro ao enviar mensagem de boas-vindas:", error);
              }
            }

            await interaction.editReply({
              content: `✅ **Registro realizado com sucesso!**\n\n🎮 **Nome in Game:** ${nomeGame}\n🆔 **ID:** ${id}\n👨‍💼 **Nome Real:** ${nomeReal}\n📱 **Telefone:** ${telefone}\n🤝 **Recrutador:** ${recrutador}`,
              flags: 64,
            });

            // Registro automático no banco de dados
            try {
              let player = await Player.findOne({
                discordId: interaction.user.id,
              });
              if (!player) {
                await Player.create({
                  discordId: interaction.user.id,
                  username: interaction.user.username,
                });
                console.log(
                  `Usuário registrado no banco via modal: ${interaction.user.username} (${interaction.user.id})`
                );
              }
            } catch (error) {
              console.error(
                "Erro ao registrar usuário no banco via modal:",
                error
              );
            }
            break;
          case "modal-parcerias":
            await handleParcerias(interaction);
            break;
          case "modal-ausências":
            await handleAusencias(interaction);
            break;
          case "modal-elite":
            try {
              const dinheiroElite = interaction.fields.getTextInputValue("dinheiro-elite");
              
              // Validar se o valor é um número
              const valor = parseInt(dinheiroElite.replace(/[^\d]/g, ''));
              if (isNaN(valor) || valor <= 0) {
                await interaction.reply({
                  content: "❌ Valor inválido! Por favor, digite um valor válido para a meta do dinheiro sujo.",
                  flags: MessageFlags.Ephemeral,
                });
                return;
              }

              // Buscar o jogador no banco de dados
              const player = await Player.findOne({
                discordId: interaction.user.id,
              });

              if (!player) {
                await interaction.reply({
                  content: "❌ Jogador não encontrado no banco de dados!",
                  flags: MessageFlags.Ephemeral,
                });
                return;
              }

              // Atualizar a meta do jogador
              player.metaElite = valor;
              player.lastChecked = new Date();
              await player.save();

              // Criar embed de confirmação
              const embedConfirmacao = new EmbedBuilder()
                .setTitle("🎯 Meta da Elite Registrada!")
                .setDescription(`Sua meta de dinheiro sujo foi definida em **${valor.toLocaleString('pt-BR')}**`)
                .addFields(
                  { name: "👤 Membro", value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                  { name: "💰 Meta Definida", value: `${valor.toLocaleString('pt-BR')}`, inline: true },
                  { name: "📅 Data", value: new Date().toLocaleString('pt-BR'), inline: true }
                )
                .setColor("#00FF00")
                .setFooter({ text: "Sistema de Metas da Elite Bennys" })
                .setTimestamp();

              // Buscar canal de logs da elite
              const canalLogsElite = interaction.guild.channels.cache.find(
                (channel) => channel.name === "🔐・logs-elite"
              );

              // Enviar confirmação para o usuário
              await interaction.reply({
                embeds: [embedConfirmacao],
                flags: MessageFlags.Ephemeral,
              });

              // Enviar log para o canal de logs (se existir)
              if (canalLogsElite) {
                await canalLogsElite.send({
                  embeds: [embedConfirmacao],
                });
              }

            } catch (error) {
              console.error("Erro ao processar modal elite:", error);
              await interaction.reply({
                content: "❌ Erro ao processar sua meta da elite. Tente novamente.",
                flags: MessageFlags.Ephemeral,
              });
            }
            break;
          default:
            await interaction.reply({
              content: "❌ Opção inválida!",
              flags: MessageFlags.Ephemeral,
            });
        }
      } catch (error) {
        console.error("Erro ao processar modal:", error);
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: "❌ Ocorreu um erro ao processar seus dados!",
              flags: MessageFlags.Ephemeral,
            });
          } else {
            await interaction.followUp({
              content: "❌ Ocorreu um erro ao processar seus dados!",
              flags: MessageFlags.Ephemeral,
            });
          }
        } catch (err) {
          console.error("Erro ao enviar mensagem de erro:", err);
        }
      }
    }
  },
};
