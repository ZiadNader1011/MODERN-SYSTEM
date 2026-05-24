import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams as useRouterParams, useNavigate as useRouterNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Printer, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/DatePicker';
import { supabase } from '@/utils/supabaseClient';

// دوال التنسيق المساعدة البديلة عن الـ Local Store لضمان استقرار الصفحة
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString();
};

const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};

const formatBalanceObj = (obj: Record<string, number>) => {
  return Object.entries(obj)
    .map(([curr, val]) => `${curr} ${val.toFixed(2)}`)
    .join(' | ') || '0.00';
};

// مكون الخلية القابلة للتعديل تلقائياً بعد التوقف عن الكتابة (Excel-Style)
function EditableCell({ value, type = 'text', onSave, className = '', placeholder = '' }: { value: string | number | undefined, type?: string, onSave: (val: any) => void, className?: string, placeholder?: string }) {
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

  // حالات البيانات القادمة من السيرفر (Supabase)
  const [supplier, setSupplier] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // حالات الفلترة
  const [filterJobId, setFilterJobId] = useState<string>('all');
  const [filterCurrency, setFilterCurrency] = useState<string>('all');

  // جلب البيانات بالكامل من Supabase بمجرد فتح الصفحة
  useEffect(() => {
    if (!id) return;
    
    async function fetchData() {
      setLoading(true);
      try {
        // 1. جلب بيانات المورد الحالي
        const { data: supplierData } = await supabase
          .from('suppliers')
          .select('*')
          .eq('id', id)
          .single();
        setSupplier(supplierData);

        // 2. جلب جميع العمليات (Jobs) المتعلقة بالمورد
        const { data: jobsData } = await supabase
          .from('jobs')
          .select('*')
          .eq('supplierId', id);
        setJobs(jobsData || []);

        // 3. جلب جميع المعاملات المالية
        const { data: txData } = await supabase
          .from('transactions')
          .select('*')
          .or(`entityId.eq.${id},relatedId.eq.${id}`);
        setTransactions(txData || []);

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load supplier details.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  // إضافة سطر جديد فارغ (Excel-Style) وحفظه مباشرة في الـ Database
  const handleAddExcelRow = async () => {
    const newTx = {
      relatedId: null, // تم تعديلها إلى null هنا لمنع خطأ الـ Foreign Key Constraint في سوبابيز
      entityId: id,    // ربط السطر بالمورد الحالي بشكل صحيح
      type: 'raw_material',
      amount: 0,
      currency: 'USD',
      date: new Date().toISOString().slice(0, 10),
      description: '',
      weightInTons: 0,
      pricePerTon: 0,
      otherCost: 0,
      blNumber: '',
      createdAt: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert([newTx])
      .select()
      .single();

    if (error) {
      console.error('Supabase Insertion Error:', error);
      toast.error('Failed to add row to database');
    } else if (data) {
      setTransactions([...transactions, data]);
      toast.success('Row added successfully');
    }
  };

  // تحديث حقل معين داخل السطر وحفظه تلقائياً في Supabase
  const handleTxUpdate = async (txId: string, field: string, value: any) => {
    let updatedTx = transactions.find(t => t.id === txId);
    if (!updatedTx) return;

    // معالجة حالة فصل السطر عن أي Job وإرجاعه كحساب عام
    let finalValue = value;
    if (field === 'relatedId' && value === 'none') {
      finalValue = null;
    }

    let updatedFields: any = { [field]: finalValue };

    // حساب التكلفة الإجمالية تلقائياً لو تم تعديل الوزن أو سعر الطن
    if (field === 'weightInTons' || field === 'pricePerTon') {
      const weight = field === 'weightInTons' ? Number(value) : (Number(updatedTx.weightInTons) || 0);
      const price = field === 'pricePerTon' ? Number(value) : (Number(updatedTx.pricePerTon) || 0);
      updatedFields.amount = weight * price;
    }

    const { error } = await supabase
      .from('transactions')
      .update(updatedFields)
      .eq('id', txId);

    if (error) {
      toast.error('Failed to update field');
      return;
    }

    setTransactions(prev => prev.map(t => t.id === txId ? { ...t, ...updatedFields } : t));

    // ربط الـ Job بالمورد لو تم تغيير الـ Linkage
    if (field === 'relatedId' && value !== 'none' && value !== id) {
      const job = jobs.find(j => j.id === value);
      if (job && job.supplierId !== id) {
        const { error: jobErr } = await supabase
          .from('jobs')
          .update({ supplierId: id })
          .eq('id', value);

        if (!jobErr) {
          setJobs(prev => prev.map(j => j.id === value ? { ...j, supplierId: id } : j));
          toast.success('Job linked to this supplier.');
        }
      }
    }
  };

  // حذف معاملة من الـ Supabase
  const handleDeleteTx = async (txId: string) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', txId);

    if (error) {
      toast.error('Failed to delete transaction');
    } else {
      setTransactions(prev => prev.filter(t => t.id !== txId));
      toast.success('Transaction deleted');
    }
  };

  // تصفية وحساب المعاملات التلقائية واليدوية لعرضها في الجدول
  const supplierTransactions = useMemo(() => {
    const supplierJobIds = jobs.map(j => j.id);
    const manualTxs = transactions.filter(t => {
      if (t.entityId) return t.entityId === id;
      if (t.type === 'discount') return false;
      if (t.relatedId === id) return true;
      if (t.relatedId && supplierJobIds.includes(t.relatedId)) {
        return t.type === 'raw_material';
      }
      return false;
    });

    const autoTxs: any[] = [];
    jobs.forEach(job => {
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
        date: job.createdAt || new Date().toISOString(),
        description: `Auto Job Cost: ${job.title}`,
        weightInTons: job.rawMaterialWeight || 0,
        pricePerTon: job.rawMaterialPricePerTon || 0,
        blNumber: job.blNumber || '',
        isAuto: true
      });
    });

    let allTxs = [...manualTxs, ...autoTxs];
    if (filterJobId !== 'all') allTxs = allTxs.filter(t => t.relatedId === filterJobId);
    if (filterCurrency !== 'all') allTxs = allTxs.filter(t => (t.currency || 'USD') === filterCurrency);
    
    return allTxs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, jobs, id, filterJobId, filterCurrency]);

  const supplierJobs = useMemo(() => {
    return [...jobs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [jobs]);

  // طباعة السطر المحدد
  const printRow = (tx: any) => {
    const jobName = tx.relatedId && tx.relatedId !== 'none' && tx.relatedId !== id ? jobs.find(j => j.id === tx.relatedId)?.title || 'General' : 'General';
    const cost = tx.type === 'raw_material' ? (tx.amount + (tx.otherCost || 0)) : 0;
    const payment = tx.type === 'outgoing' ? tx.amount : 0;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Supplier Receipt</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .receipt { border: 1px solid #ddd; padding: 30px; max-width: 600px; margin: 0 auto; border-radius: 8px; }
            .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 25px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 12px; }
            .total-row { display: flex; justify-content: space-between; margin-top: 20px; padding-top: 15px; border-top: 2px solid #333; font-weight: bold; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="receipt">
            <div class="header">
              <h2>Supplier Ledger</h2>
              <p>${supplier?.name || ''} | ${supplier?.country || ''}</p>
            </div>
            <div class="row"><span>Job:</span> <span>${jobName}</span></div>
            <div class="row"><span>Description:</span> <span>${tx.description || '-'}</span></div>
            <div class="row"><span>Container:</span> <span>${tx.blNumber || '-'}</span></div>
            <div class="total-row">
              <span>${tx.type === 'outgoing' ? 'Payment Given' : 'Total Cost'}:</span> 
              <span>${tx.currency} ${tx.type === 'outgoing' ? payment : cost}</span>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // حساب المجاميع النهائية
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

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading supplier ledger from Supabase...</div>;
  }

  if (!supplier) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold">Supplier not found</h2>
        <Button onClick={() => navigate('/suppliers')} className="mt-4">Back to Suppliers</Button>
      </div>
    );
  }

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
        <Button onClick={() => window.print()} variant="outline" className="gap-2">
          <Printer className="h-4 w-4" /> Print Summary
        </Button>
      </div>

      <div className="bg-card rounded-xl border shadow-sm flex flex-col mt-8">
        <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Excel-Style Ledger (Supabase Cloud)</h2>
            <p className="text-sm text-muted-foreground">Changes are saved automatically to your database.</p>
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
              </SelectContent>
            </Select>

            <Button onClick={handleAddExcelRow} className="gap-2 shrink-0 h-9">
              <Plus className="h-4 w-4" /> Add Row
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 whitespace-nowrap">
                <th className="px-4 py-3 text-left w-32">Date</th>
                <th className="px-4 py-3 text-left w-48">Job Operation</th>
                <th className="px-4 py-3 text-left w-40">Product / Desc</th>
                <th className="px-4 py-3 text-left w-32">Container</th>
                <th className="px-4 py-3 text-center w-24">Currency</th>
                <th className="px-4 py-3 text-right w-24">Weight (Tons)</th>
                <th className="px-4 py-3 text-right w-24">Price / Ton</th>
                <th className="px-4 py-3 text-right w-28">Supplier Cost</th>
                <th className="px-4 py-3 text-right w-24">Other Cost</th>
                <th className="px-4 py-3 text-right w-28 text-destructive">Total Cost</th>
                <th className="px-4 py-3 text-right w-28 text-success">Payment Given</th>
                <th className="px-4 py-3 text-center w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {supplierTransactions.length === 0 ? (
                <tr><td colSpan={12} className="px-4 py-8 text-center text-muted-foreground">No ledger rows found. Click "Add Row" to start.</td></tr>
              ) : (
                supplierTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2">
                      {tx.isAuto ? <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span> : <DatePicker value={tx.date ? tx.date.split('T')[0] : ''} onChange={(v) => handleTxUpdate(tx.id, 'date', v)} className="w-28 h-8 text-xs p-1" />}
                    </td>
                    <td className="px-4 py-2">
                      {tx.isAuto ? (
                        <span className="text-xs text-muted-foreground block w-40 truncate">{jobs.find(j => j.id === tx.relatedId)?.title || 'Job'}</span>
                      ) : (
                        <Select value={!tx.relatedId ? 'none' : tx.relatedId} onValueChange={(v) => handleTxUpdate(tx.id, 'relatedId', v)}>
                          <SelectTrigger className="h-8 text-xs bg-transparent border-transparent"><SelectValue placeholder="Select Job" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">General (No Job)</SelectItem>
                            {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {tx.isAuto ? <span className="text-xs text-primary font-medium">{tx.description}</span> : <EditableCell type="text" value={tx.description} onSave={(v) => handleTxUpdate(tx.id, 'description', v)} placeholder="Product..." className="w-full text-xs" />}
                    </td>
                    <td className="px-4 py-2">
                      {tx.isAuto ? (
                        <span className="text-xs text-muted-foreground">{tx.blNumber || '-'}</span>
                      ) : (
                        <EditableCell type="text" value={tx.blNumber || ''} onSave={(v) => handleTxUpdate(tx.id, 'blNumber', v)} placeholder="Container..." className="w-full text-xs" />
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {tx.isAuto ? (
                        <span className="text-xs font-medium text-muted-foreground">{tx.currency}</span>
                      ) : (
                        <Select value={tx.currency} onValueChange={(v) => handleTxUpdate(tx.id, 'currency', v)}>
                          <SelectTrigger className="h-8 text-xs bg-transparent border-transparent"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="EGP">EGP</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {tx.isAuto ? <span className="text-xs text-muted-foreground">{tx.weightInTons || 0}</span> : <EditableCell type="number" value={tx.weightInTons || 0} onSave={(v) => handleTxUpdate(tx.id, 'weightInTons', v)} className="w-20 text-xs text-right" />}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {tx.isAuto ? <span className="text-xs text-muted-foreground">{tx.pricePerTon || 0}</span> : <EditableCell type="number" value={tx.pricePerTon || 0} onSave={(v) => handleTxUpdate(tx.id, 'pricePerTon', v)} className="w-20 text-xs text-right" />}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {tx.isAuto ? (
                        <span className="text-xs font-medium">{tx.amount}</span>
                      ) : (
                        <EditableCell type="number" value={tx.amount} onSave={(v) => handleTxUpdate(tx.id, 'amount', v)} className="w-20 text-xs text-right" />
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {tx.isAuto ? <span className="text-xs text-muted-foreground">{tx.otherCost || 0}</span> : <EditableCell type="number" value={tx.otherCost || 0} onSave={(v) => handleTxUpdate(tx.id, 'otherCost', v)} className="w-20 text-xs text-right" />}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-destructive">
                      {tx.type === 'raw_material' ? formatCurrency(tx.amount + (tx.otherCost || 0), tx.currency) : '-'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {tx.type === 'outgoing' ? (
                        <EditableCell type="number" value={tx.amount} onSave={(v) => handleTxUpdate(tx.id, 'amount', v)} className="w-28 text-base font-bold text-right text-green-600" />
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-green-600" onClick={() => handleTxUpdate(tx.id, 'type', 'outgoing')}>Set Payment</Button>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center flex items-center justify-center gap-1 no-print">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => printRow(tx)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      {!tx.isAuto && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTx(tx.id)}>
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
                  <td colSpan={9} className="px-4 py-4 text-right">Total Cost Supplier:</td>
                  <td colSpan={3} className="px-4 py-4 text-center text-lg text-primary border-l">
                    {formatBalanceObj(totalCostObj)}
                  </td>
                </tr>
                <tr className="border-t">
                  <td colSpan={9} className="px-4 py-4 text-right">Total Payment Given:</td>
                  <td colSpan={3} className="px-4 py-4 text-center text-lg text-green-600 border-l">
                    {formatBalanceObj(totalPaymentsObj)}
                  </td>
                </tr>
                <tr className="border-t">
                  <td colSpan={9} className="px-4 py-4 text-right">Total Balance Owed:</td>
                  <td colSpan={3} className="px-4 py-4 text-center text-lg text-destructive border-l">
                    {formatBalanceObj(totalBalanceObj)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}