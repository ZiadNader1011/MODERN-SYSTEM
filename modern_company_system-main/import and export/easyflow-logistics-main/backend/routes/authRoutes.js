import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// --- تسجيل مستخدم جديد (Register) ---
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const user = await prisma.user.create({
            data: { username, password: hashedPassword }
        });
        res.status(201).json({ message: "تم إنشاء المستخدم بنجاح" });
    } catch (e) {
        res.status(400).json({ error: "اسم المستخدم موجود مسبقاً" });
    }
});

// --- تسجيل الدخول (Login) ---
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });

    if (user && (await bcrypt.compare(password, user.password))) {
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET || 'secret_key_123', 
            { expiresIn: '7d' }
        );
        res.json({ token, username: user.username, role: user.role });
    } else {
        res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    }
});
export const authorize = (...roles) => {
    return (req, res, next) => {
   
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: "صلاحياتك لا تسمح بالدخول لهذه الصفحة" 
            });
        }
        next();
    };
};

export default router;