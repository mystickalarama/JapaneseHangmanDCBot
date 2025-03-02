const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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

const games = new Map();

client.on("messageCreate", async (message) => {
  if (message.content === "!start-hangman") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("jlpt5")
        .setLabel("JLPT 5")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("jlpt4")
        .setLabel("JLPT 4")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("jlpt3")
        .setLabel("JLPT 3")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("jlpt2")
        .setLabel("JLPT 2")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("jlpt1")
        .setLabel("JLPT 1")
        .setStyle(ButtonStyle.Primary)
    );

    await message.reply({
      content: "Please select a level to start the game:",
      components: [row],
    });
  } else if (message.content.startsWith("!guess ") && !message.author.bot) {
    const game = games.get(message.channel.id);
    if (!game) return;

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
        `YOU WON! 🎉 The word was **${game.word}** (**${game.kanji}**) - ${game.english}`
      );
    }

    if (game.wrongGuesses >= 10) {
      games.delete(message.channel.id);
      return message.reply(
        `YOU LOST! ❌ The word was **${game.word}** (**${game.kanji}**) - ${game.english}`
      );
    }

    await message.reply(
      `Current word: ${game.hiddenWord} | Wrong guesses: ${game.wrongGuesses}/10`
    );
  }
});

// Buton etkileşimlerini işlemek için event handler
client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isButton()) return;

    console.log("Buton etkileşimi alındı:", interaction.customId);

    const gameData = startGame(interaction.customId);
    games.set(interaction.channelId, gameData);

    await interaction.reply({
      content: `Game started! Guess the word: ${gameData.hiddenWord}\nUse \`!guess [letter]\` to play.`,
      ephemeral: false,
    });
  } catch (error) {
    console.error("Etkileşim hatası:", error);
    try {
      await interaction.reply({
        content: "Bir hata oluştu. Lütfen tekrar deneyin.",
        ephemeral: true,
      });
    } catch (e) {
      console.error("Hata yanıtı gönderilemedi:", e);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
