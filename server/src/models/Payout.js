const mongoose = require('mongoose');

// ─── Payout Schema ──────────────────────────────────────────────────────────

const payoutSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['advance_payout', 'adjustment', 'withdrawal', 'recovery'],
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['completed', 'failed', 'cancelled'],
      default: 'completed',
    },
    referenceId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Payout', payoutSchema);
