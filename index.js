const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const fs = require("fs");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const words = JSON.parse(fs.readFileSync("words.json", "utf8"));
const games = new Map();

function startGame(level) {
  const wordList = words[level];
  const selectedWord = wordList[Math.floor(Math.random() * wordList.length)];
  return {
    word: selectedWord.hiragana,
    kanji: selectedWord.kanji,
    english: selectedWord.english,
    hiddenWord: "_".repeat(selectedWord.hiragana.length),
    guessedLetters: [],
    wrongGuesses: 0,
  };
}

client.once("ready", () => {
  console.log(`Bot logged in as ${client.user.tag}!`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!start-hangman") {
    const row = new ActionRowBuilder().addComponents(
      ["jlpt5", "jlpt4", "jlpt3", "jlpt2", "jlpt1"].map((level) =>
        new ButtonBuilder()
          .setCustomId(level)
          .setLabel(level.toUpperCase().replace("JLPT", "JLPT "))
          .setStyle(ButtonStyle.Primary)
      )
    );

    await message.reply({
      content: "Please select a level to start the game:",
      components: [row],
    });
  } else if (message.content.startsWith("!guess ")) {
    const game = games.get(message.channel.id);
    if (!game)
      return message.reply("No active game. Start one with `!start-hangman`.");

    const letter = message.content.split(" ")[1];
    if (!letter || game.guessedLetters.includes(letter)) return;

    game.guessedLetters.push(letter);

    if (game.word.includes(letter)) {
      game.hiddenWord = game.word
        .split("")
        .map((l) => (game.guessedLetters.includes(l) ? l : "_"))
        .join("");
    } else {
      game.wrongGuesses++;
    }

    if (game.hiddenWord === game.word) {
      games.delete(message.channel.id);
      return message.reply(
        `🎉 **YOU WON!** The word was **${game.word}** (**${game.kanji}**) - ${game.english}`
      );
    }

    if (game.wrongGuesses >= 10) {
      games.delete(message.channel.id);
      return message.reply(
        `❌ **YOU LOST!** The word was **${game.word}** (**${game.kanji}**) - ${game.english}`
      );
    }

    await message.reply(
      `**Current word:** ${game.hiddenWord}\n❌ Wrong guesses: ${game.wrongGuesses}/10`
    );
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  try {
    console.log("Button interaction received:", interaction.customId);

    const gameData = startGame(interaction.customId);
    games.set(interaction.channelId, gameData);

    await interaction.reply({
      content: `🎮 **Game started!** Guess the word: ${gameData.hiddenWord}\nUse \`!guess [letter]\` to play.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error("Interaction error:", error);
    try {
      await interaction.reply({
        content: "⚠️ An error occurred. Please try again.",
        flags: MessageFlags.Ephemeral,
      });
    } catch (e) {
      console.error("Failed to send error response:", e);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
