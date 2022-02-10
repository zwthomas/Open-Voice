const Discord = require("discord.js");
const { Client, Pool } = require("pg");
const fs = require("fs");
const dataHelper = require("./helpers/dataHelper");
const discordHelper = require("./helpers/discordHelper");
const { privateCreationChannel, publicCreationChannel } = require("./helpers/dataHelper");
const { create } = require("domain");




const VAULT_OPTIONS = {
    apiVersion: "v1",
    endpoint: "http://192.168.73.20:8200",
    token: "s.NkYRYbkbnZduSOeUAf09Xl5z"
};

const vault = require("node-vault")(VAULT_OPTIONS);
const client = new Discord.Client();
client.commands = new Discord.Collection();

let OPEN_VOICE_SECRETS = {};
let MONGO_CLIENT;
let PREFIX = "?";
let POOL;

async function getConnection() {
    POOL = new Pool({
        host: process.env.POSTGRES_URL,
        user: process.env.POSTGRES_USERNAME,
        password: process.env.POSTGRES_PASSWORD,
        database: "open_voice"
    });
}

function log(message) {
    return new Date().toUTCString() + " | " + message;
}

(async () => {
    let openVoiceSec = await vault.read("node/open-voice")
    OPEN_VOICE_SECRETS = openVoiceSec.data;
    await getConnection();
    // client.login(OPEN_VOICE_SECRETS["dev-token"])
    client.login(OPEN_VOICE_SECRETS["prod-token"])
})();

// const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
// for (const file of commandFiles) {
//     const command = require(`./commands/${file}`);
//     client.commands.set(command.name, command);
// }


client.once("ready", async () => {
    console.log("Ready!");
})

client.on("message", message => {
    if (!message.content.startsWith(PREFIX) || message.author.bot || !message.member.hasPermission('ADMINISTRATOR')) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift();

    if (!client.commands.has(command)) return;

    try {
        client.commands.get(command).execute(message, args, POOL);
    } catch (error) {
        console.error(error);
        message.reply('there was an error trying to execute that command!');
    }
})

client.on("voiceStateUpdate", async (oldState, newState) => {

    let guildId = oldState.guild.id;
    let oldChannel = oldState.channelID;
    let newChannel = newState.channelID;

    // Determine if the bot has been setup in this server
//     let isSetup = await dataHelper.hasBotBeenSetup(POOL, guildId)
    let isSetup = true
    
    // Joined
    if (newChannel != null && isSetup) {

        // New private channels need created
        if (await privateCreationChannel(POOL, newChannel, guildId)) {
            console.log(log(`${newState.guild.name} | ${newState.member.displayName} | Create Private`));

            let categoryId = await newState.channel.parent.id
            let [privateId, waitingId] = await discordHelper.createPrivate(newState, categoryId)
            dataHelper.addCreatedPrivateChannel(POOL, guildId, categoryId, privateId, waitingId);
            newState.member.voice.setChannel(privateId);

            // New public channels need created
        } else if (await publicCreationChannel(POOL, newChannel, guildId)) {
            console.log(log(`${newState.guild.name} | ${newState.member.displayName } | Create Public`));

            let [createdChannel, inCategory] = await discordHelper.createPublic(client, newChannel)
            dataHelper.addCreatedPublicChannel(POOL, guildId, inCategory, createdChannel)
            newState.member.voice.setChannel(createdChannel)

            // Was moved into a private channel, give permission to move others in
        } else if (await dataHelper.isPrivateManagedChannel(POOL, guildId, newChannel)) {
            console.log(log(`${newState.guild.name} | ${newState.member.displayName} | ${newState.channel.name} | Add Permissions`))
            let categoryId = await oldState.channel.parent.id
            let waitingId = await dataHelper.getWaitingRoom(POOL, newChannel, guildId, categoryId);
            discordHelper.allowMoveMembersToChannel(newState.channel, newState.member, client.channels.cache.get(waitingId))
        }


    }


    // Leaving voice channel
    if (oldChannel != null && isSetup && oldState.channel) {
        let membersLeftInChannel = oldState.channel.members.size;
        
        // Left Public Channel
        if (await dataHelper.isPublicManagedChannel(POOL, guildId, oldChannel) && membersLeftInChannel == 0) {
            console.log(log(`${oldState.guild.name} | ${oldState.member.displayName} | Remove Public`))

            discordHelper.deleteManagedChannel(oldState.channel);
            dataHelper.deleteManagedPublic(POOL, guildId, oldState);


            // Left Private Channel    
        } else if (await dataHelper.isPrivateManagedChannel(POOL, guildId, oldChannel)) {

            // Last person in the channel
            if (membersLeftInChannel == 0) {
                console.log(log(`${oldState.guild.name} | ${oldState.member.displayName} | Remove Private`))

                discordHelper.deleteManagedChannel(oldState.channel);
                let waitingId = await dataHelper.deleteManagedPrivate(POOL, guildId, oldState);
                discordHelper.deleteManagedChannel(client.channels.cache.get(waitingId));

                // People still in channel, remove privilege of person who left
            } else {
                console.log(log(`${oldState.guild.name} | ${oldState.member.displayName} | ${oldState.channel.name} | Remove Permissions`))
                let categoryId = await oldState.channel.parent.id
                let channelId = oldState.channel.id
                let waitingId = await dataHelper.getWaitingRoom(POOL, channelId, guildId, categoryId);
                discordHelper.removeMemberPrivilege(oldState.channel, client.channels.cache.get(waitingId), oldState.member)
            }

        }

    }
})

// https://discordjs.guide/popular-topics/permissions.html#setting-role-permissions



