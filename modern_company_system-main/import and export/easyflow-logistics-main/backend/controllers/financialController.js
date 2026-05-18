import { prisma } from '../lib/prisma.js';
export const getTransactions = async (req, res) => {
    try {
        const { entityId } = req.query;

        const where = {};

        if (entityId) {
            where.relatedId = String(entityId);
        }

        const transactions = await prisma.transaction.findMany({
            where,
            orderBy: [
                { date: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        const formatted = transactions.map(tx => ({
            ...tx,
            amount: Number(tx.amount)
        }));

        return res.status(200).json(formatted);

    } catch (error) {
        console.error("❌ Fetch Error:", error);
        return res.status(500).json({
            error: "Internal server error"
        });
    }
};


export const createTransaction = async (req, res) => {
    try {
        const { 
            type, relatedId, amount, currency, date, 
            description, bank, blNumber, invoiceNumber, 
            weightInTons, packages 
        } = req.body;

        // التصحيح: استخدام || بدلاً من ?? للفحص السليم
        if (!amount || !type || !date) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const tx = await prisma.transaction.create({
            data: {
                type,
                description: description ?? "",
                amount: parseFloat(amount),
                currency: currency ?? "USD",
                date: new Date(date),
                relatedId: (relatedId === 'none' || !relatedId) ? null : String(relatedId),
                bank: bank ?? null,
                blNumber: blNumber ?? null,
                invoiceNumber: invoiceNumber ?? null,
                weightInTons: weightInTons ? parseFloat(weightInTons) : null,
                packages: packages ? parseInt(packages) : null,
            }
        });

        // تحويل الـ id والنواتج لنصوص لترضي كاش الـ store.ts
        return res.status(201).json({ ...tx, id: String(tx.id) });
    } catch (error) {
        console.error("❌ Create Error:", error);
        return res.status(500).json({ error: "Failed to create entry" });
    }
};


export const updateTransaction = async (req, res) => {
    try {
        const numericId = parseInt(req.params.id);
        const data = req.body;

        const existing = await prisma.transaction.findUnique({ where: { id: numericId } });
        if (!existing) return res.status(404).json({ error: "Transaction not found" });

        const updated = await prisma.transaction.update({
            where: { id: numericId },
            data: {
                type: data.type ?? undefined,
                description: data.description ?? undefined,
                amount: data.amount ? parseFloat(data.amount) : undefined,
                currency: data.currency ?? undefined,
                date: data.date ? new Date(data.date) : undefined,
                relatedId: data.relatedId === 'none' ? null : (data.relatedId ? String(data.relatedId) : undefined),
                
                bank: data.bank !== undefined ? data.bank : undefined,
                blNumber: data.blNumber !== undefined ? data.blNumber : undefined,
                invoiceNumber: data.invoiceNumber !== undefined ? data.invoiceNumber : undefined,
            }
        });

        return res.status(200).json(updated);
    } catch (error) {
        console.error("❌ Update Error:", error);
        return res.status(400).json({ error: "Update failed" });
    }
};



export const deleteTransaction = async (req, res) => {
    try {
        const numericId = parseInt(req.params.id);
        
        // حذف مباشر بـ deleteMany عشان ميرميش Error لو الـ ID مش موجود
        const result = await prisma.transaction.deleteMany({
            where: { id: numericId }
        });

        if (result.count === 0) {
            return res.status(404).json({ error: "Record not found" });
        }

        return res.status(200).json({ success: true, message: "Deleted" });
    } catch (error) {
        return res.status(500).json({ error: "Server error" });
    }
};