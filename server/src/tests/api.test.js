const { log, assertEquals, assertTruthy, request, TEST_USER, resetEnv } = require('./helpers');

async function run() {
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
}

module.exports = { run };
