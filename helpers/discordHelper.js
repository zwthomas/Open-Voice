const dataHelper = require("./dataHelper");


module.exports = {
    createPublic: async function(client, creationChannel) {
        let channelName = "Public";
        let category = await client.channels.cache.get(creationChannel).parent;
        let guild = await client.channels.cache.get(creationChannel).guild

        response =  await guild.channels.create(channelName, {type: "voice", parent: category.id, name: channelName});
        
        let channelId = response.id;
        
        return [channelId, category.id];
    },
    deleteManagedPublic: function(channel) {
        channel.delete()

    }
    
}