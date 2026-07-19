const User = require('../models/User');
const Sale = require('../models/Sale');
const payoutService = require('../services/PayoutService');
const { log, assertEquals, TEST_USER, resetEnv } = require('./helpers');

async function run() {
  log.header('GROUP E: Trust & Probation Tier Security Tests');

  // Test E1: Probationary user does not receive advance payout
  await resetEnv(false); // create probationary user
  const saleE1 = await Sale.create({ userId: TEST_USER, brand: 'brand_1', earning: 100 });
  let jobResE = await payoutService.runAdvancePayoutJob();
  assertEquals(jobResE.processed, 0, 'Should not process any sales for probationary user');
  
  let dbUserE = await User.findById(TEST_USER);
  assertEquals(dbUserE.withdrawableBalance, 0, 'Probationary user balance should remain 0');
  assertEquals(dbUserE.isTrusted, false, 'User should remain untrusted');
  log.success('E1: probationary user skipped for advance payouts');

  // Test E2: Reconciling approved sale increments approvedCount and retains untrusted status if under threshold
  await payoutService.reconcileSale(saleE1._id.toString(), 'approved');
  dbUserE = await User.findById(TEST_USER);
  assertEquals(dbUserE.approvedSalesCount, 1, 'Approved sales count should be 1');
  assertEquals(dbUserE.isTrusted, false, 'User should still be untrusted (1 < 3)');
  assertEquals(dbUserE.withdrawableBalance, 100, 'User should receive 100% of the sale (100) because no advance was paid');
  log.success('E2: first approved sale credited full amount and incremented approved count');

  // Test E3: Reconciling 3rd approved sale promotes user to trusted status
  const saleE2 = await Sale.create({ userId: TEST_USER, brand: 'brand_2', earning: 100 });
  const saleE3 = await Sale.create({ userId: TEST_USER, brand: 'brand_3', earning: 100 });
  // Reconcile 2nd sale (approvedCount -> 2)
  await payoutService.reconcileSale(saleE2._id.toString(), 'approved');
  // Reconcile 3rd sale (approvedCount -> 3) -> promotes to Trusted
  await payoutService.reconcileSale(saleE3._id.toString(), 'approved');

  dbUserE = await User.findById(TEST_USER);
  assertEquals(dbUserE.approvedSalesCount, 3, 'Approved sales count should be 3');
  assertEquals(dbUserE.isTrusted, true, 'User should be promoted to trusted status');
  log.success('E3: user promoted to trusted status after 3 approved sales');

  // Test E4: Next pending sale for newly trusted user now gets advance payout
  const saleE4 = await Sale.create({ userId: TEST_USER, brand: 'brand_1', earning: 200 });
  jobResE = await payoutService.runAdvancePayoutJob();
  assertEquals(jobResE.processed, 1, 'Should process the sale for now-trusted user');
  assertEquals(jobResE.totalAdvance, 20, 'Should pay 10% advance (20)');
  
  dbUserE = await User.findById(TEST_USER);
  // Balance before saleE4: 300 (100 + 100 + 100). New balance: 300 + 20 = 320.
  assertEquals(dbUserE.withdrawableBalance, 320, 'User balance should be 320');
  log.success('E4: newly trusted user receives advance payouts on new pending sales');
}

module.exports = { run };
