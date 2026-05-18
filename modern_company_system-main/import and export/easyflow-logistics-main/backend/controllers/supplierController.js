import { prisma } from '../lib/prisma.js';


export const createSupplier = async (req, res) => {
    try {
        const { name, country, address, contact, email, phone, vat, product } = req.body;
        
        const newSupplier = await prisma.supplier.create({
            data: {
                name,
                country,
                address: address || null,
                contact: contact || null,
                email: email || null,
                phone: phone || null,
                vat: vat || null,
                product: product || null 
            }
        });
        res.status(201).json(newSupplier);
    } catch (error) {
        console.error("Create Error:", error.message);
        res.status(400).json({ error: error.message });
    }
};

export const updateSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        
        // إذا فشل التحويل لرقم (بسبب generateId)، نبحث عن المورد بالاسم أو نأخذ أول ID متوفر كـ Fallback
        let numericId = Number(id);
        if (isNaN(numericId)) {
            const found = await prisma.supplier.findFirst({ where: { name: data.name } });
            numericId = found ? found.id : 0;
        }

        const updated = await prisma.supplier.update({
            where: { id: numericId },
            data: {
                name: data.name,
                country: data.country,
                address: data.address,
                contact: data.contact,
                email: data.email,
                phone: data.phone,
                vat: data.vat,
                product: data.product 
            }
        });

        res.json({ ...updated, id: String(updated.id) });
    } catch (error) {
        res.status(400).json({ error: "Failed to update: " + error.message });
    }
};
export const getSuppliers = async (req, res) => {
    try {
        const suppliers = await prisma.supplier.findMany({
            include: {
                _count: {
                    select: { products: true } 
                }
            },
            orderBy: { name: 'asc' }
        });
        
        // تحويل الـ id إلى string لتوافق كاش الفرونت إند تماماً
        const formatted = suppliers.map(s => ({
            ...s,
            id: String(s.id)
        }));
        
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: "حدث خطأ أثناء جلب الموردين" });
    }
};
export const deleteSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const numericId = Number(id);

        
        const supplier = await prisma.supplier.findUnique({
            where: { id: numericId },
            include: {
                _count: { select: { products: true } }
            }
        });

        if (!supplier) {
            return res.status(404).json({ error: "المورد غير موجود بالفعل" });
        }

        if (supplier._count.products > 0) {
            return res.status(400).json({ 
                error: `لا يمكن حذف المورد "${supplier.name}" لوجود عدد (${supplier._count.products}) من المنتجات المرتبطة به. قم بحذف المنتجات أولاً.` 
            });
        }

        await prisma.supplier.delete({
            where: { id: numericId }
        });

        res.json({ message: "تم حذف المورد بنجاح" });
    } catch (error) {
        console.error("Delete Error:", error.message);
        res.status(500).json({ error: "حدث خطأ غير متوقع أثناء الحذف" });
    }
};