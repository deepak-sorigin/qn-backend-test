import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

export class KeyVaultService {
  private readonly vaultUrl: string;
  private readonly credential: DefaultAzureCredential;
  private readonly client: SecretClient;

  constructor(vaultUrl: string) {
    this.vaultUrl = vaultUrl;
    this.credential = new DefaultAzureCredential();
    this.client = new SecretClient(this.vaultUrl, this.credential);
  }

  async getSecret(secretName: string): Promise<string> {
    try {
      const secret = await this.client.getSecret(secretName);
      if (secret.value === undefined) {
        throw new Error(`Secret "${secretName}" has no value.`);
      }
      return secret.value;
    } catch (error) {
      console.error('Error retrieving secrets:', error);
      throw error;
    }
  }

  async getConfigs() {
    try {
      // Add all the keys that need to be fetched from the key vault
      const keysToBeFetched = [
        'QN_DB_CONNECTION_URL',
        'QN_JWT_SECRET_KEY',
        'QN_QP_BASE_URL',
        'QN_QP_API_TOKEN',
        'QN_RETOOL_DB_CONNECTION_URL',
        'QN_DB_LOGGER',
        'QN_OPEN_AI_API_KEY'
      ];

      // Fetch all the keys from the key vault
      const fetchedKeys: any = {};
      for (const key of keysToBeFetched) {
        fetchedKeys[key] = await this.getSecret(key.replace(/_/g, '-'));
      }

      return fetchedKeys;
    } catch (error) {
      console.error('Error getting secrets from azure ', error);
      process.exit(1);
    }
  }
}
