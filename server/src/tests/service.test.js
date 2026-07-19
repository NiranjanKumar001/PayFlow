const User = require('../models/User');
const Sale = require('../models/Sale');
const Payout = require('../models/Payout');
const payoutService = require('../services/PayoutService');
const { log, assertEquals, assertTruthy, TEST_USER, resetEnv } = require('./helpers');

async function run() {
  log.header('GROUP B: Service & Transaction Tests');

  // Test B1: runAdvancePayoutJob workflow
  await resetEnv();
  await Sale.create([
    { userId: TEST_USER, brand: 'brand_1', earning: 150 }, // eligible for 15 advance
    { userId: TEST_USER, brand: 'brand_2', earning: 250 }, // eligible for 25 advance
  ]);

  let jobRes = await payoutService.runAdvancePayoutJob();
  assertEquals(jobRes.processed, 2, 'Should process 2 sales');
  assertEquals(jobRes.totalAdvance, 40, 'Total advance should be 40');

  let dbUser = await User.findById(TEST_USER);
  assertEquals(dbUser.withdrawableBalance, 40, 'User balance should be 40');
  
  let dbPayouts = await Payout.find({ userId: TEST_USER, type: 'advance_payout' });
  assertEquals(dbPayouts.length, 2, 'Should create 2 payout ledger entries');
  log.success('B1: runAdvancePayoutJob processed correctly');

  // Test B2: runAdvancePayoutJob Idempotency
  jobRes = await payoutService.runAdvancePayoutJob();
  assertEquals(jobRes.processed, 0, 'Subsequent run should process 0 sales');
  dbUser = await User.findById(TEST_USER);
  assertEquals(dbUser.withdrawableBalance, 40, 'Balance should still be 40');
  log.success('B2: runAdvancePayoutJob idempotency verified');

  // Test B3: reconcileSale (Approved)
  // Sale 1: Earning 150, Advance paid: 15. Reconciliation approved should credit remaining 135.
  const saleList = await Sale.find({ userId: TEST_USER }).sort({ earning: 1 });
  let sale1 = saleList[0]; // earning 150
  let sale2 = saleList[1]; // earning 250

  await payoutService.reconcileSale(sale1._id.toString(), 'approved');
  dbUser = await User.findById(TEST_USER);
  // Previous balance: 40. Remaining credit: 135. New balance: 175.
  assertEquals(dbUser.withdrawableBalance, 175, 'User balance should be 175 after sale1 approval');
  
  let sale1Status = await Sale.findById(sale1._id);
  assertEquals(sale1Status.status, 'approved', 'Sale 1 status should be updated to approved');
  log.success('B3: approved sale reconciliation credited remaining amount');

  // Test B4: reconcileSale (Rejected / Clawback)
  // Sale 2: Earning 250, Advance paid: 25. Reconciliation rejected should debit (claw back) 25.
  await payoutService.reconcileSale(sale2._id.toString(), 'rejected');
  dbUser = await User.findById(TEST_USER);
  // Previous balance: 175. Clawback debit: 25. New balance: 150.
  assertEquals(dbUser.withdrawableBalance, 150, 'User balance should be 150 after sale2 rejection');
  
  let sale2Status = await Sale.findById(sale2._id);
  assertEquals(sale2Status.status, 'rejected', 'Sale 2 status should be updated to rejected');
  log.success('B4: rejected sale clawed back the advance amount');

  // Test B5: Reconciling already reconciled sale
  try {
    await payoutService.reconcileSale(sale1._id.toString(), 'approved');
    throw new Error('Should have failed');
  } catch (err) {
    assertTruthy(err.message.includes('already reconciled'), 'Should block repeating reconciliation');
  }
  log.success('B5: double reconciliation blocked');
}

module.exports = { run };
