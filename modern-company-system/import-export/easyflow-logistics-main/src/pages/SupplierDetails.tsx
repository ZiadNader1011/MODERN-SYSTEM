import { useState, useEffect, useMemo } from 'react';
import { useParams as useRouterParams, useNavigate as useRouterNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  getSuppliers, getJobs, getTransactions,
  formatDate, formatCurrency, formatBalanceObj, Job, Transaction
} from '@/data/store';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Printer, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/DatePicker';
import axios from '@/api/axios';


interface EditableCellProps {
  value: string | number | undefined;
  type?: string;
  onSave: (val: string | number) => void;
  className?: string;
  placeholder?: string;
}

function EditableCell({ value, type = 'text', onSave, className = '', placeholder = '' }: EditableCellProps) {
  const [val, setVal] = useState(value !== undefined && value !== null ? String(value) : '');

  useEffect(() => {
    if (value !== undefined && value !== null && String(value) !== val) {
      setVal(String(value));
    }
  }, [value]);

  const handleBlur = () => {
    let finalVal: string | number = val;
    if (type === 'number') {
      finalVal = val === '' ? 0 : Number(val);
    }
    if (String(finalVal) !== String(value)) {
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
      className={`bg-transparent outline-none focus:ring-1 focus:ring-primary rounded px-1 py-0.5 border border-transparent hover:border-input focus:border-input ${className}`}
    />
  );
}

export default function SupplierDetails() {
  const { id } = useRouterParams(); 
  const navigate = useRouterNavigate();
  const { t } = useTranslation();

  const suppliers = useMemo(() => getSuppliers(), []);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const fetchTxs = async () => {
    try {
      const res = await axios.get('/transactions');
      setTransactions(res.data);
    } catch (err) {
      setTransactions(getTransactions());
    }
  };

  useEffect(() => {
    setJobs(getJobs());
    fetchTxs();
  }, []);

  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [filterJobId, setFilterJobId] = useState<string>('all');
  const [filterCurrency, setFilterCurrency] = useState<string>('all');
  const [newRecordAmount, setNewRecordAmount] = useState('');
  const [newRecordDesc, setNewRecordDesc] = useState('');
  const [newRecordJobId, setNewRecordJobId] = useState('none'); // تم التعديل لتبدأ بـ none بدلاً من نص فارغ
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

    // 1. تجهيز الـ Payload للسيرفر
 const newTxPayload = {
  supplierId: numericSupplierId,
  entity_id: numericSupplierId, // أضف دي

  jobId: numericJobId,
  related_id: numericJobId, // أضف دي

  type: 'raw_material',
  amount: 1,
  currency: filterCurrency !== 'all' ? filterCurrency : 'USD',
  date: new Date().toISOString().split('T')[0],
  description: 'New Raw Material Entry',
  blNumber: '-',
  weightInTons: 0,
  pricePerTon: 0,
  otherCost: 0
};

    try {
      const response = await axios.post('/transactions', newTxPayload);
      
      if (response.status === 201 || response.status === 200) {
        toast.success("Row added successfully");
        
        if (response.data) {
          // 2. دمج الحقول بالصيغتين لضمان تخطي الفلترة الصارمة في الـ useMemo فوراً
          const addedTx = {
            ...response.data,
            supplierId: numericSupplierId,
            entity_id: numericSupplierId, // لدعم شرط الفلترة tEntityId
            jobId: numericJobId,
            related_id: numericJobId,     // لدعم شرط الفلترة tRelatedId
            relatedId: numericJobId ? String(numericJobId) : 'none'
          };
          
          setTransactions(prev => [...prev, addedTx]);
        }
        
        // 3. إعادة جلب البيانات من السيرفر للتأكيد
        await fetchTxs();
      }
    } catch (error) {
      toast.error("Failed to save to backend");
    }
  };
  const handleTxUpdate = async (txId: string | number, field: string, value: any) => {
    let previousTransactions: Transaction[] = [];
    let payloadToSend: any = null;

setTransactions(prev => {
  previousTransactions = [...prev];
  return prev.map(t => {
    if (String(t.id) === String(txId)) {
      // 1. احسب الـ amount الجديد أولاً في متغير جانبي
      const currentWeight = Number(field === 'weightInTons' ? value : (t.weightInTons || 0));
      const currentPrice = Number(field === 'pricePerTon' ? value : (t.pricePerTon || 0));
      
      let finalAmount = t.amount;
      if (t.type === 'raw_material') {
        const calculated = currentWeight * currentPrice;
        finalAmount = calculated > 0 ? calculated : (field === 'amount' ? Number(value) : (t.amount || 1));
      } else {
        if (field === 'amount') finalAmount = Number(value);
      }

      // 2. جهز الـ related_id
      let finalRelatedId = null;
      const currentRelatedId = field === 'relatedId' ? value : t.relatedId;
      if (currentRelatedId && currentRelatedId !== 'none') {
        finalRelatedId = parseInt(String(currentRelatedId), 10);
      }

      // 3. أنشئ Payload نقي للـ API
      payloadToSend = {
        date: field === 'date' ? value : t.date,
        description: field === 'description' ? value : t.description,
        currency: field === 'currency' ? value : t.currency,
        amount: finalAmount,
        type: t.type || 'raw_material',
        related_id: finalRelatedId,
        bl_number: field === 'blNumber' ? value : (t.blNumber || '-'),
        weight_in_tons: currentWeight,
        price_per_ton: currentPrice,
        other_cost: field === 'otherCost' ? value : (t.otherCost || 0)
      };

      // 4. ارجع أوبجكت جديد تماماً وبطريقة آمنة لـ React
      return {
        ...t,
        [field]: value,
        amount: finalAmount,
        relatedId: currentRelatedId
      };
    }
    return t;
  });
});

    if (!payloadToSend) return;
    try {
      await axios.put(`/transactions/${txId}`, payloadToSend);
    } catch (error) {
      toast.error("Failed to update on server. Reverting...");
      if (previousTransactions.length > 0) {
        setTransactions(previousTransactions);
      }
    }
  };

  const handleDeleteTx = async (txId: string | number) => {
    let previousTransactions: Transaction[] = [];
    
    setTransactions(prev => {
      previousTransactions = [...prev];
      return prev.filter(t => String(t.id) !== String(txId));
    });

    try {
      await axios.delete(`/transactions/${txId}`);
      toast.success("Row deleted successfully");
    } catch (error) {
      toast.error("Failed to delete from server");
      if (previousTransactions.length > 0) {
        setTransactions(previousTransactions);
      }
    }
  };

  const supplier = suppliers.find(s => String(s.id) === String(id));

  const supplierTransactions = useMemo(() => {
    const supplierJobIds = jobs.filter(j => String(j.supplierId) === String(id)).map(j => String(j.id));
    
    const manualTxs = transactions.filter(t => {
      if (t.type === 'discount') return false;
      
      const tEntityId = String((t as any).entity_id || t.entityId || '');
      const tSupplierId = String((t as any).supplierId || t.supplierId || '');
      const tRelatedId = String((t as any).related_id || t.relatedId || '');

      const isBelongsToSupplier = 
        tSupplierId === String(id) || 
        tEntityId === String(id) || 
        tRelatedId === String(id);

      if (isBelongsToSupplier) return true;

      if (tRelatedId && supplierJobIds.includes(tRelatedId)) {
        return t.type === 'raw_material';
      }
      return false;
    }).map(t => ({
      ...t,
      relatedId: (t as any).related_id ? String((t as any).related_id) : (t.relatedId ? String(t.relatedId) : 'none'),
      blNumber: (t as any).bl_number || t.blNumber,
      weightInTons: (t as any).weight_in_tons !== undefined ? (t as any).weight_in_tons : t.weightInTons,
      pricePerTon: (t as any).price_per_ton !== undefined ? (t as any).price_per_ton : t.pricePerTon,
      otherCost: (t as any).other_cost !== undefined ? (t as any).other_cost : t.otherCost
    }));

    const autoTxs: any[] = [];
    const supplierJobsList = jobs.filter(j => String(j.supplierId) === String(id));
    
    supplierJobsList.forEach(job => {
      const grossCost = job.rawMaterialCost || ((Number(job.rawMaterialWeight) || 0) * (Number(job.rawMaterialPricePerTon) || 0));
      const suppDisc = job.supplierDiscountPercentage || 0;
      const cost = grossCost - (grossCost * (suppDisc / 100));
      autoTxs.push({
        id: `auto-job-${job.id}`,
        relatedId: String(job.id),
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
      allTxs = allTxs.filter(t => String(t.relatedId) === String(filterJobId));
    }
    
    if (filterCurrency !== 'all') {
      allTxs = allTxs.filter(t => (t.currency || 'USD') === filterCurrency);
    }
    
    return allTxs.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, jobs, id, filterJobId, filterCurrency]);

  const supplierJobs = useMemo(() => {
    return jobs.filter(j => String(j.supplierId) === String(id)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [jobs, id]);

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

    const numericRecordJobId = newRecordJobId && newRecordJobId !== 'none' ? parseInt(newRecordJobId, 10) : null;

    const newTxPayload = {
      supplierId: numericSupplierId,   
      jobId: numericRecordJobId,       
      type: 'outgoing', 
      amount: Number(newRecordAmount),
      currency: newRecordCurrency,
      date: newRecordDate, 
      description: newRecordDesc || 'Payment Given',
      blNumber: '-',                   
      weightInTons: 0,                 
      pricePerTon: 0,                  
      otherCost: 0                     
    };

    try {
      const response = await axios.post('/transactions', newTxPayload);
      console.log(response.data);
      if (response.status === 201 || response.status === 200) {
        setIsAddRecordOpen(false);
        toast.success("Payment record added successfully");
        
        // ✅ التعديل الجوهري هنا: دمج الحقول ليتعرف عليها الـ useMemo فوراً ويظهر السطر دون الحاجة لـ Refresh
        if (response.data) {
          const addedRecord = {
            ...response.data,
            supplierId: numericSupplierId,
            entity_id: numericSupplierId, // لتخطي شرط الـ tEntityId في الفلترة
            jobId: numericRecordJobId,
            related_id: numericRecordJobId, // لتخطي شرط الـ tRelatedId في الفلترة
            relatedId: numericRecordJobId ? String(numericRecordJobId) : 'none'
          };
          setTransactions(prev => [...prev, addedRecord]);
        }

        setNewRecordAmount('');
        setNewRecordDesc('');
        setNewRecordJobId('none');
        
        await fetchTxs(); // لتأكيد البيانات المتزامنة مع السيرفر
      }
    } catch (error) {
      toast.error("Failed to save record to backend");
    }
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
            <p className="text-muted-foreground">Country: <strong>{supplier.country}</strong></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAddRecordOpen(true)} className="bg-green-600 hover:bg-green-700 text-white gap-2">
            <Plus className="h-4 w-4" />
            Add Payment Record
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Print Summary
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm flex flex-col mt-8">
        <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Excel-Style Ledger</h2>
            <p className="text-sm text-muted-foreground mt-1">Click cells directly to edit. Changes save instantly.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <Select value={filterJobId} onValueChange={setFilterJobId}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Filter by Job" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {supplierJobs.map(j => (
                  <SelectItem key={j.id} value={String(j.id)}>{j.title}</SelectItem>
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
              </SelectContent>
            </Select>

            <Button onClick={handleAddExcelRow} className="gap-2 h-9">
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
                <th className="px-4 py-3 text-center font-medium text-muted-foreground w-16">Currency</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">Weight (Tons)</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">Price / Ton</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-28">Supplier Cost</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">Other Cost</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-28 text-destructive">Total Cost</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-28 text-green-600">Payment Given</th>
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
                      {tx.isAuto ? <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span> : <DatePicker value={tx.date ? tx.date.split('T')[0] : new Date().toISOString().split('T')[0]} onChange={(v) => handleTxUpdate(tx.id, 'date', v)} className="w-28 h-8 text-xs bg-transparent border-transparent hover:border-input focus:border-input p-1" />}
                    </td>
                    <td className="px-4 py-2">
                      {tx.isAuto ? (
                        <span className="text-xs text-muted-foreground block w-40 overflow-hidden text-ellipsis whitespace-nowrap">{jobs.find(j => String(j.id) === String(tx.relatedId))?.title || 'Job'}</span>
                      ) : (
                        <Select value={tx.relatedId ? String(tx.relatedId) : 'none'} onValueChange={(v) => handleTxUpdate(tx.id, 'relatedId', v)}>
                          <SelectTrigger className="h-8 text-xs border-transparent hover:border-input bg-transparent"><SelectValue placeholder="Select Job" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">General (No Job)</SelectItem>
                            {jobs.filter(j => String(j.supplierId) === String(id)).map(j => <SelectItem key={j.id} value={String(j.id)}>{formatDate(j.createdAt)} - {j.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {tx.isAuto ? <span className="text-xs text-primary font-medium">{tx.description}</span> : <EditableCell type="text" value={tx.description} onSave={(v) => handleTxUpdate(tx.id, 'description', v)} placeholder="Product..." className="w-full text-xs bg-transparent" />}
                    </td>
                    <td className="px-4 py-2">
                      {(() => {
                        const linkedJob = jobs.find(j => String(j.id) === String(tx.relatedId));
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
                        <Select value={tx.currency || 'USD'} onValueChange={(v) => handleTxUpdate(tx.id, 'currency', v)}>
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
                        <span className="text-muted-foreground">-</span>
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
                    <td className="px-4 py-2 text-right">
                      {tx.type === 'outgoing' ? (
                        <EditableCell type="number" value={tx.amount} onSave={(v) => handleTxUpdate(tx.id, 'amount', v)} className="w-28 text-base font-bold bg-transparent text-right text-green-600" />
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-green-600" onClick={() => handleTxUpdate(tx.id, 'type', 'outgoing')}>Set Payment</Button>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center flex items-center justify-center gap-1 no-print">
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
                  <td colSpan={3} className="px-4 py-4 text-center text-lg text-primary border-l">
                    {formatBalanceObj(totalCostObj)}
                  </td>
                </tr>
                <tr className="border-t">
                  <td colSpan={9} className="px-4 py-4 text-right uppercase">Total Payment Given:</td>
                  <td colSpan={3} className="px-4 py-4 text-center text-lg text-green-600 border-l">
                    {formatBalanceObj(totalPaymentsObj)}
                  </td>
                </tr>
                <tr className="border-t">
                  <td colSpan={9} className="px-4 py-4 text-right uppercase">Total Balance Owed to Supplier:</td>
                  <td colSpan={3} className="px-4 py-4 text-center text-lg text-destructive border-l">
                    {formatBalanceObj(totalBalanceObj)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <Dialog open={isAddRecordOpen} onOpenChange={setIsAddRecordOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Payment Record</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Amount</Label>
              <Input type="number" value={newRecordAmount} onChange={(e) => setNewRecordAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="grid gap-2">
              <Label>Currency</Label>
             <Select value={newRecordCurrency} onValueChange={setNewRecordCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="EGP">EGP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Linked Job (Optional)</Label>
              <Select value={newRecordJobId} onValueChange={setNewRecordJobId}>
                <SelectTrigger><SelectValue placeholder="Select Job" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General Payment (No Job)</SelectItem>
                  {supplierJobs.map(j => <SelectItem key={j.id} value={String(j.id)}>{j.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input value={newRecordDesc} onChange={(e) => setNewRecordDesc(e.target.value)} placeholder="e.g. Cash payment" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddRecordOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRecord}>Save Record</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}