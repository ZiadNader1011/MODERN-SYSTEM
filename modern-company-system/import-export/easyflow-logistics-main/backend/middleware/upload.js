import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';

// 1. تحديد البيئة (هل إحنا على Vercel أو الـ Production؟)
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' || !process.env.PORT;
let uploadDir;

if (isProduction) {
    // في بيئة فيرسيل بنجبره يروح للمجلد المؤقت المسموح بالكتابة فيه
    uploadDir = path.join(os.tmpdir(), 'uploads');
} else {
    // محلياً عندك على الجهاز بيعمل الفولدر العادي طبيعي جداً
    uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
}

// إعدادات التخزين
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // حفظ الملفات في المجلد الآمن المتوافق مع البيئة
    },
    filename: function (req, file, cb) {
        // تسمية الملف بـ التاريخ + الاسم الأصلي لمنع التكرار
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Error: Images and PDFs Only!'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, 
    fileFilter: fileFilter
});

export default upload;