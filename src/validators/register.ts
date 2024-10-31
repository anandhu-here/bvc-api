import Joi from "joi";

export const registerValidator = Joi.object({
  fname: Joi.string().required().max(100),
  lname: Joi.string().required().max(100),
  email: Joi.string().email().required().max(100),
  password: Joi.string().required().min(8).max(32),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
  linkedUserId: Joi.string(),
  linkedUserType: Joi.string(),
  company: Joi.object({
    name: Joi.string().max(100),
    address: Joi.string().max(100),
    phone: Joi.string().length(10),
    email: Joi.string().email().max(100),
    website: Joi.string().max(100),
    isPrivate: Joi.boolean().default(false),
  }),
  accountType: Joi.string()
    .valid(
      "carer",
      "agency",
      "nurse",
      "home",
      "admin",
      "superadmin",
      "user",
      "guest",
      "unknown"
    )
    .default("user"),
});
