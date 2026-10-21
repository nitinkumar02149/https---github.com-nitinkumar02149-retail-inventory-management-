const asyncHandler = require("../utils/async-handler");
const { sendSuccess } = require("../utils/api-response");
const salesService = require("../services/sales.service");

const createSale = asyncHandler(async (req, res) => {
  const sale = await salesService.createSale(req.saleInput, req.user.id);
  return sendSuccess(res, { statusCode: 201, message: "Sale recorded and invoice created.", data: sale });
});

const listSales = asyncHandler(async (req, res) => {
  const data = await salesService.listSales(req.saleQuery);
  return sendSuccess(res, { message: "Sales retrieved.", data });
});

const getSale = asyncHandler(async (req, res) => {
  const sale = await salesService.getSaleById(req.params.id);
  return sendSuccess(res, { message: "Invoice retrieved.", data: sale });
});

module.exports = { createSale, getSale, listSales };