const User = require('../models/User');
const Sale = require('../models/Sale');
const { log, assertEquals, assertTruthy, TEST_USER, resetEnv } = require('./helpers');

async function run() {
  log.header('GROUP A: Domain Model Method Tests');

  await resetEnv();
  const userInstance = await User.findById(TEST_USER);

  // Test A1: canWithdraw with zero balance
  let withdrawCheck = userInstance.canWithdraw(10);
  assertEquals(withdrawCheck.allowed, false, 'Should block withdrawal with zero balance');
  assertEquals(withdrawCheck.reason, 'Insufficient balance', 'Should show Insufficient balance reason');
  log.success('A1: blocked withdrawal with zero balance');

  // Test A2: credit balance
  await userInstance.credit(150);
  assertEquals(userInstance.withdrawableBalance, 150, 'Balance should increase after credit');
  log.success('A2: user balance credited successfully');

  // Test A3: canWithdraw with positive balance and no withdrawal history
  withdrawCheck = userInstance.canWithdraw(100);
  assertEquals(withdrawCheck.allowed, true, 'Should allow withdrawal with enough balance');
  log.success('A3: withdrawal allowed checks passed');

  // Test A4: debit balance
  await userInstance.debit(50);
  assertEquals(userInstance.withdrawableBalance, 100, 'Balance should decrease after debit');
  log.success('A4: user balance debited successfully');

  // Test A5: debit to negative balance
  await userInstance.debit(120);
  assertEquals(userInstance.withdrawableBalance, -20, 'Balance can go negative on adjustment debit');
  log.success('A5: negative balances allowed on debit adjustment');

  // Test A6: Sale advance eligibility method
  const saleInstance = new Sale({ userId: TEST_USER, brand: 'brand_1', earning: 100 });
  assertTruthy(saleInstance.isEligibleForAdvance(), 'New pending sale should be eligible for advance');
  
  saleInstance.advanceStatus = 'paid';
  assertEquals(saleInstance.isEligibleForAdvance(), false, 'Already paid sale should not be eligible');
  
  saleInstance.advanceStatus = 'eligible';
  saleInstance.status = 'approved';
  assertEquals(saleInstance.isEligibleForAdvance(), false, 'Reconciled sale should not be eligible');
  log.success('A6: sale advance eligibility checked');
}

module.exports = { run };
