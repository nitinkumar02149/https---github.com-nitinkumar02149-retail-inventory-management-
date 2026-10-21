const mongoose = require("mongoose");
const Product = require("../models/product.model");
const InventoryMovement = require("../models/inventory-movement.model");
const Sale = require("../models/sale.model");
const Counter = require("../models/counter.model");
const ApiError = require("../utils/api-error");

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function createSale(input, createdBy) {
  const quantities = new Map();
  for (const item of input.items) {
    quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
  }
  const session = await mongoose.startSession();
  let sale;

  try {
    await session.withTransaction(async () => {
      const productIds = [...quantities.keys()];
      const products = await Product.find({ _id: { $in: productIds } }).session(session).lean();
      const productsById = new Map(products.map((product) => [product._id.toString(), product]));

      for (const productId of productIds) {
        const product = productsById.get(productId);
        if (!product) throw new ApiError(404, "A sale product was not found.", "PRODUCT_NOT_FOUND");
        if (!product.isActive) throw new ApiError(409, `${product.name} is inactive and cannot be sold.`, "INACTIVE_PRODUCT");
        if (product.stock < quantities.get(productId)) {
          throw new ApiError(409, `Insufficient stock for ${product.name}.`, "INSUFFICIENT_STOCK");
        }
      }

      const items = productIds.map((productId) => {
        const product = productsById.get(productId);
        const quantity = quantities.get(productId);
        return {
          productId: product._id,
          productNameSnapshot: product.name,
          quantity,
          unitPriceSnapshot: product.sellingPrice,
          purchaseCostSnapshot: product.purchasePrice,
          lineTotal: roundMoney(product.sellingPrice * quantity),
        };
      });

      const subtotal = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
      if (input.discount > subtotal) {
        throw new ApiError(400, "Discount cannot exceed the sale subtotal.", "INVALID_DISCOUNT");
      }
      const discount = roundMoney(input.discount);
      const taxRate = input.taxRate;
      const taxAmount = roundMoney((subtotal - discount) * taxRate);
      const total = roundMoney(subtotal - discount + taxAmount);

      const counter = await Counter.findOneAndUpdate(
        { _id: "sales-invoice" },
        { $inc: { sequence: 1 } },
        { upsert: true, new: true, session, setDefaultsOnInsert: true },
      );
      const invoiceNumber = `INV-${new Date().getUTCFullYear()}-${String(counter.sequence).padStart(6, "0")}`;

      const saleItems = [];
      for (const productId of productIds) {
        const product = productsById.get(productId);
        const quantity = quantities.get(productId);
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: product._id, isActive: true, stock: { $gte: quantity } },
          { $inc: { stock: -quantity } },
          { new: true, session, runValidators: true },
        );
        if (!updatedProduct) throw new ApiError(409, `Insufficient stock for ${product.name}.`, "INSUFFICIENT_STOCK");

        await InventoryMovement.create([{
          productId: product._id,
          type: "SALE",
          quantity,
          previousStock: product.stock,
          newStock: updatedProduct.stock,
          reason: `Sale ${invoiceNumber}`,
          createdBy,
        }], { session });

        saleItems.push({
          productId: product._id,
          productNameSnapshot: product.name,
          quantity,
          unitPriceSnapshot: product.sellingPrice,
          purchaseCostSnapshot: product.purchasePrice,
          lineTotal: roundMoney(product.sellingPrice * quantity),
        });
      }

      [sale] = await Sale.create([{
        invoiceNumber,
        items: saleItems,
        subtotal,
        discount,
        taxRate,
        taxAmount,
        total,
        createdBy,
      }], { session });
    });
  } finally {
    await session.endSession();
  }

  return Sale.findById(sale._id).populate("createdBy", "name email role").lean();
}

async function listSales(filters) {
  const query = {};
  if (filters.from || filters.to) {
    query.createdAt = {};
    if (filters.from) query.createdAt.$gte = filters.from;
    if (filters.to) query.createdAt.$lte = filters.to;
  }
  if (filters.search) query.invoiceNumber = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const skip = (filters.page - 1) * filters.limit;
  const [sales, total] = await Promise.all([
    Sale.find(query).select("invoiceNumber subtotal discount taxRate taxAmount total createdBy createdAt items.productNameSnapshot items.quantity")
      .populate("createdBy", "name email role").sort({ createdAt: -1, _id: -1 }).skip(skip).limit(filters.limit).lean(),
    Sale.countDocuments(query),
  ]);
  return { sales, pagination: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) } };
}

async function getSaleById(id) {
  if (!mongoose.isObjectIdOrHexString(id)) throw new ApiError(400, "Sale ID is invalid.", "INVALID_SALE_ID");
  const sale = await Sale.findById(id).populate("createdBy", "name email role").lean();
  if (!sale) throw new ApiError(404, "Sale was not found.", "SALE_NOT_FOUND");
  return sale;
}

module.exports = { createSale, getSaleById, listSales };