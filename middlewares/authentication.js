const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
    
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        const error = new Error('Unauthorized');
        error.status = 401;
        throw error;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded.userId)
    const user = await User.findById(decoded.userId);
    if (!user) {
        const error = new Error('Forbidden');
        error.status = 403;
        throw error;
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
    authenticateToken
}