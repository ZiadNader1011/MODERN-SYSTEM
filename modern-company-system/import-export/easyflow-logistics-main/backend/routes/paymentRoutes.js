import express from 'express';
import { getAllPayments, createPayment, deletePayment } from '../controllers/paymentController.js';

const router = express.Router();

// الروابط الأساسية للمدفوعات
router.get('/', getAllPayments);     
router.post('/', createPayment);    
router.delete('/:id', deletePayment); 

export default router;