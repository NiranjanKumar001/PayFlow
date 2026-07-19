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
 * POST /api/users
 * Register a new user.
 * Body: { id: string, name: string }
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { id, name } = req.body;
    if (!id || !name) {
      const err = new Error('User ID and Name are required');
      err.status = 400;
      throw err;
    }
    const sanitizedId = id.trim().toLowerCase().replace(/\s+/g, '_');
    if (!sanitizedId) {
      const err = new Error('Invalid User ID');
      err.status = 400;
      throw err;
    }
    const existing = await User.findById(sanitizedId);
    if (existing) {
      const err = new Error(`User ID "${sanitizedId}" already exists`);
      err.status = 400;
      throw err;
    }
    const user = await User.create({
      _id: sanitizedId,
      name: name.trim(),
      isTrusted: false,
      approvedSalesCount: 0,
      withdrawableBalance: 0,
    });
    res.status(201).json(user);
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

/**
 * POST /api/users/:id/terminate
 * Terminate/Deactivate a user.
 */
router.post(
  '/:id/terminate',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
      const err = new Error(`User not found: ${req.params.id}`);
      err.status = 404;
      throw err;
    }
    user.isTerminated = true;
    await user.save();
    res.json({ message: `User ${req.params.id} has been terminated successfully`, user });
  })
);

module.exports = router;

