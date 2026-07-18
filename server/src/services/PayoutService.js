const mongoose = require('mongoose');
const User = require('../models/User');
const Sale = require('../models/Sale');
const Payout = require('../models/Payout');

/**
 * PayoutService — Core business logic orchestrator.
 *
 * All mutating operations run inside MongoDB multi-document transactions
 * to ensure atomicity and data consistency.
 */
class PayoutService {
  // ─── Advance Payout Job ─────────────────────────────────────────────────

  /**
   * Process advance payouts (10% of earnings) for all eligible pending sales.
   * Idempotent: only processes sales where advanceStatus === 'eligible'.
   *
   * @returns {{ processed: number, totalAdvance: number, details: Array }}
   */
  async runAdvancePayoutJob() {
    const session = await mongoose.startSession();
    const result = { processed: 0, totalAdvance: 0, details: [] };

    try {
      await session.withTransaction(async () => {
        // Find all eligible sales (pending + not yet paid advance)
        const eligibleSales = await Sale.find({
          status: 'pending',
          advanceStatus: 'eligible',
        }).session(session);

        if (eligibleSales.length === 0) {
          return;
        }

        // Group sales by userId for efficient balance updates
        const userAdvances = {};

        for (const sale of eligibleSales) {
          const advanceAmount = +(sale.earning * 0.10).toFixed(2);

          // Update sale: mark as paid
          sale.advanceStatus = 'paid';
          sale.advanceAmount = advanceAmount;
          await sale.save({ session });

          // Accumulate advance per user
          if (!userAdvances[sale.userId]) {
            userAdvances[sale.userId] = 0;
          }
          userAdvances[sale.userId] += advanceAmount;

          // Record payout transaction
          await Payout.create(
            [
              {
                userId: sale.userId,
                type: 'advance_payout',
                amount: advanceAmount,
                status: 'completed',
                referenceId: sale._id.toString(),
              },
            ],
            { session }
          );

          result.details.push({
            saleId: sale._id,
            userId: sale.userId,
            earning: sale.earning,
            advanceAmount,
          });
          result.processed++;
          result.totalAdvance += advanceAmount;
        }

        // Credit each user's balance
        for (const [userId, totalAdv] of Object.entries(userAdvances)) {
          const user = await User.findById(userId).session(session);
          if (!user) throw new Error(`User not found: ${userId}`);
          await user.credit(totalAdv, session);
        }
      });
    } finally {
      await session.endSession();
    }

    result.totalAdvance = +result.totalAdvance.toFixed(2);
    return result;
  }

  // ─── Reconcile Sale ─────────────────────────────────────────────────────

  /**
   * Reconcile a single sale — approve or reject.
   *
   * Approved: credit user with (earning - advanceAmount)
   * Rejected: debit user by advanceAmount (clawback)
   *
   * @param {string} saleId
   * @param {'approved'|'rejected'} newStatus
   * @returns {object} Updated sale
   */
  async reconcileSale(saleId, newStatus) {
    if (!['approved', 'rejected'].includes(newStatus)) {
      const err = new Error('Status must be "approved" or "rejected"');
      err.status = 400;
      throw err;
    }

    const session = await mongoose.startSession();
    let updatedSale;

    try {
      await session.withTransaction(async () => {
        const sale = await Sale.findById(saleId).session(session);
        if (!sale) {
          const err = new Error(`Sale not found: ${saleId}`);
          err.status = 404;
          throw err;
        }
        if (sale.status !== 'pending') {
          const err = new Error(`Sale already reconciled as "${sale.status}"`);
          err.status = 400;
          throw err;
        }

        const user = await User.findById(sale.userId).session(session);
        if (!user) {
          const err = new Error(`User not found: ${sale.userId}`);
          err.status = 404;
          throw err;
        }

        let adjustmentAmount;

        if (newStatus === 'approved') {
          // Credit remaining: earning - advance already paid
          adjustmentAmount = +(sale.earning - sale.advanceAmount).toFixed(2);
          await user.credit(adjustmentAmount, session);
        } else {
          // Rejected: claw back the advance
          adjustmentAmount = +(-sale.advanceAmount).toFixed(2);
          if (sale.advanceAmount > 0) {
            await user.debit(sale.advanceAmount, session);
          }
        }

        // Update sale status
        sale.status = newStatus;
        sale.reconciledAt = new Date();
        await sale.save({ session });

        // Record adjustment payout
        await Payout.create(
          [
            {
              userId: sale.userId,
              type: 'adjustment',
              amount: adjustmentAmount,
              status: 'completed',
              referenceId: sale._id.toString(),
            },
          ],
          { session }
        );

        updatedSale = sale;
      });
    } finally {
      await session.endSession();
    }

    return updatedSale;
  }

