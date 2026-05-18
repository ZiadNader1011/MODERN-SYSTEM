import express from 'express';
import upload from '../middleware/upload.js';
import { prisma } from '../lib/prisma.js';
import { shippingAgentRecordSchema, validate } from '../middleware/validator.js';


const router = express.Router();


router.post(
    '/', 
    upload.single('pdfFile'), 
    
    validate(shippingAgentRecordSchema), 
    async (req, res) => {
    try {
        const data = req.body;
        const fileUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null;
        
        const newRecord = await prisma.shippingAgentRecord.create({
            data: {
                agentId: parseInt(data.agentId), 
                date: new Date(data.date), 
                jobId: (!data.jobId || data.jobId === 'none' || data.jobId === "") ? null : parseInt(data.jobId),
                blNumber: data.blNumber || '',
                country: data.country || '',
                containerCount: parseInt(data.containerCount) || 0,
                costEgp: parseFloat(data.costEgp) || 0,
                costEuro: parseFloat(data.costEuro) || 0,
                costUsd: parseFloat(data.costUsd) || 0,
                costEgpNote: data.costEgpNote || '',
                costEuroNote: data.costEuroNote || '',
                costUsdNote: data.costUsdNote || '',
                pdfUrl: fileUrl, 
            }
        });
        return res.status(201).json(newRecord);
    } catch (error) {
        console.error("Record Create Error:", error);
        return res.status(500).json({ error: "فشل في إنشاء السجل، تأكد من صحة البيانات" });
    }
});

// --- [GET] جلب كل السجلات ---
router.get('/',  async (req, res) => {
    try {
        const records = await prisma.shippingAgentRecord.findMany({
            include: { agent: true, job: true }, 
            orderBy: { date: 'desc' }
        });
        return res.json(records);
    } catch (error) {
        return res.status(500).json({ error: "فشل في جلب السجلات" });
    }
});

// --- [DELETE] حذف سجل ---
router.delete('/:id',  async (req, res) => {
    try {
        const { id } = req.params;
        const numericId = parseInt(id);

        if (isNaN(numericId)) return res.status(400).json({ error: "ID غير صحيح" });

        const existing = await prisma.shippingAgentRecord.findUnique({
            where: { id: numericId }
        });

        if (!existing) return res.status(404).json({ error: "السجل غير موجود" });

        await prisma.shippingAgentRecord.delete({ where: { id: numericId } });
        return res.status(200).json({ success: true, message: "تم الحذف بنجاح" });
    } catch (error) {
        return res.status(500).json({ error: "حدث خطأ أثناء الحذف" });
    }
});

// --- [PUT] تحديث سجل ---
router.put(
    '/:id', 
    upload.single('pdfFile'), 
   
    validate(shippingAgentRecordSchema), 
    async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const numericId = parseInt(id);

        if (isNaN(numericId)) return res.status(400).json({ error: "ID غير صحيح" });

        const updateData = {
            agentId: parseInt(data.agentId),
            date: new Date(data.date),
            jobId: (!data.jobId || data.jobId === 'none' || data.jobId === "") ? null : parseInt(data.jobId),
            blNumber: data.blNumber || '',
            country: data.country || '',
            containerCount: parseInt(data.containerCount) || 0,
            costEgp: parseFloat(data.costEgp) || 0,
            costEuro: parseFloat(data.costEuro) || 0,
            costUsd: parseFloat(data.costUsd) || 0,
            costEgpNote: data.costEgpNote || '',
            costEuroNote: data.costEuroNote || '',
            costUsdNote: data.costUsdNote || '',
        };

        if (req.file) {
            updateData.pdfUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        }

        const updated = await prisma.shippingAgentRecord.update({
            where: { id: numericId },
            data: updateData
        });
        return res.json(updated);
    } catch (error) {
        console.error("Update Record Error:", error);
        return res.status(500).json({ error: "فشل في تحديث السجل" });
    }
});

export default router;