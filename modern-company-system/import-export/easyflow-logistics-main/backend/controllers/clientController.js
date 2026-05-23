import { prisma } from '../lib/prisma.js';

// دالة مساعدة موحدة ومحسنة لتوحيد الـ ID والحسابات لمنع أي نقص في البيانات بالفرونت إند
const normalizeClient = (client) => {
  if (!client) return null;

  let operationsValue = 0;
  let remainingBalance = 0;

  // 1. حساب العمليات بشكل آمن وديناميكي إذا كانت العلاقات موجودة
  if (client.jobs && Array.isArray(client.jobs)) {
    client.jobs.forEach(job => {
      const totalPrice = Number(job.totalPrice || 0);
      const discountPercentage = Number(job.discountPercentage || 0);
      const total = totalPrice - (totalPrice * discountPercentage) / 100;
      operationsValue += total;
      remainingBalance += total;
    });
  }

  // 2. خصم الحركات المالية الواردة
  if (client.transactions && Array.isArray(client.transactions)) {
    client.transactions.forEach(tx => {
      if (tx.type === 'incoming') {
        remainingBalance -= Number(tx.amount || 0);
      }
    });
  }

  return {
    id: String(client.id),
    name: client.name || "",
    country: client.country || "—",
    company: client.company || "—",
    email: client.email || "—",
    phone: client.phone || "—",
    telephone: client.telephone || "—",
    fax: client.fax || "—",
    contact: client.contact || "—",
    address: client.address || "—",
    vat: client.vat || "—",
    agentName: client.agentName || "—",
    dhl: client.dhl || "—",
    operationsCount: Array.isArray(client.jobs) ? client.jobs.length : Number(client.operationsCount || 0),
    operationsValue: operationsValue || Number(client.operationsValue || 0),
    remainingBalance: remainingBalance || Number(client.remainingBalance || 0),
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

    const formatted = clients.map(client => normalizeClient(client));
    return res.json(formatted);

  } catch (error) {
    console.error("🚨 CRITICAL ERROR IN GET_ALL_CLIENTS:", error);
    
    try {
      // Fallback سريعة لحماية الواجهة في حال فشل الـ Join المعقد
      const fallbackClients = await prisma.client.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return res.json(fallbackClients.map(c => normalizeClient(c)));
    } catch (fallbackError) {
      return res.status(500).json({ error: 'Failed to fetch clients entirely' });
    }
  }
};

