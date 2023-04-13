const chai = require('chai');
const chaiHttp = require('chai-http');
const { app } = require('../index');
const User = require('../models/User');
const Post = require('../models/post');
const Comment = require('../models/comment');
const Likeable = require('../models/likable');
const mongoose = require('mongoose');
chai.use(chaiHttp);
const expect = chai.expect;

describe('createPost', () => {
    let user;
    let authToken;

    before(async () => {
        // create a user and get auth token
        user = await User.create({ name: 'Test User', email: 'testuser@example.com', password: 'testpassword' });

        const res = await chai.request(app)
            .post('/auth/login')
            .send({ email: 'testuser@example.com', password: 'testpassword' });
        authToken = user.generateAuthToken();
    });

    after(async () => {
        // delete the user and all posts
        await User.deleteOne({ _id: user._id });
        await Post.deleteMany({ user: user._id });
    });

    it('should create a post successfully', async () => {
        const res = await chai.request(app)
            .post('/api/posts')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ title: 'Test Post', description: 'This is a test post.' });

        expect(res).to.have.status(200);
        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('message', 'Post created successfully');
        expect(res.body.data).to.have.property('title', 'Test Post');
        expect(res.body.data).to.have.property('description', 'This is a test post.');
        expect(res.body.data).to.have.property('user', user._id.toString());
    });

    it('should return an error for missing title and description fields', async () => {
        const res = await chai.request(app)
            .post('/api/posts')
            .set('Authorization', `Bearer ${authToken}`)
            .send({});

        expect(res).to.have.status(400);
        expect(res.body).to.have.property('message', 'Title, descriptions field are required');
    });
});



