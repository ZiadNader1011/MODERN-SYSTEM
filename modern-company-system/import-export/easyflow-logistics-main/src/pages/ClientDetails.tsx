import { useMemo, useState, useEffect, useRef } from 'react';
import { useParams as useRouterParams, useNavigate as useRouterNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  formatDate, formatBalanceObj, Job, Transaction
} from '@/data/store';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Plus, Trash2, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/DatePicker';
import { ClientInvoicePrintForm } from '@/components/ClientInvoicePrintForm';
import { supabase } from '@/utils/supabaseClient';

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

export default function ClientDetails() {
  const { id } = useRouterParams();
  const navigate = useRouterNavigate();
  const { t } = useTranslation();
  
  const [invoicePrintOpen, setInvoicePrintOpen] = useState(false);
  const [selectedTxForPrint, setSelectedTxForPrint] = useState<Transaction | null>(null);

  // حالات البيانات القادمة من السيرفر
  const [client, setClient] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filterJobId, setFilterJobId] = useState<string>('all');
  const [filterCurrency, setFilterCurrency] = useState<string>('all');

  // جلب البيانات من Supabase
  const fetchData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      
      // جلب بيانات العميل
      const { data: clientData, error: clientErr } = await supabase.from('clients').select('*').eq('id', id).single();
      if (clientErr || !clientData) {
        toast.error("هذا العميل لم يعد موجوداً في قاعدة البيانات");
        navigate('/clients', { replace: true });
        return;
      }
      setClient(clientData);

      // جلب العمليات المرتبطة بالعميل
      const { data: jobsData } = await supabase.from('jobs').select('*').eq('clientId', id);
      setJobs(jobsData || []);

      // جلب الحركات المالية للمشروع بالكامل لفرزها
      const { data: txData } = await supabase.from('transactions').select('*');
      setTransactions(txData || []);

      // جلب المنتجات للأسماء الاوتوماتيكية
      const { data: prodData } = await supabase.from('products').select('*');
      setAllProducts(prodData || []);

    } catch (error) {
      console.error("Error fetching data from Supabase:", error);
      toast.error("حدث خطأ أثناء تحميل البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // ميزة المزامنة الحية (Realtime) من Supabase كبديل للـ setInterval المجهد
    const txSubscription = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => { fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => { fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => { fetchData(); })
      .subscribe();

    return () => {
      supabase.removeChannel(txSubscription);
    };
  }, [id]);

  const handleAddExcelRow = async () => {
    const newTx = {
      relatedId: id || '',
      entityId: id,
      type: 'raw_material', 
      amount: 0,
      currency: 'USD',
      date: new Date().toISOString().slice(0, 10),
      description: '',
      weightInTons: 0,
      pricePerTon: 0,
      blNumber: '',
      createdAt: new Date().toISOString()
    };

    const { data, error } = await supabase.from('transactions').insert([newTx]).select();
    
    if (error) {
      toast.error("فشل إضافة سطر جديد");
    } else {
      setTransactions(prev => [...prev, data[0]]);
      toast.success("تم إضافة سطر جديد بنجاح");
    }
  };

  const handleTxUpdate = async (txId: string, field: keyof Transaction, value: any) => {
    let updatedFields: any = { [field]: value };
    
    // العثور على المعاملة الحالية لحساب الإجمالي إذا لزم الأمر
    const currentTx = transactions.find(t => t.id === txId);
    if (!currentTx) return;

    if (field === 'weightInTons' || field === 'pricePerTon') {
      const weight = field === 'weightInTons' ? Number(value) : (Number(currentTx.weightInTons) || 0);
      const price = field === 'pricePerTon' ? Number(value) : (Number(currentTx.pricePerTon) || 0);
      updatedFields.amount = weight * price;
    }

    if (field === 'relatedId' && value === 'none') {
      updatedFields.relatedId = id || '';
    }

    // تحديث البيانات في الـ Supabase
    const { error } = await supabase.from('transactions').update(updatedFields).eq('id', txId);
    
    if (error) {
      toast.error("فشل تحديث البيانات");
      return;
    }

    // المنطق الخاص بربط الوظيفة بالعميل تلقائياً
    if (field === 'relatedId' && value !== id && value !== 'none') {
      const job = jobs.find(j => j.id === value);
      if (job && job.clientId !== id) {
        await supabase.from('jobs').update({ clientId: id }).eq('id', value);
        toast.success('Job linked to this client.');
      }
    }

    // تحديث المنتج بالوظيفة تلقائياً لو تم التعديل من الـ Excel Table
if (currentTx && (field === 'variety' || field === 'caliber' || field === 'grade')) {
  // استخدام المعرف المرتبط بالمعاملة الحالية مباشرة دون فحص إضافي
  const targetRelatedId = currentTx.relatedId;

  if (targetRelatedId && targetRelatedId !== 'none' && targetRelatedId !== id) {
    const job = jobs.find(j => j.id === targetRelatedId);
    if (job) {
      const newProds = [...(job.products || [])];
      if (newProds.length > 0) {
        newProds[0] = { ...newProds[0], [field]: value };
      } else {
        newProds.push({ productId: '', quantity: 0, unitPrice: 0, packages: 0, [field]: value });
      }
      await supabase.from('jobs').update({ products: newProds }).eq('id', job.id);
    }
  }
}

    fetchData(); // لإعادة التحميل والمزامنة الدقيقة
  };

  const handleDeleteTx = async (txId: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', txId);
    if (error) {
      toast.error("فشل حذف السطر");
    } else {
      setTransactions(prev => prev.filter(t => t.id !== txId));
      toast.success("تم الحذف بنجاح");
    }
  };

  const clientJobs = useMemo(() => {
    return jobs.filter(j => j.clientId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [jobs, id]);

  const clientTransactions = useMemo(() => {
    const clientJobIds = jobs.filter(j => j.clientId === id).map(j => j.id);
    let manualTxs = transactions.filter(t => {
      if (t.entityId) return t.entityId === id;
      if (t.relatedId === id) return true;
      if (t.relatedId && clientJobIds.includes(t.relatedId)) {
        return t.type === 'incoming';
      }
      return false;
    });

    const autoTxs: any[] = [];
    const clientJobsList = jobs.filter(j => j.clientId === id);

    clientJobsList.forEach(job => {
      const hasValidProducts = job.products && job.products.some(p => (Number(p.quantity) || 0) > 0 && (Number(p.unitPrice) || 0) > 0);
      if (hasValidProducts) {
        job.products.forEach((p, idx) => {
          if ((Number(p.quantity) || 0) > 0 && (Number(p.unitPrice) || 0) > 0) {
            const c = p.currency || job.currency;
            const val = Number(p.quantity) * Number(p.unitPrice);
            const discount = job.discountPercentage || 0;
            const finalVal = val - (val * (discount / 100));
            autoTxs.push({
              id: `auto-job-${job.id}-prod-${idx}`,
              relatedId: job.id,
              type: 'raw_material',
              amount: finalVal,
              currency: c,
              date: job.createdAt,
              description: `Auto Job Sales: ${job.title} - ${allProducts.find(prod => prod.id === p.productId)?.name || 'Product'}`,
              weightInTons: p.quantity,
              pricePerTon: p.unitPrice,
              blNumber: job.blNumber || '',
              isAuto: true
            });
          }
        });
      } else {
        const discount = job.discountPercentage || 0;
        const finalTotal = (job.totalPrice || 0) - ((job.totalPrice || 0) * (discount / 100));
        autoTxs.push({
          id: `auto-job-${job.id}`,
          relatedId: job.id,
          type: 'raw_material',
          amount: finalTotal,
          currency: job.currency,
          date: job.createdAt,
          description: `Auto Job Sales: ${job.title}`,
          weightInTons: 0,
          pricePerTon: 0,
          blNumber: job.blNumber || '',
          isAuto: true
        });
      }
    });

    let allTxs = [...manualTxs, ...autoTxs];
    if (filterJobId !== 'all') allTxs = allTxs.filter(t => t.relatedId === filterJobId);
    if (filterCurrency !== 'all') allTxs = allTxs.filter(t => (t.currency || 'USD') === filterCurrency);

    return allTxs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, jobs, id, filterJobId, filterCurrency, allProducts]);

  const printRow = (tx: Transaction) => {
    setSelectedTxForPrint(tx);
    setInvoicePrintOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">جاري تحميل كشف الحساب...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold">Client not found</h2>
        <Button onClick={() => navigate('/clients')} className="mt-4">Back to Clients</Button>
      </div>
    );
  }

  const totalBalanceObj: Record<string, number> = {};
  const totalPaymentsObj: Record<string, number> = {};
  const totalOperationsObj: Record<string, number> = {};
  
  clientTransactions.forEach(t => {
    const amt = t.type === 'incoming' ? -t.amount : t.amount;
    totalBalanceObj[t.currency || 'USD'] = (totalBalanceObj[t.currency || 'USD'] || 0) + amt;
    if (t.type === 'incoming') {
      totalPaymentsObj[t.currency || 'USD'] = (totalPaymentsObj[t.currency || 'USD'] || 0) + t.amount;
    } else {
      totalOperationsObj[t.currency || 'USD'] = (totalOperationsObj[t.currency || 'USD'] || 0) + t.amount;
    }
  });

  return (
    <div className="pb-10">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/clients')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Client Ledger: {client.name}</h1>
            <div className="text-muted-foreground flex items-center gap-2 text-sm mt-1">
              <span>Country: <strong>{client.country}</strong></span>
              {client.dhl && (
                <>
                  <span className="text-muted-foreground/30">|</span>
                  <span>DHL: <strong>{client.dhl}</strong></span>
                </>
              )}
              {client.agentName && (
                <>
                  <span className="text-muted-foreground/30">|</span>
                  <span>Agent: <strong>{client.agentName}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
                {clientJobs.map(j => (
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
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">Variety</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">Caliber</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">Grade</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">FCL</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">Delivery Terms</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground w-24">Currency</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-28">Weight (Tons)</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-28">Price / Ton</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-32">Total Value (Debit)</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-32">Payment Rcvd (Credit)</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clientTransactions.length === 0 ? (
                <tr><td colSpan={14} className="px-4 py-8 text-center text-muted-foreground">No ledger rows found. Click "Add Row" to start.</td></tr>
              ) : (
                clientTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-2">
                      {(tx as any).isAuto ? <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span> : <DatePicker value={tx.date.split('T')[0]} onChange={(v) => handleTxUpdate(tx.id, 'date', v)} className="w-28 h-8 text-xs bg-transparent border-transparent hover:border-input focus:border-input p-1" />}
                    </td>
                    <td className="px-4 py-2">
                      {(() => {
                        const linkedJob = jobs.find(j => j.id === tx.relatedId);
                        const incotermText = linkedJob?.incoterm && linkedJob.incoterm !== 'none' ? `[${linkedJob.incoterm}]` : '';
                        if ((tx as any).isAuto) {
                          return <span className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis block w-40">{linkedJob?.title || 'Job'} {incotermText}</span>;
                        }
                        return (
                          <Select value={tx.relatedId === id ? 'none' : tx.relatedId} onValueChange={(v) => handleTxUpdate(tx.id, 'relatedId', v)}>
                            <SelectTrigger className="h-8 text-xs border-transparent hover:border-input bg-transparent"><SelectValue placeholder="Select Job" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">General (No Job)</SelectItem>
                              {jobs.filter(j => j.clientId === id).map(j => <SelectItem key={j.id} value={j.id}>{formatDate(j.createdAt)} - {j.title} {j.incoterm && j.incoterm !== 'none' ? `[${j.incoterm}]` : ''}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-2">
                      {(tx as any).isAuto ? <span className="text-xs text-primary font-medium">{tx.description}</span> : <EditableCell type="text" value={tx.description} onSave={(v) => handleTxUpdate(tx.id, 'description', v)} placeholder="Product..." className="w-full text-xs bg-transparent" />}
                    </td>
                    <td className="px-4 py-2">
                      {(() => {
                        const linkedJob = jobs.find(j => j.id === tx.relatedId);
                        const p = linkedJob?.products?.[0];
                        const val = tx.variety || p?.variety || '';
                        if ((tx as any).isAuto) return <span className="text-xs text-muted-foreground">{val}</span>;
                        return <EditableCell type="text" value={tx.variety || ''} onSave={(v) => handleTxUpdate(tx.id, 'variety', v)} placeholder="Variety" className="w-16 text-xs bg-transparent" />;
                      })()}
                    </td>
                    <td className="px-4 py-2">
                      {(() => {
                        const linkedJob = jobs.find(j => j.id === tx.relatedId);
                        const p = linkedJob?.products?.[0];
                        const val = tx.caliber || p?.caliber || '';
                        if ((tx as any).isAuto) return <span className="text-xs text-muted-foreground">{val}</span>;
                        return <EditableCell type="text" value={tx.caliber || ''} onSave={(v) => handleTxUpdate(tx.id, 'caliber', v)} placeholder="Caliber" className="w-16 text-xs bg-transparent" />;
                      })()}
                    </td>
                    <td className="px-4 py-2">
                      {(() => {
                        const linkedJob = jobs.find(j => j.id === tx.relatedId);
                        const p = linkedJob?.products?.[0];
                        const val = tx.grade || p?.grade || '';
                        if ((tx as any).isAuto) return <span className="text-xs text-muted-foreground">{val}</span>;
                        return <EditableCell type="text" value={tx.grade || ''} onSave={(v) => handleTxUpdate(tx.id, 'grade', v)} placeholder="Grade" className="w-16 text-xs bg-transparent" />;
                      })()}
                    </td>
                    <td className="px-4 py-2">
                      {(() => {
                        const linkedJob = jobs.find(j => j.id === tx.relatedId);
                        const qtyText = linkedJob?.numberOfContainers ? `(${linkedJob.numberOfContainers} FCL)` : '';
                        const blVal = tx.blNumber || linkedJob?.blNumber || '-';
                        if ((tx as any).isAuto) {
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
                      {(() => {
                        const linkedJob = jobs.find(j => j.id === tx.relatedId);
                        const term = tx.incoterm || linkedJob?.incoterm || '';
                        if ((tx as any).isAuto) {
                          return <span className="text-xs text-muted-foreground font-medium">{term}</span>;
                        }
                        return (
                          <EditableCell type="text" value={tx.incoterm || ''} onSave={(v) => handleTxUpdate(tx.id, 'incoterm', v)} placeholder="CFR, FOB..." className="w-20 text-xs bg-transparent" />
                        );
                      })()}
                    </td>
                    <td className="px-4 py-2">
                      {(tx as any).isAuto ? (
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
                      {(tx as any).isAuto ? <span className="text-xs font-medium text-muted-foreground">{tx.weightInTons || 0}</span> : <EditableCell type="number" value={tx.weightInTons || 0} onSave={(v) => handleTxUpdate(tx.id, 'weightInTons', v)} className="w-20 text-xs bg-transparent text-right" />}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {(tx as any).isAuto ? <span className="text-xs font-medium text-muted-foreground">{tx.pricePerTon || 0}</span> : <EditableCell type="number" value={tx.pricePerTon || 0} onSave={(v) => handleTxUpdate(tx.id, 'pricePerTon', v)} className="w-20 text-xs bg-transparent text-right" />}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end items-center">
                        {(tx as any).isAuto ? (
                          <span className="text-xs font-medium text-red-600">{tx.amount}</span>
                        ) : tx.type !== 'incoming' ? (
                          <EditableCell type="number" value={tx.amount} onSave={(v) => handleTxUpdate(tx.id, 'amount', v)} className="w-24 text-xs font-medium bg-transparent text-right text-red-600" />
                        ) : (
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-red-600" onClick={() => handleTxUpdate(tx.id, 'type', 'raw_material')}>Set Charge</Button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end items-center">
                        {tx.type === 'incoming' ? (
                          <EditableCell type="number" value={tx.amount} onSave={(v) => handleTxUpdate(tx.id, 'amount', v)} className="w-28 text-base font-bold bg-transparent text-right text-green-600" />
                        ) : (
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-green-600" onClick={() => handleTxUpdate(tx.id, 'type', 'incoming')}>Set Payment</Button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center no-print">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => printRow(tx)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        {!(tx as any).isAuto && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteTx(tx.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {clientTransactions.length > 0 && (
              <tfoot className="bg-muted font-bold text-sm">
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-right uppercase">Operations Value:</td>
                  <td colSpan={3} className="px-4 py-4 text-center text-lg text-primary whitespace-nowrap border-l">
                    {formatBalanceObj(totalOperationsObj)}
                  </td>
                  <td colSpan={4}></td>
                </tr>
                <tr className="border-t">
                  <td colSpan={7} className="px-4 py-4 text-right uppercase">Total Payment Received:</td>
                  <td colSpan={3} className="px-4 py-4 text-center text-lg text-success whitespace-nowrap border-l">
                    {formatBalanceObj(totalPaymentsObj)}
                  </td>
                  <td colSpan={4}></td>
                </tr>
                <tr className="border-t">
                  <td colSpan={7} className="px-4 py-4 text-right uppercase">Total Balance Owed by Client:</td>
                  <td colSpan={3} className="px-4 py-4 text-center text-lg text-destructive whitespace-nowrap border-l">
                    {formatBalanceObj(totalBalanceObj)}
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      
      <ClientInvoicePrintForm 
        open={invoicePrintOpen} 
        onOpenChange={setInvoicePrintOpen} 
        transaction={selectedTxForPrint} 
        client={client}
        job={selectedTxForPrint ? jobs.find(j => j.id === selectedTxForPrint.relatedId) : null}
      />
    </div>
  );
}