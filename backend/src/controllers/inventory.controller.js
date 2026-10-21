const asyncHandler = require("../utils/async-handler");
const { sendSuccess } = require("../utils/api-response");
const inventoryService = require("../services/inventory.service");

const createAdjustment = asyncHandler(async (req, res) => {
  const data = await inventoryService.createAdjustment(req.adjustment, req.user.id);
  return sendSuccess(res, { statusCode: 201, message: "Inventory adjustment recorded.", data });
});

const listMovements = asyncHandler(async (req, res) => {
  const data = await inventoryService.listMovements(req.movementQuery);
  return sendSuccess(res, { message: "Inventory movements retrieved.", data });
});

const listLowStock = asyncHandler(async (req, res) => {
  const data = await inventoryService.listLowStock(req.lowStockStatus);
  return sendSuccess(res, { message: "Low-stock products retrieved.", data });
});

module.exports = { createAdjustment, listLowStock, listMovements };