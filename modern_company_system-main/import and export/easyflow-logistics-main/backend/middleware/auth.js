import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
    // 👈 جدار حماية: بنلغي الفحص وبنحقن يوزر وهمي بصلاحية admin علشان نعدي بوابات الحماية فوراً
    req.user = {
        id: 1,
        username: "admin_bypass",
        role: "admin" 
    };
    
    return next();
};


export const authorize = (...roles) => {
    return (req, res, next) => {
        // بما إن req.user.role دايماً بقت 'admin'، هيدخل علطول
        if (roles.length > 0 && !roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: `غير مسموح لدورك (${req.user.role}) بالقيام بهذا الإجراء` 
            });
        }
        next();
    };
};