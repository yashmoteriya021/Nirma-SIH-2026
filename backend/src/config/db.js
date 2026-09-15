import mongoose from 'mongoose';
import dns from 'dns';
import config from './env.js';

const connectDB = async () => {
  console.log('🔄 Connecting to MongoDB...');
  try {
    try {
      dns.setServers(['8.8.8.8', '8.8.4.4']);
    } catch (e) {
      console.warn('⚠️ Could not set Google DNS, using system default DNS.');
    }

    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`  ✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`  ❌ MongoDB connection error: ${error.message}`);
    console.log('⚠️ Continuing with server startup (some API endpoints requiring DB may fail until connection succeeds)');
  }
};

export default connectDB;
