import { prisma } from '../lib/prisma.js';

// دالة مساعدة لتوحيد الـ ID وإضافة الحقول الافتراضية لمنع أي نقص في البيانات بالفرونت إند
const normalizeClient = (client) => {
  if (!client) return null;
  return {
    ...client,
    id: String(client.id),
    operationsCount: client.operationsCount !== undefined ? client.operationsCount : (Array.isArray(client.jobs) ? client.jobs.length : 0),
    operationsValue: client.operationsValue !== undefined ? client.operationsValue : 0,
    remainingBalance: client.remainingBalance !== undefined ? client.remainingBalance : 0,
    jobs: Array.isArray(client.jobs) ? client.jobs : [],
    transactions: Array.isArray(client.transactions) ? client.transactions : []
  };
};

// 1. جلب كل العملاء مع تأمين الحسابات والعلاقات
export const getAllClients = async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      include: {
        jobs: {
          include: {
            products: true
          }
        },
        transactions: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formatted = clients.map(client => {
      let operationsValue = 0;
      let remainingBalance = 0;

      // حسابات الـ jobs
      if (client.jobs && Array.isArray(client.jobs)) {
        client.jobs.forEach(job => {
          const totalPrice = Number(job.totalPrice || 0);
          const discountPercentage = Number(job.discountPercentage || 0);
          const total = totalPrice - (totalPrice * discountPercentage) / 100;

          operationsValue += total;
          remainingBalance += total;
        });
      }

      // حسابات الـ transactions
      if (client.transactions && Array.isArray(client.transactions)) {
        client.transactions.forEach(tx => {
          if (tx.type === 'incoming') {
            remainingBalance -= Number(tx.amount || 0);
          }
        });
      }

      return {
        ...client,
        id: String(client.id),
        operationsCount: Array.isArray(client.jobs) ? client.jobs.length : 0,
        operationsValue: operationsValue || 0,
        remainingBalance: remainingBalance || 0,
        jobs: Array.isArray(client.jobs) ? client.jobs : [],
        transactions: Array.isArray(client.transactions) ? client.transactions : []
      };
    });

    return res.json(formatted);

  } catch (error) {
    console.error("🚨 CRITICAL ERROR IN GET_ALL_CLIENTS:", error);
    
    // الخطة البديلة (Fallback): لو الـ Include فشلت، بنرجع البيانات الأساسية حاف بدل الشاشة البيضاء
    try {
      const fallbackClients = await prisma.client.findMany({
        orderBy: { createdAt: 'desc' }
      });
      const safeFallback = fallbackClients.map(c => normalizeClient(c));
      return res.json(safeFallback);
    } catch (fallbackError) {
      return res.status(500).json({ error: 'Failed to fetch clients entirely' });
    }
  }
};

// 2. إضافة عميل جديد مع ربطه بالمستخدم الحالي فوراً
export const createClient = async (req, res) => {
    try {
        const data = req.body;

        if (!data.name || data.name.trim() === "") {
            return res.status(400).json({ error: "Client name is required" });
        }

        // 🔥 جدار حماية: ربط العميل بالمستخدم المسجل لمنع اختفائه بعد الريفريش
        // لو الـ auth middleware بيبعت الـ user في الـ req، بنجيبه. لو مش موجود بنسيبها اختياري
        const currentUserId = req.user?.id ? Number(req.user.id) : undefined;

        const newClient = await prisma.client.create({
            data: {
                name: data.name,
                country: data.country || null,
                company: data.company || null,
                email: data.email?.toLowerCase() || null,
                phone: data.phone || null,
                telephone: data.telephone || null,
                fax: data.fax || null,
                contact: data.contact || null,
                address: data.address || null,
                vat: data.vat || null,
                agentName: data.agentName || null,
                dhl: data.dhl || null,
                balance: parseFloat(data.balance) || 0,
                // إذا كان جدول العملاء في نيون يتطلب userId لربطه بالحساب المسجل:
                ...(currentUserId && { userId: currentUserId }) 
            }
        });

        res.status(201).json(normalizeClient(newClient));
    } catch (error) {
        console.error("Create Client Error:", error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: "A client with this email already exists" });
        }
        res.status(400).json({ error: "Failed to create client record" });
    }
};

// 3. تحديث بيانات عميل
export const updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const updated = await prisma.client.update({
            where: { id: Number(id) },
            data: {
                name: data.name,
                country: data.country,
                company: data.company,
                email: data.email,
                phone: data.phone,
                telephone: data.telephone,
                fax: data.fax,
                contact: data.contact,
                address: data.address,
                vat: data.vat,
                agentName: data.agentName,
                dhl: data.dhl,
                balance: data.balance !== undefined ? parseFloat(data.balance) : undefined
            }
        });

        res.json({
            message: "Client updated successfully",
            client: normalizeClient(updated)
        });
    } catch (error) {
        console.error("Update Client Error:", error);
        res.status(400).json({ error: "Failed to update client info" });
    }
};

// 4. تفاصيل عميل محدد
export const getClientDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const client = await prisma.client.findUnique({
            where: { id: Number(id) },
            include: {
                jobs: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        });

        if (!client) return res.status(404).json({ error: "Client not found" });
        res.json(normalizeClient(client));
    } catch (error) {
        res.status(500).json({ error: "Error fetching client details" });
    }
};

// 5. حذف عميل
export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({ where: { id: Number(id) } });
    if (!client) {
        return res.status(404).json({ error: "العميل غير موجود بالفعل" });
    }

    const jobsCount = await prisma.job.count({ where: { clientId: Number(id) } });
    if (jobsCount > 0) {
      return res.status(400).json({ error: "لا يمكن الحذف: العميل مرتبط بعمليات قائمة" });
    }

    await prisma.client.delete({ where: { id: Number(id) } });

    return res.status(200).json({ success: true, id: String(id) }); 
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء محاولة الحذف' });
  }
};