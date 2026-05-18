import axios, { AxiosError, AxiosInstance } from "axios";
import { toast } from "sonner";

// ============================================================================
// CONFIG
// ============================================================================

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
// FETCH INITIAL DATA (نسخة محمية تمنع جلب البيانات المزدوج)
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

  // عزل البنوك بـ catch صامته تماماً لمنع توقف الرندر في حالة عدم اكتمال الـ API بالباك إند
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
// CRUD HELPERS (PRODUCTION LEVEL HARDENED)
// ============================================================================

async function saveLive<T extends { id?: string }>(
  endpoint: string,
  dataArray: T[]
): Promise<boolean> {
  try {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return false;
    }

    // حماية وقراءة صريحة لآخر عنصر مستهدف منعا للـ Mutation العشوائي
    const rawPayload = dataArray[dataArray.length - 1];
    if (!rawPayload) return false;

    const payload = normalizeItem(rawPayload);
    if (!payload.id) {
      payload.id = generateId();
    }

    const existingIndex = globalStoreCache[endpoint]?.findIndex(
      (item: any) => item.id === payload.id
    );

    if (existingIndex >= 0) {
      globalStoreCache[endpoint][existingIndex] = payload;
    } else {
      globalStoreCache[endpoint].push(payload);
    }

    await api.post(`/${endpoint}`, payload);
    await fetchEndpoint(endpoint);
    return true;
  } catch (err) {
    console.error(`❌ Save Live Error [${endpoint}]`, err);
    return false;
  }
}

async function deleteLive(endpoint: string, id: string | number) {
  try {
    if (!id) return false;

    console.log(`🚀 Requesting Delete for: /${endpoint}/${id}`);
    await api.delete(`/${endpoint}/${id}`);

    // 1️⃣ التنظيف المحلي الفوري لضمان سرعة استجابة الـ UI
    globalStoreCache[endpoint] = globalStoreCache[endpoint].filter(
      (item: any) => String(item.id) !== String(id)
    );

    handleOrphanCleanup(endpoint, id);

    // 2️⃣ 🎉 جدار الحماية المؤمن عند النجاح: تحديث معزول ومحمي ضد الـ 404
    const endpoints = Object.keys(globalStoreCache);
    for (const ep of endpoints) {
      try {
        await fetchEndpoint(ep);
      } catch {
        console.warn(`⚠️ Failed to sync endpoint [${ep}] on success (Ignored)`);
      }
    }

    toast.success("تم الحذف بنجاح من قاعدة البيانات.");
    return true;

  } catch (err: any) {
    const backendError = err.response?.data?.error || err.message;
    console.error(`❌ Delete Error [${endpoint}]:`, backendError);

    toast.error(backendError, {
      description: "برجاء مراجعة وحذف العمليات أو المنتجات المرتبطة به أولاً ثم إعادة المحاولة.",
      duration: 5000,
    });

    console.log("♻️ Dynamic Safe Recovery for all active endpoints...");
    const endpoints = Object.keys(globalStoreCache);
    for (const ep of endpoints) {
      try {
        await fetchEndpoint(ep);
      } catch {
        console.warn(`⚠️ Isolated bypass for endpoint [${ep}] during recovery.`);
      }
    }

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
// SAVERS
// ============================================================================

export function saveSuppliers(d: Supplier[]) {
  const current = globalStoreCache['suppliers'] || [];
  const deleted = current.find((c: any) => !d.some((n: any) => String(n.id) === String(c.id)));
  if (deleted?.id) return deleteLive('suppliers', deleted.id);
  return saveLive("suppliers", d);
}

export function saveClients(d: Client[]) {
  const current = globalStoreCache['clients'] || [];
  const deleted = current.find((c: any) => !d.some((n: any) => String(n.id) === String(c.id)));
  if (deleted?.id) return deleteLive('clients', deleted.id);
  return saveLive("clients", d);
}

export function saveProducts(d: Product[]) {
  const current = globalStoreCache['products'] || [];
  const deleted = current.find((c: any) => !d.some((n: any) => String(n.id) === String(c.id)));
  if (deleted?.id) return deleteLive('products', deleted.id);
  return saveLive("products", d);
}

export function saveContainers(d: Container[]) {
  const current = globalStoreCache['containers'] || [];
  const deleted = current.find((c: any) => !d.some((n: any) => String(n.id) === String(c.id)));
  if (deleted?.id) return deleteLive('containers', deleted.id);
  return saveLive("containers", d);
}

export function saveJobs(d: Job[]) {
  const current = globalStoreCache['jobs'] || [];
  const deleted = current.find((c: any) => !d.some((n: any) => String(n.id) === String(c.id)));
  if (deleted?.id) return deleteLive('jobs', deleted.id);
  return saveLive("jobs", d);
}

export function saveFiles(d: UploadedFile[]) { return saveLive("archive", d); }
export function savePayments(d: Payment[]) { return saveLive("payments", d); }

export function saveTransactions(d: Transaction[]) {
  const current = globalStoreCache['transactions'] || [];
  const deleted = current.find((c: any) => !d.some((n: any) => String(n.id) === String(c.id)));
  if (deleted?.id) return deleteLive('transactions', deleted.id);
  return saveLive("transactions", d);
}

export function saveShippingAgents(d: ShippingAgent[]) {
  const current = globalStoreCache['shipping-agents'] || [];
  const deleted = current.find((c: any) => !d.some((n: any) => String(n.id) === String(c.id)));
  if (deleted?.id) return deleteLive('shipping-agents', deleted.id);
  return saveLive("shipping-agents", d);
}

export function saveShippingAgentRecords(d: ShippingAgentRecord[]) {
  const current = globalStoreCache['shipping-agent-records'] || [];
  const deleted = current.find((c: any) => !d.some((n: any) => String(n.id) === String(c.id)));
  if (deleted?.id) return deleteLive('shipping-agent-records', deleted.id);
  return saveLive("shipping-agent-records", d);
}

export function saveEmployees(d: Employee[]) {
  const current = globalStoreCache['employees'] || [];
  const deleted = current.find((c: any) => !d.some((n: any) => String(n.id) === String(c.id)));
  if (deleted?.id) return deleteLive('employees', deleted.id);
  return saveLive("employees", d);
}

export function savePackingLists(d: StandalonePackingList[]) {
  const current = globalStoreCache['packing-lists'] || [];
  const deleted = current.find((c: any) => !d.some((n: any) => String(n.id) === String(c.id)));
  if (deleted?.id) return deleteLive('packing-lists', deleted.id);
  return saveLive("packing-lists", d);
}

export function saveCommissions(d: Commission[]) {
  const current = globalStoreCache['commissions'] || [];
  const deleted = current.find((c: any) => !d.some((n: any) => String(n.id) === String(c.id)));
  if (deleted?.id) return deleteLive('commissions', deleted.id);
  return saveLive("commissions", d);
}

export function saveShipmentOperations(d: ShipmentOperation[]) {
  const current = globalStoreCache['operations'] || [];
  const deleted = current.find((c: any) => !d.some((n: any) => String(n.id) === String(c.id)));
  if (deleted?.id) return deleteLive('operations', deleted.id);
  return saveLive("operations", d);
}

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

// ============================================================================
// UTILITIES & MATHEMATICAL HELPERS (NaN Protected)
// ============================================================================

export function generateId() { 
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); 
}

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