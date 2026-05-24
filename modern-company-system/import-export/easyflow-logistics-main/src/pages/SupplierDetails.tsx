import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams as useRouterParams, useNavigate as useRouterNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  getSuppliers, getJobs, getTransactions, getContainers, getProducts,
  formatDate, formatCurrency, formatBalanceObj, Job, saveJobs, generateId, saveTransactions, Transaction
} from '@/data/store';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Printer, Trash2, Phone, Mail, MapPin, Download, FileText, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/DatePicker';
import axios from '@/api/axios';

function EditableCell({ value, type = 'text', onSave, className = '', placeholder = '' }: { value: string | number | undefined, type?: string, onSave: (val: string | number) => void, className?: string, placeholder?: string }) {
  const [val, setVal] = useState(value !== undefined && value !== null ? value : '');

  const valRef = useRef(val);
  const onSaveRef = useRef(onSave);
  const propValRef = useRef(value);

  useEffect(() => { valRef.current = val; }, [val]);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { propValRef.current = value; }, [value]);

  useEffect(() => {
    if (String(value) !== String(valRef.current)) {
      setVal(value !== undefined && value !== null ? value : '');
    }
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      let finalVal = val;
      if (type === 'number') {
        finalVal = finalVal === '' ? 0 : Number(finalVal);
      }
      if (finalVal !== value && val !== '') {
        onSave(finalVal);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [val, type, value, onSave]);

  useEffect(() => {
    return () => {
      let finalVal = valRef.current;
      if (type === 'number') {
        finalVal = finalVal === '' ? 0 : Number(finalVal);
      }
      if (finalVal !== propValRef.current && valRef.current !== '') {
        onSaveRef.current(finalVal);
      }
    };
  }, [type]);

  const handleBlur = () => {
    let finalVal = val;
    if (type === 'number') {
      finalVal = finalVal === '' ? 0 : Number(finalVal);
    }
    if (finalVal !== value) {
      onSave(finalVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLElement).blur();
    }
  };

  return (
    <input
      type={type}
      step={type === 'number' ? 'any' : undefined}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`bg-transparent outline-none focus:ring-1 focus:ring-primary rounded px-1 py-0.5 transition-colors hover:bg-muted/50 border border-transparent hover:border-input focus:border-input ${className}`}
    />
  );
}

