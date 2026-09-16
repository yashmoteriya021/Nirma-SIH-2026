import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import User from '../models/User.js';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * JWT authentication middleware.
 * Extracts token from Authorization: Bearer <token>, verifies it,
 * and attaches the user to req.user.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'AUTH_REQUIRED', 'Authentication required. Please provide a valid token.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    const user = await User.findById(decoded.userId).select('-password_hash -__v');
    if (!user) {
      return errorResponse(res, 'USER_NOT_FOUND', 'User associated with this token no longer exists.', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 'INVALID_TOKEN', 'Invalid authentication token.', 401);
    }
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'TOKEN_EXPIRED', 'Authentication token has expired.', 401);
    }
    next(error);
  }
};

export default authMiddleware;
