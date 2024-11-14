import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { RestUtils } from '../utils/rest';

export const validate = (schema: Joi.Schema) => {
  return (request: Request, response: Response, next: NextFunction) => {
    const { query, params, body } = request;

    const schemaDescription = schema.describe();
    const data = {
      ...(schemaDescription.keys['query'] ? { query } : {}),
      ...(schemaDescription.keys['params'] ? { params } : {}),
      ...(schemaDescription.keys['body'] ? { body } : {})
    };

    const { value, error } = Joi.compile(schema)
      .prefs({
        errors: { label: 'key' },
        abortEarly: false
      })
      .validate(data);

    if (error) {
      const errorMessage = error?.details
        .map((detail) => detail.message)
        .join(', ')
        .replace(/[\/\\"]/g, '');

      const apiError = RestUtils.handleError(errorMessage);
      response.status(apiError.status).json(apiError);
      return;
    }
    Object.assign(request, value);
    next();
  };
};
