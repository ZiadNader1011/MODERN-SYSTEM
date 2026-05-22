import express from 'express';
import * as supplierController from '../controllers/supplierController.js';
import { supplierSchema, validate } from '../middleware/validator.js'; 


const router = express.Router();

router.post('/',  validate(supplierSchema), supplierController.createSupplier);


router.get('/',  supplierController.getSuppliers);


router.put('/:id', validate(supplierSchema), supplierController.updateSupplier);


router.delete('/:id', supplierController.deleteSupplier);

export default router;