describe('deletePost', () => {
    let user;
    let authToken;
    let post;
    let comment;
    let likeable;

    before(async () => {
        // create a user, post, comment, and likeable
        user = await User.create({ name: 'Test User', email: 'testuser@example.com', password: 'testpassword' });
        post = await Post.create({ title: 'Test Post', description: 'This is a test post.', user: user._id });
        comment = await Comment.create({ comment: 'Test Comment', user: user._id, post: post._id });
        likeable = await Likeable.create({ type: 'like', user: user._id, post: post._id });

        // get auth token
        const res = await chai.request(app)
            .post('/auth/login')
            .send({ email: 'testuser@example.com', password: 'testpassword' });
        authToken = user.generateAuthToken();
    });

    after(async () => {
        // delete the user, post, comment, and likeable
        await User.deleteOne({ _id: user._id });
        await Post.deleteOne({ _id: post._id });
        await Comment.deleteOne({ _id: comment._id });
        await Likeable.deleteOne({ _id: likeable._id });
    });

    it('should delete a post successfully', async () => {
        const res = await chai.request(app)
            .delete(`/api/posts/${post._id}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('message', 'Post deleted successfully');

        const deletedPost = await Post.findById(post._id);
        expect(deletedPost).to.be.null;

        const deletedComment = await Comment.findOne({ post: post._id });
        expect(deletedComment).to.be.null;

        const deletedLikeable = await Likeable.findOne({ post: post._id });
        expect(deletedLikeable).to.be.null;
    });

    it('should return a 404 error if the post is not found or not deleted', async () => {
        const fakePostId = '5437b312a07d0179beb03f53';
        const res = await chai.request(app)
            .delete(`/api/posts/${fakePostId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(404);
        expect(res.body).to.have.property('message', 'Post not found or not deleted');
    });
});



describe('Like post', () => {
    let user, post, accessToken;

    before(async () => {
        user = await User.create({
            name: 'Test User',
            email: 'testuser@example.com',
            password: 'password'
        });
        accessToken = user.generateAuthToken();
        post = await Post.create({
            title: 'Test Post',
            description: 'This is a test post.',
            user: user._id
        });
    });

    after(async () => {
        await User.deleteMany({});
        await Post.deleteMany({});
        await Likeable.deleteMany({});

    });

    it('should like a post', async () => {
        const res = await chai.request(app)
            .post(`/api/like/${post._id}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res).to.have.status(200);
        expect(res.body.success).to.be.true;
        expect(res.body.message).to.equal('Successfully liked');
    });

});


describe('Unlike post', () => {
    let user, post, accessToken, likeable;

    before(async () => {
        user = await User.create({
            name: 'Test User',
            email: 'testuser@example.com',
            password: 'password'
        });
        accessToken = user.generateAuthToken();
        post = await Post.create({
            title: 'Test Post',
            description: 'This is a test post.',
            user: user._id
        });
        likeable = await Likeable.create({
            user: user._id,
            post: post._id,
            type: 'like'
        });
    });

    after(async () => {
        await User.deleteMany({});
        await Post.deleteMany({});
        await Likeable.deleteMany({});
    });

    it('should unlike a post', async () => {
        const res = await chai.request(app)
            .post(`/api/unlike/${post._id}`)
            .set('Authorization', `Bearer ${user.generateAuthToken()}`);

        expect(res).to.have.status(200);
        expect(res.body.success).to.be.true;
        expect(res.body.message).to.equal('Successfully unliked');

        const updatedLikeable = await Likeable.findById(likeable._id);
        expect(updatedLikeable.type).to.equal('unlike');
    });

});


describe('Get post', () => {
    let post, comments, likes;

    before(async () => {
        const user = await User.create({
            name: 'Test User',
            email: 'testuser@example.com',
            password: 'password'
        });
        post = await Post.create({
            title: 'Test Post',
            description: 'This is a test post.',
            user: user._id
        });
        comments = [
            await Comment.create({ 
                comment: 'This is a comment.', 
                user: user._id, 
                post: post._id 
            }), 
            await Comment.create({ 
                comment: 'This is another comment.', 
                user: user._id, 
                post: post._id 
            })];
        likes = [
            await Likeable.create({ user: user._id, post: post._id, type: 'like' }), 
            await Likeable.create({ user: user._id, post: post._id, type: 'like' })];
    });

    after(async () => {
        await User.deleteMany({});
        await Post.deleteMany({});
        await Comment.deleteMany({});
        await Likeable.deleteMany({});
    });

    it('should get a post and related data', async () => {
        const res = await chai.request(app)
            .get(`/api/posts/${post._id}`);

        expect(res).to.have.status(200);
        expect(res.body.success).to.be.true;
        expect(res.body.message).to.equal('Successfully fetched data');
        expect(res.body.data.post._id).to.equal(post._id.toString());
        expect(res.body.data.likes).to.equal(likes.length);
        expect(res.body.data.comments).to.equal(comments.length);
    });

    it('should return 404 if post is not found', async () => {
        const res = await chai.request(app)
            .get(`/api/posts/5437b312a07d0179beb03f53`);

        expect(res).to.have.status(404);
        expect(res.body.success).to.be.false;
        expect(res.body.message).to.equal('Post not found');
    });
});


describe('Get all posts', () => {
    let user, accessToken;
    
    before(async () => {
        user = await User.create({
            name: 'Test User',
            email: 'testuser@example.com',
            password: 'password'
        });
        accessToken = user.generateAuthToken();
        let posts = [
            await Post.create({
                title: 'Test Post 1',
                description: 'This is a test post.',
                user: user._id
            }),
            await Post.create({
                title: 'Test Post 2',
                description: 'This is another test post.',
                user: user._id
            })
        ]
        await Comment.create({
            post: posts[0],
            comment: 'This is a test comment for post 1'
        });
        await Comment.create({
            post: posts[1],
            comment: 'This is a test comment for post 2'
        });
        await Likeable.create({
            user: user._id,
            post: posts[1],
            type: 'like'
        });
        await Likeable.create({
            user: user._id,
            post: posts[0],
            type: 'like'
        });
        await Likeable.create({
            user: user._id,
            post: posts[1],
            type: 'like'
        });
    });
  
    after(async () => {
        await User.deleteMany({});
        await Post.deleteMany({});
        await Comment.deleteMany({});
        await Likeable.deleteMany({});
    });
  
    it('should return all posts with comments and likes', async () => {
        const res = await chai.request(app)
            .get('/api/all_posts')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res).to.have.status(200);
        expect(res.body.success).to.be.true;
        expect(res.body.data).to.be.an('array');
        expect(res.body.data).to.have.lengthOf(2);
        expect(res.body.data[1]).to.have.property('likes');
    });
});


describe('Create Comment', () => {
    let user, post;
  
    before(async () => {
      user = await User.create({
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'password'
      });
      post = await Post.create({
        title: 'Test Post',
        description: 'This is a test post.',
        user: user._id
      });
    });
  
    after(async () => {
      await User.deleteMany({});
      await Post.deleteMany({});
      await Comment.deleteMany({});
    });
  
    it('should create a new comment', async () => {
      const commentText = 'This is a new comment';
      const res = await chai.request(app)
        .post(`/api/comment/${post._id}`)
        .set('Authorization', `Bearer ${user.generateAuthToken()}`)
        .send({ comment: commentText });
  
      expect(res).to.have.status(200);
      expect(res.body.success).to.be.true;
      expect(res.body.message).to.equal('Comment created successfully');
  
      const createdComment = await Comment.findOne({ post: post._id });
      expect(createdComment).to.exist;
      expect(createdComment.comment).to.equal(commentText);
      expect(createdComment.user.toString()).to.equal(user._id.toString());
      expect(createdComment.post.toString()).to.equal(post._id.toString());
    });
  
    it('should return 404 if post is not found', async () => {
      const commentText = 'This is a new comment';
      const invalidPostId = 'invalid_post_id';
      const res = await chai.request(app)
        .post(`/api/comment/5437b312a07d0179beb03f53`)
        .set('Authorization', `Bearer ${user.generateAuthToken()}`)
        .send({ comment: commentText });
  
      expect(res).to.have.status(404);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal('Post not found');
    });
  });
  