const express = require('express');
const { postController, userController } = require('../controllers');
const { authenticateToken } = require('../middlewares/authentication');
const router = express.Router();

router.post('/authenticate', userController.authentication);
router.post('/follow/:id', authenticateToken, userController.followUser);
router.post('/unfollow/:id', authenticateToken, userController.unfollowUser);
router.get('/user', authenticateToken, userController.userProfile);
router.post('/posts', authenticateToken, postController.createPost);
router.delete('/posts/:id', authenticateToken ,postController.deletePost);
router.post('/like/:id', authenticateToken , postController.likePost);
router.post('/unlike/:id', authenticateToken ,postController.unlikePost);
router.post('/comment/:id', authenticateToken ,postController.createComment);
router.get('/posts/:id', postController.getPost);
router.get('/all_posts', authenticateToken ,postController.getAllPosts);


module.exports = router;