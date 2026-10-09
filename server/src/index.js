const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const missingConfig = ['JWT_SECRET', 'CORS_ORIGIN'].filter((key) => !process.env[key]);
if (missingConfig.length) throw new Error(`Missing required environment variables: ${missingConfig.join(', ')}`);
const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();