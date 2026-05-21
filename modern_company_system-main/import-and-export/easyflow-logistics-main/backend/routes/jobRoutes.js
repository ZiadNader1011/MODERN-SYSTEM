import express from 'express';
import * as jobController from '../controllers/jobController.js';
import { jobSchema, validate } from '../middleware/validator.js'; 


const router = express.Router();

router.get('/',  jobController.getAllJobs);

/**
 * --- 2. جلب تفاصيل عملية واحدة ---
 */
router.get('/:id',  jobController.getJobById);

/**
 * --- 3. إضافة عملية جديدة (POST) ---
 * الترتيب: 1. حماية -> 2. فحص بيانات -> 3. تنفيذ الكنترولر
 */
router.post('/',  validate(jobSchema), jobController.createJob);

/**
 * --- 4. التعديل (PUT) ---
 */
router.put('/:id',  validate(jobSchema), jobController.updateJob);

/**
 * --- 5. الحذف (DELETE) ---
 */
router.delete('/:id',  jobController.deleteJob);

export default router;