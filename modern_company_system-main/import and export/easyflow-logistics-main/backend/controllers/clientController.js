import { prisma } from '../lib/prisma.js';

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

      client.jobs.forEach(job => {
        const total =
          Number(job.totalPrice || 0) -
          (Number(job.totalPrice || 0) *
            Number(job.discountPercentage || 0)) /
            100;

        operationsValue += total;
        remainingBalance += total;
      });

      client.transactions.forEach(tx => {
        if (tx.type === 'incoming') {
          remainingBalance -= Number(tx.amount || 0);
        }
      });

      return {
        ...client,
        operationsCount: client.jobs.length,
        operationsValue,
        remainingBalance
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Failed to fetch clients'
    });
  }
};

// 2. إضافة عميل جديد مع التحقق من عدم التكرار
export const createClient = async (req, res) => {
    try {
        const data = req.body;

        // التحقق من الاسم (Validation بسيط)
        if (!data.name || data.name.trim() === "") {
            return res.status(400).json({ error: "Client name is required" });
        }

        const newClient = await prisma.client.create({
            data: {
                name: data.name,
                country: data.country || null,
                company: data.company || null,
                email: data.email?.toLowerCase() || null, // توحيد حالة الإيميل
                phone: data.phone || null,
                telephone: data.telephone || null,
                fax: data.fax || null,
                contact: data.contact || null,
                address: data.address || null,
                vat: data.vat || null,
                agentName: data.agentName || null,
                dhl: data.dhl || null,
                balance: parseFloat(data.balance) || 0
            }
        });

        res.status(201).json(newClient);
    } catch (error) {
        console.error("Create Client Error:", error);
        // التعامل مع خطأ تكرار الإيميل (Unique Constraint)
        if (error.code === 'P2002') {
            return res.status(400).json({ error: "A client with this email already exists" });
        }
        res.status(400).json({ error: "Failed to create client record" });
    }
};

export const updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        // التصحيح وجدار الحماية: استخلاص الحقول الحقيقية المتواجدة في موديل بريسما فقط
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
            client: { ...updated, id: String(updated.id) }
        });
    } catch (error) {
        console.error("Update Client Error:", error);
        res.status(400).json({ error: "Failed to update client info" });
    }
};

// 4. جلب تفاصيل عميل واحد (لمشاهدة بروفايل العميل)
export const getClientDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const client = await prisma.client.findUnique({
            where: { id: Number(id) },
            include: {
                jobs: {
                    orderBy: { createdAt: 'desc' },
                    take: 10 // جلب آخر 10 وظائف للعميل ده
                }
            }
        });

        if (!client) return res.status(404).json({ error: "Client not found" });
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: "Error fetching client details" });
    }
};

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


    return res.status(200).json({ success: true, id: id }); 
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء محاولة الحذف' });
  }
};