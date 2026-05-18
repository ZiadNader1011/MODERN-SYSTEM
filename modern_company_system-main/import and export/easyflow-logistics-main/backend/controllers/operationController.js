import { prisma } from '../lib/prisma.js';
import fs from 'fs/promises';
import path from 'path';

const getFileUrl = (req, filename) => `${req.protocol}://${req.get('host')}/uploads/operations/${filename}`;

export const getOperations = async (req, res) => {
    try {
        const operations = await prisma.shipmentOperation.findMany({
            orderBy: { operationDate: 'desc' },
        });
        
        // التأكد من أن المرفقات تعود كـ Array حقيقي ومطابقة المعرف النصي
        const formatted = operations.map(op => ({
            ...op,
            id: String(op.id),
            attachments: typeof op.attachments === 'string' ? JSON.parse(op.attachments) : (op.attachments || [])
        }));
        
        return res.status(200).json(formatted);
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

export const createOperation = async (req, res) => {
    try {
        const data = req.body;
        
        // 1. معالجة الـ Job ID
        const finalJobId = (data.jobId === 'none' || !data.jobId || data.jobId === "") ? null : parseInt(data.jobId);

        // 2. معالجة المرفقات الجديدة
        const newAttachments = (req.files || []).map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            url: getFileUrl(req, file.filename),
            description: file.originalname,
            createdAt: new Date().toISOString()
        }));

        // 3. الحفظ في الداتابيز
        const newOp = await prisma.shipmentOperation.create({
            data: {
                operationDate: new Date(data.operationDate),
                loadingDate: (data.loadingDate && data.loadingDate !== "") ? new Date(data.loadingDate) : null,
                clientName: data.clientName,
                jobId: finalJobId, 
                product: data.product || null,
                quantity: data.quantity || null,
                containerNumber: data.containerNumber || null,
                responsiblePerson: data.responsiblePerson || null,
                qualityRepresentative: data.qualityRepresentative || null,
                notes: data.notes || null,
                attachments: newAttachments, // حفظ المصفوفة مباشرة
                numberOfContainers: data.numberOfContainers ? data.numberOfContainers.toString() : "0",
            }
        });
        return res.status(201).json(newOp);
    } catch (error) {
        console.error("❌ Create Error:", error);
        return res.status(400).json({ error: "Failed to create operation: " + error.message });
    }
};

export const updateOperation = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const existingOp = await prisma.shipmentOperation.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingOp) return res.status(404).json({ error: "Operation not found" });

        // 1. معالجة المرفقات الموجودة (تحويلها من String إلى Array لو لزم الأمر)
        let currentAttachments = [];
        try {
            if (data.existingAttachments) {
                currentAttachments = JSON.parse(data.existingAttachments);
            } else if (data.attachments && typeof data.attachments === 'string') {
                // دعم للحالتين (الاسم القديم والجديد)
                currentAttachments = JSON.parse(data.attachments);
            } else {
                currentAttachments = existingOp.attachments || [];
            }
        } catch (e) {
            currentAttachments = existingOp.attachments || [];
        }

        // 2. إضافة الملفات الجديدة المرفوعة حالياً
        if (req.files && req.files.length > 0) {
            const newFiles = req.files.map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                url: getFileUrl(req, file.filename),
                description: file.originalname,
                createdAt: new Date().toISOString()
            }));
            currentAttachments = [...currentAttachments, ...newFiles];
        }

        const finalJobId = (data.jobId === 'none' || !data.jobId || data.jobId === "") ? null : parseInt(data.jobId);

        const updated = await prisma.shipmentOperation.update({
            where: { id: parseInt(id) },
            data: {
                operationDate: data.operationDate ? new Date(data.operationDate) : undefined,
                loadingDate: (data.loadingDate && data.loadingDate !== "") ? new Date(data.loadingDate) : null,
                clientName: data.clientName ?? undefined,
                jobId: finalJobId, 
                product: data.product ?? undefined,
                quantity: data.quantity ?? undefined,
                containerNumber: data.containerNumber ?? undefined,
                responsiblePerson: data.responsiblePerson ?? undefined,
                qualityRepresentative: data.qualityRepresentative ?? undefined,
                notes: data.notes ?? undefined,
                numberOfContainers: data.numberOfContainers ? data.numberOfContainers.toString() : undefined,
                attachments: currentAttachments, 
            },
        });

        return res.json(updated);
    } catch (error) {
        console.error("❌ Update Error:", error);
        return res.status(500).json({ error: "Failed to update: " + error.message });
    }
};

export const deleteOperation = async (req, res) => {
    try {
        const numericId = parseInt(req.params.id);
        const record = await prisma.shipmentOperation.findUnique({ where: { id: numericId } });
        
        if (!record) return res.status(404).json({ error: "Record not found" });

        // مسح الملفات الفيزيائية من السيرفر
        if (record.attachments && Array.isArray(record.attachments)) {
            for (const file of record.attachments) {
                try {
                    const filename = file.url.split('/').pop();
                    const filePath = path.join(process.cwd(), 'uploads/operations', filename);
                    await fs.unlink(filePath);
                } catch (err) { /* تجاهل لو الملف غير موجود أصلاً */ }
            }
        }

        await prisma.shipmentOperation.delete({ where: { id: numericId } });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("❌ Delete Error:", error);
        return res.status(500).json({ error: "Delete failed" });
    }
};