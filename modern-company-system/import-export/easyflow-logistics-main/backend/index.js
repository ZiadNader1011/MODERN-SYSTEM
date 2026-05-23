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
import os from 'os';

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

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

// إعداد مجلد الرفع للمحلي فقط (في الإنتاج نعتمد على Supabase)
let uploadDir = path.join(os.tmpdir(), 'uploads');
if (!isProduction) {
    uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

const allowedOrigins = [
    'https://modern-system-frontend-mdr0it2xr-ziad-s-projects6.vercel.app', 
    'https://modern-system-frontend.vercel.app', 
    'http://localhost:5173', 
    'http://localhost:3000',
    'http://localhost:8080'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || !isProduction) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.options('*', (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    return res.status(200).end();
});

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

if (!isProduction) {
    app.use('/uploads', express.static(uploadDir));
}
app.use(morgan('dev'));
app.use(compression());
app.use(express.static('public'));

// ============================================================================
// 🔥 1. الـ Middleware السحري المركزي (تمت إضافة حماية الدوران اللانهائي) 🔥
// ============================================================================
app.use((req, res, next) => {
    const originalJson = res.json;

    res.json = function (data) {
        // الـ Set دي عشان نراقب الكائنات اللي اتفحصت ومندخلش في Loop لانهائي
        const seen = new Set();
        
        function transform(obj) {
            if (obj === null || obj === undefined) return obj;

            if (Array.isArray(obj)) {
                return obj.map(transform);
            }

            if (typeof obj === 'object') {
                if (seen.has(obj)) return '[Circular]';
                seen.add(obj);
                
                if ('id' in obj && obj.id !== null && obj.id !== undefined) {
                    obj.id = String(obj.id);
                } else if ('_id' in obj && obj._id !== null && obj._id !== undefined) {
                    obj.id = String(obj._id);
                }

                if ('address' in obj || 'agentName' in obj || 'vat' in obj) { 
                    if (!('country' in obj)) obj.country = obj.address || "—";
                    if (!('contact' in obj)) obj.contact = obj.agentName || "—";
                    if (!('email' in obj)) obj.email = "—";
                }

                if ('contact' in obj && !('country' in obj) && !('address' in obj)) {
                    obj.country = "—";
                }
                if (('name' in obj || 'country' in obj) && !('contact' in obj) && !('address' in obj)) {
                    obj.contact = "—";
                    obj.email = "—";
                }

                if ('jobTitle' in obj || 'phone' in obj) {
                    if (!('phone' in obj)) obj.phone = "—";
                    if (!('jobTitle' in obj)) obj.jobTitle = "—";
                }

                if ('operationType' in obj || 'jobId' in obj) {
                    if (!('title' in obj)) obj.title = obj.product || "Operation";
                    if (!('currency' in obj)) obj.currency = "USD";
                    if (!('status' in obj)) obj.status = "active";
                    if (!('notes' in obj)) obj.notes = "";
                }

                if ('category' in obj && !('supplierId' in obj)) {
                    obj.supplierId = "";
                }

                const relationFields = [
                    'jobs', 'transactions', 'products', 'attachments', 
                    'containerNumbers', 'supplierIds', 'repNames'
                ];
                relationFields.forEach(field => {
                    if (field in obj && (obj[field] === null || obj[field] === undefined)) {
                        obj[field] = [];
                    }
                });

                for (const key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        obj[key] = transform(obj[key]);
                    }
                }
            }
            return obj;
        }

        if (data) { data = transform(data); }
        return originalJson.call(this, data);
    };

    next();
});

// ===================================================================================
// 🔥 2. الـ Middleware لتأمين الـ Request 🔥
// ===================================================================================
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        if (req.url.includes('/clients')) {
            req.body.operationsCount = req.body.operationsCount !== undefined && req.body.operationsCount !== null ? Number(req.body.operationsCount) : 0;
            req.body.operationsValue = req.body.operationsValue !== undefined && req.body.operationsValue !== null ? Number(req.body.operationsValue) : 0;
            req.body.remainingBalance = req.body.remainingBalance !== undefined && req.body.remainingBalance !== null ? Number(req.body.remainingBalance) : 0;
            
            if (!req.body.balance || isNaN(Number(req.body.balance))) {
                req.body.balance = 0;
            } else {
                req.body.balance = Number(req.body.balance);
            }

            if (!req.body.country || String(req.body.country).trim() === "" || req.body.country === "—") {
                req.body.country = req.body.address || "—";
            }
            if (!req.body.contact || String(req.body.contact).trim() === "" || req.body.contact === "—") {
                req.body.contact = req.body.agentName || "—";
            }
            if (!req.body.email || String(req.body.email).trim() === "" || req.body.email === "—") {
                req.body.email = "—";
            }

            if ('id' in req.body && req.body.id !== null && req.body.id !== undefined) {
                req.body.id = String(req.body.id);
            }
        }
    }
    next();
});

// 3. الـ Routes
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

app.get('/', (req, res) => {
    res.send("EasyFlow Logistics Backend is Running perfectly! 🚀");
});

// التعامل المركزي مع الأخطاء
app.use((err, req, res, next) => {
    console.error("🚨 Error Logged:", err.stack);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || "حدث خطأ داخلي في السيرفر",
        stack: isProduction ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;

if (!isProduction) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running perfectly on port ${PORT} 🚀`);
    });
}

export default app;