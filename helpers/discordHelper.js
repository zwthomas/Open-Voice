const dataHelper = require("./dataHelper");


module.exports = {
    createPublic: async function(client, creationChannel) {
        let channelName = "Public";
        let category = await client.channels.cache.get(creationChannel).parent;
        let guild = await client.channels.cache.get(creationChannel).guild

        let response =  await guild.channels.create(channelName, {type: "voice", parent: category.id, name: channelName});
        
        let channelId = response.id;
        
        return [channelId, category.id];
    },
    deleteManagedChannel: function(channel) {
        channel.delete()
    },
    createPrivate: async function(newState, categoryId) {
        let memberName = newState.member.displayName;
        let channelName = memberName + "'s Private Room";
        let waitingName = memberName + "'s Waiting Room";
        let guild = newState.guild; 

        let private =  await guild.channels.create(channelName, {type: "voice", parent: categoryId, name: channelName});
        let waiting =  await guild.channels.create(waitingName, {type: "voice", parent: categoryId, name: waitingName});

        private.createOverwrite(guild.roles.everyone, {"CONNECT": false})
        // private.createOverwrite(newState.member, {"CONNECT": true, "MOVE_MEMBERS": true});

        // waiting.updateOverwrite(newState.member, {"MOVE_MEMBERS": true});

        return [private.id, waiting.id]
    },
    removeMemberPrivilege: function(private, waiting, member) {
        private.createOverwrite(member, {"CONNECT": false, "MOVE_MEMBERS": false});
        waiting.updateOverwrite(member, {"MOVE_MEMBERS": false});
    },
    allowMoveMembersToChannel: function(private, member, waiting) {
        private.createOverwrite(member, {"CONNECT": true, "MOVE_MEMBERS": true});
        waiting.createOverwrite(member, {"MOVE_MEMBERS": true});
    }
    
}