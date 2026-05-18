import express from 'express';
import upload from '../middleware/upload.js';
import { prisma } from '../lib/prisma.js';
import { commissionSchema, validate } from '../middleware/validator.js';


const router = express.Router();

// --- 1. إضافة عمولة جديدة (POST) ---
// الترتيب: حماية (Auth) -> رفع ملفات (Multer) -> فحص بيانات (Validate)
router.post('/', 
     
    upload.array('attachments'), 
    validate(commissionSchema), 
    async (req, res) => {
    try {
        const data = req.body;
        
        const newFiles = (req.files || []).map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
            description: file.originalname,
            createdAt: new Date().toISOString()
        }));

        const newCommission = await prisma.commission.create({
            data: {
                date: new Date(data.date), 
                clientName: data.clientName,
                trader: data.trader || '',
                product: data.product || '',
                qualityRepresentative: data.qualityRepresentative || '',
                numberOfContainers: parseInt(data.numberOfContainers) || 0,
                totalQuantityTon: parseFloat(data.totalQuantityTon) || 0,
                commissionPerTon: parseFloat(data.commissionPerTon) || 0,
                currency: data.currency || 'USD',
                attachments: newFiles 
            }
        });
        return res.status(201).json(newCommission);
    } catch (error) {
        console.error("Create Commission Error:", error);
        return res.status(500).json({ error: "فشل في حفظ البيانات" });
    }
});

// --- 2. تحديث عمولة (PUT) ---
router.put('/:id', 
    upload.array('attachments'), 
    validate(commissionSchema), 
    async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const numericId = parseInt(id);

        if (isNaN(numericId)) return res.status(400).json({ error: "ID غير صحيح" });

        let currentAttachments = [];
        if (data.attachments) {
            currentAttachments = typeof data.attachments === 'string' 
                ? JSON.parse(data.attachments) 
                : data.attachments;
        }

        if (req.files && req.files.length > 0) {
            const newFiles = req.files.map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
                description: file.originalname,
                createdAt: new Date().toISOString()
            }));
            currentAttachments = [...currentAttachments, ...newFiles];
        }

        const updated = await prisma.commission.update({
            where: { id: numericId },
            data: {
                date: data.date ? new Date(data.date) : undefined,
                clientName: data.clientName,
                trader: data.trader,
                product: data.product,
                qualityRepresentative: data.qualityRepresentative,
                numberOfContainers: parseInt(data.numberOfContainers) || 0,
                totalQuantityTon: parseFloat(data.totalQuantityTon) || 0,
                commissionPerTon: parseFloat(data.commissionPerTon) || 0,
                currency: data.currency,
                attachments: currentAttachments 
            }
        });
        return res.json(updated);
    } catch (error) {
        console.error("Update Commission Error:", error);
        return res.status(500).json({ error: "فشل في تحديث البيانات" });
    }
});

router.get('/', async (req, res) => {
    try {
        const records = await prisma.commission.findMany({
            orderBy: { date: 'desc' }
        });
        return res.json(records);
    } catch (error) {
        return res.status(500).json({ error: "فشل في جلب البيانات" });
    }
});

// --- 4. حذف عمولة (DELETE) ---
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const numericId = parseInt(id);
        
        if (isNaN(numericId)) return res.status(400).json({ error: "ID غير صحيح" });

        await prisma.commission.delete({
            where: { id: numericId }
        });
        return res.json({ success: true, message: "تم الحذف بنجاح" });
    } catch (error) {
        console.error("Delete Error:", error);
        return res.status(500).json({ error: "حدث خطأ أثناء الحذف" });
    }
});

export default router;