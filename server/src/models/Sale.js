const mongoose = require('mongoose');

// ─── Sale Schema ────────────────────────────────────────────────────────────

const saleSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    brand: {
      type: String,
      required: true,
      enum: ['brand_1', 'brand_2', 'brand_3'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    earning: {
      type: Number,
      required: true,
      min: 0,
    },
    advanceStatus: {
      type: String,
      enum: ['eligible', 'paid'],
      default: 'eligible',
      index: true,
    },
    advanceAmount: {
      type: Number,
      default: 0,
    },
    reconciledAt: {
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
 * Check if this sale is eligible for an advance payout.
 * @returns {boolean}
 */
saleSchema.methods.isEligibleForAdvance = function () {
  return this.status === 'pending' && this.advanceStatus === 'eligible';
};

module.exports = mongoose.model('Sale', saleSchema);
