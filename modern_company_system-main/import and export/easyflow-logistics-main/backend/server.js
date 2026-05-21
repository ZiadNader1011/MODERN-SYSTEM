import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import compression from 'compression';
import morgan from 'morgan';

// حل مشكلة الـ BigInt الافتراضية
BigInt.prototype.toJSON = function() { return Number(this) };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// استيراد الـ Routes
import archiveRoutes from './routes/archiveRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import productRoutes from './routes/productRoutes.js';
import containerRoutes from './routes/containerRoutes.js';
import packingListRoutes from './routes/packingListRoutes.js';
import shippingAgentRoutes from './routes/shippingAgentRoutes.js';
import shippingAgentRecordRoutes from './routes/shippingAgentRecordRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import commissionRoutes from './routes/commissionRoutes.js';
import operationRoutes from './routes/operationRoutes.js';
import financialRoutes from './routes/financialRoutes.js';
import authRoutes from './routes/authRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import bankRoutes from './routes/bankRoutes.js';

const app = express();

// 1. إعداد مجلد الرفع بمسار مطلق مستقر للـ Cloud
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: uploadDir,
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } 
});

// 2. Middlewares الأساسية (CORS إعدادات متوافقة مع Render و Vercel)
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));
app.use(morgan('dev'));
app.use(compression());
app.use(express.static('public'));

// ============================================================================
// 🔥 الـ Middleware السحري المركزي الشامل لتوحيد وتأمين البيانات لكل الصفحات 🔥
// ============================================================================
app.use((req, res, next) => {
    const originalJson = res.json;

    res.json = function (data) {
        
        function transform(obj) {
            if (obj === null || obj === undefined) return obj;

            // 1. إذا كانت البيانات مصفوفة (Array)
            if (Array.isArray(obj)) {
                return obj.map(transform);
            }

            // 2. إذا كانت البيانات كائن (Object)
            if (typeof obj === 'object') {
                
                // 🅰️ تأمين المعرف (ID) لجميع الكائنات بلا استثناء
                if ('id' in obj && obj.id !== null && obj.id !== undefined) {
                    obj.id = String(obj.id);
                } else if ('_id' in obj && obj._id !== null && obj._id !== undefined) {
                    obj.id = String(obj._id);
                }

                // 🅱️ تأمين حقول الصفحات (تعويض الحقول الإجبارية في الفرونت إند لمنع الاختفاء والانهيار)
                
                // تأمين العميل والـ Grid الخاص به
                if ('address' in obj || 'agentName' in obj || 'vat' in obj) { 
                    if (!('country' in obj)) obj.country = obj.address || "—";
                    if (!('contact' in obj)) obj.contact = obj.agentName || "—";
                    if (!('email' in obj)) obj.email = "—";
                }

                // تأمين الموردين (Suppliers)
                if ('contact' in obj && !('country' in obj) && !('address' in obj)) {
                    obj.country = "—";
                }
                if (('name' in obj || 'country' in obj) && !('contact' in obj) && !('address' in obj)) {
                    obj.contact = "—";
                    obj.email = "—";
                }

                // تأمين الموظفين (Employees)
                if ('jobTitle' in obj || 'phone' in obj) {
                    if (!('phone' in obj)) obj.phone = "—";
                    if (!('jobTitle' in obj)) obj.jobTitle = "—";
                }

                // تأمين العمليات والوظائف (Jobs & Operations)
                if ('operationType' in obj || 'jobId' in obj) {
                    if (!('title' in obj)) obj.title = obj.product || "Operation";
                    if (!('currency' in obj)) obj.currency = "USD";
                    if (!('status' in obj)) obj.status = "active";
                    if (!('notes' in obj)) obj.notes = "";
                }

                // تأمين المنتجات (Products)
                if ('category' in obj && !('supplierId' in obj)) {
                    obj.supplierId = "";
                }

                // 🆃 تأمين علاقات المصفوفات الدائرية لمنع الـ undefined والـ null
                const relationFields = [
                    'jobs', 'transactions', 'products', 'attachments', 
                    'containerNumbers', 'supplierIds', 'repNames', 'attachments'
                ];
                relationFields.forEach(field => {
                    if (field in obj && (obj[field] === null || obj[field] === undefined)) {
                        obj[field] = [];
                    }
                });

                // دمج وتفتيش باقي الخصائص العميقة داخل الكائن (Deep Scan)
                for (const key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        obj[key] = transform(obj[key]);
                    }
                }
            }
            return obj;
        }

        // تطبيق الفلتر قبل الإرسال النهائي للفرونت إند
        if (data) {
            data = transform(data);
        }

        return originalJson.call(this, data);
    };

    next();
});
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        
        // 1. تأمين حقول العميل الرقمية لتتوافق مع double precision في نيون
        if (req.url.includes('/api/clients') && req.method === 'POST') {
            req.body.operationsCount = req.body.operationsCount !== undefined && req.body.operationsCount !== null ? Number(req.body.operationsCount) : 0;
            req.body.operationsValue = req.body.operationsValue !== undefined && req.body.operationsValue !== null ? Number(req.body.operationsValue) : 0;
            req.body.remainingBalance = req.body.remainingBalance !== undefined && req.body.remainingBalance !== null ? Number(req.body.remainingBalance) : 0;
            
            if (!req.body.balance || isNaN(Number(req.body.balance))) {
                req.body.balance = 0;
            } else {
                req.body.balance = Number(req.body.balance);
            }

            // تعويض الحقول النصية الفارغة لتفادي قيود الـ NOT NULL في الـ Database
            if (!req.body.country || req.body.country.trim() === "") req.body.country = req.body.address || "—";
            if (!req.body.contact || req.body.contact.trim() === "") req.body.contact = req.body.agentName || "—";
            if (!req.body.email || req.body.email.trim() === "") req.body.email = "—";
        }
    }
    next();
});
// ============================================================================

// 3. استخدام الـ Routes
app.use('/api/suppliers', supplierRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/products', productRoutes);
app.use('/api/containers', containerRoutes); 
app.use('/api/packing-lists', packingListRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/shipping-agents', shippingAgentRoutes); 
app.use('/api/shipping-agent-records', shippingAgentRecordRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/operations', operationRoutes);
app.use('/api/transactions', financialRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/payments', paymentRoutes);

// 4. مسار الرفع المباشر
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

app.get('/', (req, res) => {
    res.send("EasyFlow Logistics Backend is Running! 🚀");
});

// التعامل المركزي مع الأخطاء
app.use((err, req, res, next) => {
    console.error("🚨 Error Logged:", err.stack);

    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || "حدث خطأ داخلي في السيرفر",
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

// 5. تشغيل السيرفر (تعديل الـ PORT الإجباري للـ Cloud)
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running perfectly on port ${PORT} 🚀`);
});

export default app;