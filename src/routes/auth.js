const express = require('express');
const { register, login, logout } = require('../controllers/authController');
const { body } = require('express-validator');
const handleValidationErrors = require('../middleware/validationErrorHandler');
const authMiddleware = require('../middleware/auth');
const { prisma } = require('../services/db');

const router = express.Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  [
    // Validate input
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .trim(),
    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Name must be less than 100 characters'),
  ],
  handleValidationErrors,
  register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post(
  '/login',
  [
    // Validate input
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .trim(),
  ],
  handleValidationErrors,
  login
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user & invalidate token
 * @access  Private
 */
router.post('/logout', authMiddleware, logout);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    // The user is already attached to the request by the auth middleware
    // We just need to return the user data
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

module.exports = router;
