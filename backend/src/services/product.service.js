const Product = require("../models/product.model");
const InventoryMovement = require("../models/inventory-movement.model");
const ApiError = require("../utils/api-error");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function listProducts(filters) {
  const conditions = [];
  if (filters.search) {
    const search = new RegExp(escapeRegex(filters.search), "i");
    conditions.push({ $or: [{ name: search }, { sku: search }] });
  }
  if (filters.category) conditions.push({ category: filters.category });
  if (filters.isActive !== undefined) conditions.push({ isActive: filters.isActive });
  if (filters.outOfStock === true) conditions.push({ stock: 0 });
  if (filters.outOfStock === false) conditions.push({ stock: { $gt: 0 } });
  if (filters.lowStock === true) conditions.push({ $expr: { $lte: ["$stock", "$reorderLevel"] } });
  if (filters.lowStock === false) conditions.push({ $expr: { $gt: ["$stock", "$reorderLevel"] } });

  const filter = conditions.length ? { $and: conditions } : {};
  const sort = { [filters.sortBy]: filters.sortOrder === "asc" ? 1 : -1, _id: 1 };
  const skip = (filters.page - 1) * filters.limit;
  const [products, total, categories] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(filters.limit).lean(),
    Product.countDocuments(filter),
    Product.distinct("category"),
  ]);

  return {
    products,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
    categories: categories.sort((first, second) => first.localeCompare(second)),
  };
}

async function getProductById(id) {
  const product = await Product.findById(id).lean();
  if (!product) throw new ApiError(404, "Product was not found.", "PRODUCT_NOT_FOUND");
  return product;
}

async function createProduct(data, createdBy) {
  const session = await Product.startSession();
  let product;

  try {
    await session.withTransaction(async () => {
      [product] = await Product.create([data], { session });
      if (product.stock > 0) {
        await InventoryMovement.create([{
          productId: product._id,
          type: "STOCK_RECEIVED",
          quantity: product.stock,
          previousStock: 0,
          newStock: product.stock,
          reason: "Initial stock on product creation.",
          createdBy,
        }], { session });
      }
    });
  } finally {
    await session.endSession();
  }

  return product.toObject();
}

async function updateProduct(id, data) {
  const product = await Product.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();
  if (!product) throw new ApiError(404, "Product was not found.", "PRODUCT_NOT_FOUND");
  return product;
}

async function updateProductStatus(id, isActive) {
  const product = await Product.findByIdAndUpdate(id, { $set: { isActive } }, { new: true, runValidators: true }).lean();
  if (!product) throw new ApiError(404, "Product was not found.", "PRODUCT_NOT_FOUND");
  return product;
}

async function getSellableProductById(id) {
  const product = await Product.findOne({ _id: id, isActive: true }).lean();
  if (!product) throw new ApiError(404, "Active product was not found.", "ACTIVE_PRODUCT_NOT_FOUND");
  return product;
}

module.exports = { createProduct, getProductById, getSellableProductById, listProducts, updateProduct, updateProductStatus };