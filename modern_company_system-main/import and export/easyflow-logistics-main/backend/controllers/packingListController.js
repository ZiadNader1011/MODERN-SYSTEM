import { prisma } from '../lib/prisma.js';

export const getPackingLists = async (req, res) => {
    try {
        const lists = await prisma.packingList.findMany({
            orderBy: { createdAt: 'desc' }
        });
        
        // تحويل المعرفات لنصوص لإرضاء كاش الفرونت إند تماماً
        const formatted = lists.map(list => ({
            ...list,
            id: String(list.id),
            containerNumbers: typeof list.containerNumbers === 'string' ? JSON.parse(list.containerNumbers) : (list.containerNumbers || []),
            products: typeof list.products === 'string' ? JSON.parse(list.products) : (list.products || []),
            attachments: typeof list.attachments === 'string' ? JSON.parse(list.attachments) : (list.attachments || [])
        }));
        
        return res.status(200).json(formatted);
    } catch (error) {
        console.error("❌ Fetch PackingLists Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

export const createPackingList = async (req, res) => {
    try {
        const data = req.body;

        const newUploadedFiles = (req.files || []).map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            url: `${req.protocol}://${req.get('host')}/uploads/packing-lists/${file.filename}`,
            description: file.originalname,
            createdAt: new Date().toISOString()
        }));

        const products = typeof data.products === 'string' ? JSON.parse(data.products) : (data.products || []);
        const containerNumbers = typeof data.containerNumbers === 'string' ? JSON.parse(data.containerNumbers) : (data.containerNumbers || []);
        const existingAttachments = data.existingAttachments ? JSON.parse(data.existingAttachments) : [];
        const finalAttachments = [...existingAttachments, ...newUploadedFiles];

        const newList = await prisma.packingList.create({
            data: {
                date: new Date(data.date),
                blNumber: data.blNumber || null,
                clientName: data.clientName,
                invoiceNumber: data.invoiceNumber || null,
                customRelease: data.customRelease || null,
                note: data.note || null,
                shippingAgent: data.shippingAgent || null,
                pol: data.pol || null,
                pod: data.pod || null,
                finalDestination: data.finalDestination || null,
                shippingDate: data.shippingDate ? new Date(data.shippingDate) : null,
                dhlNumber: data.dhlNumber || null,
                numberOfContainers: parseInt(data.numberOfContainers) || 0,
                numberOfProducts: parseInt(data.numberOfProducts) || 0,
                containerNumbers,
                products,
                attachments: finalAttachments 
            }
        });
        return res.status(201).json({ ...newList, id: String(newList.id) });
    } catch (error) {
        console.error("❌ Create PackingList Error:", error);
        return res.status(400).json({ error: "Failed to create: " + error.message });
    }
};

export const updatePackingList = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const numericId = parseInt(id);

        const newUploadedFiles = (req.files || []).map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            url: `${req.protocol}://${req.get('host')}/uploads/packing-lists/${file.filename}`,
            description: file.originalname,
            createdAt: new Date().toISOString()
        }));

        const keptAttachments = data.existingAttachments ? JSON.parse(data.existingAttachments) : [];
        const finalAttachments = [...keptAttachments, ...newUploadedFiles];
        const products = typeof data.products === 'string' ? JSON.parse(data.products) : data.products;
        const containerNumbers = typeof data.containerNumbers === 'string' ? JSON.parse(data.containerNumbers) : data.containerNumbers;

        const updated = await prisma.packingList.update({
            where: { id: isNaN(numericId) ? 0 : numericId },
            data: {
                date: data.date ? new Date(data.date) : undefined,
                shippingDate: data.shippingDate ? new Date(data.shippingDate) : null,
                blNumber: data.blNumber,
                clientName: data.clientName,
                invoiceNumber: data.invoiceNumber,
                customRelease: data.customRelease,
                note: data.note,
                shippingAgent: data.shippingAgent,
                pol: data.pol,
                pod: data.pod,
                finalDestination: data.finalDestination,
                numberOfContainers: data.numberOfContainers ? parseInt(data.numberOfContainers) : undefined,
                numberOfProducts: data.numberOfProducts ? parseInt(data.numberOfProducts) : undefined,
                containerNumbers,
                products,
                attachments: finalAttachments 
            }
        });
        return res.status(200).json({ ...updated, id: String(updated.id) });
    } catch (error) {
        console.error("❌ Update PackingList Error:", error);
        return res.status(400).json({ error: "Update failed" });
    }
};

export const deletePackingList = async (req, res) => {
    try {
        const numericId = parseInt(req.params.id);
        await prisma.packingList.deleteMany({ where: { id: isNaN(numericId) ? 0 : numericId } });
        return res.status(200).json({ success: true, message: "Deleted successfully" });
    } catch (error) {
        return res.status(500).json({ error: "Delete operation failed" });
    }
};