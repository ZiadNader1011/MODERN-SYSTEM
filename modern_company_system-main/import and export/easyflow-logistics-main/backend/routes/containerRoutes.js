import express from 'express';
import * as containerController from '../controllers/containerController.js';
import upload from '../middleware/upload.js'; 
import { containerSchema, validate } from '../middleware/validator.js';


const router = express.Router();

router.get('/', containerController.getAllContainers);

router.post(
    '/', 
    validate(containerSchema), 
    containerController.createContainer
);

// تحديث حاوية (PUT)
router.put(
    '/:id', 
   
    validate(containerSchema), 
    containerController.updateContainer
); 

// حذف حاوية (DELETE)
router.delete('/:id', containerController.deleteContainer);

/**
 * --- عملية رفع الملفات ---
 * محمية بالكامل لأن الرفع يستهلك مساحة السيرفر وموارد النظام
 */
router.post("/upload",  upload.single("file"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "لم يتم رفع أي ملف" });
        }
        
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        return res.json({
            success: true,
            url: `${baseUrl}/uploads/${req.file.filename}`,
            filename: req.file.filename
        });
    } catch (error) {
        console.error("Upload Route Error:", error);
        return res.status(500).json({ error: "حدث خطأ أثناء معالجة رفع الملف" });
    }
});

export default router;