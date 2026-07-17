const mongoose = require('mongoose');

// ─── User Schema ────────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    withdrawableBalance: {
      type: Number,
      default: 0,
    },
    lastWithdrawalAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Instance Methods ───────────────────────────────────────────────────────

/**
 * Check if the user can make a withdrawal right now.
 * Rules: balance > 0 AND no withdrawal in the last 24 hours.
 * @param {number} amount - The amount to withdraw.
 * @returns {{ allowed: boolean, reason?: string }}
 */
userSchema.methods.canWithdraw = function (amount) {
  if (this.withdrawableBalance <= 0) {
    return { allowed: false, reason: 'Insufficient balance' };
  }
  if (amount > this.withdrawableBalance) {
    return { allowed: false, reason: `Insufficient balance. Available: ₹${this.withdrawableBalance}, requested: ₹${amount}` };
  }
  if (this.lastWithdrawalAt) {
    const hoursSince = (Date.now() - this.lastWithdrawalAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) {
      const remainingHours = Math.ceil(24 - hoursSince);
      return { allowed: false, reason: `Withdrawal limit: 1 per 24 hours. Try again in ~${remainingHours}h` };
    }
  }
  return { allowed: true };
};

/**
 * Credit (add) an amount to the user's withdrawable balance.
 * @param {number} amount
 * @param {mongoose.ClientSession} [session]
 */
userSchema.methods.credit = async function (amount, session) {
  this.withdrawableBalance += amount;
  await this.save({ session });
};

/**
 * Debit (subtract) an amount from the user's withdrawable balance.
 * @param {number} amount
 * @param {mongoose.ClientSession} [session]
 */
userSchema.methods.debit = async function (amount, session) {
  this.withdrawableBalance -= amount;
  await this.save({ session });
};

module.exports = mongoose.model('User', userSchema);
