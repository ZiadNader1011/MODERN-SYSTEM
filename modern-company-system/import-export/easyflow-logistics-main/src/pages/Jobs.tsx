import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import {
  getJobs, saveJobs, getSuppliers, getProducts, getContainers, getClients, getTransactions, saveTransactions,
  getShippingAgents, getShipmentOperations, getShippingAgentRecords,
  generateId, Job, JobProduct, JobAttachment, OperationType, formatCurrency, sumByCurrency, formatBalanceObj, formatDate,uploadFileToSupabase
} from '@/data/store';
import { compressImage } from '@/utils/imageCompression';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from '@/components/DatePicker';
import { FileViewer } from '@/components/FileViewer';
import {
  Plus, Pencil, Trash2, Briefcase, Ship, Wheat, DollarSign, Calendar,
  ChevronDown, ChevronUp, Users, Camera, ArrowRightLeft, ArrowUpRight, ArrowDownRight, FileText
} from 'lucide-react';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/20',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function Jobs() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const transactions = useMemo(() => getTransactions(), []);
  const suppliers = useMemo(() => getSuppliers(), []);
  const clients = useMemo(() => getClients(), []);
  const products = useMemo(() => getProducts(), []);
  const containers = useMemo(() => getContainers(), []);
  const shippingAgents = useMemo(() => getShippingAgents(), []);
  const shipmentOperations = useMemo(() => getShipmentOperations(), []);
  const shippingAgentRecords = useMemo(() => getShippingAgentRecords(), []);
  // 1. تأكدي من استدعاء getJobs من الـ store
const [jobs, setJobs] = useState<Job[]>([]);

