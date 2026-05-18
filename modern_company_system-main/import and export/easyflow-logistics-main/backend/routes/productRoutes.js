import express from 'express';
import * as productController from '../controllers/productController.js';
import { productSchema, validate } from '../middleware/validator.js'; 

const router = express.Router();


router.get('/', productController.getAllProducts);

router.post(
    '/', 
   
    validate(productSchema), 
    productController.createProduct
);


router.put(
    '/:id', 
  
    validate(productSchema), 
    productController.updateProduct
);

router.delete('/:id',  productController.deleteProduct);

export default router;