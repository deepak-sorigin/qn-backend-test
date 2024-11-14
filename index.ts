import { configs, Environments, loadConfigs } from './src/config';

// enable new relic for non development environment
if (configs.NODE_ENV !== Environments.DEVELOPMENT) {
  require('newrelic'); // new relic setup
}

const logger = require('./src/logger').default;

async function main() {
  // load external configs
  await loadConfigs();

  const app = require('./src/app').default;
  app.listen(configs.PORT, () => {
    logger.info(
      `QN Backend App running for ${configs.NODE_ENV} on PORT: ${configs.PORT}`
    );
  });
}

main();
