import Joi from "joi";
const invitationValidagtor = Joi.object({
  senderId: Joi.string(),
  receiverId: Joi.string(),
  status: Joi.string().valid("pending", "accepted", "rejected"),
  companyName: Joi.string(),
});

export default invitationValidagtor;
