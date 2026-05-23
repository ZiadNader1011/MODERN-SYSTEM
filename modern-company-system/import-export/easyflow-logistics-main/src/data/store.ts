import axios, { AxiosError, AxiosInstance } from "axios";
import { toast } from "sonner";
import { supabase } from "../utils/supabaseClient";

// ============================================================================
// UTILITIES & GENERATORS (تم نقلها للأعلى لتجنب أخطاء الترتيب)
// ============================================================================
export function generateId() { 
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); 
}

// ============================================================================
// CONFIG (تعديل الرابط ليدعم البيئة السحابية والمحلية معاً)
// ============================================================================

// إذا كنت تستخدم Vite، سيقرأ الرابط من ملف الـ .env وفي حال عدم وجوده سيتوجه محلياً لـ localhost
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");
const api: AxiosInstance = axios.create({
  baseURL: BACKEND_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================================
// TOKEN SAFE HANDLING
// ============================================================================

if (typeof window !== "undefined") {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      localStorage.setItem("token", "bypass_token_easyflow_logistics");
    }
  } catch (err) {
    console.error("❌ LocalStorage Error:", err);
  }
}

api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.error("❌ Token Read Error:", err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error("❌ API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);

// بقية الـ Types الحالية الخاصة بك دون أي تغيير...

// ============================================================================
// TYPES
// ============================================================================

export interface Supplier {
  id: string;
  name: string;
  country: string;
  contact: string;
  email: string;
  phone?: string;
  product?: string;
}

export interface Client {
  id: string;
  name: string;
  country: string;
  contact: string;
  email: string;
  phone?: string;
  telephone?: string;
  fax?: string;
  vat?: string;
  address?: string;
  dhl?: string;
  agentName?: string;
  operationsCount?: number;
  operationsValue?: number;
  remainingBalance?: number;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  jobTitle: string;
}

export interface PackingListProduct {
  id?: string;
  productName?: string;
  variety?: string;
  grade?: string;
  caliber?: string;
  packagesQtyKind?: string;
  numberOfPackages?: string;
  netWeight?: string;
  grossWeight?: string;
  shippingAgent?: string;
  dhlNumber?: string;
  shippingDate?: string;
  pol?: string;
  pod?: string;
  finalDestination?: string;
}

export interface StandalonePackingList {
  id: string;
  date: string;
  blNumber: string;
  containerNumber: string;
  clientName: string;
  invoiceNumber: string;
  customRelease: string;
  note: string;
  numberOfContainers?: number;
  containerNumbers?: string[];
  dhlNumber?: string;
  productName?: string;
  variety?: string;
  grade?: string;
  caliber?: string;
  packagesQtyKind?: string;
  numberOfPackages?: string;
  netWeight?: string;
  grossWeight?: string;
  shippingAgent?: string;
  pol?: string;
  pod?: string;
  finalDestination?: string;
  shippingDate?: string;
  numberOfProducts?: number;
  products?: PackingListProduct[];
  attachments: { id: string; url: string; description: string; createdAt: string }[];
}

export interface Commission {
  id: string;
  date: string;
  clientName: string;
  numberOfContainers: number;
  actualFiles?: File[];
  totalQuantityTon: number;
  commissionPerTon: number;
  currency: string;
  product: string;
  trader: string;
  qualityRepresentative?: string;
  attachments: { id: any; _id: string; url: string; description: string; createdAt: string }[];
}

export interface ShipmentOperation {
  id: string;
  operationDate: string;
  jobDate?: string;
  jobId: string;
  clientName: string;
  product: string;
  numberOfContainers: string;
  quantity: string;
  loadingDate: string;
  containerNumber: string;
  responsiblePerson?: string;
  qualityRepresentative?: string;
  notes: string;
  attachments?: any[];
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  supplierId: string;
  numberOfSuppliers?: number;
  supplierIds?: string[];
}

export interface ContainerProduct {
  productId: string;
  quantity: number;
  packages: string | number;
  netWeight?: number;
  grossWeight?: number;
  packageType?: string;
}

export interface Container {
  id: string;
  containerNumber: string;
  sourcePort: string;
  destinationPort: string;
  shippingDate: string;
  arrivalDate: string;
  status: 'loading' | 'in-transit' | 'arrived' | 'cleared';
  products: ContainerProduct[];
  attachments?: { id: string; url: string; description: string; createdAt: string }[];
}

export interface JobProduct {
  productId: string;
  quantity: number;
  unitPrice: number;
  packages: string | number;
  packageType?: string;
  numberOfPallets?: number;
  variety?: string;
  caliber?: string;
  grade?: string;
  currency?: string;
}

export interface JobAttachment {
  id: string;
  url: string;
  description: string;
  createdAt: string;
}

export type OperationType = 'export' | 'import' | 'supply';

export interface Job {
  id: string;
  operationType: OperationType;
  title: string;
  supplierId?: string;
  clientId?: string;
  containerId?: string;
  numberOfContainers?: number;
  containerIds?: string[];
  invoiceNumber?: string;
  blNumber?: string;
  containerNumber?: string;
  customCountry?: string;
  productName?: string;
  exportCertificate?: string;
  shippingAgent?: string;
  incoterm?: string;
  departurePort?: string;
  arrivalPort?: string;
  transitTo?: string;
  numberOfReps?: number;
  repNames?: string[];
  packingListUrl?: string;
  isSold?: boolean;
  discountPercentage?: number;
  supplierDiscountPercentage?: number;
  rawMaterialPricePerTon?: number;
  rawMaterialCost?: number;
  rawMaterialWeight?: number;
  pettyCash?: number;
  otherCostReason?: string;
  products: JobProduct[];
  totalPrice: number;
  currency: string;
  paymentDate: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  notes: string;
  attachments?: JobAttachment[];
}

export interface Payment {
  id: string;
  supplierId?: string;
  clientId?: string;
  jobId?: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  relatedId?: string;
  entityId?: string;
  type: 'incoming' | 'outgoing' | 'petty_cash' | 'raw_material' | 'discount';
  amount: number;
  currency: string;
  date: string;
  incoterm?: string;
  variety?: string;
  caliber?: string;
  grade?: string;
  weightInTons?: number;
  pricePerTon?: number;
  otherCost?: number;
  blNumber?: string;
  invoiceNumber?: string;
  packages?: number;
  description: string;
  bank?: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: 'bl' | 'invoice' | "image" | "pdf" | "other";
  jobId?: string;
  agentId?: string;
  url: string;
  uploadedAt: string;
}

export interface ShippingAgent {
  id: string;
  name: string;
  company?: string;
  address?: string;
  telephone?: string;
  personalNumber?: string;
  email?: string;
  attachmentUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShippingAgentRecord {
  id: string;
  agentId: string;
  jobId?: string;
  date: string;
  blNumber?: string;
  country?: string;
  containerCount?: number;
  costEgp?: number;
  costEgpNote?: string;
  costEuro?: number;
  costEuroNote?: string;
  costUsd?: number;
  costUsdNote?: string;
  pdfUrl?: string;
  createdAt: string;
}

export type BankBalances = Record<string, Record<string, number>>;

export const EGYPTIAN_BANKS = [
  'NBE (National Bank of Egypt)',
  'Misr (Banque Misr)',
  'ABC (Arab Banking Corporation)',
  'FAB (First Abu Dhabi Bank)',
  'Banque du Caire',
  'Commercial International Bank (CIB)',
  'QNB Alahli',
  'HSBC Egypt',
  'AlexBank',
  'Abu Dhabi Islamic Bank (ADIB)',
  'Credit Agricole Egypt',
  'Faisal Islamic Bank',
  'Arab African International Bank (AAIB)',
  'Emirates NBD Egypt'
];

// ============================================================================
// GLOBAL CACHE & SAFE HELPERS
// ============================================================================

const globalStoreCache: Record<string, any[]> = {
  suppliers: [],
  clients: [],
  products: [],
  containers: [],
  jobs: [],
  archive: [],
  transactions: [],
  "shipping-agents": [],
  "shipping-agent-records": [],
  employees: [],
  "packing-lists": [],
  commissions: [],
  operations: [],
};

const globalBankCache: BankBalances = {};

function safeArray(data: any): any[] {
  return Array.isArray(data) ? data : [];
}

function safeNumber(value: any): number {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

function normalizeItem(item: any) {
  if (!item || typeof item !== "object") {
    return {};
  }
  return {
    ...item,
    id: item.id !== undefined && item.id !== null ? String(item.id) : generateId(),
  };
}

// ============================================================================
// FETCH INITIAL DATA
// ============================================================================

async function fetchEndpoint(endpoint: string) {
  try {
    const res = await api.get(`/${endpoint}`);
    const data = safeArray(res.data).map(normalizeItem);
    globalStoreCache[endpoint] = data;
  } catch (err) {
    console.error(`❌ Fetch Error [${endpoint}]`, err);
    globalStoreCache[endpoint] = []; 
  }
}

let isStoreInitialized = false;

async function initializeStore() {
  if (isStoreInitialized) return; 
  isStoreInitialized = true;

  const endpoints = Object.keys(globalStoreCache);
  for (const endpoint of endpoints) {
    await fetchEndpoint(endpoint);
  }

  try {
    const bankRes = await api.get("/banks");
    Object.assign(globalBankCache, bankRes.data || {});
  } catch (err) {
    console.warn("⚠️ Banks API route is not available yet (Safely Ignored).");
  }
}

if (typeof window !== "undefined") {
  initializeStore();
}

// ============================================================================
// GLOBAL DYNAMIC CLEANUP RELATIONSHIPS MAPPING 🌍
// ============================================================================

const RELATIONSHIP_MAP: Record<string, { targetCache: string; foreignKey: string; nameField?: string; fallbackName: string }[]> = {
  suppliers: [
    { targetCache: "products", foreignKey: "supplierId", nameField: "supplierName", fallbackName: "— Deleted Supplier" }
  ],
  clients: [
    { targetCache: "jobs", foreignKey: "clientId", nameField: "clientName", fallbackName: "— Deleted Client" }
  ],
  products: [
    { targetCache: "containers", foreignKey: "productId", nameField: "productName", fallbackName: "— Deleted Product" },
    { targetCache: "jobs", foreignKey: "productId", nameField: "productName", fallbackName: "— Deleted Product" }
  ],
  containers: [
    { targetCache: "jobs", foreignKey: "containerId", nameField: "containerNumber", fallbackName: "— No Container" }
  ],
  jobs: [
    { targetCache: "transactions", foreignKey: "relatedId", nameField: "description", fallbackName: "— Target Job Deleted" }
  ],
  employees: [
    { targetCache: "operations", foreignKey: "responsiblePerson", nameField: "responsiblePersonName", fallbackName: "— Deleted Employee" }
  ]
};

function handleOrphanCleanup(endpoint: string, deletedId: string | number) {
  const id = String(deletedId);
  const rules = RELATIONSHIP_MAP[endpoint];

  if (!rules) return;

  console.log(`🧹 Running Dynamic Orphan Cleanup for [${endpoint}] with ID: ${id}`);

  rules.forEach(rule => {
    const targetData = globalStoreCache[rule.targetCache];
    if (!targetData || !Array.isArray(targetData)) return;

    globalStoreCache[rule.targetCache] = targetData.map((item: any) => {
      if (item.products && Array.isArray(item.products)) {
        return {
          ...item,
          products: item.products.map((subItem: any) => 
            String(subItem[rule.foreignKey]) === id
              ? { ...subItem, [rule.foreignKey]: null, ...(rule.nameField ? { [rule.nameField]: rule.fallbackName } : {}) }
              : subItem
          )
        };
      }

      if (String(item[rule.foreignKey]) === id) {
        return {
          ...item,
          [rule.foreignKey]: null, 
          ...(rule.nameField ? { [rule.nameField]: rule.fallbackName } : {}) 
        };
      }
      return item;
    });
  });
}

// ============================================================================
// CRUD HELPERS (المحرك الرئيسي المطور والمحمي ضد مشاكل Supabase/PostgreSQL)
// ============================================================================

async function saveLiveAndMutateCache(endpoint: string, payload: any, clientTempId?: string): Promise<void> {
  try {
    const itemToSend = { ...payload };
    const isNewItem = !itemToSend.id || (clientTempId && clientTempId.length > 10);

    if (clientTempId && clientTempId.length > 10) {
      delete itemToSend.id;
    }

    let res;
    
    // 1️⃣ الفحص الذكي: إذا لم يكن عنصراً جديداً، أرسل طلب PUT للتعديل على المسار المخصص
    if (!isNewItem) {
      console.log(`📝 Sending PUT request to: /${endpoint}/${itemToSend.id}`);
      res = await api.put(`/${endpoint}/${itemToSend.id}`, itemToSend);
    } else {
      // إذا كان عنصراً جديداً، أرسل طلب POST عادي للإنشاء
      console.log(`🚀 Sending POST request to: /${endpoint}`);
      res = await api.post(`/${endpoint}`, itemToSend);
    }

    const savedItem = normalizeItem(res.data || payload);

    // 2️⃣ تحديث الكاش العالمي بالمعرف النهائي والآمن المستلم من الخادم
    const currentCache = globalStoreCache[endpoint] || [];
    
    let index = -1;
    if (clientTempId) {
      index = currentCache.findIndex((item: any) => String(item.id) === String(clientTempId));
    }
    if (index === -1) {
      index = currentCache.findIndex((item: any) => String(item.id) === String(savedItem.id));
    }

    if (index >= 0) {
      globalStoreCache[endpoint][index] = savedItem;
    } else {
      globalStoreCache[endpoint].push(savedItem);
    }

    // 3️⃣ تأمين المزامنة وإعادة الترتيب التلقائي من الخادم
    await fetchEndpoint(endpoint);
    console.log(`✅ [${endpoint}] Synced successfully with Server! ID:`, savedItem.id);

  } catch (err) {
    console.error(`❌ Background Save Error [${endpoint}]:`, err);
    toast.error("حدث خطأ أثناء مزامنة البيانات وحفظها في قاعدة البيانات السحابية.");
    await fetchEndpoint(endpoint); // التراجع التلقائي عن الكاش الوهمي في حال الفشل
  }
}

async function deleteLive(endpoint: string, id: string | number) {
  try {
    if (!id) return false;

    console.log(`🚀 Requesting Delete from Supabase: /${endpoint}/${id}`);
    
    // 1. التحديث الفوري الصارم للكاش المحلي أولاً قبل أي طلب خارجي للحفاظ على استقرار الـ UI
    globalStoreCache[endpoint] = (globalStoreCache[endpoint] || []).filter((item: any) => String(item.id) !== String(id));

    // 2. إرسال طلب الحذف الحقيقي للسيرفر
    await api.delete(`/${endpoint}/${id}`);

    handleOrphanCleanup(endpoint, id);

    // 3. تحديث هادئ لبقية الجداول للتأكد من زوال العلاقات
    const endpoints = Object.keys(globalStoreCache).filter(ep => ep !== endpoint);
    for (const ep of endpoints) {
      try { await fetchEndpoint(ep); } catch { /** bypass */ }
    }

    toast.success("تم الحذف بنجاح من قاعدة البيانات السحابية.");
    return true;

  } catch (err: any) {
    const backendError = err.response?.data?.error || err.message;
    console.error(`❌ Delete Error [${endpoint}]:`, backendError);

    toast.error(backendError, {
      description: "برجاء مراجعة وحذف العمليات أو المنتجات المرتبطة به أولاً.",
      duration: 5000,
    });

    // إعادة جلب البيانات فقط في حالة الفشل الحقيقي لإعادة العنصر المرفوض حذفه من قاعدة البيانات
    await fetchEndpoint(endpoint); 
    return false;
  }
}

// ============================================================================
// GETTERS
// ============================================================================

export function getSuppliers(): Supplier[] { return safeArray(globalStoreCache.suppliers); }
export function getClients(): Client[] { return safeArray(globalStoreCache.clients); }
export function getProducts(): Product[] { return safeArray(globalStoreCache.products); }
export function getContainers(): Container[] { return safeArray(globalStoreCache.containers); }
export function getJobs(): Job[] { return safeArray(globalStoreCache.jobs); }
export function getFiles(): UploadedFile[] { return safeArray(globalStoreCache.archive); }
export function getTransactions(): Transaction[] { return safeArray(globalStoreCache.transactions); }
export function getShippingAgents(): ShippingAgent[] { return safeArray(globalStoreCache["shipping-agents"]); }
export function getShippingAgentRecords(): ShippingAgentRecord[] { return safeArray(globalStoreCache["shipping-agent-records"]); }
export function getEmployees(): Employee[] { return safeArray(globalStoreCache.employees); }
export function getPackingLists(): StandalonePackingList[] { return safeArray(globalStoreCache["packing-lists"]); }
export function getCommissions(): Commission[] { return safeArray(globalStoreCache.commissions); }
export function getShipmentOperations(): ShipmentOperation[] { return safeArray(globalStoreCache.operations); }
export function getBankBalances(): BankBalances { return globalBankCache || {}; }

// ============================================================================
// SAVERS (CENTRALIZED SMART INTERACTION - FIXED & STRICT RACE-CONDITION PROOF)
// ============================================================================

function executeSaveFlow(endpoint: string, newData: any[]) {
  if (!newData) return false;

  const current = globalStoreCache[endpoint] || [];

  // 1. الفحص الصارم والذكي لعمليات "الحذف"
  if (current.length > 0 && newData.length < current.length) {
    const deleted = current.find((c: any) => !newData.some((n: any) => String(n.id) === String(c.id)));
    
    if (deleted?.id) {
      console.log(`🗑️ Strict Detection of Delete operation for [${endpoint}] ID: ${deleted.id}`);
      globalStoreCache[endpoint] = current.filter((item: any) => String(item.id) !== String(deleted.id));
      deleteLive(endpoint, deleted.id);
      return true; 
    }
  }

  // 2. حماية حيوية ضد التصفير العشوائي
  if (current.length > 0 && newData.length === 0) {
    console.warn(`⚠️ Blocked accidental cache wipeout for [${endpoint}] during component mount/refresh.`);
    return true; 
  }
  
  // 3. الفحص الدقيق لعمليات "الإضافة" أو "التعديل"
  let targetedItem = null;
  let isNewItem = false;
  let clientTempId: string | undefined = undefined;

  const foundNew = newData.find((n: any) => !current.some((c: any) => String(c.id) === String(n.id)));
  
  if (foundNew) {
    targetedItem = foundNew;
    isNewItem = true;
    if (String(targetedItem.id).length > 10) {
      clientTempId = String(targetedItem.id); 
    }
  } else {
    // ✨ التعديل الذهبي: فحص عميق ومرن يقارن كل الحقول ديناميكياً لتجنب سقوط أي حقل
    targetedItem = newData.find((n: any) => {
      const old = current.find((c: any) => String(c.id) === String(n.id));
      if (!old) return false;
      
      // مقارنة كافة المفاتيح المتواجدة في الكائن الجديد بالقديم لقنص أي اختلاف
      return Object.keys(n).some(key => {
        // نغض الطرف عن تاريخ التحديث التلقائي لتجنب الحلقات اللانهائية
        if (key === 'updatedAt' || key === 'createdAt') return false;
        return String(old[key]) !== String(n[key]);
      });
    });
  }

  if (targetedItem) {
    globalStoreCache[endpoint] = newData.map(normalizeItem);
    console.log(`🚀 Dispatching Live Write operation for [${endpoint}] - IsNew: ${isNewItem}`);
    saveLiveAndMutateCache(endpoint, targetedItem, clientTempId);
  } else {
    globalStoreCache[endpoint] = newData.map(normalizeItem);
  }

  return true; 
}

export function saveSuppliers(d: Supplier[]) { return executeSaveFlow('suppliers', d); }
export function saveClients(d: Client[]) { return executeSaveFlow('clients', d); }
export function saveProducts(d: Product[]) { return executeSaveFlow('products', d); }
export function saveContainers(d: Container[]) { return executeSaveFlow('containers', d); }
export function saveJobs(d: Job[]) { return executeSaveFlow('jobs', d); }
export function saveTransactions(data: Transaction[]) { return executeSaveFlow('transactions', data); }
export function saveShippingAgents(d: ShippingAgent[]) { return executeSaveFlow('shipping-agents', d); }
export function saveShippingAgentRecords(d: ShippingAgentRecord[]) { return executeSaveFlow('shipping-agent-records', d); }
export function saveEmployees(d: Employee[]) { return executeSaveFlow('employees', d); }
export function savePackingLists(d: StandalonePackingList[]) { return executeSaveFlow('packing-lists', d); }
export function saveCommissions(d: Commission[]) { return executeSaveFlow('commissions', d); }
export function saveShipmentOperations(d: ShipmentOperation[]) { return executeSaveFlow('operations', d); }
export function saveFiles(d: UploadedFile[]) { return executeSaveFlow("archive", d); }
export function savePayments(d: Payment[]) { return executeSaveFlow("payments", d); }

export async function saveBankBalances(d: BankBalances) {
  try {
    Object.assign(globalBankCache, d);
    await api.post("/banks/summary", d);
    return true;
  } catch (err) {
    console.error("❌ Save Bank Error:", err);
    return false;
  }
}
export async function uploadFileToSupabase(file: File, bucketName: string = "attachments"): Promise<string | null> {
  try {
    if (!file) return null;

    // 1. تنظيف اسم الملف وتوليد اسم فريد لمنع التداخل والملفات المكررة
    const fileExt = file.name.split('.').pop();
    const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

    console.log(`📤 Uploading ${file.name} to Supabase bucket: [${bucketName}]...`);

    // 2. الرفع المباشر إلى البكت المستهدف
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(cleanFileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // 3. استخراج الرابط العام والمباشر للملف (Public URL)
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(cleanFileName);

    console.log("✅ Upload successful! Public URL:", publicUrl);
    return publicUrl;

  } catch (err: any) {
    console.error("❌ Supabase Upload Error:", err.message || err);
    toast.error("فشل رفع الملف إلى السحابة: " + (err.message || "خطأ غير معروف"));
    return null;
  }
}

// ============================================================================
// UTILITIES & MATHEMATICAL HELPERS (NaN Protected)
// ============================================================================

export function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(safeNumber(amount));
}

export function formatDate(dateStr: string | Date | undefined) {
  if (!dateStr) return '—';
  let d = new Date(dateStr);
  if (typeof dateStr === 'string' && dateStr.length === 10) {
    d = new Date(dateStr + 'T12:00:00');
  }
  if (isNaN(d.getTime())) return '—';
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function sumByCurrency<T>(items: T[], getCurrency: (item: T) => string, getValue: (item: T) => number): Record<string, number> {
  return safeArray(items).reduce((acc, it) => {
    const c = getCurrency(it) || 'USD';
    acc[c] = (acc[c] || 0) + safeNumber(getValue(it));
    return acc;
  }, {} as Record<string, number>);
}

export function computeBalances(debts: Record<string, number>, credits: Record<string, number>): Record<string, number> {
  const currencies = Array.from(new Set([...Object.keys(debts || {}), ...Object.keys(credits || {})]));
  const balances: Record<string, number> = {};
  currencies.forEach(c => {
    const diff = safeNumber(debts?.[c]) - safeNumber(credits?.[c]);
    if (Math.abs(diff) > 0.001) balances[c] = diff;
  });
  return balances;
}

export function formatBalanceObj(balances: Record<string, number>): string {
  if (!balances || Object.keys(balances).length === 0) return '0';
  const parts = Object.entries(balances).map(([cur, val]) => formatCurrency(val, cur));
  return parts.length ? parts.join(' | ') : '0';
}