useEffect(() => {
  setJobs(getJobs());
  const interval = setInterval(() => {
    const latest = getJobs();
    if (latest.length > 0) {
      setJobs(latest);
      clearInterval(interval);
    }
  }, 1000);
  return () => clearInterval(interval);
}, []);

  const [activeTab, setActiveTab] = useState<OperationType>('export');

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState<Job | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const emptyForm = {
    title: '', supplierId: 'none', clientId: 'none', containerId: 'none', currency: 'USD',
    paymentDate: '', status: 'active' as Job['status'], notes: '',
    operationType: activeTab, invoiceNumber: '', blNumber: '', exportCertificate: '', shippingAgent: '', incoterm: 'none', departurePort: '', arrivalPort: '', transitTo: '', packingListUrl: '',
    isSold: false, discountPercentage: 0 as string | number, supplierDiscountPercentage: 0 as string | number, rawMaterialPricePerTon: 0 as string | number, rawMaterialWeight: 0 as string | number, rawMaterialCost: 0 as string | number, pettyCash: 0 as string | number, otherCostReason: '',
    numberOfContainers: '' as string | number, containerIds: [] as string[],
    products: [] as JobProduct[],
    attachments: [] as JobAttachment[],
    numberOfReps: '' as string | number,
    repNames: [] as string[],
    createdAt: new Date().toISOString().split('T')[0],
  };
  const [form, setForm] = useState(emptyForm);

  const filteredJobs = jobs.filter(j => j.operationType === activeTab);
  const activeJobs = filteredJobs.filter(j => j.status === 'active').length;

  const totalValueObj = filteredJobs.reduce((acc, job) => {
    const hasValidProducts = job.products && job.products.some(p => (Number(p.quantity) || 0) > 0 && (Number(p.unitPrice) || 0) > 0);
    const discount = job.discountPercentage || 0;

    if (hasValidProducts) {
      job.products.forEach(p => {
        const c = p.currency || job.currency;
        const gross = (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0);
        acc[c] = (acc[c] || 0) + (gross * (1 - discount / 100));
      });
    } else {
      acc[job.currency] = (acc[job.currency] || 0) + (job.totalPrice * (1 - discount / 100));
    }
    return acc;
  }, {} as Record<string, number>);

  const totalValueStr = formatBalanceObj(totalValueObj);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, operationType: activeTab });
    setEditOpen(true);
  };

 const openEdit = (j: Job) => {
    setEditing(j);
    setForm({
      title: j.title || '', 
      supplierId: j.supplierId || 'none', 
      clientId: j.clientId || 'none', 
      containerId: j.containerId || 'none',
      currency: j.currency || 'USD', 
      paymentDate: j.paymentDate || '', 
      status: j.status || 'active', 
      operationType: j.operationType || activeTab,
      invoiceNumber: j.invoiceNumber || '', 
      blNumber: j.blNumber || '', 
      exportCertificate: j.exportCertificate || '', 
      shippingAgent: j.shippingAgent || '', 
      incoterm: j.incoterm || 'none', 
      departurePort: j.departurePort || '', 
      arrivalPort: j.arrivalPort || '', 
      transitTo: j.transitTo || '', 
      packingListUrl: j.packingListUrl || '',
      isSold: j.isSold || false, 
      discountPercentage: j.discountPercentage !== undefined ? j.discountPercentage : 0, 
      supplierDiscountPercentage: j.supplierDiscountPercentage !== undefined ? j.supplierDiscountPercentage : 0, 
      rawMaterialPricePerTon: j.rawMaterialPricePerTon !== undefined ? j.rawMaterialPricePerTon : 0, 
      rawMaterialWeight: j.rawMaterialWeight !== undefined ? j.rawMaterialWeight : 0, 
      rawMaterialCost: j.rawMaterialCost !== undefined ? j.rawMaterialCost : 0, 
      pettyCash: j.pettyCash !== undefined ? j.pettyCash : 0, 
      otherCostReason: j.otherCostReason || '',
      numberOfContainers: j.numberOfContainers || (j.containerIds && j.containerIds.length > 0 ? j.containerIds.length : ''),
      containerIds: j.containerIds && j.containerIds.length > 0 ? j.containerIds : (j.containerId && j.containerId !== 'none' ? [j.containerId] : []),
      notes: j.notes || '', 
      products: j.products ? [...j.products] : [], 
      attachments: j.attachments ? [...j.attachments] : [],
      numberOfReps: j.numberOfReps || '',
      repNames: j.repNames ? [...j.repNames] : [],
      createdAt: (j.createdAt || new Date().toISOString()).split('T')[0]
    });
    setEditOpen(true);
  };

  const addProductLine = () => {
    setForm(f => ({ ...f, products: [...f.products, { productId: '', quantity: 0, unitPrice: 0, packages: 0, numberOfPallets: 0, packageType: '', variety: '', caliber: '', grade: '' }] }));
  };

  const updateProductLine = (index: number, field: string, value: string | number) => {
    setForm(f => {
      const prods = [...f.products];
      prods[index] = { ...prods[index], [field]: value };
      return { ...f, products: prods };
    });
  };

  const removeProductLine = (index: number) => {
    setForm(f => ({ ...f, products: f.products.filter((_, i) => i !== index) }));
  };
  const removeAttachment = (index: number) => {
  setForm(f => ({
    ...f,
    attachments: (f.attachments || []).filter((_, i) => i !== index)
  }));
};

  // 1️⃣ تحديث دالة رفع الصور والمستندات المشتركة
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const originalFile = e.target.files[0];
      
      toast.loading("جاري رفع المستند إلى السحابة...", { id: "upload-doc" });
      
      // رفع الملف مباشرة إلى سوبابيز من خلال الدالة المركزية بالـ store
      const publicUrl = await uploadFileToSupabase(originalFile, "attachments");
      
      if (publicUrl) {
        setForm(f => ({
          ...f,
          attachments: [...(f.attachments || []), { 
            id: generateId(), 
            url: publicUrl, // 👈 حفظ الرابط السحابي المباشر بدلاً من الـ base64
            description: originalFile.name, 
            createdAt: new Date().toISOString() 
          }]
        }));
        toast.success("تم رفع المستند بنجاح! ✨", { id: "upload-doc" });
      } else {
        toast.error("فشل رفع المستند.", { id: "upload-doc" });
      }    
    }
    e.target.value = '';
  };

  // 2️⃣ تحديث دالة رفع الـ Packing List
  const handlePackingListUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const originalFile = e.target.files[0];

      toast.loading("جاري رفع بيان التعبئة...", { id: "upload-pl" });

      // رفع الملف إلى سوبابيز
      const publicUrl = await uploadFileToSupabase(originalFile, "attachments");

      if (publicUrl) {
        setForm(f => ({ ...f, packingListUrl: publicUrl })); // 👈 حفظ الرابط السحابي
        toast.success("تم رفع بيان التعبئة بنجاح! 🎉", { id: "upload-pl" });
      } else {
        toast.error("فشل رفع بيان التعبئة.", { id: "upload-pl" });
      }
    }
    e.target.value = '';
  };

  const calcTotal = (prods: { quantity?: string | number; unitPrice?: string | number }[]) => prods.reduce((s, p) => s + (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0), 0);

 const handleSave = () => {
    if (!form.title.trim()) { toast.error('Please enter a job title.'); return; }
    
    const parsedProducts = (form.products || []).map(p => ({
      ...p,
      quantity: Number(p.quantity) || 0,
      unitPrice: Number(p.unitPrice) || 0,
      packages: p.packages ? Number(p.packages) : 0
    }));
    
    const totalPrice = calcTotal(parsedProducts);
    const calculatedRawMaterialCost = (Number(form.rawMaterialPricePerTon) || 0) * (Number(form.rawMaterialWeight) || 0);

    const finalJobData: Job = {
      ...form,
      products: parsedProducts,
      rawMaterialPricePerTon: Number(form.rawMaterialPricePerTon) || 0,
      rawMaterialWeight: Number(form.rawMaterialWeight) || 0,
      pettyCash: Number(form.pettyCash) || 0,
      discountPercentage: Number(form.discountPercentage) || 0,
      supplierDiscountPercentage: Number(form.supplierDiscountPercentage) || 0,
      rawMaterialCost: calculatedRawMaterialCost,
      id: editing ? editing.id : generateId(),
      supplierId: form.supplierId === 'none' ? undefined : form.supplierId,
      clientId: form.clientId === 'none' ? undefined : form.clientId,
      containerId: form.containerId === 'none' ? undefined : form.containerId,
      numberOfContainers: Number(form.numberOfContainers) || 0,
      containerIds: form.containerIds && form.containerIds.length > 0 ? form.containerIds : (form.containerId && form.containerId !== 'none' ? [form.containerId] : []),
      totalPrice,
      numberOfReps: Number(form.numberOfReps) || 0,
      repNames: form.numberOfReps && Number(form.numberOfReps) > 0 ? form.repNames.slice(0, Number(form.numberOfReps)) : form.repNames,
      createdAt: form.createdAt ? new Date(form.createdAt + 'T12:00:00Z').toISOString() : new Date().toISOString()
    };

    let updated: Job[];
    if (editing) {
      updated = jobs.map(j => j.id === editing.id ? finalJobData : j);

      // مزامنة حقول التواريخ مع الـ Transactions المرتبطة بالوظيفة لمنع تعارض السجلات
      const oldDateOnly = editing.createdAt ? new Date(editing.createdAt).toISOString().split('T')[0] : '';
      const newDateOnly = finalJobData.createdAt.split('T')[0];

      if (oldDateOnly !== newDateOnly) {
        const allTx = getTransactions();
        let changedTx = false;
        const updatedTx = allTx.map(t => {
          if (t.relatedId === editing.id) {
            changedTx = true;
            return { ...t, date: newDateOnly };
          }
          return t;
        });
        if (changedTx) {
          saveTransactions(updatedTx);
        }
      }

      toast.success(`"${form.title}" has been updated! ✨`);
    } else {
      updated = [...jobs, finalJobData];
      toast.success(`"${form.title}" has been created! 🎉`);
    }
    
    setJobs(updated);
    saveJobs(updated);
    setEditOpen(false);
  };

  const handleDelete = useCallback(() => {
    if (!deleting) return;
    const updated = jobs.filter(j => j.id !== deleting.id);
    setJobs(updated);
    saveJobs(updated);
    toast.success(`Removed job.`);
    setDeleting(null);
  }, [deleting, jobs]);

  return (
    <div>
      <PageHeader title={t('common.jobs', 'Jobs')} description={t('pages.jobsDesc', 'Manage your import, export, and supply jobs centrally.')}
        action={<Button onClick={openNew} size="lg"><Plus className="mr-2 h-4 w-4" /> {t('pages.createJob', 'New Job')}</Button>} />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OperationType)} className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="export" className="gap-2"><ArrowUpRight className="h-4 w-4" /> {t('Export', 'Export (تصدير)')}</TabsTrigger>
          <TabsTrigger value="import" className="gap-2"><ArrowDownRight className="h-4 w-4" /> {t('Import', 'Import (استيراد)')}</TabsTrigger>
          <TabsTrigger value="supply" className="gap-2"><ArrowRightLeft className="h-4 w-4" /> {t('Supply', 'Supply (توريد)')}</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          <StatCard title={t('Active Jobs', 'Active Jobs')} value={activeJobs} icon={Briefcase} variant="success" description={`${filteredJobs.length} ${t('total', 'total')}`} />
          <StatCard title={t('Total Value', 'Total Value')} value={totalValueStr} icon={DollarSign} variant="info" />
          <StatCard title={t('Completed', 'Completed')} value={filteredJobs.filter(j => j.status === 'completed').length} icon={Briefcase} variant="default" />
        </div>

        <TabsContent value={activeTab} className="mt-0">
          <div className="space-y-4">
            {filteredJobs.map(job => {
              const supplier = suppliers.find(s => s.id === job.supplierId);
              const client = clients.find(c => c.id === job.clientId);
              const container = containers.find(c => c.id === job.containerId);
              const isExpanded = expandedJob === job.id;

              const hasValidProducts = job.products && job.products.some(p => (Number(p.quantity) || 0) > 0 && (Number(p.unitPrice) || 0) > 0);
              const jobProductsValuationObjGross = hasValidProducts
                ? job.products.reduce((acc, p) => {
                  const c = p.currency || job.currency;
                  acc[c] = (acc[c] || 0) + ((Number(p.quantity) || 0) * (Number(p.unitPrice) || 0));
                  return acc;
                }, {} as Record<string, number>)
                : { [job.currency]: job.totalPrice };

              const jobProductsValuationObj = Object.fromEntries(
                Object.entries(jobProductsValuationObjGross).map(([c, v]) => [c, v * (1 - (job.discountPercentage || 0) / 100)])
              );

              const formatMultiTotal = (obj: Record<string, number>) => {
                const parts = Object.entries(obj).filter(([_, v]) => v !== 0).map(([c, v]) => formatCurrency(v, c));
                return parts.length ? parts.join(' | ') : formatCurrency(0, job.currency);
              };

              return (
                <div key={job.id} className="rounded-xl bg-card border shadow-sm transition-shadow hover:shadow-md">
                  <div className="p-5 cursor-pointer" onClick={() => setExpandedJob(isExpanded ? null : job.id)}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Briefcase className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-foreground">{job.title}</h3>
                          <Badge variant="outline" className={statusColors[job.status]}>{t(`status.${job.status}`, job.status)}</Badge>
                          {job.isSold && <Badge variant="secondary">Sold</Badge>}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {client && <span className="flex items-center gap-1"><Users className="h-3 w-3" />Client: {client.name}</span>}
                          {supplier && <span className="flex items-center gap-1"><Users className="h-3 w-3" />Supplier: {supplier.name}</span>}
                          {job.invoiceNumber && <span className="flex items-center gap-1 font-mono">INV: {job.invoiceNumber}</span>}
                          {job.blNumber && <span className="flex items-center gap-1 font-mono">B/L: {job.blNumber}</span>}

                          {/* Render all linked containers */}
                          {(job.containerIds || []).map((cid, idx) => {
                            const linkedC = containers.find(c => c.id === cid);
                            return linkedC ? <span key={idx} className="flex items-center gap-1"><Ship className="h-3 w-3" />{linkedC.containerNumber}</span> : null;
                          })}
                          {/* Fallback for legacy jobs with single containerId */}
                          {(!job.containerIds || job.containerIds.length === 0) && container && (
                            <span className="flex items-center gap-1"><Ship className="h-3 w-3" />{container.containerNumber}</span>
                          )}

                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(job.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-foreground">{formatMultiTotal(jobProductsValuationObj)}</p>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t px-5 pb-5 pt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
                        <div>
                          <p className="text-muted-foreground">{t('Job Settings', 'Job Settings')}</p>
                          <ul className="mt-1 space-y-1">
                            {job.blNumber && <li><span className="font-medium">B/L No:</span> {job.blNumber}</li>}
                            {job.exportCertificate && <li><span className="font-medium">Cert:</span> {job.exportCertificate}</li>}
                            {job.shippingAgent && <li><span className="font-medium">Shipping Agent:</span> {job.shippingAgent}</li>}
                            {job.packingListUrl && (
                              <li>
                                <button onClick={(e) => { e.stopPropagation(); setPreviewImage(job.packingListUrl!); }} className="text-primary hover:underline flex items-center gap-1 font-medium">
                                  <FileText className="h-3.5 w-3.5" /> View Packing List
                                </button>
                              </li>
                            )}
                            <li><span className="font-medium">Discount:</span> {job.discountPercentage}%</li>
                          </ul>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-muted-foreground">{t('Financial Summary', 'Financial Summary')}</p>
                          <div className="mt-2 bg-background p-3 rounded border font-mono space-y-1">
                            {(() => {
                              // Compute from transactions
                              const jobTxs = transactions.filter(tx => tx.relatedId === job.id);
                              const sumByCurr = (filterFn: (t: any) => boolean, mapFn: (t: any) => number = t => t.amount) => {
                                return jobTxs.filter(filterFn).reduce((acc, t) => {
                                  const c = t.currency || job.currency;
                                  acc[c] = (acc[c] || 0) + mapFn(t);
                                  return acc;
                                }, {} as Record<string, number>);
                              };

                              const mergeCurr = (...objs: Record<string, number>[]) => {
                                const res: Record<string, number> = {};
                                objs.forEach(o => {
                                  Object.entries(o).forEach(([c, v]) => {
                                    if (v !== 0) res[c] = (res[c] || 0) + v;
                                  });
                                });
                                return res;
                              };

                              const formatMulti = (obj: Record<string, number>) => {
                                const parts = Object.entries(obj).filter(([_, v]) => v !== 0).map(([c, v]) => formatCurrency(v, c));
                                return parts.length ? parts.join(' | ') : formatCurrency(0, job.currency);
                              };

                              const isMultiZero = (obj: Record<string, number>) => Object.values(obj).every(v => v === 0);

                              const txIncomingObj = sumByCurr(t => t.type === 'incoming');
                              const txOutgoingObj = sumByCurr(t => t.type === 'outgoing');
                              const txPettyCashObj = sumByCurr(t => t.type === 'petty_cash');
                              const txRawMatObj = sumByCurr(t => t.type === 'raw_material');
                              const txOtherCostObj = sumByCurr(t => t.type === 'raw_material', t => Number(t.otherCost) || 0);
                              const txDiscountObj = sumByCurr(t => t.type === 'discount');

                              const baseOtherObj = { [job.currency]: job.pettyCash || 0 };
                              const grossRM = job.rawMaterialCost || 0;
                              const netRM = grossRM - (grossRM * ((job.supplierDiscountPercentage || 0) / 100));
                              const baseRawMatObj = { [job.currency]: netRM };
                              const jobProductsValuationObjLocal = jobProductsValuationObj;
                              const grossValuationObj = jobProductsValuationObjGross;

                              const agentCostObj: Record<string, number> = {};
                              shippingAgentRecords.filter(r => r.jobId === job.id).forEach(r => {
                                if (r.costEgp) agentCostObj['EGP'] = (agentCostObj['EGP'] || 0) + r.costEgp;
                                if (r.costEuro) agentCostObj['EUR'] = (agentCostObj['EUR'] || 0) + r.costEuro;
                                if (r.costUsd) agentCostObj['USD'] = (agentCostObj['USD'] || 0) + r.costUsd;
                              });

                              const baseDiscountObj = Object.fromEntries(
                                Object.entries(grossValuationObj).map(([c, v]) => [c, v * ((job.discountPercentage || 0) / 100)])
                              );

                              const totalOtherCostsObj = mergeCurr(baseOtherObj, txPettyCashObj, txOtherCostObj, agentCostObj);
                              const totalRawMatObj = mergeCurr(baseRawMatObj, txRawMatObj);
                              const totalDiscountObj = mergeCurr(baseDiscountObj, txDiscountObj);

                              const totalAccumulatedObj = mergeCurr(totalOtherCostsObj, totalRawMatObj, totalDiscountObj);
                              const totalSupplierOtherObj = mergeCurr(totalOtherCostsObj, totalRawMatObj);

                              return (
                                <>
                                  <div className="flex justify-between font-bold text-lg border-b pb-2">
                                    <span>Products Valuation (Net Result):</span>
                                    <span>{formatMulti(jobProductsValuationObjLocal)}</span>
                                  </div>

                                  {!isMultiZero(txIncomingObj) && (
                                    <div className="flex justify-between text-success text-xs pt-2">
                                      <span>Total Incoming Payments:</span>
                                      <span>{formatMulti(txIncomingObj)}</span>
                                    </div>
                                  )}

                                  {!isMultiZero(txOutgoingObj) && (
                                    <div className="flex justify-between text-destructive text-xs">
                                      <span>Total Outgoing Payments:</span>
                                      <span>{formatMulti(txOutgoingObj)}</span>
                                    </div>
                                  )}

                                  {!isMultiZero(totalAccumulatedObj) && (
                                    <div className="flex justify-between text-warning text-xs pt-2 border-t border-dashed">
                                      <span>Total Accumulated Costs & Discounts:</span>
                                      <span>{formatMulti(totalAccumulatedObj)}</span>
                                    </div>
                                  )}
                                  {!isMultiZero(totalSupplierOtherObj) && (
                                    <div className="pt-2 border-t border-dashed mt-2">
                                      <div className="space-y-1 text-[11px] text-muted-foreground mb-2 px-2">
                                        {grossRM > 0 && <div className="flex justify-between"><span>Base Supplier Cost (Net):</span><span>{formatCurrency(netRM, job.currency)}</span></div>}
                                        {!isMultiZero(txRawMatObj) && <div className="flex justify-between"><span>Ledger Supplier Cost (Rows):</span><span>{formatMulti(txRawMatObj)}</span></div>}
                                        {(job.pettyCash || 0) > 0 && <div className="flex justify-between"><span>Base Other Cost (Job Edit):</span><span>{formatCurrency(job.pettyCash || 0, job.currency)}</span></div>}
                                        {!isMultiZero(txOtherCostObj) && <div className="flex justify-between"><span>Other Cost (Supplier Ledger):</span><span>{formatMulti(txOtherCostObj)}</span></div>}
                                        {!isMultiZero(txPettyCashObj) && <div className="flex justify-between"><span>Other Cost (Financial Daybook):</span><span>{formatMulti(txPettyCashObj)}</span></div>}
                                        {!isMultiZero(agentCostObj) && <div className="flex justify-between"><span>Shipping Agent Costs:</span><span>{formatMulti(agentCostObj)}</span></div>}
                                      </div>
                                      <div className="flex justify-between text-destructive text-sm font-bold pt-2 border-t border-dashed">
                                        <span>Total Cost (Supplier + Other):</span>
                                        <span>{formatMulti(totalSupplierOtherObj)}</span>
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      {job.products.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">{t('Products', 'Products')}</p>
                          <div className="rounded-lg bg-muted/40 p-3 space-y-2">
                            {job.products.map((jp, i) => {
                              const prod = products.find(p => p.id === jp.productId);
                              return (
                                <div key={i} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <Wheat className="h-3.5 w-3.5 text-primary" />
                                    <span className="text-foreground">{prod?.name || 'Unknown'}</span>
                                  </div>
                                  <span className="text-muted-foreground">
                                    {jp.quantity} × {formatCurrency(jp.unitPrice, jp.currency || job.currency)} = <span className="font-medium text-foreground">{formatCurrency(jp.quantity * jp.unitPrice, jp.currency || job.currency)}</span>
                                    {jp.packages && ` · ${jp.packages} pkgs`}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {(() => {
                        const linkedOps = shipmentOperations.filter(op => op.jobId === job.id);
                        if (linkedOps.length === 0) return null;
                        return (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">{t('Linked Operations', 'عمليات التشغيل المرتبطة')}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {linkedOps.map(op => (
                                <div key={op.id} className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1 text-sm cursor-pointer hover:bg-primary/10 transition-colors" onClick={(e) => { e.stopPropagation(); navigate('/operations'); }}>
                                  <div className="flex items-center justify-between font-semibold">
                                    <span className="text-primary">{formatDate(op.operationDate || op.jobDate)}</span>
                                    {op.containerNumber && <Badge variant="outline" className="text-[10px]">{op.containerNumber}</Badge>}
                                  </div>
                                  <div className="text-muted-foreground text-xs grid grid-cols-2 gap-x-2 gap-y-1 mt-2">
                                    {op.quantity && <div><span className="font-medium text-foreground">{t('Quantity')}:</span> {op.quantity}</div>}
                                    {op.product && <div><span className="font-medium text-foreground">{t('Product')}:</span> {op.product}</div>}
                                    {op.responsiblePerson && <div><span className="font-medium text-foreground">{t('Resp. Person')}:</span> {op.responsiblePerson}</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {job.attachments && job.attachments.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">{t('Uploaded Documents & PDF', 'Uploaded Documents/PDFs/Photos')}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {job.attachments.map(att => (
                              <div key={att.id} className="relative rounded-lg overflow-hidden border group cursor-pointer" onClick={(e) => { e.stopPropagation(); setPreviewImage(att.url); }}>
                                {att.url.startsWith('data:image/') ? (
                                  <img src={att.url} alt={att.description} className="h-24 w-full object-cover transition-transform group-hover:scale-105" />
                                ) : (
                                  <div className="h-24 w-full flex items-center justify-center bg-muted text-muted-foreground transition-transform group-hover:scale-105">
                                    <FileText className="h-8 w-8" />
                                  </div>
                                )}
                                {att.description && (
                                  <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1.5 text-[10px] text-white truncate">
                                    {att.description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {job.notes && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">{t('Notes', 'Notes')}</p>
                          <p className="text-sm text-foreground">{job.notes}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t mt-4 pt-4">
                        <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}`); }}>
                          <Briefcase className="mr-1.5 h-3.5 w-3.5" /> Detailed Ledger & Add Costs
                        </Button>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(job); }}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Summary
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10"
                          onClick={(e) => { e.stopPropagation(); setDeleting(job); setDeleteOpen(true); }}>
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete & Archive
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredJobs.length === 0 && (
              <div className="rounded-xl border-2 border-dashed p-12 text-center">
                <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">No jobs found in {activeTab}</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${form.operationType}` : `Create New ${form.operationType}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Job Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              <div>
                <Label>Job Date</Label>
                <DatePicker value={form.createdAt} onChange={v => setForm(f => ({ ...f, createdAt: v }))} />
              </div>

              <div>
                <Label>Invoice Number</Label>
                <Input value={form.invoiceNumber} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} />
              </div>

              <div>
                <Label>B/L Number (رقم البوليصة)</Label>
                <Input value={form.blNumber} onChange={e => setForm(f => ({ ...f, blNumber: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Client (Buyer)</Label>
                <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Supplier (Vendor)</Label>
                <Select value={form.supplierId} onValueChange={v => setForm(f => ({ ...f, supplierId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select Supplier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {form.operationType === 'export' && (
                <div>
                  <Label>Export Certificate</Label>
                  <Input value={form.exportCertificate} onChange={e => setForm(f => ({ ...f, exportCertificate: e.target.value }))} />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Shipping Agent (الوكيل البحري)</Label>
                  <Select value={form.shippingAgent || 'none'} onValueChange={v => setForm(f => ({ ...f, shippingAgent: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Shipping Agent" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {shippingAgents.map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Incoterm</Label>
                  <Select value={form.incoterm || 'none'} onValueChange={v => setForm(f => ({ ...f, incoterm: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Incoterm" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="EXW">EXW (Ex Works)</SelectItem>
                      <SelectItem value="FOB">FOB (Free On Board)</SelectItem>
                      <SelectItem value="CFR">CFR (Cost and Freight)</SelectItem>
                      <SelectItem value="CIF">CIF (Cost, Insurance, and Freight)</SelectItem>
                      <SelectItem value="DAP">DAP (Delivered at Place)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Departure Port <span className="text-xs text-muted-foreground">(Optional)</span></Label>
                  <Input placeholder="Departure Port" value={form.departurePort} onChange={e => setForm(f => ({ ...f, departurePort: e.target.value }))} />
                </div>
                <div>
                  <Label>Arrival Port <span className="text-xs text-muted-foreground">(Optional)</span></Label>
                  <Input placeholder="Arrival Port" value={form.arrivalPort} onChange={e => setForm(f => ({ ...f, arrivalPort: e.target.value }))} />
                </div>
                <div>
                  <Label>Transit To <span className="text-xs text-muted-foreground">(Optional)</span></Label>
                  <Input placeholder="Transit To" value={form.transitTo} onChange={e => setForm(f => ({ ...f, transitTo: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Packing List</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Input type="file" accept="image/*,.pdf,.xlsx,.xls,.csv" onChange={handlePackingListUpload} className="flex-1" />
                    {form.packingListUrl && <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white shrink-0">Attached</Badge>}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Number of Containers</Label>
                <Input type="number" min="0" value={form.numberOfContainers} onChange={e => {
                  const num = Number(e.target.value) || 0;
                  setForm(f => {
                    const newContainerIds = [...f.containerIds];
                    while (newContainerIds.length < num) newContainerIds.push('none');
                    return { ...f, numberOfContainers: e.target.value, containerIds: newContainerIds.slice(0, num) };
                  });
                }} placeholder="0" />
              </div>

              {Array.from({ length: Number(form.numberOfContainers) || 0 }).map((_, i) => (
                <div key={i}>
                  <Label>Container #{i + 1}</Label>
                  <Select value={form.containerIds[i] || 'none'} onValueChange={v => {
                    setForm(f => {
                      const newIds = [...f.containerIds];
                      newIds[i] = v;
                      return { ...f, containerIds: newIds };
                    });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Link container" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No container / Skip</SelectItem>
                      {containers.map(c => <SelectItem key={c.id} value={c.id}>{c.containerNumber}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              <div>
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="EGP">EGP (ج.م)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date</Label>
                <DatePicker value={form.paymentDate} onChange={v => setForm(f => ({ ...f, paymentDate: v }))} />
              </div>

              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Job['status'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('status.active', 'Active')}</SelectItem>
                    <SelectItem value="completed">{t('status.completed', 'Completed')}</SelectItem>
                    <SelectItem value="cancelled">{t('status.cancelled', 'Cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.operationType === 'import' && (
              <div className="flex items-center space-x-2">
                <Checkbox id="isSold" checked={form.isSold} onCheckedChange={(checked) => setForm(f => ({ ...f, isSold: !!checked }))} />
                <Label htmlFor="isSold">Mark as Sold Locally (تم البيع)</Label>
              </div>
            )}

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('Notes', 'Notes')}</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-20" />
              </div>
              <div>
                <Label>Number of quality represintatives</Label>
                <Input type="number" min="0" value={form.numberOfReps} onChange={e => {
                  const val = parseInt(e.target.value) || 0;
                  setForm(f => {
                    const newNames = [...f.repNames];
                    while (newNames.length < val) newNames.push('');
                    return { ...f, numberOfReps: val || '', repNames: newNames };
                  });
                }} />
                {(Number(form.numberOfReps) || 0) > 0 && (
                  <div className="mt-2 space-y-2 max-h-32 overflow-y-auto p-1 border rounded bg-muted/20">
                    {Array.from({ length: Number(form.numberOfReps) || 0 }).map((_, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                        <Input className="h-7 text-xs" placeholder={`Representative ${idx + 1} Name`} value={form.repNames[idx] || ''} onChange={e => {
                          setForm(f => {
                            const newNames = [...f.repNames];
                            newNames[idx] = e.target.value;
                            return { ...f, repNames: newNames };
                          });
                        }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-muted/30 p-4 rounded-xl border border-dashed space-y-4">
              <div>
                <h4 className="font-semibold text-sm">Account Statement Additions / كشف الحساب</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Amounts mapped to job's currency</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                <div>
                  <Label>Weight (Tons)</Label>
                  <Input type="number" step="any" value={form.rawMaterialWeight === 0 ? '' : form.rawMaterialWeight} onChange={e => setForm(f => ({ ...f, rawMaterialWeight: e.target.value }))} />
                </div>
                <div>
                  <Label>R. Material Price/Ton</Label>
                  <Input type="number" step="any" value={form.rawMaterialPricePerTon === 0 ? '' : form.rawMaterialPricePerTon} onChange={e => setForm(f => ({ ...f, rawMaterialPricePerTon: e.target.value }))} />
                </div>
                <div>
                  <Label>Supplier Discount (%)</Label>
                  <Input type="number" step="any" placeholder="e.g. 5" value={form.supplierDiscountPercentage === 0 ? '' : form.supplierDiscountPercentage} onChange={e => setForm(f => ({ ...f, supplierDiscountPercentage: e.target.value }))} />
                </div>
                <div>
                  <Label>Other Cost Amount</Label>
                  <Input type="number" step="any" value={form.pettyCash === 0 ? '' : form.pettyCash} onChange={e => setForm(f => ({ ...f, pettyCash: e.target.value }))} />
                </div>
                <div>
                  <Label>Other Cost Reason</Label>
                  <Input placeholder="e.g. storage fees" value={form.otherCostReason || ''} onChange={e => setForm(f => ({ ...f, otherCostReason: e.target.value }))} />
                </div>
              </div>

              <div className="bg-primary/5 p-3 rounded border text-sm flex flex-col items-center gap-1">
                {(() => {
                  const baseRM = (Number(form.rawMaterialWeight) || 0) * (Number(form.rawMaterialPricePerTon) || 0);
                  const suppDisc = Number(form.supplierDiscountPercentage) || 0;
                  const netRM = baseRM - (baseRM * (suppDisc / 100));
                  const totalCost = netRM + (Number(form.pettyCash) || 0);
                  return (
                    <>
                      <div><span className="font-semibold">Calculated Supplier Cost (Net):</span> {formatCurrency(netRM, form.currency)}</div>
                      <div className="text-destructive font-bold text-base"><span className="font-semibold text-foreground">Total Cost (Supplier + Other):</span> {formatCurrency(totalCost, form.currency)}</div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Products</Label>
                <Button variant="outline" size="sm" onClick={addProductLine}><Plus className="mr-1 h-3 w-3" /> Add Product</Button>
              </div>
              <div className="space-y-3">
                {form.products.map((jp, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-2 relative">
                    <button onClick={() => removeProductLine(i)} className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 rounded p-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <p className="text-xs font-medium text-muted-foreground">Product #{i + 1}</p>
                    <Select value={jp.productId} onValueChange={v => updateProductLine(i, 'productId', v)}>
                      <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                      <div>
                        <Label className="text-sm">Quantity</Label>
                        <Input type="number" step="any" value={jp.quantity === 0 ? '' : jp.quantity} onChange={e => updateProductLine(i, 'quantity', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-sm">Unit Price</Label>
                        <Input type="number" step="any" value={jp.unitPrice === 0 ? '' : jp.unitPrice} onChange={e => updateProductLine(i, 'unitPrice', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-sm">Currency</Label>
                        <Select value={jp.currency || form.currency} onValueChange={v => updateProductLine(i, 'currency', v)}>
                          <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="EGP">EGP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">No. Pallets</Label>
                        <Input type="number" step="any" value={jp.numberOfPallets === 0 ? '' : jp.numberOfPallets} onChange={e => updateProductLine(i, 'numberOfPallets', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-sm">Variety</Label>
                        <Input placeholder="Variety" value={jp.variety || ''} onChange={e => updateProductLine(i, 'variety', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-sm">Caliber</Label>
                        <Input placeholder="Caliber" value={jp.caliber || ''} onChange={e => updateProductLine(i, 'caliber', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-sm">Grade</Label>
                        <Input placeholder="Grade" value={jp.grade || ''} onChange={e => updateProductLine(i, 'grade', e.target.value)} />
                      </div>
                      <div className="sm:col-span-2 lg:col-span-2">
                        <Label className="text-sm">Packages (Qty & Kind)</Label>
                        <div className="flex gap-2">
                          <Input value={jp.packages === 0 ? '' : jp.packages} onChange={e => updateProductLine(i, 'packages', e.target.value)} className="w-1/2" placeholder="e.g. 10 Boxes" />
                          <Input placeholder="Kind" value={jp.packageType || ''} onChange={e => updateProductLine(i, 'packageType', e.target.value)} className="w-1/2" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex justify-end">
                <div className="w-48">
                  <Label className="text-primary font-semibold">Client Discount (%)</Label>
                  <Input type="number" step="any" placeholder="e.g. 5" value={form.discountPercentage === 0 ? '' : form.discountPercentage} onChange={e => setForm(f => ({ ...f, discountPercentage: e.target.value }))} className="border-primary/50 focus-visible:ring-primary" />
                </div>
              </div>

              {/* Live Summary inside Modal */}
              <div className="mt-4 p-4 rounded-xl border-2 bg-muted/30">
                <h4 className="font-semibold text-sm mb-2 text-primary">Live Financial Summary</h4>
                <div className="space-y-1 font-mono text-sm">
                  {(() => {
                    const prodObj: Record<string, number> = {};
                    form.products.forEach(p => {
                      const c = p.currency || form.currency;
                      prodObj[c] = (prodObj[c] || 0) + (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0);
                    });

                    const clientDiscount = Number(form.discountPercentage) || 0;
                    if (clientDiscount > 0) {
                      Object.keys(prodObj).forEach(c => {
                        prodObj[c] = prodObj[c] - (prodObj[c] * (clientDiscount / 100));
                      });
                    }

                    const costObj: Record<string, number> = {};
                    const baseRM = (Number(form.rawMaterialWeight) || 0) * (Number(form.rawMaterialPricePerTon) || 0);
                    const suppDiscount = Number(form.supplierDiscountPercentage) || 0;
                    const netRM = baseRM - (baseRM * (suppDiscount / 100));
                    const rmCost = netRM + (Number(form.pettyCash) || 0);
                    if (rmCost > 0) costObj[form.currency] = rmCost;

                    return (
                      <>
                        <div className="flex justify-between font-bold text-lg pb-2 border-b">
                          <span>Products Valuation (Net Result):</span>
                          <span>{Object.keys(prodObj).length > 0 ? formatBalanceObj(prodObj) : formatCurrency(0, form.currency)}</span>
                        </div>
                        {Object.keys(costObj).length > 0 && (
                          <div className="flex justify-between text-warning text-xs pt-2">
                            <span>Total Accumulated Costs & Discounts:</span>
                            <span>{formatBalanceObj(costObj)}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Upload PDF/Images/Documents</Label>
                <div>
                  <Input type="file" accept="image/*,.pdf,.xlsx,.xls,.csv" id="photo-upload" className="hidden" onChange={handlePhotoUpload} />
                  <Button variant="outline" size="sm" type="button" onClick={() => document.getElementById('photo-upload')?.click()}>
                    <Camera className="mr-1 h-3 w-3" /> Upload
                  </Button>
                </div>
              </div>

              {form.attachments && form.attachments.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {form.attachments.map((att, i) => (
                    <div key={att.id} className="flex gap-2 items-center border rounded-lg p-2 bg-muted/20">
                      {att.url.startsWith('data:image/') ? (
                        <img src={att.url} className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex flex-shrink-0 items-center justify-center">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <Input className="h-8 text-xs" placeholder="Description..." value={att.description} onChange={e => {
                        setForm(f => {
                          const atts = [...(f.attachments || [])];
                          atts[i] = { ...atts[i], description: e.target.value };
                          return { ...f, attachments: atts };
                        });
                      }} />
                      <button type="button" onClick={() => removeAttachment(i)} className="text-destructive p-1 rounded hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Job</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FileViewer fileUrl={previewImage} onClose={() => setPreviewImage(null)} />

      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete} itemName={deleting?.title || ''} />
    </div>
  );
}
