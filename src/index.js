const app = require('./app');
const { connectDatabase } = require('./services/db');
const PORT = process.env.PORT || 3000;

// Connect to the database
connectDatabase()
  .then(() => {
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
