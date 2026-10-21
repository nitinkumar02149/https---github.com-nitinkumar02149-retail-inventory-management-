const Sale = require("../models/sale.model");
const Product = require("../models/product.model");

async function getSalesReport(range) {
  const [summaryRows, topSellingProducts, dailySales, recentSales, activeProducts, lowStockCount, outOfStockCount, lowStockProducts] = await Promise.all([
    Sale.aggregate([
      { $match: range.match },
      { $group: {
        _id: null,
        totalSales: { $sum: "$total" },
        netSales: { $sum: { $subtract: ["$subtotal", "$discount"] } },
        transactionCount: { $sum: 1 },
        taxAmount: { $sum: "$taxAmount" },
        discounts: { $sum: "$discount" },
      } },
    ]),
    Sale.aggregate([
      { $match: range.match },
      { $unwind: "$items" },
      { $group: {
        _id: "$items.productId",
        productName: { $first: "$items.productNameSnapshot" },
        quantitySold: { $sum: "$items.quantity" },
        revenue: { $sum: "$items.lineTotal" },
      } },
      { $sort: { quantitySold: -1, revenue: -1, productName: 1 } },
      { $limit: 5 },
      { $project: { _id: 0, productId: "$_id", productName: 1, quantitySold: 1, revenue: { $round: ["$revenue", 2] } } },
    ]),
    Sale.aggregate([
      { $match: range.match },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
        sales: { $sum: "$total" },
        transactionCount: { $sum: 1 },
      } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", sales: { $round: ["$sales", 2] }, transactionCount: 1 } },
    ]),
    Sale.find(range.match)
      .select("invoiceNumber total createdAt createdBy items.productNameSnapshot items.quantity")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: true, stock: { $gt: 0 }, $expr: { $lte: ["$stock", "$reorderLevel"] } }),
    Product.countDocuments({ isActive: true, stock: 0 }),
    Product.find({ isActive: true, $expr: { $lte: ["$stock", "$reorderLevel"] } })
      .select("sku name category stock reorderLevel")
      .sort({ stock: 1, name: 1 })
      .limit(10)
      .lean(),
  ]);

  const summary = summaryRows[0] || { totalSales: 0, netSales: 0, transactionCount: 0, taxAmount: 0, discounts: 0 };
  return {
    period: { startDate: range.startDate, endDate: range.endDate },
    summary: {
      totalActiveProducts: activeProducts,
      totalSales: Number(summary.totalSales.toFixed(2)),
      netSales: Number(summary.netSales.toFixed(2)),
      transactionCount: summary.transactionCount,
      taxAmount: Number(summary.taxAmount.toFixed(2)),
      discounts: Number(summary.discounts.toFixed(2)),
      lowStockCount,
      outOfStockCount,
    },
    recentSales: recentSales.map((sale) => ({
      ...sale,
      itemCount: sale.items.reduce((count, item) => count + item.quantity, 0),
      items: undefined,
    })),
    topSellingProducts,
    dailySales,
    lowStockProducts,
  };
}

async function getProfitReport(range) {
  const result = await Sale.aggregate([
    { $match: range.match },
    { $unwind: "$items" },
    { $addFields: {
      lineCost: { $multiply: ["$items.quantity", "$items.purchaseCostSnapshot"] },
      allocatedDiscount: {
        $cond: [
          { $gt: ["$subtotal", 0] },
          { $multiply: ["$discount", { $divide: ["$items.lineTotal", "$subtotal"] }] },
          0,
        ],
      },
    } },
    { $facet: {
      summary: [{ $group: {
        _id: null,
        merchandiseRevenue: { $sum: { $subtract: ["$items.lineTotal", "$allocatedDiscount"] } },
        costOfGoods: { $sum: "$lineCost" },
        grossProfit: { $sum: { $subtract: [{ $subtract: ["$items.lineTotal", "$allocatedDiscount"] }, "$lineCost"] } },
        invoices: { $addToSet: "$_id" },
      } }, { $project: {
        _id: 0,
        merchandiseRevenue: { $round: ["$merchandiseRevenue", 2] },
        costOfGoods: { $round: ["$costOfGoods", 2] },
        grossProfit: { $round: ["$grossProfit", 2] },
        transactionCount: { $size: "$invoices" },
      } }],
      products: [{ $group: {
        _id: "$items.productId",
        productName: { $first: "$items.productNameSnapshot" },
        quantitySold: { $sum: "$items.quantity" },
        merchandiseRevenue: { $sum: { $subtract: ["$items.lineTotal", "$allocatedDiscount"] } },
        costOfGoods: { $sum: "$lineCost" },
        grossProfit: { $sum: { $subtract: [{ $subtract: ["$items.lineTotal", "$allocatedDiscount"] }, "$lineCost"] } },
      } }, { $sort: { grossProfit: -1, productName: 1 } }, { $limit: 10 }, { $project: {
        _id: 0,
        productId: "$_id",
        productName: 1,
        quantitySold: 1,
        merchandiseRevenue: { $round: ["$merchandiseRevenue", 2] },
        costOfGoods: { $round: ["$costOfGoods", 2] },
        grossProfit: { $round: ["$grossProfit", 2] },
      } }],
    } },
  ]);

  const report = result[0] || { summary: [], products: [] };
  return {
    period: { startDate: range.startDate, endDate: range.endDate },
    summary: report.summary[0] || { merchandiseRevenue: 0, costOfGoods: 0, grossProfit: 0, transactionCount: 0 },
    topProductProfits: report.products,
  };
}

module.exports = { getProfitReport, getSalesReport };