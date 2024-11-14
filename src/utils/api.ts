import axios, { AxiosError } from 'axios';
import logger from '../logger';

export interface ApiConfig {
  method: string;
  url: string;
  data?: object;
  headers?: object;
  params?: object;
}

export class ApiUtils {
  static async callApi(config: ApiConfig) {
    try {
      logger.info(`Calling API with config: ${JSON.stringify(config)}`);
      const response = await axios.request(config);
      logger.info(`API response status: ${JSON.stringify(response.status)}`);
      logger.info(`API response: ${JSON.stringify(response.data)}`);
      return response;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        logger.error('Connection refused:', (<any>error).config.url);
        throw new Error('Service is unavailable. Please try again later.');
      } else if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message || error.message);
      }
      logger.error('Error calling API:', error);
      throw error;
    }
  }
}
