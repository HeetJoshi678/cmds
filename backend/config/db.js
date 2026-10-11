const mongoose = require('mongoose');
const dbMock = require('../utils/dbMock');
const dotenv = require('dotenv');

dotenv.config();

// Determine if we should use Mock DB
const useMock = !process.env.MONGO_URI;

const connectDB = async () => {
  if (useMock) {
    console.log('⚠️  No MONGO_URI detected in .env.');
    console.log('📂  Database Mode: Local JSON File database (zero-config) under backend/.data/');
    return true;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 3000 // Quick failure to fall back if offline
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`❌ MongoDB Connection Failed: ${error.message}`);
    console.log('📂 Database Fallback: Switching to local JSON File database under backend/.data/');
    process.env.USE_MOCK_DB = 'true';
    return false;
  }
};

const getDBEngine = () => {
  if (useMock || process.env.USE_MOCK_DB === 'true') {
    return dbMock;
  }
  return mongoose;
};

module.exports = {
  connectDB,
  getDBEngine,
  isMock: () => useMock || process.env.USE_MOCK_DB === 'true'
};
