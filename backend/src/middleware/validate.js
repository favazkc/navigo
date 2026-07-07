const { validationResult } = require('express-validator');

/**
 * Middleware to check express-validator results.
 * Sends 422 with structured error list if validation fails.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

module.exports = validate;
