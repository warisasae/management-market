// routes/products.routes.js
import { Router } from 'express';
import {
  createProduct,
  getAllProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductByBarcode,
  searchProducts,
  getNearExpiryProducts,
  getLowStockProducts,
  getOutOfStockProducts,
} from '../controllers/productController.js';
// import { requireLogin } from '../middleware/requireLogin.js';
// import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();

// router.use(requireLogin);

// เส้นทางเฉพาะ (ต้องมาก่อน :id)
router.get('/barcode/:barcode', getProductByBarcode);
router.get('/search',          searchProducts);
router.get('/near-expiry',     getNearExpiryProducts);
router.get('/low-stock',       getLowStockProducts);
router.get('/out-of-stock',    getOutOfStockProducts);

// CRUD ทั่วไป
router.get('/',        getAllProducts);
router.get('/:id',     getProduct);
router.post('/',       /* requireAdmin, */ createProduct);
router.put('/:id',     /* requireAdmin, */ updateProduct);
router.delete('/:id',  /* requireAdmin, */ deleteProduct);

export default router;
