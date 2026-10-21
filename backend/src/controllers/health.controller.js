const asyncHandler = require("../utils/async-handler");
const { sendSuccess } = require("../utils/api-response");

const getHealth = asyncHandler((req, res) => sendSuccess(res, {
  message: "Retail inventory API is running.",
  data: { status: "ok" },
}));

module.exports = { getHealth };