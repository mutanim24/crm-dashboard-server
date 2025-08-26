const { prisma } = require('../services/db');

// Store blacklisted tokens in the database
const blacklistToken = async (token) => {
  try {
    // Get the token's expiration date
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.exp) {
      throw new Error('Invalid token format');
    }
    
    // Calculate expiration date (convert from seconds to milliseconds)
    const expiresAt = new Date(decoded.exp * 1000);
    
    // Store the token in the blacklist
    await prisma.tokenBlacklist.create({
      data: {
        token,
        expiresAt,
      },
    });
    
    return true;
  } catch (error) {
    console.error('Error blacklisting token:', error);
    return false;
  }
};

// Check if a token is blacklisted
const isTokenBlacklisted = async (token) => {
  try {
    const blacklistedToken = await prisma.tokenBlacklist.findUnique({
      where: {
        token,
      },
    });
    
    return !!blacklistedToken;
  } catch (error) {
    console.error('Error checking token blacklist:', error);
    return false;
  }
};

// Clean up expired tokens from the blacklist
const cleanupExpiredTokens = async () => {
  try {
    await prisma.tokenBlacklist.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
  }
};

module.exports = {
  blacklistToken,
  isTokenBlacklisted,
  cleanupExpiredTokens,
};
