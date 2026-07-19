const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const Sale = require('../models/Sale');
const User = require('../models/User');
const payoutService = require('../services/PayoutService');

const router = express.Router();

/**
 * GET /api/sales
 * List sales with optional filters: ?userId=xxx&status=pending
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.status) filter.status = req.query.status;
    const sales = await Sale.find(filter).sort({ createdAt: -1 });
    res.json(sales);
  })
);

/**
 * POST /api/sales
 * Create a new pending sale.
 * Body: { userId: string, brand: string, earning: number }
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { userId, brand, earning } = req.body;

    // Validate required fields
    if (!userId || !brand || earning === undefined) {
      const err = new Error('Required fields: userId, brand, earning');
      err.status = 400;
      throw err;
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      const err = new Error(`User not found: ${userId}`);
      err.status = 404;
      throw err;
    }
    if (user.isTerminated) {
      const err = new Error(`User "${userId}" is terminated and cannot register sales`);
      err.status = 400;
      throw err;
    }

    const sale = await Sale.create({ userId, brand, earning });
    res.status(201).json(sale);
  })
);

/**
 * POST /api/sales/:id/reconcile
 * Reconcile a single sale.
 * Body: { status: "approved" | "rejected" }
 */
router.post(
  '/:id/reconcile',
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!status) {
      const err = new Error('Request body must include "status"');
      err.status = 400;
      throw err;
    }
    const sale = await payoutService.reconcileSale(req.params.id, status);
    res.json(sale);
  })
);

/**
 * POST /api/sales/reconcile
 * Bulk reconcile multiple sales.
 * Body: { saleIds: string[], status: "approved" | "rejected" }
 */
router.post(
  '/reconcile',
  asyncHandler(async (req, res) => {
    const { saleIds, status } = req.body;
    if (!saleIds || !Array.isArray(saleIds) || !status) {
      const err = new Error('Required fields: saleIds (array), status');
      err.status = 400;
      throw err;
    }
    const sales = await payoutService.reconcileBulk(saleIds, status);
    res.json(sales);
  })
);

module.exports = router;
