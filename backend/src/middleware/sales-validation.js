const mongoose = require("mongoose");
const ApiError = require("../utils/api-error");

function validateCreateSale(req, res, next) {
  const body = req.body;
  const details = [];
  const allowedFields = ["items", "discount", "taxRate"];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return next(new ApiError(400, "A JSON object is required.", "VALIDATION_ERROR"));
  }
  for (const key of Object.keys(body)) {
    if (!allowedFields.includes(key)) details.push({ field: key, message: "This field is calculated or assigned by the server and cannot be submitted." });
  }
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 100) {
    details.push({ field: "items", message: "Provide between 1 and 100 sale items." });
  } else {
    body.items.forEach((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        details.push({ field: `items.${index}`, message: "Each item must be an object." });
        return;
      }
      for (const key of Object.keys(item)) {
        if (!["productId", "quantity"].includes(key)) details.push({ field: `items.${index}.${key}`, message: "Only productId and quantity are accepted." });
      }
      if (typeof item.productId !== "string" || !mongoose.isObjectIdOrHexString(item.productId)) {
        details.push({ field: `items.${index}.productId`, message: "A valid product ID is required." });
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100000) {
        details.push({ field: `items.${index}.quantity`, message: "Quantity must be a positive whole number no greater than 100,000." });
      }
    });
  }
  if (body.discount !== undefined && (typeof body.discount !== "number" || !Number.isFinite(body.discount) || body.discount < 0)) {
    details.push({ field: "discount", message: "Discount must be a non-negative amount." });
  }
  if (body.taxRate !== undefined && (typeof body.taxRate !== "number" || !Number.isFinite(body.taxRate) || body.taxRate < 0 || body.taxRate > 1)) {
    details.push({ field: "taxRate", message: "Tax rate must be a number from 0 to 1." });
  }
  if (details.length) return next(new ApiError(400, "Request validation failed.", "VALIDATION_ERROR", details));

  req.saleInput = {
    items: body.items.map(({ productId, quantity }) => ({ productId, quantity })),
    discount: body.discount ?? 0,
    taxRate: body.taxRate ?? Number(process.env.DEFAULT_TAX_RATE ?? 0.08),
  };
  if (!Number.isFinite(req.saleInput.taxRate) || req.saleInput.taxRate < 0 || req.saleInput.taxRate > 1) {
    return next(new ApiError(500, "Default tax configuration is invalid.", "INVALID_TAX_CONFIGURATION"));
  }
  return next();
}

function validateSaleListQuery(req, res, next) {
  const query = req.query;
  const details = [];
  const allowed = new Set(["page", "limit", "from", "to", "search"]);
  for (const key of Object.keys(query)) {
    if (!allowed.has(key)) details.push({ field: key, message: "This query parameter is not supported." });
  }
  for (const key of ["from", "to"]) {
    if (query[key] !== undefined && (typeof query[key] !== "string" || Number.isNaN(Date.parse(query[key])))) {
      details.push({ field: key, message: "Provide a valid date." });
    }
  }
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) details.push({ field: "page", message: "Page must be a positive integer." });
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) details.push({ field: "limit", message: "Limit must be between 1 and 100." });
  if (query.search !== undefined && (typeof query.search !== "string" || query.search.length > 100)) {
    details.push({ field: "search", message: "Search must be a single string no longer than 100 characters." });
  }
  if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
    details.push({ field: "from", message: "From date must be before or equal to the to date." });
  }
  if (details.length) return next(new ApiError(400, "Request validation failed.", "VALIDATION_ERROR", details));

  req.saleQuery = {
    page,
    limit,
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(query.to) ? `${query.to}T23:59:59.999Z` : query.to) : undefined,
    search: query.search?.trim(),
  };
  return next();
}

module.exports = { validateCreateSale, validateSaleListQuery };