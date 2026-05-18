import express from 'express';
import upload from '../middleware/upload.js';
import { prisma } from '../lib/prisma.js';
import { shippingAgentSchema, validate } from '../middleware/validator.js';


const router = express.Router();

// --- [POST] إضافة وكيل جديد ---
// الترتيب: الرفع (Multer) -> الحماية (Auth) -> الفحص (Validator) -> التنفيذ
router.post(
    '/', 
    upload.single('file'), 
  
    validate(shippingAgentSchema), 
    async (req, res) => {
    try {
        const data = req.body;
        const fileUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null;

        const newAgent = await prisma.shippingAgent.create({
            data: {
                name: data.name,
                company: data.company || null,
                address: data.address || null,
                telephone: data.telephone || null,
                personalNumber: data.personalNumber || null,
                email: data.email || null,
                attachmentUrl: fileUrl
            }
        });
        return res.status(201).json(newAgent);
    } catch (error) {
        console.error("Create Agent Error:", error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: "هذا البريد الإلكتروني مسجل بالفعل لوكيل آخر" });
        }
        return res.status(500).json({ error: "حدث خطأ أثناء إضافة الوكيل" });
    }
});

// --- [GET] جلب كل الوكلاء ---
// يُفضل حماية بيانات الوكلاء وأرقام هواتفهم بحيث لا يراها إلا الموظفين
router.get('/',  async (req, res) => {
    try {
        const agents = await prisma.shippingAgent.findMany({
            orderBy: { id: 'desc' }
        });
        return res.json(agents);
    } catch (error) {
        return res.status(500).json({ error: "فشل في جلب قائمة الوكلاء" });
    }
});

// --- [PUT] تحديث بيانات وكيل ---
router.put(
    '/:id', 
    upload.single('file'), 
    validate(shippingAgentSchema), 
    async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const numericId = parseInt(id);

        if (isNaN(numericId)) {
            return res.status(400).json({ error: "معرف الوكيل غير صحيح" });
        }

        const updateData = {
            name: data.name,
            company: data.company || null,
            address: data.address || null,
            telephone: data.telephone || null,
            personalNumber: data.personalNumber || null,
            email: data.email || null,
        };

        if (req.file) {
            updateData.attachmentUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        }

        const updated = await prisma.shippingAgent.update({
            where: { id: numericId },
            data: updateData
        });
        return res.json(updated);
    } catch (error) {
        console.error("Update Agent Error:", error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: "الوكيل غير موجود" });
        }
        return res.status(500).json({ error: "فشل في تحديث بيانات الوكيل" });
    }
});

// --- [DELETE] حذف وكيل ---
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const numericId = parseInt(id);

        if (isNaN(numericId)) {
            return res.status(400).json({ error: "معرف الوكيل غير صحيح" });
        }

        const record = await prisma.shippingAgent.findUnique({
            where: { id: numericId }
        });

        if (!record) {
            return res.status(200).json({ success: true, message: "تم الحذف بالفعل مسبقاً" });
        }

        await prisma.shippingAgent.delete({
            where: { id: numericId }
        });

        return res.status(200).json({ success: true, message: "تم الحذف بنجاح" });
    } catch (error) {
        console.error("Delete Agent Error:", error);
        if (error.code === 'P2003') {
            return res.status(400).json({ error: "لا يمكن حذف هذا الوكيل لوجود سجلات فواتير مرتبطة به" });
        }
        return res.status(500).json({ error: "حدث خطأ أثناء محاولة الحذف" });
    }
});

export default router;