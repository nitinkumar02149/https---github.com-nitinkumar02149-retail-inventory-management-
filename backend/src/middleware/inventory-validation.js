const mongoose = require("mongoose");
const ApiError = require("../utils/api-error");
const { movementTypes } = require("../models/inventory-movement.model");

const adjustmentTypes = ["STOCK_RECEIVED", "MANUAL_INCREASE", "MANUAL_DECREASE"];

function validateAdjustment(req, res, next) {
  const body = req.body;
  const details = [];
  const acceptedFields = ["productId", "type", "quantity", "reason"];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return next(new ApiError(400, "A JSON object is required.", "VALIDATION_ERROR"));
  }
  for (const field of Object.keys(body)) {
    if (!acceptedFields.includes(field)) details.push({ field, message: "This field is not accepted." });
  }
  if (typeof body.productId !== "string" || !mongoose.isObjectIdOrHexString(body.productId)) {
    details.push({ field: "productId", message: "A valid product ID is required." });
  }
  if (!adjustmentTypes.includes(body.type)) {
    details.push({ field: "type", message: `Use one of: ${adjustmentTypes.join(", ")}.` });
  }
  if (!Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 1000000) {
    details.push({ field: "quantity", message: "Quantity must be a positive whole number no greater than 1,000,000." });
  }
  if (typeof body.reason !== "string" || !body.reason.trim() || body.reason.trim().length > 500) {
    details.push({ field: "reason", message: "Reason is required and must be 500 characters or fewer." });
  }
  if (details.length) return next(new ApiError(400, "Request validation failed.", "VALIDATION_ERROR", details));
  req.adjustment = { productId: body.productId, type: body.type, quantity: body.quantity, reason: body.reason.trim() };
  return next();
}

function validateMovementQuery(req, res, next) {
  const query = req.query;
  const details = [];
  const allowed = new Set(["productId", "type", "from", "to", "page", "limit"]);
  for (const field of Object.keys(query)) {
    if (!allowed.has(field)) details.push({ field, message: "This query parameter is not supported." });
  }

  if (query.productId !== undefined && (typeof query.productId !== "string" || !mongoose.isObjectIdOrHexString(query.productId))) {
    details.push({ field: "productId", message: "Product ID is invalid." });
  }
  if (query.type !== undefined && (typeof query.type !== "string" || !movementTypes.includes(query.type))) {
    details.push({ field: "type", message: "Movement type is not supported." });
  }
  for (const field of ["from", "to"]) {
    if (query[field] !== undefined && (typeof query[field] !== "string" || Number.isNaN(Date.parse(query[field])))) {
      details.push({ field, message: "Provide a valid date." });
    }
  }
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) details.push({ field: "page", message: "Page must be a positive integer." });
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) details.push({ field: "limit", message: "Limit must be between 1 and 100." });
  if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
    details.push({ field: "from", message: "From date must be before or equal to the to date." });
  }
  if (details.length) return next(new ApiError(400, "Request validation failed.", "VALIDATION_ERROR", details));

  req.movementQuery = {
    productId: query.productId,
    type: query.type,
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(query.to) ? `${query.to}T23:59:59.999Z` : query.to) : undefined,
    page,
    limit,
  };
  return next();
}

function validateLowStockQuery(req, res, next) {
  const status = req.query.status || "all";
  if (Object.keys(req.query).some((field) => field !== "status") || !["all", "low", "out"].includes(status)) {
    return next(new ApiError(400, "Use status=all, low, or out.", "VALIDATION_ERROR", [{ field: "status", message: "Value must be all, low, or out." }]));
  }
  req.lowStockStatus = status;
  return next();
}

module.exports = { validateAdjustment, validateLowStockQuery, validateMovementQuery };