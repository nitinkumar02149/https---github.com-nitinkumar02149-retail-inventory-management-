export const products = [
  { sku: "EL-1042", name: "Ceramic pour-over set", category: "Kitchen", purchasePrice: 18.5, sellingPrice: 42, stock: 24, reorderLevel: 8 },
  { sku: "ST-2081", name: "Linen market tote", category: "Accessories", purchasePrice: 7.25, sellingPrice: 19, stock: 7, reorderLevel: 10 },
  { sku: "HM-0317", name: "Amber glass candle", category: "Home", purchasePrice: 9, sellingPrice: 24, stock: 42, reorderLevel: 12 },
  { sku: "SK-4450", name: "Botanical hand balm", category: "Beauty", purchasePrice: 4.8, sellingPrice: 14, stock: 5, reorderLevel: 12 },
  { sku: "EL-1188", name: "Rechargeable desk lamp", category: "Home", purchasePrice: 22, sellingPrice: 54, stock: 16, reorderLevel: 6 },
  { sku: "KT-0913", name: "Stoneware breakfast bowl", category: "Kitchen", purchasePrice: 8.5, sellingPrice: 23, stock: 0, reorderLevel: 8 },
  { sku: "AC-6102", name: "Woven card wallet", category: "Accessories", purchasePrice: 11, sellingPrice: 29, stock: 19, reorderLevel: 8 },
];

export const recentSales = [
  { id: "TX-2841", customer: "Walk-in customer", date: "Today, 10:42 AM", total: "$86.00", status: "Paid" },
  { id: "TX-2840", customer: "Maya Chen", date: "Today, 10:18 AM", total: "$57.00", status: "Paid" },
  { id: "TX-2839", customer: "Walk-in customer", date: "Today, 9:51 AM", total: "$42.00", status: "Paid" },
  { id: "TX-2838", customer: "Jordan Lee", date: "Yesterday, 4:32 PM", total: "$108.00", status: "Paid" },
];

export const topProducts = [
  { name: "Amber glass candle", units: "38 units", revenue: "$912.00", share: "78%" },
  { name: "Ceramic pour-over set", units: "26 units", revenue: "$1,092.00", share: "62%" },
  { name: "Linen market tote", units: "21 units", revenue: "$399.00", share: "49%" },
];

export const invoices = [
  { id: "INV-2026-041", customer: "Maya Chen", date: "Oct 21, 2026", due: "Oct 21, 2026", total: "$57.00", status: "Paid" },
  { id: "INV-2026-040", customer: "Jordan Lee", date: "Oct 21, 2026", due: "Oct 21, 2026", total: "$108.00", status: "Paid" },
  { id: "INV-2026-039", customer: "Walk-in customer", date: "Oct 20, 2026", due: "Oct 20, 2026", total: "$42.00", status: "Paid" },
  { id: "INV-2026-038", customer: "Riley Morgan", date: "Oct 20, 2026", due: "Oct 20, 2026", total: "$164.00", status: "Pending" },
];

export const formatMoney = (amount) => `$${amount.toFixed(2)}`;