const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const User = require('../models/User');
const payoutService = require('../services/PayoutService');

const router = express.Router();

/**
 * GET /api/users
 * List all users with their current balances.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const users = await User.find().sort({ _id: 1 });
    res.json(users);
  })
);

/**
 * POST /api/users/:id/withdraw
 * Initiate a payout withdrawal. Enforces 24-hour cooldown and balance check.
 * Body: { amount: number }
 */
router.post(
  '/:id/withdraw',
  asyncHandler(async (req, res) => {
    const { amount } = req.body;
    if (!amount || typeof amount !== 'number') {
      const err = new Error('Request body must include "amount" as a number');
      err.status = 400;
      throw err;
    }
    const payout = await payoutService.initiateWithdrawal(req.params.id, amount);
    res.status(201).json(payout);
  })
);

module.exports = router;
