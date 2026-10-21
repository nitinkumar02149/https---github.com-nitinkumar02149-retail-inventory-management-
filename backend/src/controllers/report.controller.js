const asyncHandler = require("../utils/async-handler");
const { sendSuccess } = require("../utils/api-response");
const reportService = require("../services/report.service");

const salesReport = asyncHandler(async (req, res) => {
  const data = await reportService.getSalesReport(req.reportRange);
  return sendSuccess(res, { message: "Sales report retrieved.", data });
});

const profitReport = asyncHandler(async (req, res) => {
  const data = await reportService.getProfitReport(req.reportRange);
  return sendSuccess(res, { message: "Profit report retrieved.", data });
});

module.exports = { profitReport, salesReport };