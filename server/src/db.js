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
    const count = await User.countDocuments();
    if (count === 0) {
      const seedUsers = [
        { _id: 'john_doe', name: 'John Doe', isTrusted: true, approvedSalesCount: 3 },
        { _id: 'jane_smith', name: 'Jane Smith', isTrusted: false, approvedSalesCount: 0 },
      ];
      await User.insertMany(seedUsers);
      console.log(`  [Database] Seeded ${seedUsers.length} demo users: ${seedUsers.map(u => u._id).join(', ')}`);
    }
  } catch (err) {
    console.error('  [Database] MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = { connectDB, mongoose };
