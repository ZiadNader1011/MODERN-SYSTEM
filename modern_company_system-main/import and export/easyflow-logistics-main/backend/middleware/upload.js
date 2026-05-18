import multer from 'multer';
import path from 'path';
import fs from 'fs';

// التأكد من وجود مجلد التحميلات عشان السيرفر ميعلقش
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// إعدادات التخزين
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // حفظ الملفات في مجلد uploads
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