const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const payoutService = require('../services/PayoutService');

const router = express.Router();

/**
 * POST /api/jobs/advance-payout
 * Trigger the advance payout job — processes 10% advance for all eligible pending sales.
 */
router.post(
  '/advance-payout',
  asyncHandler(async (req, res) => {
    const result = await payoutService.runAdvancePayoutJob();
    res.json(result);
  })
);

module.exports = router;
