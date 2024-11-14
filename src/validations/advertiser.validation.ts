import Joi from 'joi';
import { ENTITY_STATUS } from '../../generated/client';
import { commonValidations } from './common.validation';

const filterItemForCategoryContentExclusion = Joi.object({
  label: Joi.string().required(),
  dv360Value: Joi.string().required(),
  ttdValue: Joi.string().required()
});

const geographicDetails = Joi.object({
  timeZone: commonValidations.filterItem.required(),
  currency: commonValidations.filterItem.required(),
  locations: filterItemForCategoryContentExclusion.required()
});

const create = Joi.object({
  body: Joi.object({
    displayName: Joi.string().required(),
    entityStatus: Joi.string()
      .valid(
        ENTITY_STATUS.DRAFT,
        ENTITY_STATUS.PUBLISH_REQUESTED,
        ENTITY_STATUS.PUBLISHED
      )
      .required(),
    advertiserUrl: Joi.string().required(),
    competitorUrl: Joi.array().items(Joi.string()).required(),
    defaultRightMediaOfferTypeId: commonValidations.filterItem.required(),
    geographicDetails: geographicDetails.required(),
    brandName: Joi.string().required()
  }).required()
});

const update = Joi.object({
  params: Joi.object({
    advertiserId: Joi.string().required()
  }).required(),
  body: Joi.object({
    displayName: Joi.string().optional(),
    entityStatus: Joi.string()
      .valid(
        ENTITY_STATUS.DRAFT,
        ENTITY_STATUS.PUBLISH_REQUESTED,
        ENTITY_STATUS.PUBLISHED
      )
      .optional(),
    advertiserUrl: Joi.string().optional(),
    competitorUrl: Joi.array().items(Joi.string()).optional(),
    defaultRightMediaOfferTypeId: commonValidations.filterItem.optional(),
    geographicDetails: geographicDetails.optional(),
    brandName: Joi.string().optional()
  }).or(
    'displayName',
    'entityStatus',
    'advertiserUrl',
    'competitorUrl',
    'defaultRightMediaOfferTypeId',
    'geographicDetails',
    'brandName'
  )
});

const fetchById = Joi.object({
  params: Joi.object({
    advertiserId: Joi.string().required()
  }).required()
});

const publish = Joi.object({
  params: Joi.object({
    advertiserId: Joi.string().required()
  }).required()
});

const lookup = Joi.object({
  params: Joi.object({
    qpId: Joi.number().required()
  }).required()
});

export const advertiserValidations = {
  create,
  update,
  fetchById,
  publish,
  lookup
};
