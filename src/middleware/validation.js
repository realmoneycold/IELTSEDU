const Joi = require('joi');

const schemas = {
  signup: Joi.object({
    email: Joi.string().email().required().lowercase().trim(),
    password: Joi.string().min(8).required(),
    full_name: Joi.string().min(2).max(100).trim(),
    firstName: Joi.string().min(1).max(50).trim(),
    lastName: Joi.string().min(1).max(50).trim(),
    username: Joi.string().alphanum().min(3).max(20).trim(),
    country: Joi.string().max(100).allow('', null).trim(),
    role: Joi.string().valid('STUDENT', 'TEACHER', 'ADMIN', 'CEO').default('STUDENT')
  }),
  login: Joi.object({
    email: Joi.string().email().required().lowercase().trim(),
    password: Joi.string().required()
  }),
  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(8).required()
  }),
  updateProfile: Joi.object({
    full_name: Joi.string().min(2).max(100).trim(),
    country: Joi.string().max(100).allow('', null).trim(),
    target_band: Joi.number().min(0).max(9).allow(null),
    current_band: Joi.number().min(0).max(9).allow(null)
  }).min(1)
};

/**
 * Middleware to validate request body against a schema
 * @param {string} schemaName - The name of the schema to use from the schemas object
 */
const validate = (schemaName) => {
  return (req, res, next) => {
    if (!schemas[schemaName]) {
      return res.status(500).json({ 
        success: false, 
        message: `Validation schema '${schemaName}' not found` 
      });
    }

    const { error, value } = schemas[schemaName].validate(req.body, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true // Remove fields not defined in schema
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      
      return res.status(400).json({ 
        success: false, 
        message: errorMessage 
      });
    }

    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
};

module.exports = {
  validate,
  schemas
};
