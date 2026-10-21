const mongoose = require("mongoose");
const ApiError = require("../utils/api-error");

const writableFields = ["sku", "name", "category", "purchasePrice", "sellingPrice", "stock", "reorderLevel"];
const requiredFields = ["sku", "name", "category", "purchasePrice", "sellingPrice", "stock", "reorderLevel"];
const sortableFields = new Set(["sku", "name", "category", "purchasePrice", "sellingPrice", "stock", "reorderLevel", "createdAt", "updatedAt"]);

function failValidation(details) {
  return new ApiError(400, "Request validation failed.", "VALIDATION_ERROR", details);
}

function validateProductBody({ partial = false, allowStock = true } = {}) {
  return function productBodyValidator(req, res, next) {
    const body = req.body;
    if (!body || Array.isArray(body) || typeof body !== "object") {
      return next(failValidation([{ field: "body", message: "A JSON object is required." }]));
    }

    const details = [];
    const acceptedFields = allowStock ? writableFields : writableFields.filter((field) => field !== "stock");
    const required = allowStock ? requiredFields : requiredFields.filter((field) => field !== "stock");
    for (const field of Object.keys(body)) {
      if (!acceptedFields.includes(field)) {
        details.push({ field, message: "This field cannot be changed through this endpoint." });
      }
    }

    if (!partial) {
      for (const field of required) {
        if (body[field] === undefined || body[field] === null || body[field] === "") {
          details.push({ field, message: "This field is required." });
        }
      }
    } else if (!Object.keys(body).length) {
      details.push({ field: "body", message: "At least one product field is required." });
    }

    for (const field of ["sku", "name", "category"]) {
      const value = body[field];
      if (value === undefined) continue;
      if (typeof value !== "string" || !value.trim()) {
        details.push({ field, message: "A non-empty string is required." });
      } else if (value.trim().length > (field === "sku" ? 64 : field === "name" ? 160 : 80)) {
        details.push({ field, message: "The value is too long." });
      }
    }

    for (const field of ["purchasePrice", "sellingPrice"]) {
      const value = body[field];
      if (value === undefined) continue;
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        details.push({ field, message: "A finite, non-negative number is required." });
      }
    }

    for (const field of ["stock", "reorderLevel"]) {
      const value = body[field];
      if (value === undefined) continue;
      if (!Number.isInteger(value) || value < 0) {
        details.push({ field, message: "A non-negative whole number is required." });
      }
    }

    if (details.length) return next(failValidation(details));
    return next();
  };
}

function validateProductStatus(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.isActive !== "boolean" || Object.keys(body).length !== 1) {
    return next(failValidation([{ field: "isActive", message: "Provide only an isActive boolean." }]));
  }
  return next();
}

function validateProductId(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return next(new ApiError(400, "Product ID is invalid.", "INVALID_PRODUCT_ID"));
  }
  return next();
}

function parseBooleanQuery(value, field, details) {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  details.push({ field, message: "Use true or false." });
  return undefined;
}

function validateProductQuery(req, res, next) {
  const query = req.query;
  const details = [];
  const allowedFields = new Set(["page", "limit", "search", "category", "lowStock", "outOfStock", "isActive", "sortBy", "sortOrder"]);

  for (const field of Object.keys(query)) {
    if (!allowedFields.has(field)) details.push({ field, message: "This query parameter is not supported." });
  }

  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) details.push({ field: "page", message: "Page must be a positive integer." });
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) details.push({ field: "limit", message: "Limit must be an integer between 1 and 100." });
  if (query.search !== undefined && typeof query.search !== "string") details.push({ field: "search", message: "Search must be a single string." });
  else if (query.search && query.search.length > 100) details.push({ field: "search", message: "Search must be 100 characters or fewer." });
  if (query.category !== undefined && typeof query.category !== "string") details.push({ field: "category", message: "Category must be a single string." });
  else if (query.category && query.category.length > 80) details.push({ field: "category", message: "Category must be 80 characters or fewer." });

  const sortBy = query.sortBy || "createdAt";
  if (!sortableFields.has(sortBy)) details.push({ field: "sortBy", message: "Sort field is not supported." });
  const sortOrder = query.sortOrder || "desc";
  if (!(["asc", "desc"].includes(sortOrder))) details.push({ field: "sortOrder", message: "Use asc or desc." });

  const filters = {
    page,
    limit,
    search: typeof query.search === "string" ? query.search.trim() : undefined,
    category: typeof query.category === "string" ? query.category.trim() : undefined,
    lowStock: parseBooleanQuery(query.lowStock, "lowStock", details),
    outOfStock: parseBooleanQuery(query.outOfStock, "outOfStock", details),
    isActive: parseBooleanQuery(query.isActive, "isActive", details),
    sortBy,
    sortOrder,
  };

  if (details.length) return next(failValidation(details));
  req.productQuery = filters;
  return next();
}

module.exports = { validateProductBody, validateProductId, validateProductQuery, validateProductStatus };