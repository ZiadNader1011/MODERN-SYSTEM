import { prisma } from '../lib/prisma.js';

export const getAgents = async (req, res) => {
  try {
    const agents = await prisma.shippingAgent.findMany({ orderBy: { id: 'desc' } });
    const formatted = agents.map(a => ({ ...a, id: String(a.id) }));
    return res.status(200).json(formatted);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch agents" });
  }
};

export const createAgent = async (req, res) => {
  try {
    // 1. فك البيانات القادمة من الطلب
    const { id, ...data } = req.body; 

    if (!data.name) {
      return res.status(400).json({ error: "اسم وكيل الشحن مطلوب" });
    }

    // 2. حساب المعرف التلقائي التالي
    const lastAgent = await prisma.shippingAgent.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true }
    });
    const nextId = lastAgent ? lastAgent.id + 1 : 1;

    // 3. تجهيز مسار الملف
    let fileUrl = null;
    if (req.file) {
      fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    } else if (data.attachmentUrl && !data.attachmentUrl.startsWith('data:')) {
      fileUrl = data.attachmentUrl;
    }

    // 4. معالجة البريد الإلكتروني (إذا كان فارغاً تماماً لا نرسله كنص فارغ لتجنب مشاكل القيد الفريد)
    const agentEmail = data.email && data.email.trim() !== "" ? data.email.trim() : null;

    // 5. الإنشاء في قاعدة البيانات
    const newAgent = await prisma.shippingAgent.create({
      data: {
        id: nextId,
        name: data.name,
        company: data.company || null, 
        address: data.address || null,
        telephone: data.telephone || null,
        personalNumber: data.personalNumber || null,
        email: agentEmail,
        attachmentUrl: fileUrl
      }
    });

    return res.status(201).json({ ...newAgent, id: String(newAgent.id) });
  } catch (error) {
    console.error("🚨 CRITICAL ERROR IN CREATE_AGENT:", error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "البريد الإلكتروني أو المعرّف موجود بالفعل!" });
    }
    return res.status(500).json({ error: "حدث خطأ أثناء مزامنة البيانات وحفظها في قاعدة البيانات السحابية" });
  }
};

export const updateAgent = async (req, res) => {
  try {
    const numericId = parseInt(req.params.id);
    const idToCheck = isNaN(numericId) ? 0 : numericId;

    // 1️⃣ عزل الـ id القادم في الـ body لمنع تضارب الأنواع (String vs Int) مع Prisma
    const { id, ...bodyData } = req.body;

    // التحقق من وجود السجل أولاً
    const existing = await prisma.shippingAgent.findUnique({ where: { id: idToCheck } });
    if (!existing) return res.status(404).json({ error: "الوكيل غير موجود!" });

    // 2️⃣ معالجة مسار الملف المرفوع أو الرابط السحابي القادم من سوبابيز
    let fileUrl = existing.attachmentUrl;
    if (req.file) {
      fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    } else if (bodyData.attachmentUrl === 'null' || bodyData.attachmentUrl === null || bodyData.attachmentUrl === '') {
      fileUrl = null;
    } else if (bodyData.attachmentUrl) {
      fileUrl = bodyData.attachmentUrl;
    }

    // 3️⃣ معالجة الإيميل لمنع تكرار النصوص الفارغة وتحقيق شروط Unique Constraint
    let agentEmail = undefined; // تعني لا تعدل الحقل إذا لم يرسل في الطلب
    if (bodyData.email !== undefined) {
      agentEmail = bodyData.email && bodyData.email.trim() !== "" ? bodyData.email.trim() : null;
    }

    // 4️⃣ تحديث البيانات في قاعدة البيانات بأمان
    const updated = await prisma.shippingAgent.update({
      where: { id: idToCheck },
      data: {
        name: bodyData.name !== undefined ? bodyData.name.trim() : undefined,
        company: bodyData.company !== undefined ? (bodyData.company.trim() || null) : undefined,
        address: bodyData.address !== undefined ? (bodyData.address.trim() || null) : undefined,
        telephone: bodyData.telephone !== undefined ? (bodyData.telephone.trim() || null) : undefined,
        personalNumber: bodyData.personalNumber !== undefined ? (bodyData.personalNumber.trim() || null) : undefined,
        email: agentEmail,
        attachmentUrl: fileUrl
      }
    });

    // إرجاع النتيجة مع تحويل المعرف لنص ليتوافق مع الحالات بالفرونت إند
    return res.status(200).json({ ...updated, id: String(updated.id) });

  } catch (error) {
    console.error("🚨 ERROR IN UPDATE_AGENT:", error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "البريد الإلكتروني مستخدم بالفعل مع وكيل آخر!" });
    }
    return res.status(400).json({ error: "فشل التحديث: " + error.message });
  }
};

// 🌟 تعديل دالة الحذف لتصفير أي ربط متعلق بالوكيل لمنع أخطاء الـ Database القيودية
export const deleteAgent = async (req, res) => {
    try {
        const numericId = parseInt(req.params.id);
        const agentId = isNaN(numericId) ? 0 : numericId;

        // تصفير معرف الوكيل في الجداول المرتبطة إن وجدت لفك الارتباط قبل الحذف الحقيقي
        // مثال: await prisma.operation.updateMany({ where: { shippingAgentId: agentId }, data: { shippingAgentId: null } });

        await prisma.shippingAgent.deleteMany({ where: { id: agentId } });
        return res.status(200).json({ success: true, message: "Action completed" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server Error" });
    }
};