const { Db } = require("mongodb");

module.exports = {
    checkForGuild: function(db, guildId) {
        let result = db.find({guildId: guildId});
        return result.toArray().length > 0;
    },
    insertGuildIntoDB: function(db, guildId) {
        let starter = {
            guildId: guildId,
            private: [],
            public: []
        };

        db.insertOne(starter);
    },
    insertNewCategory: async function(db, guildId, categoryId, channelId, private) {
        let result = await db.findOne({guildId: guildId});
        let dataToModify;
        if (private) {
            dataToModify = [...result.private];
        } else {
            dataToModify = [...result.public];
        }

        dataToModify.push({categoryId: categoryId, channelId: channelId, managedChannels: []})

        if (private) {
            db.updateOne({guildId: guildId}, {$set: {private: dataToModify}})
        } else {
            db.updateOne({guildId: guildId}, {$set: {public: dataToModify}})
        }

    },
    getGuildData: async function(db, guildId) {
        return await db.findOne({guildId: guildId});
    },
    
    privateCreationChannel: function(guildData, channelId)  {
        return guildData.private.some(e => e.channelId == channelId)
    },

    publicCreationChannel: function(guildData, channelId) {
        return guildData.public.some(e => e.channelId == channelId)
    },
    addCreatedPublicChannel: async function(db, guildId, categoryId, channelId) {
        let result = await db.findOne({guildId: guildId});
        let dataToModify = [ ...result.public];

        dataToModify.forEach(group => {
            if (group.categoryId == categoryId) {
                group.managedChannels.push(channelId)
            }
        })

        db.updateOne({guildId: guildId}, {$set: {public: dataToModify}})
    },
    isPublicManagedChannel: function(guildData, channelId) {
        return guildData.public.some(group => group.managedChannels.some(channel => channel == channelId));
    },
    deleteManagedPublic: async function(db, guildData, oldState) {
        let dataToModify = [ ...guildData.public ];
        let categoryId = await oldState.channel.parent

        dataToModify.forEach(group => {
            if (group.categoryId == categoryId) {
                let ndx = group.managedChannels.indexOf(oldState.channel.id);
                if (ndx > -1) {
                    group.managedChannels.splice(ndx, 1);
                }
            }
        })

        db.updateOne({guildId: oldState.guild.id}, {$set: {public: dataToModify}})

        
    }

}