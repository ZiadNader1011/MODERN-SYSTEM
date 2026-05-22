import express from 'express';
import { prisma } from '../lib/prisma.js';
import { employeeSchema, validate } from '../middleware/validator.js';


const router = express.Router();

router.get('/',  async (req, res) => {
    try {
        const employees = await prisma.employee.findMany({
            orderBy: { id: 'desc' }
        });
        return res.json(employees);
    } catch (error) {
        console.error("Error fetching employees:", error);
        return res.status(500).json({ error: "فشل في جلب قائمة الموظفين" });
    }
});

/**
 * --- 2. إضافة موظف جديد (POST) ---
 * الترتيب: 1. حماية -> 2. فحص بيانات -> 3. تنفيذ
 */
router.post('/',  validate(employeeSchema), async (req, res) => {
    try {
        const { name, phone, jobTitle } = req.body;
        
        const newEmployee = await prisma.employee.create({
            data: {
                name: name,
                phone: phone || null,
                jobTitle: jobTitle || null
            }
        });
        return res.status(201).json(newEmployee);
    } catch (error) {
        console.error("Error creating employee:", error);
        return res.status(500).json({ error: "حدث خطأ أثناء إضافة الموظف" });
    }
});

/**
 * --- 3. تحديث بيانات موظف (PUT) ---
 */
router.put('/:id', validate(employeeSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, jobTitle } = req.body;

        const numericId = parseInt(id);
        if (isNaN(numericId)) {
            return res.status(400).json({ error: "معرف الموظف غير صحيح" });
        }

        const updatedEmployee = await prisma.employee.update({
            where: { id: numericId },
            data: {
                name: name,
                phone: phone,
                jobTitle: jobTitle
            }
        });
        return res.json(updatedEmployee);
    } catch (error) {
        console.error("Error updating employee:", error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: "الموظف غير موجود" });
        }
        return res.status(400).json({ error: "فشل في تحديث بيانات الموظف" });
    }
});

/**
 * --- 4. حذف موظف (DELETE) ---
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const numericId = parseInt(id);

        if (isNaN(numericId)) {
            return res.status(400).json({ error: "معرف الموظف غير صحيح" });
        }

        await prisma.employee.delete({
            where: { id: numericId }
        });
        return res.json({ success: true, message: "تم حذف الموظف بنجاح" });
    } catch (error) {
        console.error("Error deleting employee:", error);
        return res.status(400).json({ error: "فشل في حذف الموظف، قد يكون غير موجود" });
    }
});

export default router;