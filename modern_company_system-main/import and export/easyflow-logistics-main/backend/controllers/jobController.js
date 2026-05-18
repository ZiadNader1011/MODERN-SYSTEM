import { prisma } from '../lib/prisma.js';

export const getAllJobs = async (req, res) => {
    try {
        const jobs = await prisma.job.findMany({
            include: {
                client: true,
                supplier: true,
                shippingRecords: true,
                products: { include: { product: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        const formatted = jobs.map(j => ({
            ...j,
            id: String(j.id),
            clientId: j.clientId ? String(j.clientId) : undefined,
            supplierId: j.supplierId ? String(j.supplierId) : undefined,
            products: (j.products || []).map(p => ({
                ...p,
                productId: String(p.productId)
            }))
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch jobs" });
    }
};

export const createJob = async (req, res) => {
    try {
        const data = req.body;
        if (data.jobNumber) {
            const existingJob = await prisma.job.findUnique({ where: { jobNumber: data.jobNumber } });
            if (existingJob) return res.status(400).json({ error: "رقم العملية موجود بالفعل." });
        }

        const validProducts = (data.products || [])
            .filter(p => p.productId && p.productId !== 'none' && !isNaN(Number(p.productId)))
            .map(p => ({
                productId: Number(p.productId),
                quantity: parseFloat(p.quantity) || 1,
                unitPrice: parseFloat(p.unitPrice) || 0,
                currency: p.currency || data.currency || "USD",
                variety: p.variety || null
            }));

        const newJob = await prisma.job.create({
            data: {
                jobNumber: data.jobNumber?.trim() || `JO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
                title: data.title || "Untitled Job",
                status: data.status || "active",
                operationType: data.operationType || "export",
                currency: data.currency || "USD",
                notes: data.notes || null,
                clientId: data.clientId && data.clientId !== 'none' ? Number(data.clientId) : null,
                supplierId: data.supplierId && data.supplierId !== 'none' ? Number(data.supplierId) : null,
                discountPercentage: parseFloat(data.discountPercentage) || 0,
                rawMaterialPricePerTon: parseFloat(data.rawMaterialPricePerTon) || 0,
                rawMaterialWeight: parseFloat(data.rawMaterialWeight) || 0,
                pettyCash: parseFloat(data.pettyCash) || 0,
                products: { create: validProducts }
            },
            include: { products: true }
        });
        res.status(201).json({ ...newJob, id: String(newJob.id) });
    } catch (error) {
        res.status(500).json({ error: "خطأ في قاعدة البيانات الداخلي" });
    }
};

export const updateJob = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const numericId = Number(id);

        const updatedJob = await prisma.job.update({
            where: { id: isNaN(numericId) ? 0 : numericId },
            data: {
                title: data.title,
                status: data.status,
                operationType: data.operationType,
                currency: data.currency,
                notes: data.notes,
                clientId: data.clientId && data.clientId !== 'none' ? Number(data.clientId) : null,
                supplierId: data.supplierId && data.supplierId !== 'none' ? Number(data.supplierId) : null,
                discountPercentage: parseFloat(data.discountPercentage) || 0,
                rawMaterialPricePerTon: parseFloat(data.rawMaterialPricePerTon) || 0,
                rawMaterialWeight: parseFloat(data.rawMaterialWeight) || 0,
                pettyCash: parseFloat(data.pettyCash) || 0,
                products: {
                    deleteMany: {}, 
                    create: (data.products || [])
                        .filter(p => p.productId && p.productId !== 'none')
                        .map(p => ({
                            productId: Number(p.productId),
                            quantity: parseFloat(p.quantity) || 1,
                            unitPrice: parseFloat(p.unitPrice) || 0,
                            currency: p.currency || data.currency || "USD",
                            variety: p.variety || null
                        }))
                }
            }
        });
        res.json({ ...updatedJob, id: String(updatedJob.id) });
    } catch (error) {
        res.status(400).json({ error: "فشل تحديث البيانات." });
    }
};

export const getJobById = async (req, res) => {
    try {
        const { id } = req.params;
        const job = await prisma.job.findUnique({
            where: { id: Number(id) },
            include: {
                client: true,
                supplier: true,
                shippingRecords: { include: { agent: true } },
                products: { include: { product: true } }
            }
        });
        if (!job) return res.status(404).json({ error: "Job not found" });
        res.json({ ...job, id: String(job.id) });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch job details" });
    }
};

export const deleteJob = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.job.deleteMany({ where: { id: Number(id) } });
        res.json({ message: "Job deleted successfully" });
    } catch (error) {
        res.status(400).json({ error: "Delete failed" });
    }
};