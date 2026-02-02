import mongoose from 'mongoose';
import { config } from './index.js';

// Connect to MongoDB
export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.database.url);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

// Disconnect from database
export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  console.log('MongoDB disconnected');
}

// Health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const admin = mongoose.connection.db?.admin();
    if (admin) {
      await admin.ping();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
