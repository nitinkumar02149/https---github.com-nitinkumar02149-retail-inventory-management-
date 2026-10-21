const ApiError = require("../utils/api-error");

function validateRequest(schema) {
  return function requestValidator(req, res, next) {
    const validationErrors = [];

    for (const [location, fields] of Object.entries(schema)) {
      const values = req[location] || {};

      for (const [fieldName, rules] of Object.entries(fields)) {
        const value = values[fieldName];
        const missing = value === undefined || value === null || value === "";

        if (missing && rules.required) {
          validationErrors.push({ field: fieldName, message: "This field is required." });
          continue;
        }
        if (missing) continue;

        if (rules.type && typeof value !== rules.type) {
          validationErrors.push({ field: fieldName, message: `Expected a ${rules.type} value.` });
        } else if (rules.enum && !rules.enum.includes(value)) {
          validationErrors.push({ field: fieldName, message: "Value is not an allowed option." });
        } else if (rules.min !== undefined && value < rules.min) {
          validationErrors.push({ field: fieldName, message: `Value must be at least ${rules.min}.` });
        } else if (rules.max !== undefined && value > rules.max) {
          validationErrors.push({ field: fieldName, message: `Value must be no more than ${rules.max}.` });
        } else if (rules.maxLength && typeof value === "string" && value.length > rules.maxLength) {
          validationErrors.push({ field: fieldName, message: `Must be ${rules.maxLength} characters or fewer.` });
        }
      }
    }

    if (validationErrors.length) {
      return next(new ApiError(400, "Request validation failed.", "VALIDATION_ERROR", validationErrors));
    }

    return next();
  };
}

module.exports = { validateRequest };