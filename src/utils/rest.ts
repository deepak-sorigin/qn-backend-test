import { ApiError } from '../models/common/ApiError';

export class RestUtils {
  static handleError(error: unknown): ApiError {
    const result: ApiError = {
      status: 400
    };
    if (typeof error === 'string') {
      result.message = error as any;
    } else if (error instanceof Error) {
      result.message = error.message;
    }

    return result;
  }
}
