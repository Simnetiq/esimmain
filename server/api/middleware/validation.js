const Joi = require('joi');

const validatePayment = (req, res, next) => {
  const schema = Joi.object({
    amount: Joi.number().positive().required(),
    currency: Joi.string().length(3).default('USD'),
    metadata: Joi.object().optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details[0].message
    });
  }

  next();
};

const validateOTP = (req, res, next) => {
  const schema = Joi.object({
    phoneNumber: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required(),
    purpose: Joi.string().default('verification')
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details[0].message
    });
  }

  next();
};

const validateEmail = (req, res, next) => {
  const schema = Joi.object({
    to: Joi.string().email().required(),
    subject: Joi.string().required(),
    html: Joi.string().optional(),
    text: Joi.string().optional(),
    attachments: Joi.array().optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details[0].message
    });
  }

  next();
};

module.exports = {
  validatePayment,
  validateOTP,
  validateEmail
};

