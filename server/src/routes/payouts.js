const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const Payout = require('../models/Payout');
const payoutService = require('../services/PayoutService');

const router = express.Router();

/**
 * GET /api/payouts
 * List all payout transactions with optional filter: ?userId=xxx
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    const payouts = await Payout.find(filter).sort({ createdAt: -1 });
    res.json(payouts);
  })
);

/**
 * POST /api/payouts/:id/status
 * Update a withdrawal payout status (simulate gateway callback).
 * Triggers failed payout recovery if status is "failed" or "cancelled".
 * Body: { status: "failed" | "cancelled" }
 */
router.post(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!status) {
      const err = new Error('Request body must include "status"');
      err.status = 400;
      throw err;
    }
    const recovery = await payoutService.recoverFailedPayout(req.params.id, status);
    res.json(recovery);
  })
);

module.exports = router;
