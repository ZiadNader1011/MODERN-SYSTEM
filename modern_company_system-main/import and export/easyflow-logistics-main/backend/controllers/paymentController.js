import { prisma } from '../lib/prisma.js';

// 1. جلب كل المدفوعات
export const getAllPayments = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    // تحويل الـ id لنص عشان يتطابق مع الـ store.ts في الفرونت إند
    const formatted = payments.map(p => ({
      ...p,
      id: String(p.id)
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error("❌ Fetch Payments Error:", error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

// 2. إضافة مدفوعة جديدة
export const createPayment = async (req, res) => {
  try {
    const data = req.body;

    const newPayment = await prisma.payment.create({
      data: {
        amount: parseFloat(data.amount) || 0,
        currency: data.currency || 'USD',
        date: data.date ? new Date(data.date) : new Date(),
        description: data.description || '',
        // ربط العلاقات لو مبعوتة (حسب الـ Schema بتاعتك)
        supplierId: data.supplierId ? Number(data.supplierId) : null,
        clientId: data.clientId ? Number(data.clientId) : null,
        jobId: data.jobId ? Number(data.jobId) : null,
      }
    });

    res.status(201).json({ ...newPayment, id: String(newPayment.id) });
  } catch (error) {
    console.error("❌ Create Payment Error:", error);
    res.status(400).json({ error: 'Failed to create payment record' });
  }
};

// 3. حذف مدفوعة
export const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.payment.delete({
      where: { id: Number(id) }
    });

    res.json({ success: true, message: "Payment deleted successfully" });
  } catch (error) {
    console.error("❌ Delete Payment Error:", error);
    res.status(400).json({ error: 'Failed to delete payment' });
  }
};