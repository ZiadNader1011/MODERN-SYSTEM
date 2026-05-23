import { prisma } from '../lib/prisma.js';

export const getAllContainers = async (req, res) => {
    try {
        const containers = await prisma.container.findMany({
            include: {
                products: { include: { product: true } },
                attachments: true
            },
            orderBy: { createdAt: 'desc' }
        });
        const formatted = containers.map(c => ({
            ...c,
            id: String(c.id),
            products: (c.products || []).map(p => ({ ...p, productId: String(p.productId) }))
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch containers" });
    }
};

export const createContainer = async (req, res) => {
    try {
        const data = req.body;
        if (!data.containerNumber) return res.status(400).json({ error: "Container number is required" });

        const newContainer = await prisma.container.create({
            data: {
                containerNumber: data.containerNumber,
                sourcePort: data.sourcePort || null,
                destinationPort: data.destinationPort || null,
                shippingDate: data.shippingDate ? new Date(data.shippingDate) : null,
                arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : null,
                status: data.status || 'loading',
                products: {
                    create: (data.products || [])
                        .filter(p => p.productId && !isNaN(parseInt(p.productId))) 
                        .map(p => ({
                            productId: parseInt(p.productId),
                            quantity: parseFloat(p.quantity) || 0,
                            unit: p.unit || "KG",
                            packages: parseInt(p.packages) || 0,
                            netWeight: parseFloat(p.netWeight) || 0,
                            grossWeight: parseFloat(p.grossWeight) || 0,
                            packageType: p.packageType || null
                        }))
                },
                attachments: {
                    create: (data.attachments || []).map(a => ({
                        url: a.url,
                        description: a.description || ''
                    }))
                }
            },
            include: { products: { include: { product: true } }, attachments: true }
        });
        res.status(201).json({ ...newContainer, id: String(newContainer.id) });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const updateContainer = async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    
    // 1. تحويل المعرف بشكل آمن وصارم وضمان عدم تمرير حقول تالفة
    const numericId = parseInt(String(id).trim(), 10);

    if (isNaN(numericId)) {
        return res.status(400).json({ error: "معرف الحاوية غير صحيح أو تالف من الواجهة" });
    }

    try {
        // 2. التحقق من وجود الحاوية في قاعدة البيانات قبل المباشرة بالمسح والتحديث
        const existingContainer = await prisma.container.findUnique({
            where: { id: numericId }
        });

        if (!existingContainer) {
            return res.status(404).json({ error: "الحاوية المطلوبة غير موجودة في قاعدة البيانات" });
        }

        // 3. تنفيذ العمليات المترابطة داخل عملية موحدة (Transaction) لضمان سلامة البيانات
        const result = await prisma.$transaction(async (tx) => {
            // مسح المنتجات والملحقات القديمة المرتبطة بهذه الحاوية تحديداً
            await tx.containerProduct.deleteMany({ where: { containerId: numericId } });
            await tx.attachment.deleteMany({ where: { containerId: numericId } });

            // إجراء التحديث الشامل لبيانات الحاوية مع إعادة بناء العلاقات من جديد
            return await tx.container.update({
                where: { id: numericId },
                data: {
                    containerNumber: data.containerNumber,
                    sourcePort: data.sourcePort || null,
                    destinationPort: data.destinationPort || null,
                    shippingDate: data.shippingDate ? new Date(data.shippingDate) : null,
                    arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : null,
                    status: data.status || 'loading',
                    products: {
                        create: (Array.isArray(data.products) ? data.products : [])
                            .filter(p => p.productId && !isNaN(Number(p.productId)))
                            .map(p => ({
                                productId: Number(p.productId),
                                quantity: Number(p.quantity) || 0,
                                unit: p.unit || "KG",
                                packages: Number(p.packages) || 0,
                                netWeight: Number(p.netWeight) || 0,
                                grossWeight: Number(p.grossWeight) || 0,
                                packageType: p.packageType || null
                            }))
                    },
                    attachments: {
                        create: (Array.isArray(data.attachments) ? data.attachments : [])
                            .map(a => ({
                                url: a.url,
                                description: a.description || ''
                            }))
                    }
                },
                include: { 
                    products: { include: { product: true } }, 
                    attachments: true 
                }
            });
        });

        // 4. إرجاع البيانات وتوحيد صيغة الـ ID كـ String لتتوافق تماماً مع كاش الفرونت إند
        return res.json({ 
            ...result, 
            id: String(result.id),
            products: (result.products || []).map(p => ({ ...p, productId: String(p.productId) }))
        });

    } catch (error) {
        console.error("🚨 CONTAINER UPDATE CRITICAL ERROR:", error);
        return res.status(400).json({ error: "حدث خطأ أثناء مزامنة البيانات وحفظها في قاعدة البيانات السحابية" });
    }
};

export const deleteContainer = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.container.deleteMany({ where: { id: Number(id) } });
        res.json({ message: "Container deleted successfully" });
    } catch (error) {
        res.status(400).json({ error: "Failed to delete container" });
    }
};