import Joi from 'joi';

const geoLocation = Joi.object({
  query: Joi.object({
    pageNumber: Joi.number().integer().positive().not(0).optional(),
    limit: Joi.number().integer().positive().not(0).optional(),
    search: Joi.string().optional()
  })
});

const geoLocationList = Joi.object({
  query: Joi.object({
    pageNumber: Joi.number().integer().positive().not(0).optional(),
    limit: Joi.number().integer().positive().not(0).optional(),
    search: Joi.string().optional()
  })
});

export const geoTargetValidations = {
  geoLocation,
  geoLocationList
};
