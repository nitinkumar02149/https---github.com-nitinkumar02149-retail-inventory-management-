const express = require("express");
const productController = require("../controllers/product.controller");
const {
  validateProductBody,
  validateProductId,
  validateProductQuery,
  validateProductStatus,
} = require("../middleware/product-validation");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);
router.get("/", validateProductQuery, productController.listProducts);
router.post("/", authorizeRoles("Admin"), validateProductBody(), productController.createProduct);
router.get("/:id", validateProductId, productController.getProduct);
router.put("/:id", authorizeRoles("Admin"), validateProductId, validateProductBody({ allowStock: false }), productController.updateProduct);
router.patch("/:id/status", authorizeRoles("Admin"), validateProductId, validateProductStatus, productController.updateProductStatus);

module.exports = router;