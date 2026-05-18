import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import compression from 'compression';


BigInt.prototype.toJSON = function() { return Number(this) };


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

import morgan from 'morgan';



const app = express();

// 1. إعداد مجلد الرفع
const uploadDir = './uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
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

// 2. Middlewares
app.use(cors({
    origin: '*', // أو حددي رابط الفرونت إند بتاعك لزيادة الأمان
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(morgan('dev'));
app.use(compression());
app.use(express.static('public'));

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

app.use((err, req, res, next) => {
    console.error("🚨 Error Logged:", err.stack); // بيطبع الخطأ بالتفصيل في السيرفر عندك

    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || "حدث خطأ داخلي في السيرفر",
        // الاختيار ده بيظهر تفاصيل الخطأ بس وانتي في مرحلة التطوير
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

// 5. تشغيل السيرفر
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} 🚀`);
});

export default app;