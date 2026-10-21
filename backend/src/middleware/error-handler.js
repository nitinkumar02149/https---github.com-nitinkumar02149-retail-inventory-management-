function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const isDuplicateKey = error.code === 11000;
  const isMongooseValidation = error.name === "ValidationError";
  const statusCode = isDuplicateKey ? 409
    : isMongooseValidation ? 400
      : Number.isInteger(error.statusCode) ? error.statusCode
        : Number.isInteger(error.status) ? error.status : 500;
  const isServerError = statusCode >= 500;
  const isInvalidJson = error.type === "entity.parse.failed";
  const code = isServerError
    ? "INTERNAL_SERVER_ERROR"
    : isDuplicateKey ? "DUPLICATE_SKU"
      : isMongooseValidation ? "VALIDATION_ERROR"
        : isInvalidJson ? "INVALID_JSON" : (error.code || "REQUEST_ERROR");
  const message = isServerError
    ? "An unexpected error occurred."
    : isDuplicateKey ? "A product with this SKU already exists."
      : isMongooseValidation ? "Product validation failed."
        : isInvalidJson ? "Request body contains invalid JSON." : error.message;

  if (isServerError) {
    console.error("API request failed with a server error.");
  }

  const response = {
    success: false,
    message,
    error: { code },
  };

  if (!isServerError && isMongooseValidation) {
    response.error.details = Object.values(error.errors).map((validationError) => ({
      field: validationError.path,
      message: validationError.message,
    }));
  } else if (!isServerError && error.details) {
    response.error.details = error.details;
  }

  return res.status(statusCode).json(response);
}

module.exports = { errorHandler };