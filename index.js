const Discord = require("discord.js");
const { MongoClient } = require('mongodb');
const fs = require("fs");
const dataHelper = require("./helpers/dataHelper");
const discordHelper = require("./helpers/discordHelper");
const { privateCreationChannel, publicCreationChannel } = require("./helpers/dataHelper");
const { create } = require("domain");


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
let DB;

async function getConnection() {
    let user = encodeURIComponent(OPEN_VOICE_SECRETS["db-username"]);
    let password = encodeURIComponent(OPEN_VOICE_SECRETS["db-password"]);

    let url = `mongodb://${user}:${password}@192.168.73.20:27017`;
    MONGO_CLIENT = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    await MONGO_CLIENT.connect()
    DB = MONGO_CLIENT.db("nestdb").collection("open-voice")
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
        client.commands.get(command).execute(message, args, DB);
    } catch (error) {
        console.error(error);
        message.reply('there was an error trying to execute that command!');
    }
})

client.on("voiceStateUpdate", async (oldState, newState) => {

    let guildId = oldState.guild.id;
    let oldChannel = oldState.channelID;
    let newChannel = newState.channelID;
    // let guildData = await dataHelper.getGuildData(DB, guildId)
    // let newGuildData = { ...guildData };

    // Prevously in a voice channel
    if (oldChannel != null) {
        console.log("previously in a voice channel")
    }

    // Joined
    if (newChannel != null) {
        let guildData = await dataHelper.getGuildData(DB, guildId)

        // Me private channels need created
        if (privateCreationChannel(guildData, newChannel)) {
            let categoryId = await newState.channel.parent
            let [privateId, waitingId] = await discordHelper.createPrivate(newState, categoryId)
            dataHelper.addCreatedPrivateChannel(DB, guildId, categoryId, privateId, waitingId);
            newState.member.voice.setChannel(privateId);

        // New public channels need created
        } else if (publicCreationChannel(guildData, newChannel)) {
            let [createdChannel, inCategory] = await discordHelper.createPublic(client, newChannel)
            dataHelper.addCreatedPublicChannel(DB, guildId, inCategory, createdChannel)
            newState.member.voice.setChannel(createdChannel)

        // Was moved into a private channel, give permission to move others in
        } else if (dataHelper.joinedPrivateManagedChannel(guildData, newChannel)) {
            console.log("Need to update User")
            let waitingId = await dataHelper.getWaitingRoom(guildData, newState.channel);
            discordHelper.allowMoveMembersToChannel(newState.channel, newState.member, client.channels.cache.get(waitingId))
        }

    // Leaving voice entirely
    } else {
        let guildData = await dataHelper.getGuildData(DB, guildId)
        let membersLeftInChannel = oldState.channel.members.size;
        if (dataHelper.isPublicManagedChannel(guildData, oldChannel) && membersLeftInChannel == 0) {
            discordHelper.deleteManagedChannel(oldState.channel);
            dataHelper.deleteManagedPublic(DB, guildData, oldState);


        // Left Private Channel    
        } else if (dataHelper.isPrivateManagedChannel(guildData, oldChannel)) {

            // Last person in the channel
            if (membersLeftInChannel == 0) {
                discordHelper.deleteManagedChannel(oldState.channel);
                let waitingId = await dataHelper.deleteManagedPrivate(DB, guildData, oldState);
                discordHelper.deleteManagedChannel(client.channels.cache.get(waitingId));
            
            // People still in channel, remove privilege of person who left
            } else {
                let waitingId = await dataHelper.getWaitingRoom(guildData, oldState.channel);
                discordHelper.removeMemberPrivilege(oldState.channel, client.channels.cache.get(waitingId), oldState.member)    
            }

        }
            
    } 
})

// https://discordjs.guide/popular-topics/permissions.html#setting-role-permissions



