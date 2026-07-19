const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payout_system';

/**
 * Connect to MongoDB and seed demo data if collections are empty.
 */
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`  [Database] MongoDB connected: ${mongoose.connection.host}`);

    // Seed demo users if empty
    const User = require('./models/User');
    const seedUsers = [
      { _id: 'john_doe', name: 'John Doe', isTrusted: true, approvedSalesCount: 3 },
      { _id: 'jane_smith', name: 'Jane Smith', isTrusted: false, approvedSalesCount: 0 },
      { _id: 'alex_jones', name: 'Alex Jones', isTrusted: true, approvedSalesCount: 5 },
      { _id: 'bob_brown', name: 'Bob Brown', isTrusted: false, approvedSalesCount: 1 },
      { _id: 'charlie_clark', name: 'Charlie Clark', isTrusted: true, approvedSalesCount: 4 },
      { _id: 'david_davis', name: 'David Davis', isTrusted: false, approvedSalesCount: 2 },
      { _id: 'eva_evans', name: 'Eva Evans', isTrusted: true, approvedSalesCount: 3 },
      { _id: 'frank_franklin', name: 'Frank Franklin', isTrusted: false, approvedSalesCount: 0 },
      { _id: 'grace_green', name: 'Grace Green', isTrusted: true, approvedSalesCount: 6 },
      { _id: 'henry_harris', name: 'Henry Harris', isTrusted: false, approvedSalesCount: 1 },
    ];
    for (const u of seedUsers) {
      await User.updateOne({ _id: u._id }, { $setOnInsert: u }, { upsert: true });
    }
    console.log(`  [Database] Seeded/verified ${seedUsers.length} demo users`);
  } catch (err) {
    console.error('  [Database] MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = { connectDB, mongoose };
