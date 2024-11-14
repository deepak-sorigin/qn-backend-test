import Joi from 'joi';
import { commonValidations } from './common.validation';

const category = Joi.object({
  query: Joi.object({
    pageNumber: Joi.number().integer().positive().not(0).optional(),
    limit: Joi.number().integer().positive().not(0).optional(),
    platform: Joi.string().optional(),
    type: Joi.string().optional(),
    search: Joi.string().optional()
  })
});

const keyword = Joi.object({
  query: Joi.object({
    campaignId: Joi.string().required(),
    count: Joi.number().integer().positive().not(0).optional()
  })
});

const retool360TargetList = Joi.object({
  query: Joi.object({
    campaignId: Joi.string().required(),
    platform: Joi.string().optional()
  })
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

const keywordsForSales = Joi.object({
  query: Joi.object({
    count: Joi.number().integer().positive().not(0).optional()
  }),
  body: Joi.object({
    advertiserUrl: Joi.string().required(),
    competitorUrl: Joi.array().items(Joi.string()).required(),
    demographicInformation: demographicInformation.required()
  }).required()
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

const retool360TargetListForSales = Joi.object({
  query: Joi.object({
    platform: Joi.string().optional()
  }),
  body: Joi.object({
    contentThemes: contentThemes.required()
  }).required()
});

const advertiser = Joi.object({
  query: Joi.object({
    pageNumber: Joi.number().integer().positive().not(0).optional(),
    limit: Joi.number().integer().positive().not(0).optional(),
    search: Joi.string().optional()
  })
});

export const filterValidations = {
  category,
  keyword,
  retool360TargetList,
  keywordsForSales,
  retool360TargetListForSales,
  advertiser
};
