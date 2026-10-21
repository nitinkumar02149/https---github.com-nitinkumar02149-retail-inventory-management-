const asyncHandler = require("../utils/async-handler");
const { sendSuccess } = require("../utils/api-response");
const productService = require("../services/product.service");

const listProducts = asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.productQuery);
  return sendSuccess(res, { message: "Products retrieved.", data: result });
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  return sendSuccess(res, { message: "Product retrieved.", data: product });
});

const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body, req.user.id);
  return sendSuccess(res, { statusCode: 201, message: "Product created.", data: product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  return sendSuccess(res, { message: "Product updated.", data: product });
});

const updateProductStatus = asyncHandler(async (req, res) => {
  const product = await productService.updateProductStatus(req.params.id, req.body.isActive);
  return sendSuccess(res, { message: `Product ${product.isActive ? "activated" : "deactivated"}.`, data: product });
});

module.exports = { createProduct, getProduct, listProducts, updateProduct, updateProductStatus };