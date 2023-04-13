const chai = require('chai');
const chaiHttp = require('chai-http');
const {app, server} = require('../index');
const User = require('../models/User');

chai.use(chaiHttp);
const expect = chai.expect;

describe('Authentication', () => {

  it('should return a token on successful login', async () => {
    const user = new User({
      email: 'testuser@example.com',
      password: 'testpassword'
    });
    await user.save();

    const res = await chai.request(app)
      .post('/api/authenticate')
      .send({
        email: 'testuser@example.com',
        password: 'testpassword'
      });

    expect(res).to.have.status(200);
    expect(res.body).to.have.property('success').to.equal(true);
    expect(res.body).to.have.property('message').to.equal('Login successful');
    expect(res.body).to.have.property('token');
  });

  it('should return an error on unsuccessful login', async () => {
    const res = await chai.request(app)
      .post('/api/authenticate')
      .send({
        email: 'invalid@example.com',
        password: 'invalidpassword'
      });

    expect(res).to.have.status(401);
    expect(res.body).to.have.property('message').to.equal('Invalid credentials');
  });
});

describe('Follow User', () => {
  let user;
  let otherUser;
  let userToken;

  before(async () => {
    // create a user to follow and another user
    user = new User({
      email: 'user1@example.com',
      password: 'password1'
    });
    await user.save();
    userToken = await user.generateAuthToken();
    otherUser = new User({
      email: 'user2@example.com',
      password: 'password2'
    });
    await otherUser.save();
  });

  after(async () => {
    // clean up the database
    await User.deleteMany({});
  });

  it('should follow a user successfully', async () => {
    const res = await chai.request(app)
      .post(`/api/follow/${otherUser._id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res).to.have.status(200);
    expect(res.body).to.have.property('success').to.equal(true);
    expect(res.body).to.have.property('message').to.equal('Successfully followed User');

    // check that the user and otherUser have updated correctly
    const updatedUser = await User.findById(user._id);
    const updatedOtherUser = await User.findById(otherUser._id);

    expect(updatedUser.following).to.have.lengthOf(1);
    expect(updatedUser.following[0].toString()).to.equal(otherUser._id.toString());

    expect(updatedOtherUser.followers).to.have.lengthOf(1);
    expect(updatedOtherUser.followers[0].toString()).to.equal(user._id.toString());
  });

  it('should return an error when trying to follow an invalid user', async () => {
    const res = await chai.request(app)
      .post(`/api/follow/5437b312a07d0179beb03f53`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res).to.have.status(404);
    expect(res.body).to.have.property('success').to.equal(false);
    expect(res.body).to.have.property('message').to.equal('Invalid User');
  });

  it('should return an error when trying to follow a user that has already been followed', async () => {
    // follow the otherUser once
    otherUser.followers.push(user);
    await otherUser.save();

    const res = await chai.request(app)
      .post(`/api/follow/${otherUser._id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res).to.have.status(409);
    expect(res.body).to.have.property('success').to.equal(false);
    expect(res.body).to.have.property('message').to.equal('User already followed');
  });
});

describe('Unfollow User', () => {
  let user;
  let otherUser;

  before(async () => {
    // create a user to follow and another user
    user = new User({
      email: 'user1@example.com',
      password: 'password1',
      following: [],
      followers: []
    });
    await user.save();

    otherUser = new User({
      email: 'user2@example.com',
      password: 'password2',
      following: [],
      followers: []
    });
    await otherUser.save();

    // have the user follow the other user
    user.following.push(otherUser._id);
    otherUser.followers.push(user._id);
    await user.save();
    await otherUser.save();
  });

  after(async () => {
    // clean up the database
    await User.deleteMany({});
  });

  it('should unfollow a user successfully', async () => {
    const res = await chai.request(app)
      .post(`/api/unfollow/${otherUser._id}`)
      .set('Authorization', `Bearer ${user.generateAuthToken()}`);

    expect(res).to.have.status(200);
    expect(res.body).to.have.property('success').to.equal(true);
    expect(res.body).to.have.property('message').to.equal('Successfully unfollowed User');

    // check that the user and otherUser have updated correctly
    const updatedUser = await User.findById(user._id);
    const updatedOtherUser = await User.findById(otherUser._id);

    expect(updatedUser.following).to.have.lengthOf(0);
    expect(updatedOtherUser.followers).to.have.lengthOf(0);
  });

  it('should return an error if trying to unfollow a user that has not been followed', async () => {
    const res = await chai.request(app)
      .post(`/api/unfollow/${otherUser._id}`)
      .set('Authorization', `Bearer ${user.generateAuthToken()}`);

    expect(res).to.have.status(409);
    expect(res.body).to.have.property('success').to.equal(false);
    expect(res.body).to.have.property('message').to.equal('User is already unfollowed');
  });

  it('should return an error if trying to unfollow an invalid user', async () => {
    const res = await chai.request(app)
      .post(`/api/unfollow/5437b312a07d0179beb03f53`)
      .set('Authorization', `Bearer ${user.generateAuthToken()}`);

    expect(res).to.have.status(404);
    expect(res.body).to.have.property('success').to.equal(false);
    expect(res.body).to.have.property('message').to.equal('Invalid User');
  });
});


describe('userProfile', () => {
  it('should return the user profile data', async () => {
    const user = new User({
      name: 'John Doe',
      email: 'johndoe@example.com',
      password: 'password'
    });
    await user.save();

    const authToken = user.generateAuthToken();

    const res = await chai.request(app)
      .get('/api/user')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res).to.have.status(200);
    expect(res.body).to.have.property('success').to.equal(true);
    expect(res.body).to.have.property('message').to.equal('Succefully retrived user profile data');
    expect(res.body).to.have.property('data');
    expect(res.body.data).to.have.property('name').to.equal('John Doe');
    expect(res.body.data).to.have.property('followersCount').to.equal(0);
    expect(res.body.data).to.have.property('followingCount').to.equal(0);
  });

  it('should return 401 error if no auth token is provided', async () => {
    const res = await chai.request(app).get('/api/user');
    expect(res).to.have.status(401);
    expect(res.body).to.have.property('success').to.equal(false);
    expect(res.body).to.have.property('message').to.equal('Unauthorized');
  });
});




