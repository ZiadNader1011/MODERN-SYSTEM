import express from 'express';
import * as financialController from '../controllers/financialController.js';
import upload from '../middleware/upload.js'; 
import { transactionSchema, validate } from '../middleware/validator.js'; 


const router = express.Router();

router.get('/',  financialController.getTransactions);


router.post(
    '/', 
    upload.none(), 
    
    validate(transactionSchema), 
    financialController.createTransaction
);


router.put(
    '/:id', 
    upload.none(),  
    validate(transactionSchema), 
    financialController.updateTransaction
);

/**
 * --- 4. حذف معاملة مالية (DELETE) ---
 */
router.delete('/:id',  financialController.deleteTransaction);

export default router;