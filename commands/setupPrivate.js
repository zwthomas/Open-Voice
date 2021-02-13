module.exports = {
    name: "setupPrivate",
    descriptions: "Creates Private Voice Channels",
    async execute(message, args) {
        combineArgs = args.join(" ")

        if ((combineArgs.match(/"/g)||[]).length != 4) {
            message.channel.send("ERROR: Invalid Args");
            return;
        }

        // Get strings in quotes and remove white space strings
        newArgs = combineArgs.split("\"").filter((arg) => arg.trim().length > 0)

        if (newArgs.length != 2) {
            message.channel.send("ERROR: Invalid number of args");
            return;
        }

        let categoryName = newArgs[0];
        let channelName = newArgs[1];

        let response = await message.guild.channels.create(categoryName, {type: "category"});
        let categoryId = response.id;

        response = await message.guild.channels.create(channelName, {type: "voice", parent: categoryId, name: channelName});
        let channelId = response.id;

        console.log(response)
        

        // message.channel.send(message.guild)
    }
}