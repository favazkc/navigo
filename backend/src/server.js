require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 4000;

// Start HTTP server immediately so healthchecks pass while DB is connecting
app.listen(PORT, () => {
  logger.info(`TeamSphere API running on port ${PORT} [${process.env.NODE_ENV}]`);
});

// Connect to MongoDB in the background — retries are handled inside connectDB
connectDB().catch((err) => {
  logger.error(`Fatal: could not connect to MongoDB — ${err.message}`);
  process.exit(1);
});
