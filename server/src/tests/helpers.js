const { connectDB, mongoose } = require('../db');
const User = require('../models/User');
const Sale = require('../models/Sale');
const Payout = require('../models/Payout');
const app = require('../app');
const http = require('http');

let server;
const PORT = 3002;
const BASE_URL = `http://localhost:${PORT}/api`;

const log = {
  header: (msg) => console.log(`\n\x1b[36m=== ${msg} ===\x1b[0m`),
  success: (msg) => console.log(`  \x1b[32m✔ [PASS]\x1b[0m ${msg}`),
  error: (msg) => console.error(`  \x1b[31m✘ [FAIL]\x1b[0m ${msg}`),
  info: (msg) => console.log(`  \x1b[33mℹ [INFO]\x1b[0m ${msg}`),
};

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

const TEST_USER = 'det_test_user';

const resetEnv = async (isTrusted = true) => {
  await Sale.deleteMany({ userId: TEST_USER });
  await Payout.deleteMany({ userId: TEST_USER });
  await User.deleteMany({ _id: TEST_USER });
  await User.create({ _id: TEST_USER, name: 'Detailed Test User', withdrawableBalance: 0, isTrusted });
};

const cleanupEnv = async () => {
  await Sale.deleteMany({ userId: TEST_USER });
  await Payout.deleteMany({ userId: TEST_USER });
  await User.deleteMany({ _id: TEST_USER });
};

const startServer = async () => {
  await connectDB();
  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });
  log.success(`Test Server running on port ${PORT}`);
};

const stopServer = async () => {
  await cleanupEnv();
  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }
  await mongoose.disconnect();
  log.info('Database disconnected and server closed.');
};

module.exports = {
  log,
  assertEquals,
  assertTruthy,
  request,
  TEST_USER,
  resetEnv,
  cleanupEnv,
  startServer,
  stopServer,
};
