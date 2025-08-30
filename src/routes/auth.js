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
        phoneNumber: true,
        company: true,
        jobTitle: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Format user data to match frontend expectations
    const formattedUser = {
      ...user,
      name: `${user.firstName} ${user.lastName}`.trim(),
      fullName: `${user.firstName} ${user.lastName}`.trim(),
    };

    res.json({
      success: true,
      data: formattedUser,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { fullName, email, phoneNumber, company, jobTitle } = req.body;
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user profile with all fields
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName: fullName ? fullName.split(' ')[0] : user.firstName,
        lastName: fullName && fullName.split(' ').length > 1 ? fullName.split(' ').slice(1).join(' ') : user.lastName,
        email: email || user.email,
        phoneNumber: phoneNumber || user.phoneNumber,
        company: company || user.company,
        jobTitle: jobTitle || user.jobTitle,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        company: true,
        jobTitle: true,
        role: true,
        createdAt: true,
      }
    });
    
    // Format user data to match frontend expectations
    const formattedUser = {
      ...updatedUser,
      name: `${updatedUser.firstName} ${updatedUser.lastName}`.trim(),
      fullName: `${updatedUser.firstName} ${updatedUser.lastName}`.trim(),
    };
    
    res.json({
      success: true,
      data: formattedUser,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

module.exports = router;
