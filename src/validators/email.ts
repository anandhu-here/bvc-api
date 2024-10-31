import Joi from "joi";

const emailValidator = Joi.object({
  to: Joi.string().email().required(),
  subject: Joi.string().required(),
  text: Joi.string().required(),
});

export default emailValidator;
