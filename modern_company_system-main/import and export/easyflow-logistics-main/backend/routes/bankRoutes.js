import express from 'express';
import { getBanksSummary, saveBanksSummary } from '../controllers/BankController.js';

const router = express.Router();

// طلب الـ GET لقراءة الأرصدة (api/banks)
router.get('/', getBanksSummary);

// طلب الـ POST لحفظ وتحديث الحسابات من الشاشة (api/banks/summary)
router.post('/summary', saveBanksSummary);

export default router;