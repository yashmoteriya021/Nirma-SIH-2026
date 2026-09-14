import mongoose from 'mongoose';
import dns from 'dns';
import config from './env.js';

const connectDB = async () => {
  try {
    // Use Google Public DNS to resolve MongoDB Atlas SRV records
    // (fixes ECONNREFUSED on networks with restrictive local DNS)
    dns.setServers(['8.8.8.8', '8.8.4.4']);

    const conn = await mongoose.connect(config.mongodbUri);
    console.log(`  ✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`  ❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
