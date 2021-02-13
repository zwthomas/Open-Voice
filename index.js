const Discord = require("discord.js");
const { MongoClient } = require('mongodb');
const fs = require("fs");

const VAULT_OPTIONS = {
    apiVersion: "v1",
    endpoint: "http://192.168.73.20:8200",
    token: "s.tLWbbS9mBlEcDedkystiYG8P"
};

const vault = require("node-vault")(VAULT_OPTIONS);
const client = new Discord.Client();
client.commands = new Discord.Collection();

let OPEN_VOICE_SECRETS = {};
let MONGO_CLIENT;
let PREFIX = "?";

async function getConnection() {
    let user = encodeURIComponent(OPEN_VOICE_SECRETS["db-username"]);
    let password = encodeURIComponent(OPEN_VOICE_SECRETS["db-password"]);

    let url = `mongodb://${user}:${password}@192.168.73.20:27017`;
    MONGO_CLIENT = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    await MONGO_CLIENT.connect()
}


(async () => {
    let openVoiceSec = await vault.read("node/open-voice")
    OPEN_VOICE_SECRETS = openVoiceSec.data;
    await getConnection();
    client.login(OPEN_VOICE_SECRETS["dev-token"])
})();

const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}


client.once("ready", async () => {
    console.log("Ready!");
})

client.on("message", message => {
    if (!message.content.startsWith(PREFIX) || message.author.bot || !message.member.hasPermission('ADMINISTRATOR')) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
	const command = args.shift();

    if (!client.commands.has(command)) return;

    try {
        client.commands.get(command).execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply('there was an error trying to execute that command!');
    }


})

// https://discordjs.guide/popular-topics/permissions.html#setting-role-permissions