  // ─── Bulk Reconcile ─────────────────────────────────────────────────────

  /**
   * Reconcile multiple sales at once.
   *
   * @param {string[]} saleIds
   * @param {'approved'|'rejected'} newStatus
   * @returns {object[]} Updated sales
   */
  async reconcileBulk(saleIds, newStatus) {
    const results = [];
    for (const saleId of saleIds) {
      const sale = await this.reconcileSale(saleId, newStatus);
      results.push(sale);
    }
    return results;
  }

  // ─── Initiate Withdrawal ────────────────────────────────────────────────

  /**
   * Initiate a payout withdrawal for a user.
   * Enforces: positive balance, sufficient funds, 24-hour cooldown.
   *
   * @param {string} userId
   * @param {number} amount
   * @returns {object} Created withdrawal payout
   */
  async initiateWithdrawal(userId, amount) {
    if (!amount || amount <= 0) {
      const err = new Error('Withdrawal amount must be positive');
      err.status = 400;
      throw err;
    }

    const session = await mongoose.startSession();
    let withdrawal;

    try {
      await session.withTransaction(async () => {
        const user = await User.findById(userId).session(session);
        if (!user) {
          const err = new Error(`User not found: ${userId}`);
          err.status = 404;
          throw err;
        }

        // Check withdrawal eligibility
        const check = user.canWithdraw(amount);
        if (!check.allowed) {
          const err = new Error(check.reason);
          err.status = check.reason.includes('24 hours') ? 429 : 400;
          throw err;
        }

        // Debit user
        await user.debit(amount, session);

        // Update withdrawal timestamp
        user.lastWithdrawalAt = new Date();
        await user.save({ session });

        // Create withdrawal payout
        const [payout] = await Payout.create(
          [
            {
              userId,
              type: 'withdrawal',
              amount,
              status: 'completed',
            },
          ],
          { session }
        );

        withdrawal = payout;
      });
    } finally {
      await session.endSession();
    }

    return withdrawal;
  }

  // ─── Recover Failed Payout ──────────────────────────────────────────────

  /**
   * Handle a failed/cancelled/rejected payout.
   * Re-credits the amount to user's balance and resets withdrawal cooldown.
   *
   * @param {string} payoutId
   * @param {'failed'|'cancelled'} failureStatus
   * @returns {object} Recovery payout record
   */
  async recoverFailedPayout(payoutId, failureStatus = 'failed') {
    if (!['failed', 'cancelled'].includes(failureStatus)) {
      const err = new Error('Status must be "failed" or "cancelled"');
      err.status = 400;
      throw err;
    }

    const session = await mongoose.startSession();
    let recoveryPayout;

    try {
      await session.withTransaction(async () => {
        const payout = await Payout.findById(payoutId).session(session);
        if (!payout) {
          const err = new Error(`Payout not found: ${payoutId}`);
          err.status = 404;
          throw err;
        }
        if (payout.type !== 'withdrawal') {
          const err = new Error('Can only recover withdrawal payouts');
          err.status = 400;
          throw err;
        }
        if (payout.status !== 'completed') {
          const err = new Error(`Payout already marked as "${payout.status}"`);
          err.status = 400;
          throw err;
        }

        // Mark original payout as failed
        payout.status = failureStatus;
        await payout.save({ session });

        // Re-credit user
        const user = await User.findById(payout.userId).session(session);
        if (!user) {
          const err = new Error(`User not found: ${payout.userId}`);
          err.status = 404;
          throw err;
        }
        await user.credit(payout.amount, session);

        // Reset withdrawal cooldown so user can retry immediately
        user.lastWithdrawalAt = null;
        await user.save({ session });

        // Create recovery record
        const [recovery] = await Payout.create(
          [
            {
              userId: payout.userId,
              type: 'recovery',
              amount: payout.amount,
              status: 'completed',
              referenceId: payout._id.toString(),
            },
          ],
          { session }
        );

        recoveryPayout = recovery;
      });
    } finally {
      await session.endSession();
    }

    return recoveryPayout;
  }
}

module.exports = new PayoutService();
