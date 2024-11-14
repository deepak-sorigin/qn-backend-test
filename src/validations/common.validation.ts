import Joi from 'joi';

const filterItem = Joi.object({
  label: Joi.string().required(),
  value: Joi.string().required()
});

export const commonValidations = {
  filterItem
};
