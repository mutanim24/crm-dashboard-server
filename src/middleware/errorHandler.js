const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error(err);

  // Prisma errors
  if (err.code === 'P2002') {
      error.message = 'Duplicate field value entered';
      error.statusCode = 409;
  }

  if (err.code === 'P2025') {
      error.message = 'Record not found';
      error.statusCode = 404;
  }

  // Validation errors
  if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(val => val.message).join(', ');
      error.message = message;
      error.statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
      error.message = 'Invalid token';
      error.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
      error.message = 'Token expired';
      error.statusCode = 401;
  }

  // Cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
      error.message = 'Resource not found';
      error.statusCode = 404;
  }

  // Send error response
  res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
