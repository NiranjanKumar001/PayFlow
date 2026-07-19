const { connectDB, mongoose } = require('../db');
const User = require('../models/User');
const Sale = require('../models/Sale');
const Payout = require('../models/Payout');
const payoutService = require('../services/PayoutService');
const app = require('../app');
const http = require('http');

let server;
const PORT = 3002;
const BASE_URL = `http://localhost:${PORT}/api`;

// Colorized logging helper
const log = {
  header: (msg) => console.log(`\n\x1b[36m=== ${msg} ===\x1b[0m`),
  success: (msg) => console.log(`  \x1b[32m✔ [PASS]\x1b[0m ${msg}`),
  error: (msg) => console.error(`  \x1b[31m✘ [FAIL]\x1b[0m ${msg}`),
  info: (msg) => console.log(`  \x1b[33mℹ [INFO]\x1b[0m ${msg}`),
};

// Custom Assert helper
function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: Expected [${expected}] but got [${actual}]`);
  }
}

function assertTruthy(value, message) {
  if (!value) {
    throw new Error(`${message}: Expected truthy value but got [${value}]`);
  }
}

// Helper to make native HTTP requests
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const options = {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function main() {
  log.header('STARTING COMPREHENSIVE TEST SUITE');

  // Connect to DB and Start HTTP Server
  await connectDB();
  
  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });
  log.success(`Test Server running on port ${PORT}`);

  const TEST_USER = 'det_test_user';

  // Helper to reset test environment
  const resetEnv = async (isTrusted = true) => {
    await Sale.deleteMany({ userId: TEST_USER });
    await Payout.deleteMany({ userId: TEST_USER });
    await User.deleteMany({ _id: TEST_USER });
    await User.create({ _id: TEST_USER, name: 'Detailed Test User', withdrawableBalance: 0, isTrusted });
  };

  try {
    // =========================================================================
    // GROUP A: DOMAIN MODEL UNIT TESTS
    // =========================================================================
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


    // =========================================================================
    // GROUP B: PAYOUTSERVICE TRANSACTION TESTS
    // =========================================================================
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


    // =========================================================================
    // GROUP C: WITHDRAWAL & GATEWAY RECOVERY TESTS
    // =========================================================================
    log.header('GROUP C: Withdrawal & Cooldown Recovery Tests');

    // Test C1: initiateWithdrawal success
    await resetEnv();
    dbUser = await User.findById(TEST_USER);
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
    // Wait, let's bypass the cooldown constraint temporarily on user record to test insufficient balance
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
    // Setup withdrawal again
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


    // =========================================================================
    // GROUP D: HTTP API END-TO-END TESTS
    // =========================================================================
    log.header('GROUP D: HTTP API End-To-End Tests');

    await resetEnv();

    // Test D1: GET /api/users
    let res = await request('GET', '/users');
    assertEquals(res.status, 200, 'GET /users status should be 200');
    assertTruthy(Array.isArray(res.body), 'Response should be a user array');
    log.success('D1: GET /api/users works');

    // Test D2: POST /api/sales (Create Sale)
    res = await request('POST', '/sales', {
      userId: TEST_USER,
      brand: 'brand_3',
      earning: 500,
    });
    assertEquals(res.status, 201, 'POST /sales status should be 201');
    assertEquals(res.body.earning, 500, 'Created sale earning should be 500');
    const apiSaleId = res.body._id;
    log.success('D2: POST /api/sales creates sale');

    // Test D3: POST /api/jobs/advance-payout (Trigger advance job)
    res = await request('POST', '/jobs/advance-payout');
    assertEquals(res.status, 200, 'POST /jobs/advance-payout status should be 200');
    assertEquals(res.body.processed, 1, 'Should process the created sale');
    log.success('D3: POST /api/jobs/advance-payout runs job');

    // Test D4: POST /api/sales/:id/reconcile (Approve sale)
    res = await request('POST', `/sales/${apiSaleId}/reconcile`, { status: 'approved' });
    assertEquals(res.status, 200, 'POST /reconcile status should be 200');
    assertEquals(res.body.status, 'approved', 'Sale should be approved');
    log.success('D4: POST /api/sales/:id/reconcile approves sale');

    // Test D5: POST /api/users/:id/withdraw (Withdraw amount)
    res = await request('POST', `/users/${TEST_USER}/withdraw`, { amount: 100 });
    assertEquals(res.status, 201, 'POST /withdraw status should be 201');
    const apiPayoutId = res.body._id;
    log.success('D5: POST /api/users/:id/withdraw submits withdrawal');

    // Test D6: Rate limiting on API
    res = await request('POST', `/users/${TEST_USER}/withdraw`, { amount: 10 });
    assertEquals(res.status, 429, 'Second API withdrawal should return 429 rate limit');
    log.success('D6: API rate limiting enforces cooldown');

    // Test D7: POST /api/payouts/:id/status (Simulate failure callback)
    res = await request('POST', `/payouts/${apiPayoutId}/status`, { status: 'failed' });
    assertEquals(res.status, 200, 'POST /payouts/:id/status status should be 200');
    log.success('D7: API failure gateway callback processes recovery');

    // =========================================================================
    // GROUP E: TRUST & PROBATION TIER SECURITY TESTS
    // =========================================================================
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

    log.header('COMPREHENSIVE TEST SUITE RESULT');
    log.success('ALL TESTS PASSED! THE SYSTEM IS 100% CORRECT & COMPLIANT!\n');

  } catch (error) {
    log.error(`Test run encountered a failure:\n${error.stack}`);
    process.exit(1);
  } finally {
    // Cleanup and Shutdown
    await Sale.deleteMany({ userId: TEST_USER });
    await Payout.deleteMany({ userId: TEST_USER });
    await User.deleteMany({ _id: TEST_USER });
    
    await new Promise((resolve) => {
      server.close(resolve);
    });
    await mongoose.disconnect();
    log.info('Database disconnected and server closed.');
  }
}

main();
