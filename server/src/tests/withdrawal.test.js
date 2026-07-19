const User = require('../models/User');
const payoutService = require('../services/PayoutService');
const { log, assertEquals, assertTruthy, TEST_USER, resetEnv } = require('./helpers');

async function run() {
  log.header('GROUP C: Withdrawal & Cooldown Recovery Tests');

  // Test C1: initiateWithdrawal success
  await resetEnv();
  let dbUser = await User.findById(TEST_USER);
  dbUser.withdrawableBalance = 100;
  await dbUser.save();

  let withdrawal = await payoutService.initiateWithdrawal(TEST_USER, 75);
  assertEquals(withdrawal.amount, 75, 'Withdrawal amount should be 75');
  assertEquals(withdrawal.status, 'completed', 'Withdrawal status should be completed');
  
  dbUser = await User.findById(TEST_USER);
  assertEquals(dbUser.withdrawableBalance, 25, 'Balance should be 25 after withdrawal');
  assertTruthy(dbUser.lastWithdrawalAt, 'lastWithdrawalAt should be populated');
  log.success('C1: withdrawal executed successfully');

  // Test C2: 24h Rate Limiting
  try {
    await payoutService.initiateWithdrawal(TEST_USER, 5);
    throw new Error('Should have failed due to rate limit');
  } catch (err) {
    assertEquals(err.status, 429, 'Rate limit error should return status 429');
    assertTruthy(err.message.includes('limit'), 'Error message should describe withdrawal limit');
  }
  log.success('C2: 24h rate limit blocked consecutive withdrawal');

  // Test C3: Insufficient Balance Withdrawal
  dbUser = await User.findById(TEST_USER);
  dbUser.lastWithdrawalAt = null;
  await dbUser.save();

  try {
    await payoutService.initiateWithdrawal(TEST_USER, 50); // Balance is only 25
    throw new Error('Should have failed due to insufficient balance');
  } catch (err) {
    assertEquals(err.status, 400, 'Insufficient balance should return status 400');
  }
  log.success('C3: insufficient balance withdrawal blocked');

  // Test C4: Failed Gateway Recovery (Fail Status)
  dbUser = await User.findById(TEST_USER);
  dbUser.withdrawableBalance = 100;
  dbUser.lastWithdrawalAt = null;
  await dbUser.save();

  withdrawal = await payoutService.initiateWithdrawal(TEST_USER, 60);
  dbUser = await User.findById(TEST_USER);
  assertEquals(dbUser.withdrawableBalance, 40, 'Balance is 40');
  assertTruthy(dbUser.lastWithdrawalAt, 'Cooldown is active');

  let recovery = await payoutService.recoverFailedPayout(withdrawal._id.toString(), 'failed');
  assertEquals(recovery.amount, 60, 'Recovery amount should be 60');
  
  dbUser = await User.findById(TEST_USER);
  assertEquals(dbUser.withdrawableBalance, 100, 'Balance should be restored to 100');
  assertEquals(dbUser.lastWithdrawalAt, null, 'Cooldown should be cleared');
  log.success('C4: failed status recovery restored balance and cleared cooldown');

  // Test C5: Recovery on already recovered payout
  try {
    await payoutService.recoverFailedPayout(withdrawal._id.toString(), 'failed');
    throw new Error('Should fail');
  } catch (err) {
    assertTruthy(err.message.includes('already marked'), 'Should reject double recovery');
  }
  log.success('C5: double recovery check blocked');
}

module.exports = { run };
