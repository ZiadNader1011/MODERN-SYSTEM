import { useMemo, useState, useEffect, useRef } from 'react';
import { useParams as useRouterParams, useNavigate as useRouterNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { formatDate, formatCurrency, formatBalanceObj, Job, Transaction } from '@/data/store'; 
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Plus, Trash2, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/DatePicker';
import { ClientInvoicePrintForm } from '@/components/ClientInvoicePrintForm';
import { supabase } from '@/utils/supabaseClient';

// تعريف الـ Interfaces اللازمة لضمان خلو عملية الـ Build من أخطاء الـ types
interface Client {
  id: string;
  name: string;
  country?: string;
  dhl?: string;
  agentName?: string;
}

interface Product {
  id: string;
  name: string;
}

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
    }, 800); // زيادة الـ Debounce قليلاً لتناسب سرعة استجابة السيرفر عبر الـ API
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
  const { id } = useRouterParams<{ id: string }>();
  const navigate = useRouterNavigate();
  const { t } = useTranslation();
  
  const [invoicePrintOpen, setInvoicePrintOpen] = useState(false);
  const [selectedTxForPrint, setSelectedTxForPrint] = useState<Transaction | null>(null);

  // تعريف حالات البيانات المستجلبة من Supabase
  const [client, setClient] = useState<Client | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [filterJobId, setFilterJobId] = useState<string>('all');
  const [filterCurrency, setFilterCurrency] = useState<string>('all');

  // جلب البيانات من الجداول عند تحميل الصفحة أو تحديث الـ trigger
  useEffect(() => {
    async function fetchClientData() {
      if (!id) return;
      try {
        setLoading(true);
        
        // جلب العميل، العمليات، المعاملات، والمنتجات بالتوازي لضمان سرعة التحميل الشديدة
        const [clientRes, jobsRes, txsRes, productsRes] = await Promise.all([
          supabase.from('clients').select('*').eq('id', id).single(),
          supabase.from('jobs').select('*'),
          supabase.from('transactions').select('*'),
          supabase.from('products').select('id, name')
        ]);

        if (clientRes.error) throw clientRes.error;
        
        setClient(clientRes.data);
        if (jobsRes.data) setJobs(jobsRes.data);
        if (txsRes.data) setTransactions(txsRes.data);
        if (productsRes.data) setAllProducts(productsRes.data);

      } catch (error: any) {
        console.error('Error fetching ledger data:', error);
        toast.error('Failed to load ledger data from database.');
      } finally {
        setLoading(false);
      }
    }
    fetchClientData();
  }, [id, refreshTrigger]);

  // إضافة سطر جديد فارغ (Excel Row) مباشرة إلى Supabase وحفظه بشكل حي
  const handleAddExcelRow = async () => {
    if (!id) return;
    
    const newTx = {
      related_id: id, // تأكدي من تطابق أسماء الأعمدة في الـ DB لديكِ (snake_case أو camelClient)
      entity_id: id,
      type: 'raw_material',
      amount: 0,
      currency: 'USD',
      date: new Date().toISOString().slice(0, 10),
      description: '',
      weight_in_tons: 0,
      price_per_ton: 0,
      bl_number: '',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert([newTx])
      .select()
      .single();

    if (error) {
      console.error(error);
      toast.error('Could not add database row.');
    } else if (data) {
      setTransactions(prev => [...prev, data]);
      toast.success('Row added directly to system.');
    }
  };

  // تحديث خلية محددة داخل السطر وتأكيدها في السيرفر بشكل فوري
  const handleTxUpdate = async (txId: string, field: keyof Transaction | string, value: any) => {
    // تحديث محلي سريع لإشعار واجهة المستخدم فوراً (Optimistic UI)
    let updatedTxLocal: any = null;
    const updatedLocally = transactions.map(t => {
      if (t.id === txId) {
        const newT = { ...t, [field]: value };
        if (field === 'weightInTons' || field === 'pricePerTon' || field === 'weight_in_tons' || field === 'price_per_ton') {
          const w = Number(newT.weightInTons || newT.weightInTons) || 0;
          const p = Number(newT.pricePerTon || newT.pricePerTon) || 0;
          newT.amount = w * p;
        }
        updatedTxLocal = newT;
        return newT;
      }
      return t;
    });
    setTransactions(updatedLocally);

    // تجهيز كائن التحديث لقاعدة البيانات (تعديل الحقول لتطابق الـ Mapping إذا كانت الـ DB تستخدم snake_case)
    const updatePayload: Record<string, any> = { [field]: value };
    if (field === 'weightInTons' || field === 'pricePerTon' || field === 'weight_in_tons' || field === 'price_per_ton') {
      const w = Number(updatedTxLocal?.weightInTons || updatedTxLocal?.weight_in_tons) || 0;
      const p = Number(updatedTxLocal?.pricePerTon || updatedTxLocal?.price_per_ton) || 0;
      updatePayload.amount = w * p;
    }

    const { error } = await supabase
      .from('transactions')
      .update(updatePayload)
      .eq('id', txId);

    if (error) {
      console.error(error);
      toast.error('Database sync failed.');
      return;
    }

    // التحقق من حالة ربط العمليات بالعملاء بشكل حي
    if ((field === 'relatedId' || field === 'related_id') && value !== id && value !== 'none') {
      const job = jobs.find(j => j.id === value);
      if (job && job.clientId !== id) {
        const { error: jobErr } = await supabase
          .from('jobs')
          .update({ clientId: id })
          .eq('id', value);

        if (!jobErr) {
          setJobs(prev => prev.map(j => j.id === value ? { ...j, clientId: id! } : j));
          toast.success('Job linked to this client globally.');
        }
      }
    }

    // مزامنة التحديثات على المنتجات المرتبطة بالعملية تلقائياً
    if (updatedTxLocal && ['variety', 'caliber', 'grade'].includes(field as string)) {
      const targetJobId = updatedTxLocal.relatedId || updatedTxLocal.related_id;
      if (targetJobId && targetJobId !== 'none' && targetJobId !== id) {
        const job = jobs.find(j => j.id === targetJobId);
        if (job) {
          const newProds = [...(job.products || [])];
          if (newProds.length > 0) {
            newProds[0] = { ...newProds[0], [field]: value };
          } else {
            newProds.push({ productId: '', quantity: 0, unitPrice: 0, packages: 0, [field]: value });
          }
          
          await supabase.from('jobs').update({ products: newProds }).eq('id', job.id);
          setJobs(prev => prev.map(j => j.id === job.id ? { ...j, products: newProds } : j));
        }
      }
    }
  };

  // حذف السطر نهائياً من الـ PostgreSQL
  const handleDeleteTx = async (txId: string) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', txId);

    if (error) {
      toast.error('Could not delete from database.');
    } else {
      setTransactions(prev => prev.filter(t => t.id !== txId));
      toast.success('Row deleted successfully.');
    }
  };

  // معالجة تصفية العمليات والمعاملات التلقائية المربوطة بالـ Client الحالي
  const clientJobs = useMemo(() => {
    return jobs.filter(j => j.clientId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [jobs, id]);

  const clientTransactions = useMemo(() => {
    const clientJobIds = jobs.filter(j => j.clientId === id).map(j => j.id);
    
    // الحقول تدعم التسميتين الاحتياطيتين (camelCase و snake_case القادمة من الـ Postgres)
    let manualTxs = transactions.filter(t => {
      const entityId = t.entityId || (t as any).entity_id;
      const relatedId = t.relatedId || (t as any).related_id;
      if (entityId) return entityId === id;
      if (relatedId === id) return true;
      if (relatedId && clientJobIds.includes(relatedId)) {
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

    if (filterJobId !== 'all') {
      allTxs = allTxs.filter(t => (t.relatedId || (t as any).related_id) === filterJobId);
    }

    if (filterCurrency !== 'all') {
      allTxs = allTxs.filter(t => (t.currency || 'USD') === filterCurrency);
    }

    return allTxs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, jobs, id, filterJobId, filterCurrency, allProducts]);

  if (loading) {
    return (
      <div className="p-24 flex flex-col items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Syncing Ledger with PostgreSQL database...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold">Client data not found in Supabase</h2>
        <Button onClick={() => navigate('/clients')} className="mt-4">Back to Clients</Button>
      </div>
    );
  }

  const printRow = (tx: Transaction) => {
    setSelectedTxForPrint(tx);
    setInvoicePrintOpen(true);
  };

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
            <p className="text-muted-foreground flex items-center gap-2">
              <span>Country: <strong>{client.country || 'N/A'}</strong></span>
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
            </p>
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
            <p className="text-sm text-muted-foreground mt-1">Add or edit rows below. All calculations sync automatically with cloud storage.</p>
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
                clientTransactions.map((tx) => {
                  const txRelatedId = tx.relatedId || (tx as any).related_id;
                  const txBlNumber = tx.blNumber || (tx as any).bl_number;
                  const txWeightInTons = tx.weightInTons !== undefined ? tx.weightInTons : (tx as any).weight_in_tons;
                  const txPricePerTon = tx.pricePerTon !== undefined ? tx.pricePerTon : (tx as any).price_per_ton;

                  return (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-2">
                        {(tx as any).isAuto ? <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span> : <DatePicker value={tx.date.split('T')[0]} onChange={(v) => handleTxUpdate(tx.id, 'date', v)} className="w-28 h-8 text-xs bg-transparent border-transparent hover:border-input focus:border-input p-1" />}
                      </td>
                      <td className="px-4 py-2">
                        {(() => {
                          const linkedJob = jobs.find(j => j.id === txRelatedId);
                          const incotermText = linkedJob?.incoterm && linkedJob.incoterm !== 'none' ? `[${linkedJob.incoterm}]` : '';
                          if ((tx as any).isAuto) {
                            return <span className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis block w-40">{linkedJob?.title || 'Job'} {incotermText}</span>;
                          }
                          return (
                            <Select value={txRelatedId === id ? 'none' : (txRelatedId || 'none')} onValueChange={(v) => handleTxUpdate(tx.id, 'relatedId', v)}>
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
                          const linkedJob = jobs.find(j => j.id === txRelatedId);
                          const p = linkedJob?.products?.[0];
                          const val = tx.variety || p?.variety || '';
                          if ((tx as any).isAuto) return <span className="text-xs text-muted-foreground">{val}</span>;
                          return <EditableCell type="text" value={tx.variety || ''} onSave={(v) => handleTxUpdate(tx.id, 'variety', v)} placeholder="Variety" className="w-16 text-xs bg-transparent" />;
                        })()}
                      </td>
                      <td className="px-4 py-2">
                        {(() => {
                          const linkedJob = jobs.find(j => j.id === txRelatedId);
                          const p = linkedJob?.products?.[0];
                          const val = tx.caliber || p?.caliber || '';
                          if ((tx as any).isAuto) return <span className="text-xs text-muted-foreground">{val}</span>;
                          return <EditableCell type="text" value={tx.caliber || ''} onSave={(v) => handleTxUpdate(tx.id, 'caliber', v)} placeholder="Caliber" className="w-16 text-xs bg-transparent" />;
                        })()}
                      </td>
                      <td className="px-4 py-2">
                        {(() => {
                          const linkedJob = jobs.find(j => j.id === txRelatedId);
                          const p = linkedJob?.products?.[0];
                          const val = tx.grade || p?.grade || '';
                          if ((tx as any).isAuto) return <span className="text-xs text-muted-foreground">{val}</span>;
                          return <EditableCell type="text" value={tx.grade || ''} onSave={(v) => handleTxUpdate(tx.id, 'grade', v)} placeholder="Grade" className="w-16 text-xs bg-transparent" />;
                        })()}
                      </td>
                      <td className="px-4 py-2">
                        {(() => {
                          const linkedJob = jobs.find(j => j.id === txRelatedId);
                          const qtyText = linkedJob?.numberOfContainers ? `(${linkedJob.numberOfContainers} FCL)` : '';
                          const blVal = txBlNumber || linkedJob?.blNumber || '-';
                          if ((tx as any).isAuto) {
                            return <span className="text-xs text-muted-foreground">{blVal} {qtyText}</span>;
                          }
                          return (
                            <div className="flex flex-col gap-1 w-full">
                              <EditableCell type="text" value={txBlNumber || ''} onSave={(v) => handleTxUpdate(tx.id, 'blNumber', v)} placeholder="Container..." className="w-full text-xs bg-transparent" />
                              {qtyText && <span className="text-[10px] text-muted-foreground">{qtyText}</span>}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-2">
                        {(() => {
                          const linkedJob = jobs.find(j => j.id === txRelatedId);
                          const term = tx.incoterm || linkedJob?.incoterm || '';
                          if ((tx as any).isAuto) {
                            return <span className="text-xs text-muted-foreground font-medium">{term}</span>;
                          }
                          return <EditableCell type="text" value={tx.incoterm || ''} onSave={(v) => handleTxUpdate(tx.id, 'incoterm', v)} placeholder="CFR, FOB..." className="w-20 text-xs bg-transparent" />;
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
                        {(tx as any).isAuto ? <span className="text-xs text-muted-foreground">{txWeightInTons || 0}</span> : <EditableCell type="number" value={txWeightInTons || 0} onSave={(v) => handleTxUpdate(tx.id, 'weightInTons', v)} className="w-20 text-xs bg-transparent text-right" />}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {(tx as any).isAuto ? <span className="text-xs text-muted-foreground">{txPricePerTon || 0}</span> : <EditableCell type="number" value={txPricePerTon || 0} onSave={(v) => handleTxUpdate(tx.id, 'pricePerTon', v)} className="w-20 text-xs bg-transparent text-right" />}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {(tx as any).isAuto ? (
                          <span className="text-xs font-medium text-red-600">{tx.amount}</span>
                        ) : tx.type !== 'incoming' ? (
                          <EditableCell type="number" value={tx.amount} onSave={(v) => handleTxUpdate(tx.id, 'amount', v)} className="w-24 text-xs font-medium bg-transparent text-right text-red-600" />
                        ) : (
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-red-600" onClick={() => handleTxUpdate(tx.id, 'type', 'raw_material')}>Set Charge</Button>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right flex justify-end">
                        {tx.type === 'incoming' ? (
                          <EditableCell type="number" value={tx.amount} onSave={(v) => handleTxUpdate(tx.id, 'amount', v)} className="w-28 text-base font-bold bg-transparent text-right text-green-600" />
                        ) : (
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-green-600" onClick={() => handleTxUpdate(tx.id, 'type', 'incoming')}>Set Payment</Button>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center flex items-center justify-center gap-1 no-print">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => printRow(tx)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        {!(tx as any).isAuto && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteTx(tx.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {clientTransactions.length > 0 && (
              <tfoot className="bg-muted font-bold text-sm">
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-right uppercase">Operations Value:</td>
                  <td colSpan={3} className="px-4 py-4 text-center text-lg text-primary whitespace-nowrap border-l">
                    {formatBalanceObj(totalOperationsObj)}
                  </td>
                </tr>
                <tr className="border-t">
                  <td colSpan={7} className="px-4 py-4 text-right uppercase">Total Payment Received:</td>
                  <td colSpan={3} className="px-4 py-4 text-center text-lg text-success whitespace-nowrap border-l">
                    {formatBalanceObj(totalPaymentsObj)}
                  </td>
                </tr>
                <tr className="border-t">
                  <td colSpan={7} className="px-4 py-4 text-right uppercase">Total Balance Owed by Client:</td>
                  <td colSpan={3} className="px-4 py-4 text-center text-lg text-destructive whitespace-nowrap border-l">
                    {formatBalanceObj(totalBalanceObj)}
                  </td>
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
        job={selectedTxForPrint ? jobs.find(j => j.id === (selectedTxForPrint.relatedId || (selectedTxForPrint as any).related_id)) : null}
      />
    </div>
  );
}