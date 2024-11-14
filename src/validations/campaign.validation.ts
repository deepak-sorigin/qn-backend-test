import Joi from 'joi';
import { ENTITY_STATUS } from '../../generated/client';
import { commonValidations } from './common.validation';

const gamePlanDetails = Joi.object({
  kpi1Name: Joi.string().required(),
  kpi1Value: Joi.string().required(),
  kpi1Unit: Joi.string().allow('').optional(),
  kpi2Name: Joi.string().required(),
  kpi2Value: Joi.string().required(),
  kpi2Unit: Joi.string().allow('').optional(),
  kpi3Name: Joi.string().required(),
  kpi3Value: Joi.string().required(),
  kpi3Unit: Joi.string().allow('').optional(),
  billingMetric: commonValidations.filterItem.required(),
  rate: Joi.number().positive().greater(0).required(),
  budget: Joi.number().integer().positive().not(0).required(),
  estimatedImpressions: Joi.number().integer().positive().not(0).required(),
  format: Joi.array().items(commonValidations.filterItem.required()).optional(),
  bidStrategyType: commonValidations.filterItem.optional()
});

const flight = Joi.object({
  from: Joi.string().isoDate().required(),
  to: Joi.string().isoDate().required()
});

const contentThemes = Joi.object({
  keywordsFromAdvertiser: Joi.array().items(Joi.string()).required(),
  keywordsFromCompetitor: Joi.array().items(Joi.string()).required(),
  keywordsFromCategory: Joi.array().items(Joi.string()).required(),
  keywordsFromCultureVector: Joi.array().items(Joi.string()).required()
}).custom((value, helpers) => {
  const {
    keywordsFromAdvertiser,
    keywordsFromCompetitor,
    keywordsFromCategory,
    keywordsFromCultureVector
  } = value;

  if (
    keywordsFromAdvertiser?.length > 0 ||
    keywordsFromCompetitor?.length > 0 ||
    keywordsFromCategory?.length > 0 ||
    keywordsFromCultureVector?.length > 0
  ) {
    return value;
  } else {
    return helpers.error('any.required');
  }
}, 'At least one keyword validation');

const limitFrequency = Joi.object({
  frequency: Joi.number().integer().positive().not(0).required(),
  exposerPer: Joi.number().integer().positive().not(0).required(),
  exposerFrequency: commonValidations.filterItem.required()
});
const filterItemForCategoryContentExclusion = Joi.object({
  label: Joi.string().required(),
  dv360Value: Joi.string().required(),
  ttdValue: Joi.string().required()
});

const ioTarget = Joi.object({
  limitFrequency: limitFrequency.required(),
  totalMediaCost: Joi.number().integer().positive().not(0).required(),
  fees: commonValidations.filterItem.required(),
  deviceTargeting: Joi.array()
    .items(commonValidations.filterItem.required())
    .required(),
  viewability: Joi.number().integer().positive().not(0).required(),
  categoryContentExclusion: Joi.array()
    .items(filterItemForCategoryContentExclusion.required())
    .required()
});

const demographic = Joi.object({
  from: Joi.number().integer().positive().not(0).required(),
  to: Joi.number().integer().positive().not(0).required(),
  gender: commonValidations.filterItem.required()
});

const demographicInformation = Joi.object({
  demographic: demographic.required(),
  category: commonValidations.filterItem.required(),
  cultureVector: Joi.array()
    .items(commonValidations.filterItem.required())
    .required()
});

const retoolTarget = Joi.object({
  platform: Joi.string().required(),
  type: Joi.string().required(),
  fullName: Joi.string().required(),
  lineItemNameVariable: Joi.string().allow('').required(),
  leaf: Joi.string().required(),
  platformId: Joi.string().required(),
  relevance: Joi.number().required(),
  rowNumber: Joi.number().integer().required()
});

const targetSection = Joi.object({
  name: Joi.string().required(),
  platform: Joi.string().required(),
  type: Joi.string().required(),
  targets: Joi.array().items(retoolTarget).required()
});

const targets = Joi.object({
  audience: Joi.array().items(targetSection).required(),
  content: Joi.array().items(targetSection).required(),
  location: Joi.array().items(targetSection).required(),
  cultural: Joi.array().items(targetSection).required(),
  t3pd: Joi.array().items(targetSection).required(),
  vividata: Joi.array().items(targetSection).required()
});

const create = Joi.object({
  body: Joi.object({
    advertiserId: Joi.string().required(),
    displayName: Joi.string().required(),
    goal: commonValidations.filterItem.required(),
    billingCode: Joi.string().required(),
    entityStatus: Joi.string()
      .valid(
        ENTITY_STATUS.DRAFT,
        ENTITY_STATUS.PUBLISH_REQUESTED,
        ENTITY_STATUS.PUBLISHED
      )
      .required(),
    gamePlan: gamePlanDetails.optional(),
    flights: Joi.array().items(flight.required()).optional(),
    channel: Joi.array()
      .items(commonValidations.filterItem.required())
      .required(),
    geographic: Joi.array()
      .items(commonValidations.filterItem.required())
      .optional(),
    locations: Joi.array()
      .items(filterItemForCategoryContentExclusion.required())
      .optional(),
    locationListName: Joi.string().optional(),
    platforms: Joi.array()
      .items(commonValidations.filterItem.required())
      .required(),
    scale: Joi.number().positive().not(0).optional(),
    contentThemes: contentThemes.optional(),
    ioTarget: ioTarget.optional(),
    demographicInformation: demographicInformation.required(),
    targets: targets.optional(),
    language: Joi.string().optional()
  }).required()
});

const update = Joi.object({
  params: Joi.object({
    campaignId: Joi.string().required()
  }).required(),
  body: Joi.object({
    displayName: Joi.string().optional(),
    goal: commonValidations.filterItem.optional(),
    billingCode: Joi.string().optional(),
    entityStatus: Joi.string()
      .valid(
        ENTITY_STATUS.DRAFT,
        ENTITY_STATUS.PUBLISH_REQUESTED,
        ENTITY_STATUS.PUBLISHED
      )
      .optional(),
    gamePlan: gamePlanDetails.optional(),
    flights: Joi.array().items(flight.required()).optional(),
    channel: Joi.array()
      .items(commonValidations.filterItem.required())
      .optional(),
    geographic: Joi.array()
      .items(commonValidations.filterItem.required())
      .optional(),
    locations: Joi.array()
      .items(filterItemForCategoryContentExclusion.required())
      .optional(),
    locationListName: Joi.string().optional(),
    platforms: Joi.array()
      .items(commonValidations.filterItem.required())
      .optional(),
    scale: Joi.number().positive().not(0).optional(),
    contentThemes: contentThemes.optional(),
    ioTarget: ioTarget.optional(),
    demographicInformation: demographicInformation.optional(),
    targets: targets.optional(),
    language: Joi.string().optional()
  }).or(
    'displayName',
    'goal',
    'billingCode',
    'entityStatus',
    'gamePlan',
    'flights',
    'channel',
    'geographic',
    'locations',
    'locationListName',
    'platforms',
    'scale',
    'contentThemes',
    'ioTarget',
    'demographicInformation',
    'targets',
    'language'
  )
});

const fetchById = Joi.object({
  params: Joi.object({
    campaignId: Joi.string().required()
  }).required()
});

const publish = Joi.object({
  params: Joi.object({
    campaignId: Joi.string().required()
  }).required()
});

export const campaignValidations = {
  create,
  update,
  fetchById,
  publish
};
