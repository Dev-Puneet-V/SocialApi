const User = require('../models/User')
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
// authenticate and send jwt token
const authentication = async (req, res, next) => {
    try {
        const {
            email, 
            password
        } = req.body;
        // Find user by email and password
        const user = await User.findOne({
            email: email,
            password: password
        });
        console.log(user)
        if(!user){
            const error = new Error('Invalid credentials');
            error.status = 401;
            throw error;
        }
        
        // Create JWT token and send it in response
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).send({
            success: true, 
            message: 'Login successful', 
            token 
        });
    }catch(err){
        next(err);
    }
};

const followUser = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const user = req.user;
        const otherUserId = req.params.id;
        const otherUser = await User.findById(otherUserId).session(session);
        
        if(!otherUser){
            const error =  Error('Invalid User');
            error.status = 404;
            throw error;
        }
        if(otherUser.followers.filter(curreUser => curreUser._id.toString() == user._id.toString()).length !== 0){
            const error =  Error('User already followed');
            error.status = 409;
            throw error;
        }

        otherUser.followers.push(user);
        await otherUser.save();

        user.following.push(otherUser);
        await user.save();

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: 'Successfully followed User'
        });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        next(err);
    }
}


const unfollowUser = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const user = req.user;
        const otherUserId = req.params.id;
        const otherUser = await User.findById(otherUserId).session(session);

        if(!otherUser){
            const error =  Error('Invalid User');
            error.status = 404;
            throw error;
        }
        if(user.following.filter(curreUser => curreUser._id.toString() === otherUser._id.toString()).length === 0){
            const error =  Error('User is already unfollowed');
            error.status = 409;
            throw error;
        }
        
        user.following = user.following.filter((followingUser) => {
            return followingUser._id.toString() !== otherUser._id.toString();
        });
        await user.save();

        otherUser.followers = user.followers.filter((followerUser) => {
            return followerUser._id.toString() !== user._id.toString();
        });
        await otherUser.save();

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: 'Successfully unfollowed User'
        });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        next(err);
    }
}



const userProfile = async (req, res, next) => {
    try {
        const user = req.user;
        res.status(200).json({
            success: true,
            message: "Succefully retrived user profile data",
            data: {
                name: user.name,
                followersCount: user.followers?.length || 0,
                followingCount: user.following?.length || 0
            }
        })
    } catch(err){
        next(err);
    }
};

module.exports = {
    authentication,
    followUser,
    unfollowUser,
    userProfile
}