// 2. إنشاء عميل جديد أو التحديث التلقائي الذكي لمنع التكرار
// 2. إنشاء عميل جديد تماماً (تم إزالة الـ Auto-Update المتداخل مع الحذف)
export const createClient = async (req, res) => {
  try {
    const data = req.body;

    if (!data.name || String(data.name).trim() === "") {
      return res.status(400).json({ error: "اسم العميل مطلوب بشكل أساسي" });
    }

    const emailClean = data.email && data.email.trim() !== "" && data.email !== "—" ? data.email.toLowerCase().trim() : null;

    if (emailClean) {
      const existingClient = await prisma.client.findFirst({
        where: { email: emailClean }
      });

      if (existingClient) {
        return res.status(400).json({ error: "هذا البريد الإلكتروني مستخدم بالفعل من قبل عميل آخر" });
      }
    }

    const currentUserId = req.user?.id ? Number(req.user.id) : undefined;

    const newClient = await prisma.client.create({
      data: {
        name: data.name,
        country: data.country || null,
        company: data.company || null,
        email: emailClean,
        phone: data.phone || null,
        telephone: data.telephone || null,
        fax: data.fax || null,
        contact: data.contact || null,
        address: data.address || null,
        vat: data.vat || null,
        agentName: data.agentName || null,
        dhl: data.dhl || null,
        ...(currentUserId && { userId: currentUserId }) 
      },
      include: { jobs: true, transactions: true }
    });

    return res.status(201).json(normalizeClient(newClient));
  } catch (error) {
    console.error("🚨 Create Client Error Catch:", error);
    return res.status(400).json({ error: "فشل في تسجيل بيانات العميل، برجاء مراجعة الحقول" });
  }
};
// 3. تحديث بيانات العميل بشكل مرن ومتوافق مع كاش الفرونت إند
export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const targetId = Number(id);
    if (isNaN(targetId)) {
      return res.status(400).json({ error: "معرف العميل غير صحيح" });
    }

    const emailClean = data.email && data.email.trim() !== "" && data.email !== "—" ? data.email.toLowerCase().trim() : null;

    if (emailClean) {
      const duplicateEmail = await prisma.client.findFirst({
        where: {
          email: emailClean,
          NOT: { id: targetId }
        }
      });
      if (duplicateEmail) {
        return res.status(400).json({ error: "البريد الإلكتروني مستخدم بالفعل من قبل عميل آخر" });
      }
    }

    // بناء حقول التحديث بذكاء تام وبدون تمرير حقول غير معرفة (undefined) تسبب كراش لـ Prisma
    const cleanUpdateData = {};
    const textFields = ['name', 'country', 'company', 'phone', 'telephone', 'fax', 'contact', 'address', 'vat', 'agentName', 'dhl'];
    
    textFields.forEach(field => {
      if (data[field] !== undefined) {
        cleanUpdateData[field] = data[field] === "—" || data[field] === "" ? null : data[field];
      }
    });

    if (data.email !== undefined) cleanUpdateData.email = emailClean;

    const updated = await prisma.client.update({
      where: { id: targetId },
      data: cleanUpdateData,
      include: { jobs: true, transactions: true } // تضمين دائم لضمان صحة حسابات المزامنة بالفرونت إند
    });

    // سيعود الكائن المحدث مباشرة لتحديث كاش الجدول فوراً وبدون التفاف حقول إضافية
    return res.status(200).json(normalizeClient(updated));
  } catch (error) {
    console.error("🚨 Update Client Error Logged:", error);
    return res.status(400).json({ error: "تعذر تحديث بيانات العميل لوجود تعارض في البيانات" });
  }
};

// 4. تفاصيل عميل محدد
export const getClientDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const targetId = Number(id);
    
    if (isNaN(targetId)) {
      return res.status(400).json({ error: "Invalid client ID" });
    }

    const client = await prisma.client.findUnique({
      where: { id: targetId },
      include: {
        jobs: { orderBy: { createdAt: 'desc' } },
        transactions: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!client) return res.status(404).json({ error: "العميل غير موجود" });
    return res.json(normalizeClient(client));
  } catch (error) {
    return res.status(500).json({ error: "حدث خطأ أثناء جلب تفاصيل العميل" });
  }
};

// 5. دالة الحذف النهائية المصححة والمطابقة للـ Schema الخاصة بك
export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const targetId = Number(String(id).trim());

    if (isNaN(targetId)) {
        return res.status(400).json({ error: "معرف العميل غير صحيح أو صيغته غير مدعومة بالسيرفر" });
    }

    const client = await prisma.client.findUnique({ where: { id: targetId } });
    if (!client) {
        return res.status(404).json({ error: "العميل غير موجود بالفعل في قاعدة البيانات أو تم حذفه مسبقاً" });
    }

    // 🔥 1. تنظيف الحركات المالية المرتبطة بالعميل يدوياً (بالاعتماد على clientId فقط)
    await prisma.transaction.deleteMany({ 
      where: { 
        clientId: targetId 
      } 
    });

    // 🔥 2. تنظيف العمليات المرتبطة بالعميل (Jobs)
    await prisma.job.deleteMany({ where: { clientId: targetId } });

    // 🚀 3. الآن احذف العميل نفسه بأمان تام بعد إزالة كل متعلقاته الصحيحة
    await prisma.client.delete({ where: { id: targetId } });

    return res.status(200).json({ 
      success: true, 
      message: "Client permanently deleted along with all relations", 
      id: String(targetId) 
    }); 

  } catch (error) {
    console.error("🚨 CRITICAL ERROR IN DELETE_CLIENT:", error);
    return res.status(500).json({ error: 'حدث خطأ غير متوقع بالخادم أثناء محاولة حذف العميل' });
  }
};