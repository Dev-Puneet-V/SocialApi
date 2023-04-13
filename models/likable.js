const mongoose = require('mongoose');

const LikableSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['like', 'unlike']
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

const Likable = mongoose.model('Likable', LikableSchema);

module.exports = Likable;
