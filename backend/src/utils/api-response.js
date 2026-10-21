function sendSuccess(res, { statusCode = 200, message = "Request successful", data = null } = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

module.exports = { sendSuccess };