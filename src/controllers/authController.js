const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../services/db');
const { blacklistToken } = require('../models/TokenBlacklist');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Split name into first and last name if provided
    let firstName = '';
    let lastName = '';
    if (name) {
      const nameParts = name.trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle unique constraint violation (email already exists)
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Email already in use. Please log in.' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Handle "User Not Found"
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Validate the Password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    // Handle "Incorrect Password"
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Handle Success - create JWT and send response
    const token = generateToken(user);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    // Format user data to match frontend expectations
    const formattedUser = {
      ...userWithoutPassword,
      name: `${user.firstName} ${user.lastName}`.trim(),
      phoneNumber: user.phoneNumber || '',
      company: user.company || '',
      jobTitle: user.jobTitle || ''
    };

    res.status(200).json({
      message: 'Login successful',
      user: formattedUser,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const logout = async (req, res) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    // Blacklist the token
    const blacklisted = await blacklistToken(token);
    
    if (blacklisted) {
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } else {
      res.status(500).json({
        error: 'Failed to logout',
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  register,
  login,
  logout,
};