export default function SupplierDetails() {
  const { id } = useRouterParams();
  const navigate = useRouterNavigate();
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const suppliers = useMemo(() => getSuppliers(), []);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const containers = useMemo(() => getContainers(), []);
  const allProducts = useMemo(() => getProducts(), []);

  useEffect(() => {
    setJobs(getJobs());
    setTransactions(getTransactions());
  }, []);

  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [filterJobId, setFilterJobId] = useState<string>('all');
  const [filterCurrency, setFilterCurrency] = useState<string>('all');
  const [newRecordJobId, setNewRecordJobId] = useState('');
  const [newRecordAmount, setNewRecordAmount] = useState('');
  const [newRecordDesc, setNewRecordDesc] = useState('');
  const [newRecordCurrency, setNewRecordCurrency] = useState('USD');
  const [newRecordDate, setNewRecordDate] = useState(new Date().toISOString().split('T')[0]);

const handleAddExcelRow = async () => {
  const numericSupplierId = id ? parseInt(id, 10) : null;

  if (!numericSupplierId || isNaN(numericSupplierId)) {
    toast.error("Invalid Supplier ID");
    return;
  }

  const parsedJobId = filterJobId !== 'all' ? parseInt(filterJobId, 10) : null;
  const numericJobId = (parsedJobId && !isNaN(parsedJobId)) ? parsedJobId : null;

  // بناء الـ Payload مع التحقق من الحقول الرقمية وعدم إرسال قيم null إذا كان الباك إند يتحسس منها
  const newTxPayload: Record<string, any> = {
    entity_id: numericSupplierId,
    type: 'raw_material', 
    amount: 0,
    currency: filterCurrency !== 'all' ? filterCurrency : 'USD', 
    date: new Date().toISOString().split('T')[0], 
    description: 'New Raw Material Entry', 
    bl_number: '-', 
    weight_in_tons: 0,
    price_per_ton: 0,
    other_cost: 0
  };

  // إرسال الحقل فقط إذا كان هناك Job محدد بالفعل، وإلا نتركه تماماً أو نرسل الحقل المتوقع من الباك إند
  if (numericJobId) {
    newTxPayload.related_id = numericJobId;
    // ملحوظة: لو الباك إند في قاعدة البيانات مسمي الحقل job_id وليس related_id، قم بتفعيل السطر التالي:
    // newTxPayload.job_id = numericJobId; 
  }

  try {
    const response = await axios.post('/api/transactions', newTxPayload);
    const savedTxFromBackend = response.data; 

    const normalizedTx = {
      ...savedTxFromBackend,
      id: savedTxFromBackend.id,
      supplierId: savedTxFromBackend.entity_id,
      relatedId: savedTxFromBackend.related_id || savedTxFromBackend.job_id,
      blNumber: savedTxFromBackend.bl_number,
      weightInTons: savedTxFromBackend.weight_in_tons,
      pricePerTon: savedTxFromBackend.price_per_ton,
      otherCost: savedTxFromBackend.other_cost
    };

    setTransactions(prev => [...prev, normalizedTx]);
    toast.success("Row added successfully");
  } catch (error) {
    console.error("Backend error details:", error); // لمشاهدة تفاصيل الخطأ القادم من السيرفر في الـ Console
    toast.error("Failed to save to backend");
  }
};

  const handleTxUpdate = async (txId: string | number, field: keyof Transaction, value: any) => {
    const numericSupplierId = id ? parseInt(id, 10) : null;
    const previousTransactions = [...transactions];

    let targetTx: any = null;
    const updated = transactions.map(t => {
      if (String(t.id) === String(txId)) {
        const newT = { 
          ...t, 
          [field]: value,
          supplierId: (t as any).supplierId || numericSupplierId,
          jobId: (t as any).jobId || (t.relatedId && t.relatedId !== id ? parseInt(t.relatedId, 10) : null)
        };

        if (field === 'weightInTons' || field === 'pricePerTon') {
          newT.amount = (Number(newT.weightInTons) || 0) * (Number(newT.pricePerTon) || 0);
        }
        targetTx = newT;
        return newT;
      }
      return t;
    });
    setTransactions(updated);

    // 🔹 تعديل هنا: خريطة تحويل المسميات عند التحديث للسيرفر
    const dbFieldsMap: Record<string, string> = {
      date: 'date',
      description: 'description',
      currency: 'currency',
      amount: 'amount',
      type: 'type',
      relatedId: 'related_id',
      blNumber: 'bl_number',
      weightInTons: 'weight_in_tons',
      pricePerTon: 'price_per_ton',
      otherCost: 'other_cost'
    };

    const dbField = dbFieldsMap[field as string] || (field as string);

    try {
      await axios.put(`/api/transactions/${txId}`, {
        [dbField]: value,
        amount: targetTx.amount 
      });
    } catch (error) {
      toast.error("Failed to update on server");
      setTransactions(previousTransactions);
    }
  }; 

  const handleDeleteTx = async (txId: string | number) => {
    const previousTransactions = [...transactions];
    const updated = transactions.filter(t => String(t.id) !== String(txId));
    setTransactions(updated);

    try {
      await axios.delete(`/api/transactions/${txId}`);
      toast.success("Row deleted successfully");
    } catch (error) {
      toast.error("Failed to delete from server");
      setTransactions(previousTransactions);
    }
  };

  const supplier = suppliers.find(s => s.id === id);

  const supplierTransactions = useMemo(() => {
    const numericSupplierId = id ? parseInt(id, 10) : null;
    const supplierJobIds = jobs.filter(j => j.supplierId === id).map(j => j.id);
    
    const manualTxs = transactions.filter(t => {
      if (t.type === 'discount') return false;
      
      // التوافق مع الحقول القادمة من السيرفر كـ snake_case أو كود الفرونت الحالي
      const tEntityId = (t as any).entity_id || t.entityId;
      const tSupplierId = (t as any).supplierId || t.supplierId;
      const tRelatedId = (t as any).related_id || t.relatedId;

      const isBelongsToSupplier = 
        tSupplierId === numericSupplierId || 
        tEntityId === id || 
        tRelatedId === id;

      if (isBelongsToSupplier) return true;

      if (tRelatedId && supplierJobIds.includes(tRelatedId)) {
        return t.type === 'raw_material';
      }
      return false;
    }).map(t => ({
      ...t,
      relatedId: (t as any).related_id || t.relatedId,
      blNumber: (t as any).bl_number || t.blNumber,
      weightInTons: (t as any).weight_in_tons !== undefined ? (t as any).weight_in_tons : t.weightInTons,
      pricePerTon: (t as any).price_per_ton !== undefined ? (t as any).price_per_ton : t.pricePerTon,
      otherCost: (t as any).other_cost !== undefined ? (t as any).other_cost : t.otherCost
    }));

    const autoTxs: any[] = [];
    const supplierJobsList = jobs.filter(j => j.supplierId === id);
    
    supplierJobsList.forEach(job => {
      const grossCost = job.rawMaterialCost || ((Number(job.rawMaterialWeight) || 0) * (Number(job.rawMaterialPricePerTon) || 0));
      const suppDisc = job.supplierDiscountPercentage || 0;
      const cost = grossCost - (grossCost * (suppDisc / 100));
      autoTxs.push({
        id: `auto-job-${job.id}`,
        relatedId: job.id,
        type: 'raw_material',
        amount: cost,
        otherCost: Number(job.pettyCash) || 0,
        currency: job.currency,
        date: job.createdAt,
        description: `Auto Job Cost: ${job.title}`,
        weightInTons: job.rawMaterialWeight || 0,
        pricePerTon: job.rawMaterialPricePerTon || 0,
        blNumber: job.blNumber || '',
        isAuto: true
      });
    });

    let allTxs = [...manualTxs, ...autoTxs];
    
    if (filterJobId !== 'all') {
      allTxs = allTxs.filter(t => t.relatedId === filterJobId);
    }
    
    if (filterCurrency !== 'all') {
      allTxs = allTxs.filter(t => (t.currency || 'USD') === filterCurrency);
    }
    
    return allTxs.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, jobs, id, filterJobId, filterCurrency]);

  const supplierJobs = useMemo(() => {
    return jobs.filter(j => j.supplierId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [jobs, id]);

  const handleJobUpdate = (jobId: string, field: keyof Job, value: string | number) => {
    setJobs(prev => {
      const updated = prev.map(job => {
        if (job.id === jobId) {
          const newJob = { ...job, [field]: value };
          if (field === 'rawMaterialPricePerTon' || field === 'rawMaterialWeight' || field === 'pettyCash') {
            if (field === 'rawMaterialPricePerTon' || field === 'rawMaterialWeight') {
              const p = newJob.rawMaterialPricePerTon || 0;
              const w = newJob.rawMaterialWeight || 0;
              newJob.rawMaterialCost = p * w;
            }
            newJob.totalPrice = (Number(newJob.rawMaterialCost) || 0) + (Number(newJob.pettyCash) || 0);
          } else if (field === 'rawMaterialCost') {
            newJob.totalPrice = (Number(newJob.rawMaterialCost) || 0) + (Number(newJob.pettyCash) || 0);
          }
          return newJob;
        }
        return job;
      });
      saveJobs(updated);
      return updated;
    });
  };

  if (!supplier) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold">Supplier not found</h2>
        <Button onClick={() => navigate('/suppliers')} className="mt-4">Back to Suppliers</Button>
      </div>
    );
  }

const handleAddRecord = async () => {
    const numericSupplierId = id ? parseInt(id, 10) : null;

    if (!numericSupplierId || isNaN(numericSupplierId)) {
      toast.error("Invalid Supplier ID");
      return;
    }

    if (!newRecordAmount || isNaN(Number(newRecordAmount))) {
      toast.error("Please enter a valid amount");
      return;
    }

    // 💡 التعديل الجوهري هنا: تحويل الـ Job ID لرقم صريح في حقل السندات لتفادي الـ 400
    const parsedRecordJobId = newRecordJobId && newRecordJobId !== 'none' ? parseInt(newRecordJobId, 10) : null;
    const numericRecordJobId = (parsedRecordJobId && !isNaN(parsedRecordJobId)) ? parsedRecordJobId : null;

    const newTxPayload = {
      entity_id: numericSupplierId,
      related_id: numericRecordJobId, // 👈 بيبعت رقم أو null
      type: 'outgoing', 
      amount: Number(newRecordAmount),
      currency: newRecordCurrency,
      date: newRecordDate, // هو أصلاً مقصوص جاهز YYYY-MM-DD من الـ State
      description: newRecordDesc || 'Payment Given',
      bl_number: '-',
      weight_in_tons: 0,
      price_per_ton: 0,
      other_cost: 0
    };

    try {
      const response = await axios.post('/api/transactions', newTxPayload);
      const savedTxFromBackend = response.data; 

      const normalizedTx = {
        ...savedTxFromBackend,
        id: savedTxFromBackend.id,
        supplierId: savedTxFromBackend.entity_id,
        relatedId: savedTxFromBackend.related_id,
        blNumber: savedTxFromBackend.bl_number,
        weightInTons: savedTxFromBackend.weight_in_tons,
        pricePerTon: savedTxFromBackend.price_per_ton,
        otherCost: savedTxFromBackend.other_cost
      };

      setTransactions(prev => [...prev, normalizedTx]);
      setIsAddRecordOpen(false);
      toast.success("Payment record added successfully");

      setNewRecordAmount('');
      setNewRecordDesc('');
      setNewRecordJobId('');
    } catch (error) {
      console.error("Error saving record to PostgreSQL:", error);
      toast.error("Failed to save record to backend");
    }
  };

  const printRow = (tx: Transaction) => {
    const jobName = tx.relatedId && tx.relatedId !== 'none' && tx.relatedId !== id ? jobs.find(j => j.id === tx.relatedId)?.title || 'General' : 'General';
    const cost = tx.type === 'raw_material' ? (tx.amount + (tx.otherCost || 0)) : 0;
    const payment = tx.type === 'outgoing' ? tx.amount : 0;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Supplier Receipt - EasyFlow</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .receipt { border: 1px solid #ddd; padding: 30px; max-width: 600px; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 25px; }
            .header h2 { margin: 0 0 5px 0; color: #1a1a1a; }
            .header p { margin: 0; color: #666; }
            .row { display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f5f5f5; }
            .label { font-weight: bold; color: #555; }
            .value { font-size: 1.05em; text-align: right; }
            .total-row { display: flex; justify-content: space-between; margin-top: 20px; padding-top: 15px; border-top: 2px solid #333; }
            .total-label { font-size: 1.2em; font-weight: bold; }
            .total-val { font-size: 1.3em; font-weight: bold; color: #000; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="receipt">
            <div class="header">
              <h2>Supplier Ledger</h2>
              <p>${supplier.name} | ${supplier.country}</p>
              <p style="margin-top:5px;font-size:0.9em;">Date: ${formatDate(tx.date)}</p>
            </div>
            <div class="row"><span class="label">Job / Operation:</span> <span class="value">${jobName}</span></div>
            <div class="row"><span class="label">Product / Desc:</span> <span class="value">${tx.description || '-'}</span></div>
            <div class="row"><span class="label">Container / FCL:</span> <span class="value">${tx.blNumber || '-'}</span></div>
            <div class="row"><span class="label">Weight (Tons):</span> <span class="value">${tx.weightInTons || '-'}</span></div>
            <div class="row"><span class="label">Price per Ton:</span> <span class="value">${tx.pricePerTon || '-'}</span></div>
            
            <div class="total-row">
              <span class="total-label">${tx.type === 'outgoing' ? 'Payment Given' : 'Total Cost'}:</span> 
              <span class="total-val">${tx.currency} ${tx.type === 'outgoing' ? payment : cost}</span>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const totalBalanceObj: Record<string, number> = {};
  const totalPaymentsObj: Record<string, number> = {};
  const totalCostObj: Record<string, number> = {};
  supplierTransactions.forEach(t => {
    const amt = t.type === 'outgoing' ? -t.amount : t.type === 'raw_material' ? (t.amount + (t.otherCost || 0)) : 0;
    totalBalanceObj[t.currency || 'USD'] = (totalBalanceObj[t.currency || 'USD'] || 0) + amt;
    if (t.type === 'outgoing') {
      totalPaymentsObj[t.currency || 'USD'] = (totalPaymentsObj[t.currency || 'USD'] || 0) + t.amount;
    } else if (t.type === 'raw_material') {
      totalCostObj[t.currency || 'USD'] = (totalCostObj[t.currency || 'USD'] || 0) + (t.amount + (t.otherCost || 0));
    }
  });

  return (
    <div className="pb-10">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/suppliers')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Supplier Ledger: {supplier.name}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <span>Country: <strong>{supplier.country}</strong></span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* تم إضافة زر سريع لفتح الـ Modal الخاص بالـ Add Record لسهولة إضافة سندات الدفع المباشرة */}
          <Button onClick={() => setIsAddRecordOpen(true)} className="bg-green-600 hover:bg-green-700 text-white gap-2">
            <Plus className="h-4 w-4" />
            Add Payment Record
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="shrink-0 gap-2">
            <Printer className="h-4 w-4" />
            Print Summary
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm flex flex-col mt-8">
        <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold font-heading">Excel-Style Ledger</h2>
            <p className="text-sm text-muted-foreground mt-1">Add rows below. Changes automatically update the linked job's calculations.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <Select value={filterJobId} onValueChange={setFilterJobId}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Filter by Job" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {supplierJobs.map(j => (
                  <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCurrency} onValueChange={setFilterCurrency}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Curr.</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="EGP">EGP</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleAddExcelRow} className="gap-2 shrink-0 h-9">
              <Plus className="h-4 w-4" />
              Add Row
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 whitespace-nowrap">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-48">Job Operation</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-40">Product / Desc</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">Container</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground w-24">Currency</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">Weight (Tons)</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">Price / Ton</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-28">Supplier Cost</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">Other Cost</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-28 text-destructive">Total Cost</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-28 text-success">Payment Given</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {supplierTransactions.length === 0 ? (
                <tr><td colSpan={12} className="px-4 py-8 text-center text-muted-foreground">No ledger rows found. Click "Add Row" to start.</td></tr>
              ) : (
                supplierTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-2">
                      {tx.isAuto ? <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span> : <DatePicker value={tx.date ? tx.date.split('T')[0] : ''} onChange={(v) => handleTxUpdate(tx.id, 'date', v)} className="w-28 h-8 text-xs bg-transparent border-transparent hover:border-input focus:border-input p-1" />}
                    </td>
                    <td className="px-4 py-2">
                      {tx.isAuto ? (
                        <span className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis block w-40">{jobs.find(j => j.id === tx.relatedId)?.title || 'Job'}</span>
                      ) : (
                        <Select value={tx.relatedId || 'none'} onValueChange={(v) => handleTxUpdate(tx.id, 'relatedId', v === 'none' ? null : v)}>
                          <SelectTrigger className="h-8 text-xs border-transparent hover:border-input bg-transparent"><SelectValue placeholder="Select Job" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">General (No Job)</SelectItem>
                            {jobs.filter(j => j.supplierId === id).map(j => <SelectItem key={j.id} value={j.id}>{formatDate(j.createdAt)} - {j.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {tx.isAuto ? <span className="text-xs text-primary font-medium">{tx.description}</span> : <EditableCell type="text" value={tx.description} onSave={(v) => handleTxUpdate(tx.id, 'description', v)} placeholder="Product..." className="w-full text-xs bg-transparent" />}
                    </td>
                    <td className="px-4 py-2">
                      {(() => {
                        const linkedJob = jobs.find(j => j.id === tx.relatedId);
                        const qtyText = linkedJob?.numberOfContainers ? `(${linkedJob.numberOfContainers} FCL)` : '';
                        const blVal = tx.blNumber || linkedJob?.blNumber || '-';
                        if (tx.isAuto) {
                          return <span className="text-xs text-muted-foreground">{blVal} {qtyText}</span>;
                        }
                        return (
                          <div className="flex flex-col gap-1 w-full">
                            <EditableCell type="text" value={tx.blNumber || ''} onSave={(v) => handleTxUpdate(tx.id, 'blNumber', v)} placeholder="Container..." className="w-full text-xs bg-transparent" />
                            {qtyText && <span className="text-[10px] text-muted-foreground">{qtyText}</span>}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-2">
                      {tx.isAuto ? (
                        <span className="text-xs font-medium text-muted-foreground">{tx.currency}</span>
                      ) : (
                        <Select value={tx.currency} onValueChange={(v) => handleTxUpdate(tx.id, 'currency', v)}>
                          <SelectTrigger className="h-8 text-xs border-transparent hover:border-input bg-transparent"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="EGP">EGP</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {tx.isAuto ? <span className="text-xs text-muted-foreground">{tx.weightInTons || 0}</span> : <EditableCell type="number" value={tx.weightInTons || 0} onSave={(v) => handleTxUpdate(tx.id, 'weightInTons', v)} className="w-20 text-xs bg-transparent text-right" />}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {tx.isAuto ? <span className="text-xs text-muted-foreground">{tx.pricePerTon || 0}</span> : <EditableCell type="number" value={tx.pricePerTon || 0} onSave={(v) => handleTxUpdate(tx.id, 'pricePerTon', v)} className="w-20 text-xs bg-transparent text-right" />}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {tx.isAuto ? (
                        <span className="text-xs font-medium text-foreground">{tx.amount}</span>
                      ) : tx.type === 'raw_material' ? (
                        <EditableCell type="number" value={tx.amount} onSave={(v) => handleTxUpdate(tx.id, 'amount', v)} className="w-20 text-xs font-medium bg-transparent text-right" />
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-red-600" onClick={() => handleTxUpdate(tx.id, 'type', 'raw_material')}>Set Cost</Button>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {tx.isAuto ? (
                        <span className="text-xs text-muted-foreground">{tx.otherCost || 0}</span>
                      ) : tx.type === 'raw_material' ? (
                        <EditableCell type="number" value={tx.otherCost || 0} onSave={(v) => handleTxUpdate(tx.id, 'otherCost', v)} className="w-20 text-xs bg-transparent text-right" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-destructive">
                      {tx.type === 'raw_material' ? formatCurrency(tx.amount + (tx.otherCost || 0), tx.currency) : '-'}
                    </td>
                    <td className="px-4 py-2 text-right flex justify-end">
                      {tx.type === 'outgoing' ? (
                        <EditableCell type="number" value={tx.amount} onSave={(v) => handleTxUpdate(tx.id, 'amount', v)} className="w-28 text-base font-bold bg-transparent text-right text-green-600" />
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-green-600" onClick={() => handleTxUpdate(tx.id, 'type', 'outgoing')}>Set Payment</Button>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center flex items-center justify-center gap-1 no-print">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => printRow(tx)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      {!tx.isAuto && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteTx(tx.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {supplierTransactions.length > 0 && (
              <tfoot className="bg-muted font-bold text-sm">
                <tr>
                  <td colSpan={9} className="px-4 py-4 text-right uppercase">Total Cost Supplier:</td>
                  <td colSpan={3} className="px-4 py-4 text-center text-lg text-primary whitespace-nowrap border-l">
                    {formatBalanceObj(totalCostObj)}
                  </td>
                </tr>
                <tr className="border-t">
                  <td colSpan={9} className="px-4 py-4 text-right uppercase">Total Payment Given:</td>
                  <td colSpan={3} className="px-4 py-4 text-center text-lg text-success whitespace-nowrap border-l">
                    {formatBalanceObj(totalPaymentsObj)}
                  </td>
                </tr>
                <tr className="border-t">
                  <td colSpan={9} className="px-4 py-4 text-right uppercase">Total Balance Owed to Supplier:</td>
                  <td colSpan={3} className="px-4 py-4 text-center text-lg text-destructive whitespace-nowrap border-l">
                    {formatBalanceObj(totalBalanceObj)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* الـ Dialog (النافذة المنبثقة) الخاصة بإضافة السندات */}
      <Dialog open={isAddRecordOpen} onOpenChange={setIsAddRecordOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Payment Record</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">Amount</Label>
              <Input id="amount" type="number" value={newRecordAmount} onChange={(e) => setNewRecordAmount(e.target.value)} className="col-span-3" placeholder="0.00" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currency" className="text-right">Currency</Label>
              <Select value={newRecordCurrency} onValueChange={setNewRecordCurrency}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="EGP">EGP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="job" className="text-right">Link to Job</Label>
              <Select value={newRecordJobId || 'none'} onValueChange={setNewRecordJobId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General (No Job)</SelectItem>
                  {supplierJobs.map(j => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">Date</Label>
              <div className="col-span-3">
                <DatePicker value={newRecordDate} onChange={(v) => setNewRecordDate(v || '')} />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="desc" className="text-right">Description</Label>
              <Input id="desc" value={newRecordDesc} onChange={(e) => setNewRecordDesc(e.target.value)} className="col-span-3" placeholder="e.g. Cash payment, Bank transfer" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRecordOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRecord} className="bg-green-600 hover:bg-green-700 text-white">Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}