const User = require('../models/User');
const Sale = require('../models/Sale');
const payoutService = require('../services/PayoutService');
const { log, assertEquals, assertTruthy, request, TEST_USER, resetEnv } = require('./helpers');

async function run() {
  log.header('GROUP F: Affiliate User Termination Security Tests');

  // Test F1: Toggle termination status via POST /api/users/:id/terminate
  await resetEnv();
  let dbUser = await User.findById(TEST_USER);
  assertEquals(dbUser.isTerminated, false, 'User should not be terminated initially');

  let res = await request('POST', `/users/${TEST_USER}/terminate`);
  assertEquals(res.status, 200, 'POST /users/:id/terminate should return 200');
  assertEquals(res.body.user.isTerminated, true, 'User should be marked as terminated in response');

  dbUser = await User.findById(TEST_USER);
  assertEquals(dbUser.isTerminated, true, 'User should be terminated in DB');
  log.success('F1: terminated user toggle successfully via API');

  // Test F2: Block sales registration for terminated user
  res = await request('POST', '/sales', {
    userId: TEST_USER,
    brand: 'brand_1',
    earning: 100,
  });
  assertEquals(res.status, 400, 'POST /sales for terminated user should return 400 Bad Request');
  assertTruthy(res.body.error.includes('terminated'), 'Error message should describe user termination status');
  log.success('F2: blocked new sales registration for terminated user');

  // Test F3: Block withdrawal initiation for terminated user
  // Bypass 24h limit by resetting lastWithdrawalAt
  dbUser = await User.findById(TEST_USER);
  dbUser.withdrawableBalance = 100;
  dbUser.lastWithdrawalAt = null;
  await dbUser.save();

  try {
    await payoutService.initiateWithdrawal(TEST_USER, 50);
    throw new Error('Should have failed');
  } catch (err) {
    assertEquals(err.status, 400, 'Should return status 400 for terminated user withdrawal');
    assertTruthy(err.message.includes('terminated'), 'Error message should describe user termination status');
  }

  // Double check via HTTP API
  res = await request('POST', `/users/${TEST_USER}/withdraw`, { amount: 50 });
  assertEquals(res.status, 400, 'POST /withdraw for terminated user should return 400 Bad Request');
  log.success('F3: blocked withdrawal initiation for terminated user');

  // Test F4: Skip advance payouts processing for terminated user
  await resetEnv();
  // Create pending sale
  await Sale.create({ userId: TEST_USER, brand: 'brand_1', earning: 100 });
  
  // Terminate user
  dbUser = await User.findById(TEST_USER);
  dbUser.isTerminated = true;
  await dbUser.save();

  let jobRes = await payoutService.runAdvancePayoutJob();
  assertEquals(jobRes.processed, 0, 'Advance payout job should process 0 sales for terminated user');
  
  dbUser = await User.findById(TEST_USER);
  assertEquals(dbUser.withdrawableBalance, 0, 'User withdrawable balance should remain 0');
  log.success('F4: skipped advance payouts processing for terminated user');
}

module.exports = { run };
