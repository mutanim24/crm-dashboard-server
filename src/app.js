const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// Configure CORS to allow requests from the front-end
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:5173', 
      'http://localhost:5174',
      process.env.FRONTEND_URL
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    }
  },
  credentials: true, // Allow cookies and authentication
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contactRoutes');
const pipelinesRoutes = require('./routes/pipelines');
const dealRoutes = require('./routes/dealRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const templateRoutes = require('./routes/templateRoutes');

const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors(corsOptions)); // Cross-origin resource sharing with configured options
app.use(morgan('combined')); // Logging
app.use(express.json()); // JSON parsing
app.use(express.urlencoded({ extended: true })); // URL-encoded parsing

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/contacts', authMiddleware, contactRoutes);
app.use('/api/v1/pipelines', authMiddleware, pipelinesRoutes);
app.use('/api/v1/deals', authMiddleware, dealRoutes);
app.use('/api/v1/workflows', workflowRoutes);
app.use('/api/v1/integrations', authMiddleware, integrationRoutes);
app.use('/api/v1/templates', authMiddleware, templateRoutes);

// Webhook endpoints (no auth required)
app.use('/webhooks/kixie', require('./routes/webhooks/kixie'));
app.use('/webhooks/iclosed', require('./routes/webhooks/iclosed'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Service is healthy' });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
