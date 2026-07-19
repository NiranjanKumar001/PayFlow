const { startServer, stopServer, log } = require('./helpers');
const domainTests = require('./domain.test');
const serviceTests = require('./service.test');
const withdrawalTests = require('./withdrawal.test');
const apiTests = require('./api.test');
const trustTests = require('./trust.test');
const terminationTests = require('./termination.test');

async function main() {
  try {
    log.header('STARTING COMPREHENSIVE MODULAR TEST SUITE');
    
    // Setup server and database connection
    await startServer();

    // Execute modular test suites
    await domainTests.run();
    await serviceTests.run();
    await withdrawalTests.run();
    await apiTests.run();
    await trustTests.run();
    await terminationTests.run();

    log.header('COMPREHENSIVE TEST SUITE RESULT');
    log.success('ALL TESTS PASSED! THE SYSTEM IS 100% CORRECT & COMPLIANT!\n');
    process.exit(0);

  } catch (error) {
    log.error(`Test run encountered a failure:\n${error.stack}`);
    process.exit(1);
  } finally {
    // Cleanup, close server and disconnect DB
    await stopServer();
  }
}

main();
