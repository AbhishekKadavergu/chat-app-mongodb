const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        chatroom: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Room',
        },
        text: {
            type: String,
            trim: true,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// messageSchema.virtual('user', {
//     ref: 'User',
//     localField: 'sender',
//     foreignField: '_id',
// });

messageSchema.statics.dataCleanup = ({ sender, text, createdAt }) => {
    return {
        sender: { email: sender.email, username: sender.username },
        text,
        createdAt,
    };
};

messageSchema.statics.generateMessage = async function ({ _id, chatroom }, text) {
    text = text.trim();

    if (!text) {
        return;
    }
    const message = await this.create({ sender: _id, chatroom, text });

    return this.dataCleanup(await message.execPopulate('sender', 'username email'));
};

messageSchema.statics.generateAdminNotif = (chatroom, text) => {
    const notif = {
        sender: { username: 'Admin' },
        chatroom,
        text,
        createdAt: new Date().getTime(),
    };

    return notif;
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
