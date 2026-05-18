import Joi from 'joi';

// --- 1. عام (Generic Middleware) ---
export const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false }); // abortEarly: false بيطلع كل الأخطاء مرة واحدة
    if (error) {
        const errorMessage = error.details.map(detail => detail.message).join(', ');
        return res.status(400).json({ error: errorMessage });
    }
    next();
};

// --- 2. سكيما العميل (Client) ---
export const clientSchema = Joi.object({
    name: Joi.string().min(3).required(),
    email: Joi.string().email().allow('', null),
    country: Joi.string().allow('', null),
    company: Joi.string().allow('', null),
    phone: Joi.string().allow('', null),
    telephone: Joi.string().allow('', null),
    address: Joi.string().allow('', null),
    balance: Joi.number().default(0)
}).unknown(true); // unknown(true) بتسمح بوجود حقول إضافية دون منع الطلب

// --- 3. سكيما المورد (Supplier) ---
export const supplierSchema = Joi.object({
    name: Joi.string().required(),
    country: Joi.string().required(),
    email: Joi.string().email().allow('', null),
    product: Joi.string().allow('', null),
    phone: Joi.string().allow('', null)
}).unknown(true);

// --- 4. سكيما المعاملات المالية (Transaction) ---
export const transactionSchema = Joi.object({
    type: Joi.string().valid('incoming', 'outgoing', 'petty_cash', 'raw_material', 'discount').required(),
    amount: Joi.number().positive().required(),
    currency: Joi.string().valid('USD', 'EGP', 'EUR').default('USD'),
    date: Joi.date().default(Date.now),
    clientId: Joi.number().integer().allow(null),
    jobId: Joi.number().integer().allow(null)
}).unknown(true);

// --- 5. سكيما الحاويات (Container) ---
export const containerSchema = Joi.object({
    containerNumber: Joi.string().required(),
    status: Joi.string().valid('loading', 'shipped', 'arrived').default('loading'),
    shippingDate: Joi.date().allow(null),
    arrivalDate: Joi.date().allow(null)
}).unknown(true);

// --- 6. سكيما العمليات (Job) ---
export const jobSchema = Joi.object({
    title: Joi.string().required(),
    operationType: Joi.string().valid('export', 'import').default('export'),
    clientId: Joi.number().integer().allow(null),
    supplierId: Joi.number().integer().allow(null)
}).unknown(true);

// --- 7. سكيما وكيل الشحن (Shipping Agent) ---
export const shippingAgentSchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().allow('', null),
    company: Joi.string().allow('', null)
}).unknown(true);

// --- 8. سكيما الموظفين (Employee) ---
export const employeeSchema = Joi.object({
    name: Joi.string().required(),
    jobTitle: Joi.string().allow('', null),
    phone: Joi.string().allow('', null)
}).unknown(true);

// --- 9. سكيما العمولات (Commission) ---
export const commissionSchema = Joi.object({
    clientName: Joi.string().required(),
    date: Joi.date().required(),
    numberOfContainers: Joi.number().integer().min(0),
    totalQuantityTon: Joi.number().min(0),
    commissionPerTon: Joi.number().min(0),
    currency: Joi.string().default('USD')
}).unknown(true);
export const dashboardSchema = Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional()
});

// دالة فحص الـ Query (لأن بيانات الـ GET بتيجي في الـ query مش الـ body)
export const validateQuery = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.query);
    if (error) return res.status(400).json({ error: error.details[0].message });
    next();
};
export const shipmentOperationSchema = Joi.object({
    operationDate: Joi.date().required(),
    loadingDate: Joi.date().required(),
    clientName: Joi.string().required(),
    product: Joi.string().allow('', null),
    quantity: Joi.string().allow('', null),
    numberOfContainers: Joi.string().allow('', null),
    containerNumber: Joi.string().allow('', null),
    responsiblePerson: Joi.string().allow('', null),
    qualityRepresentative: Joi.string().allow('', null),
    notes: Joi.string().allow('', null),
    jobId: Joi.number().integer().allow(null),
    attachments: Joi.any() // بنسيب المرفقات للكنترولر
}).unknown(true);
export const packingListSchema = Joi.object({
    date: Joi.date().required(),
    clientName: Joi.string().required(),
    blNumber: Joi.string().allow('', null),
    invoiceNumber: Joi.string().allow('', null),
    shippingAgent: Joi.string().allow('', null),
    pol: Joi.string().allow('', null), // Port of Loading
    pod: Joi.string().allow('', null), // Port of Discharge
    finalDestination: Joi.string().allow('', null),
    numberOfContainers: Joi.number().integer().min(0).default(0),
    containerNumbers: Joi.any(),
    products: Joi.any(),
    attachments: Joi.any()
}).unknown(true);

export const productSchema = Joi.object({
    name: Joi.string().min(2).required().messages({
        'string.empty': 'اسم المنتج مطلوب'
    }),
    category: Joi.string().allow('', null),
    price: Joi.number().min(0).default(0),
    currency: Joi.string().valid('USD', 'EGP', 'EUR').default('USD'),
    supplierId: Joi.number().integer().allow(null),
    numberOfSuppliers: Joi.number().integer().min(0).default(0),
    supplierIds: Joi.array().items(Joi.number().integer()).default([])
}).unknown(true);



export const shippingAgentRecordSchema = Joi.object({
    agentId: Joi.number().integer().required(),
    date: Joi.date().required(),
    jobId: Joi.any().optional(), // بنعالجه يدوي لأنه ممكن ييجي "none"
    blNumber: Joi.string().allow('', null),
    country: Joi.string().allow('', null),
    containerCount: Joi.number().integer().min(0).default(0),
    costEgp: Joi.number().min(0).default(0),
    costEuro: Joi.number().min(0).default(0),
    costUsd: Joi.number().min(0).default(0),
    costEgpNote: Joi.string().allow('', null),
    costEuroNote: Joi.string().allow('', null),
    costUsdNote: Joi.string().allow('', null),
    pdfFile: Joi.any().optional()
}).unknown(true);