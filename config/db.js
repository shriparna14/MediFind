const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.log('⚠️  No MONGODB_URI environment variable found.');
    console.log('🚀 Running in Local Database Mode: storing data as JSON files inside local /data directory.');
    return;
  }

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`📡 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.log('🚀 Falling back to Local Database Mode.');
    process.env.MONGODB_URI = ''; // Set to empty to trigger localDb imports
  }
};

module.exports = connectDB;
