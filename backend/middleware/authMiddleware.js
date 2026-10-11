const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
      req.user = decoded;
      next();
    } catch (error) {
      console.error('JWT validation error:', error.message);
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'No authentication token provided.' });
  }
};

// Role authorization checker
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Forbidden: Access restricted. Required roles: [${roles.join(', ')}]. Current role: ${req.user ? req.user.role : 'None'}` 
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
