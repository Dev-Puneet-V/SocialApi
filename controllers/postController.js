const Likeable = require('../models/likable');
const Post = require('../models/post');
const Comment = require('../models/comment');
const User= require('../models/User');
const mongoose = require('mongoose');
const createPost = async (req, res, next) => {
    try {
        const user = req.user;
        const {
            title,
            description
        } = req.body;
        if(!title || title.length === 0 || !description || description === 0){
            const error = new Error('Title, descriptions field are required');
            error.status = 400;
            throw error;
        }
        const newPost = await Post.create({
            title,
            description,
            user: user._id
        });
        newPost.__v = undefined;
        if(!newPost){
            const error = new Error('Error in post creation');
            throw error;
        }
        res.status(200).json({
            success: true,
            message: 'Post created successfully',
            data: newPost
        })
    } catch(err) {
        next(err)
    }
}

const deletePost = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = req.user;
    const postId = req.params.id;

    const postDeleteResult = await Post.deleteOne({
        user,
        _id: postId
    }).session(session);

    if (postDeleteResult.deletedCount === 0) {
        const error = new Error('Post not found or not deleted');
        error.status = 404;
        throw error;
    }

    const commentDeleteResult = await Comment.deleteMany({
        post: postId
    }).session(session);

    if (commentDeleteResult.deletedCount === 0) {
        console.warn('No comments found or deleted for post:', postId);
    }

    const likeableDeleteResult = await Likeable.deleteMany({
        post: postId
    }).session(session);

    if (likeableDeleteResult.deletedCount === 0) {
        console.warn('No likables found or deleted for post:', postId);
    }

    await session.commitTransaction();

    res.status(200).json({
        success: true,
        message: 'Post deleted successfully'
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
}



const likePost = async (req, res, next) => {
    try {
        const user = req.user;
        const postId = req.params.id;
        await Likeable.findOneAndUpdate({
            user,
            post: postId
        }, {
            type: "like"
        }, {
            upsert: true,
            new: true
        })
        res.status(200).json({
            success: true,
            message: 'Successfully liked'
        });
    } catch(err) {
        next(err)
    }
}


const unlikePost = async (req, res, next) => {
    try {
        const user = req.user;
        const postId = req.params.id;
        await Likeable.findOneAndUpdate({
            user,
            post: postId
        }, {
            type: "unlike"
        }, {
            upsert: true,
            new: true
        })
        res.status(200).json({
            success: true,
            message: 'Successfully unliked'
        });
    } catch(err) {
        next(err)
    }
}


const getPost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId)
                            .populate({
                                path: 'user',
                                select: '-password -__v -following -followers'
                            })
                            .exec();
        if(!post){
            const error = new Error('Post not found');
            error.status = 404;
            throw error;
        }
        const comments = await Comment.find({
          post: postId  
        });
        const likes = await Likeable.find({
            type: 'like',
            post: postId
        });
        res.status(200).json({
            success: true,
            message: "Successfully fetched data",
            data: {
                post,
                likes: likes?.length || 0,
                comments: comments?.length || 0
            }
        })
    } catch(err) {
        next(err);
    }
}

const getAllPosts = async (req, res, next) => {
    try {
        const user = req.user;
        const posts = await Post.find({ user });

        // Get comments for each post
        const postIds = posts.map(post => post._id);
        const comments = await Comment.aggregate([
            { $match: { post: { $in: postIds } } },
          ]);

        // Get likes for each post
        const likes = await Likeable.aggregate([
            { $match: { post: { $in: postIds }, type: 'like' } },
            { $group: { _id: '$post', count: { $sum: 1 } } }
        ]);

        // Combine posts, comments, and likes into a single object for each post
        const combinedPosts = posts.map(post => {
            const postComments = comments.filter(comment => comment.post._id.equals(post._id));
            const postLikes = likes.find(l => l._id.equals(post._id)) || { count: 0 };
            return {
                _id: post._id,
                title: post.title,
                content: post.content,
                createdAt: post.createdAt,
                updatedAt: post.updatedAt,
                comments: postComments,
                likes: postLikes.count
            };
        });

        res.status(200).json({
            success: true,
            message: 'Successfully fetched the data',
            data: combinedPosts
        });

    } catch(err) {
        next(err)
    }
}

const createComment = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const user = req.user;
        const commentText = req.body.comment;
        const post = await Post.findById(postId);
        if(!post){
            const error = new Error('Post not found');
            error.status = 404;
            throw error;
        }
        const comment = await Comment.create({
            post,
            user,
            comment: commentText
        });
        res.status(200).json({
            success: true,
            message: 'Comment created successfully',
            commentId: comment._id
        });
    } catch(err) {
        next(err);
    }
}


module.exports = {
    createPost,
    deletePost,
    likePost,
    unlikePost,
    getPost,
    getAllPosts,
    createComment
}