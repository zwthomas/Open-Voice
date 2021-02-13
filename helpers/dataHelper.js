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

    }

}