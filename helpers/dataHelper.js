const { Db } = require("mongodb");

module.exports = {
    hasBotBeenSetup: async function(pool, guildId) {
        let err, res = await pool.query('SELECT guild_id from guilds');
        if (0 == res.rows.length) {
            return false;
        }
        return true
    },
    privateCreationChannel: async function(pool, joinedChannelId, guildId)  {
        let err, res = await pool.query('SELECT channel_id from private_create where guild_id=$1', [guildId]);
        return res.rows.some((row) => row.channel_id == joinedChannelId)
    },
    addCreatedPrivateChannel: async function(pool, guildId, categoryId, privateId, waitingId) {
        let err, res = await pool.query("INSERT INTO private_managed (channel_id, category_id, guild_id, waiting_room_id) VALUES ($1,$2,$3,$4)", [privateId, categoryId, guildId, waitingId])
    },
    isPrivateManagedChannel: async function(pool, guildId, channelId) {
        let err, res = await pool.query("SELECT channel_id from private_managed where guild_id=$1", [guildId])
        return res.rows.some((row) => row.channel_id == channelId)
    },
    deleteManagedPrivate: async function(pool, guildId, oldState) {
        let categoryId = await oldState.channel.parent.id;
        let channelId = oldState.channel.id

        // let err, res = await pool.query("SELECT waiting_room_id from private_managed WHERE channel_id=$1 ANd guild_id=$2 AND category_id=$3", [channelId, guildId, categoryId])
        // let waitingId = res.rows[0].waiting_room_id
        let waitingId = await this.getWaitingRoom(pool, channelId, guildId, categoryId)
        await pool.query("DELETE FROM private_managed WHERE channel_id=$1 AND guild_id=$2 AND category_id=$3",[channelId, guildId, categoryId]);
        return waitingId
    },
    publicCreationChannel: async function(pool, joinedChannelId, guildId) {
        let err, res = await pool.query('SELECT channel_id from public_create where guild_id=$1', [guildId]);
        return res.rows.some((row) => row.channel_id == joinedChannelId)
    },
    addCreatedPublicChannel: async function(pool, guildId, categoryId, channelId) {
        let err, res = await pool.query("INSERT INTO public_managed (channel_id, category_id, guild_id) VALUES ($1,$2,$3)", [channelId, categoryId, guildId])
    },
    isPublicManagedChannel: async function(pool, guildId, channelId) {
        let err, res = await pool.query("SELECT channel_id from public_managed where guild_id=$1", [guildId])
        return res.rows.some((row) => row.channel_id == channelId)
    },
    deleteManagedPublic: async function(pool, guildId, oldState) {
        let categoryId = await oldState.channel.parent
        let channelId = oldState.channel.id
        await pool.query("DELETE FROM public_managed WHERE channel_id=$1 AND guild_id=$2 AND category_id=$3",[channelId, guildId, categoryId]);   
    }, 
    getWaitingRoom: async function(pool, channelId, guildId, categoryId) {
        let err, res = await pool.query("SELECT waiting_room_id from private_managed WHERE channel_id=$1 ANd guild_id=$2 AND category_id=$3", [channelId, guildId, categoryId])
        let waitingId = res.rows[0].waiting_room_id
        return waitingId
    },
    









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
    
    

    



    

    

    joinedPrivateManagedChannel: function(guildData, channelId) {
        return guildData.private.some(group => group.managedChannels.some(channelInfo => channelInfo.privateId == channelId));
    }

}