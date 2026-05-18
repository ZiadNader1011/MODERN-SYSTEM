import { prisma } from '../lib/prisma.js';

// 1️⃣ دالة جلب الأرصدة والحساب التراكمي (GET)
export const getBanksSummary = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { bank: { not: null, not: "" } }
    });

    const initialBalances = await prisma.bankBalance.findMany();

    const bankNames = new Set([
      ...transactions.map(t => t.bank.trim()),
      ...initialBalances.map(b => b.bankName.trim())
    ]);

    const finalResult = {};

    Array.from(bankNames).forEach(bankName => {
      finalResult[bankName] = {};
      const bankTxs = transactions.filter(t => t.bank?.trim() === bankName);

      // حساب أرصدة البداية
      initialBalances
        .filter(b => b.bankName === bankName)
        .forEach(b => {
          finalResult[bankName][b.currency] = (finalResult[bankName][b.currency] || 0) + b.amount;
        });

      // تصفية المعاملات الحية (Incoming / Outgoing)
      bankTxs.forEach(t => {
        const cur = t.currency || 'USD';
        if (!finalResult[bankName][cur]) finalResult[bankName][cur] = 0;
        
        if (t.type === 'incoming') {
          finalResult[bankName][cur] += Number(t.amount);
        } else {
          // أي عملية تانية (outgoing, petty_cash, raw_material) بتخصم من الحساب
          finalResult[bankName][cur] -= Number(t.amount);
        }
      });
    });

    res.json(finalResult);
  } catch (error) {
    console.error("❌ Bank Summary Get Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 2️⃣ دالة حفظ وتحديث أرصدة البداية من الفرونت إند (POST)
// 🚀 مأمنة بتحديث السجلات القديمة أو إنشاء سجلات جديدة (Upsert Mechanism)
export const saveBanksSummary = async (req, res) => {
  try {
    const incomingData = req.body; // بتستقبل الهيكل: { "Bank Name": { "USD": 5000 } }
    
    if (!incomingData || typeof incomingData !== 'object') {
      return res.status(400).json({ error: "Invalid bank data layout" });
    }

    // نفتح عملية جماعية (Transaction) لضمان حفظ كل البنوك مع بعض بسلام
    await prisma.$transaction(async (tx) => {
      for (const [bankName, currencies] of Object.entries(incomingData)) {
        for (const [currency, amount] of Object.entries(currencies)) {
          
          // البحث عن رصيد بداية موجود مسبقاً بنفس البنك والعملة
          const existing = await tx.bankBalance.findFirst({
            where: {
              bankName: bankName.trim(),
              currency: currency.trim()
            }
          });

          if (existing) {
            // لو موجود، بنحدث القيمة الجديدة الطازة
            await tx.bankBalance.update({
              where: { id: existing.id },
              data: { amount: Number(amount) || 0 }
            });
          } else {
            // لو مش موجود، بنكريت له سجل جديد
            await tx.bankBalance.create({
              data: {
                bankName: bankName.trim(),
                currency: currency.trim(),
                amount: Number(amount) || 0
              }
            });
          }
        }
      }
    });

    res.json({ success: true, message: "Bank initial balances synchronized successfully!" });
  } catch (error) {
    console.error("❌ Bank Summary Save Error:", error);
    res.status(500).json({ error: error.message });
  }
};