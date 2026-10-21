const mongoose = require("mongoose");
const Product = require("../models/product.model");
const InventoryMovement = require("../models/inventory-movement.model");
const ApiError = require("../utils/api-error");

async function createAdjustment(adjustment, createdBy) {
  const delta = adjustment.type === "MANUAL_DECREASE" ? -adjustment.quantity : adjustment.quantity;
  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const stockCondition = delta < 0 ? { stock: { $gte: adjustment.quantity } } : {};
      const product = await Product.findOneAndUpdate(
        { _id: adjustment.productId, isActive: true, ...stockCondition },
        { $inc: { stock: delta } },
        { new: true, session, runValidators: true },
      );

      if (!product) {
        const existingProduct = await Product.findById(adjustment.productId).session(session).lean();
        if (!existingProduct) throw new ApiError(404, "Product was not found.", "PRODUCT_NOT_FOUND");
        if (!existingProduct.isActive) throw new ApiError(409, "Inactive products cannot receive inventory adjustments.", "INACTIVE_PRODUCT");
        throw new ApiError(409, "There is not enough stock for this decrease.", "INSUFFICIENT_STOCK");
      }

      const previousStock = product.stock - delta;
      const [movement] = await InventoryMovement.create([{
        productId: product._id,
        type: adjustment.type,
        quantity: adjustment.quantity,
        previousStock,
        newStock: product.stock,
        reason: adjustment.reason,
        createdBy,
      }], { session });

      result = { product: product.toObject(), movement: movement.toObject() };
    });
  } finally {
    await session.endSession();
  }

  return result;
}

async function listMovements(filters) {
  const query = {};
  if (filters.productId) query.productId = filters.productId;
  if (filters.type) query.type = filters.type;
  if (filters.from || filters.to) {
    query.createdAt = {};
    if (filters.from) query.createdAt.$gte = filters.from;
    if (filters.to) query.createdAt.$lte = filters.to;
  }

  const skip = (filters.page - 1) * filters.limit;
  const [movements, total] = await Promise.all([
    InventoryMovement.find(query)
      .populate("productId", "sku name category")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(filters.limit)
      .lean(),
    InventoryMovement.countDocuments(query),
  ]);

  return { movements, pagination: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) } };
}

async function listLowStock(status) {
  const baseFilter = { isActive: true };
  const filter = status === "out"
    ? { ...baseFilter, stock: 0 }
    : status === "low"
      ? { ...baseFilter, stock: { $gt: 0 }, $expr: { $lte: ["$stock", "$reorderLevel"] } }
      : { ...baseFilter, $expr: { $lte: ["$stock", "$reorderLevel"] } };

  const products = await Product.find(filter).sort({ stock: 1, name: 1 }).lean();
  const [outOfStock, lowStock] = await Promise.all([
    Product.countDocuments({ isActive: true, stock: 0 }),
    Product.countDocuments({ isActive: true, stock: { $gt: 0 }, $expr: { $lte: ["$stock", "$reorderLevel"] } }),
  ]);

  return { products, summary: { lowStock, outOfStock } };
}

module.exports = { createAdjustment, listLowStock, listMovements };