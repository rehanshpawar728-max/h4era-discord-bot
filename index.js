require("dotenv").config();

const fs = require("node:fs");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder
} = require("discord.js");

if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
  throw new Error("Set DISCORD_TOKEN and CLIENT_ID in your environment.");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const DRAFTS_FILE = "./drafts.json";
let drafts = {};

try {
  if (fs.existsSync(DRAFTS_FILE)) {
    drafts = JSON.parse(fs.readFileSync(DRAFTS_FILE, "utf8"));
  }
} catch {
  console.error("Could not read drafts.json. Starting with empty drafts.");
  drafts = {};
}

function saveDrafts() {
  fs.writeFileSync(DRAFTS_FILE, JSON.stringify(drafts, null, 2));
}

function getDraft(userId) {
  if (!drafts[userId]) {
    drafts[userId] = {
      title: "H4ERA CLOUD",
      description: "Built For Performance.",
      color: "#00BFFF",
      image: "",
      thumbnail: "",
      footer: "H4ERA CLOUD • Built For Performance"
    };
  }
  return drafts[userId];
}

function makeEmbed(d) {
  const embed = new EmbedBuilder()
    .setColor(d.color || "#00BFFF")
    .setFooter({ text: d.footer || "H4ERA CLOUD" })
    .setTimestamp();

  if (d.title) embed.setTitle(d.title);
  if (d.description) embed.setDescription(d.description);
  if (d.image) embed.setImage(d.image);
  if (d.thumbnail) embed.setThumbnail(d.thumbnail);

  return embed;
}

function panelRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("edit:title")
        .setLabel("Title")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("edit:description")
        .setLabel("Description")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("edit:color")
        .setLabel("Color")
        .setStyle(ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("edit:image")
        .setLabel("Image")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("edit:thumbnail")
        .setLabel("Thumbnail")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("studio:json")
        .setLabel("JSON Export")
        .setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("studio:preview")
        .setLabel("Preview")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("studio:save")
        .setLabel("Save Draft")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("studio:send")
        .setLabel("Send Embed")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("studio:exit")
        .setLabel("Exit")
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

function makeModal(field, draft) {
  const settings = {
    title: {
      heading: "Edit Embed Title",
      label: "Title (max 256 characters)",
      style: TextInputStyle.Short,
      value: draft.title,
      placeholder: "Enter embed title",
      max: 256
    },
    description: {
      heading: "Edit Description",
      label: "Description (max 4000 characters)",
      style: TextInputStyle.Paragraph,
      value: draft.description,
      placeholder: "Enter embed description",
      max: 4000
    },
    color: {
      heading: "Edit Embed Color",
      label: "HEX color, e.g. #00BFFF",
      style: TextInputStyle.Short,
      value: draft.color,
      placeholder: "#00BFFF",
      max: 7
    },
    image: {
      heading: "Set Embed Image",
      label: "Direct image URL (or leave blank)",
      style: TextInputStyle.Short,
      value: draft.image,
      placeholder: "https://example.com/image.png",
      max: 400
    },
    thumbnail: {
      heading: "Set Embed Thumbnail",
      label: "Direct image URL (or leave blank)",
      style: TextInputStyle.Short,
      value: draft.thumbnail,
      placeholder: "https://example.com/thumb.png",
      max: 400
    }
  }[field];

  const modal = new ModalBuilder()
    .setCustomId(`submit:${field}`)
    .setTitle(settings.heading);

  const input = new TextInputBuilder()
    .setCustomId("value")
    .setLabel(settings.label)
    .setStyle(settings.style)
    .setRequired(false)
    .setMaxLength(settings.max)
    .setPlaceholder(settings.placeholder);

  if (settings.value) input.setValue(settings.value);

  modal.addComponents(
    new ActionRowBuilder().addComponents(input)
  );

  return modal;
}

const command = new SlashCommandBuilder()
  .setName("embedstudio")
  .setDescription("Open the H4ERA CLOUD Embed Studio");

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const rest = new REST({ version: "10" })
    .setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: [command.toJSON()] }
    );
    console.log("Slash command /embedstudio registered.");
  } catch (error) {
    console.error("Command registration failed:", error);
  }
});

client.on("interactionCreate", async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName !== "embedstudio") return;

      const d = getDraft(interaction.user.id);

      return interaction.reply({
        content: [
          "# H4ERA CLOUD | EMBED STUDIO",
          "Use the buttons below to customise your embed.",
          "",
          `**Current title:** ${d.title || "(empty)"}`,
          `**Current color:** ${d.color}`
        ].join("\n"),
        components: panelRows(),
        ephemeral: true
      });
    }

    if (interaction.isButton()) {
      const id = interaction.customId;
      const d = getDraft(interaction.user.id);

      if (id.startsWith("edit:")) {
        const field = id.slice(5);
        if (!["title", "description", "color", "image", "thumbnail"].includes(field)) return;

        return interaction.showModal(makeModal(field, d));
      }

      if (id === "studio:preview") {
        return interaction.reply({
          content: "**Embed Preview**",
          embeds: [makeEmbed(d)],
          ephemeral: true
        });
      }

      if (id === "studio:save") {
        saveDrafts();
        return interaction.reply({
          content: "Draft saved successfully.",
          ephemeral: true
        });
      }

      if (id === "studio:json") {
        const file = new AttachmentBuilder(
          Buffer.from(JSON.stringify(d, null, 2), "utf8"),
          { name: "h4era-embed.json" }
        );

        return interaction.reply({
          content: "Your embed draft JSON:",
          files: [file],
          ephemeral: true
        });
      }

      if (id === "studio:send") {
        if (!interaction.channel || !interaction.channel.isTextBased()) {
          return interaction.reply({
            content: "I can't send an embed in this channel.",
            ephemeral: true
          });
        }

        await interaction.channel.send({ embeds: [makeEmbed(d)] });

        return interaction.reply({
          content: "Embed sent successfully!",
          ephemeral: true
        });
      }

      if (id === "studio:exit") {
        return interaction.update({
          content: "Embed Studio closed.",
          embeds: [],
          components: []
        });
      }
    }

    if (interaction.isModalSubmit()) {
      const field = interaction.customId.slice(7);
      const allowed = ["title", "description", "color", "image", "thumbnail"];
      if (!allowed.includes(field)) return;

      const d = getDraft(interaction.user.id);
      const value = interaction.fields.getTextInputValue("value").trim();

      if (field === "color") {
        if (!/^#?[0-9a-fA-F]{6}$/.test(value)) {
          return interaction.reply({
            content: "Invalid HEX color. Example: `#00BFFF`",
            ephemeral: true
          });
        }
        d.color = value.startsWith("#") ? value : `#${value}`;
      } else if (field === "image" || field === "thumbnail") {
        if (value && !/^https?:\/\/\S+$/i.test(value)) {
          return interaction.reply({
            content: "Please enter a valid URL beginning with http:// or https://",
            ephemeral: true
          });
        }
        d[field] = value;
      } else {
        d[field] = value;
      }

      saveDrafts();

      return interaction.reply({
        content: `Updated **${field}**. Click Preview to check your embed.`,
        ephemeral: true
      });
    }
  } catch (error) {
    console.error(error);

    const message = {
      content: "Something went wrong. Check the bot logs and try again.",
      ephemeral: true
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(message).catch(() => {});
    } else {
      await interaction.reply(message).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
