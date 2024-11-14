import { config } from 'dotenv';
import { KeyVaultService } from './KeyVaultService';

// // load env config
config();

export const Environments = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production'
};

/**
 * Environment settings.
 */
export let configs = {
  NODE_ENV: process.env.NODE_ENV || Environments.DEVELOPMENT,
  PORT: process.env.PORT || 3000,
  QN_DB_CONNECTION_URL: process.env.QN_DB_CONNECTION_URL || '',
  QN_JWT_SECRET_KEY: process.env.QN_JWT_SECRET_KEY,
  AZURE_KEY_VAULT_URL: process.env.AZURE_KEY_VAULT_URL || '',
  API_TOKEN: process.env.API_TOKEN,
  QN_QP_BASE_URL: process.env.QN_QP_BASE_URL || '',
  QN_QP_API_TOKEN: process.env.QN_QP_API_TOKEN || '',
  QN_RETOOL_DB_CONNECTION_URL: process.env.QN_RETOOL_DB_CONNECTION_URL || '',
  QN_DB_LOGGER: Number(process.env.QN_DB_LOGGER),
  QN_OPEN_AI_API_KEY: process.env.QN_OPEN_AI_API_KEY || ''
};

/**
 * Load external configs other than env.
 */
export const loadConfigs = async () => {
  if (configs.AZURE_KEY_VAULT_URL) {
    // load staging configs
    const keyVaultService = new KeyVaultService(configs.AZURE_KEY_VAULT_URL);
    const vaultConfigs = await keyVaultService.getConfigs();

    configs = {
      ...configs,
      // load additional configs
      ...vaultConfigs
    };
  }

  // append all configs to process.env
  for (const key in configs) {
    process.env[key] = '' + ((<any>configs)[key] || '');
  }
};
