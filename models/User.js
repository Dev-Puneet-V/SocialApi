const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
    name: String,
    email: {
        type: String,
        required: [true, "Email is required"]
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
});

UserSchema.methods.generateAuthToken = function() {
    const token = jwt.sign({ userId: this._id }, process.env.JWT_SECRET, {expiresIn: '1hr'});
    return token;
  };
  

const User = mongoose.model('User', UserSchema);

module.exports = User;
