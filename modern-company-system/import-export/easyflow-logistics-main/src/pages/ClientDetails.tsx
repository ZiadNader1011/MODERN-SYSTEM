import { useMemo, useState, useEffect } from 'react';
import { useParams as useRouterParams, useNavigate as useRouterNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { formatDate, formatBalanceObj, Job, Transaction } from '@/data/store'; 
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Plus, Trash2, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/DatePicker';
import { ClientInvoicePrintForm } from '@/components/ClientInvoicePrintForm';
import { supabase } from '@/utils/supabaseClient';

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

  useEffect(() => {
    setVal(value !== undefined && value !== null ? value : '');
  }, [value]);

  const handleBlur = () => {
    let finalVal = val;
    if (type === 'number') {
      finalVal = finalVal === '' ? 0 : Number(finalVal);
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
      className={`bg-transparent outline-none focus:ring-1 focus:ring-primary rounded px-1 py-0.5 transition-colors hover:bg-muted/50 border border-transparent hover:border-input focus:border-input ${className}`}
    />
  );
}

export default function ClientDetails() {
  const { id } = useRouterParams<{ id: string }>();
  const navigate = useRouterNavigate();
  const { t } = useTranslation();
  
  const [invoicePrintOpen, setInvoicePrintOpen] = useState(false);
  const [selectedTxForPrint, setSelectedTxForPrint] = useState<any | null>(null);

  const [client, setClient] = useState<Client | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]); 
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [filterJobId, setFilterJobId] = useState<string>('all');
  const [filterCurrency, setFilterCurrency] = useState<string>('all');

  useEffect(() => {
    async function fetchClientData() {
      if (!id) return;
      try {
        setLoading(true);
        
        // 🔹 تعديل هنا: تم تغيير اسم جدول الحركات إلى 'transactions' كما هو بالـ Database
        const [clientRes, jobsRes, txsRes, productsRes] = await Promise.all([
          supabase.from('Client').select('*').eq('id', id).maybeSingle(),
          supabase.from('Job').select('*').eq('clientId', id), 
          supabase.from('transactions').select('*').eq('entity_id', id), 
          supabase.from('Product').select('id, name')
        ]);

        if (clientRes.error) throw clientRes.error;
        if (jobsRes.error) throw jobsRes.error;
        if (txsRes.error) throw txsRes.error;

        setClient(clientRes.data || null);
        setJobs(jobsRes.data || []);
        setTransactions(txsRes.data || []);
        setAllProducts(productsRes.data || []);

      } catch (error: any) {
        console.error('Error fetching ledger data:', error);
        toast.error(`Database Error: ${error.message || 'Failed to load data'}`);
      } finally {
        setLoading(false);
      }
    }
    fetchClientData();
  }, [id, refreshTrigger]);

  const handleAddExcelRow = async () => {
    if (!id) return;
    
    const newTx = {
      entity_id: id,      
      type: 'raw_material',
      amount: 0,
      currency: 'USD',
      date: new Date().toISOString().slice(0, 10),
      description: '',
      weight_in_tons: 0,   
      price_per_ton: 0,    
      bl_number: '',
      variety: '',
      caliber: '',
      grade: '',
      incoterm: ''
    };

    // 🔹 تعديل هنا: 'transactions'
    const { data, error } = await supabase
      .from('transactions')
      .insert([newTx])
      .select()
      .maybeSingle();

    if (error) {
      console.error("Supabase Insert Error: ", error);
      toast.error(`إضافة السطر فشلت: ${error.message}`);
    } else if (data) {
      setTransactions(prev => [...prev, data]);
      toast.success('تم إضافة السطر بنجاح في قاعدة البيانات.');
    }
  };

  const handleTxUpdate = async (txId: string, dbField: string, value: any) => {
    const updatedLocally = transactions.map(t => {
      if (t.id === txId) {
        const newT = { ...t, [dbField]: value };
        if (['weight_in_tons', 'price_per_ton'].includes(dbField)) {
          const w = Number(newT.weight_in_tons) || 0;
          const p = Number(newT.price_per_ton) || 0;
          newT.amount = w * p;
        }
        return newT;
      }
      return t;
    });
    setTransactions(updatedLocally);

    const updatePayload: Record<string, any> = { [dbField]: value };
    const targetTx = updatedLocally.find(t => t.id === txId);
    
    if (['weight_in_tons', 'price_per_ton'].includes(dbField)) {
      const w = Number(targetTx?.weight_in_tons) || 0;
      const p = Number(targetTx?.price_per_ton) || 0;
      updatePayload.amount = w * p;
    }

    // 🔹 تعديل هنا: 'transactions'
    const { error } = await supabase
      .from('transactions')
      .update(updatePayload)
      .eq('id', txId);

    if (error) {
      console.error('Supabase Update Error: ', error);
      toast.error(`فشل المزامنة: ${error.message}`);
      setRefreshTrigger(p => p + 1); 
    }
  };

  const handleDeleteTx = async (txId: string) => {
    // 🔹 تعديل هنا: 'transactions'
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', txId);

    if (error) {
      toast.error(`تعذر الحذف من قاعدة البيانات: ${error.message}`);
    } else {
      setTransactions(prev => prev.filter(t => t.id !== txId));
      toast.success('تم حذف السطر بنجاح.');
    }
  };

  const clientJobs = useMemo(() => {
    return [...jobs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [jobs]);

  const clientTransactions = useMemo(() => {
    let manualTxs = transactions.map(t => ({
      id: t.id,
      entityId: t.entity_id,
      type: t.type,
      amount: t.amount,
      currency: t.currency,
      date: t.date,
      description: t.description,
      relatedId: t.related_id,
      blNumber: t.bl_number,
      weightInTons: t.weight_in_tons,
      pricePerTon: t.price_per_ton,
      variety: t.variety,
      caliber: t.caliber,
      grade: t.grade,
      incoterm: t.incoterm,
      isAuto: false
    }));

    const autoTxs: any[] = [];
    jobs.forEach(job => {
      const hasValidProducts = job.products && job.products.some((p: any) => (Number(p.quantity) || 0) > 0 && (Number(p.unitPrice) || 0) > 0);
      if (hasValidProducts) {
        job.products.forEach((p: any, idx: number) => {
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
              variety: p.variety || '',
              caliber: p.caliber || '',
              grade: p.grade || '',
              incoterm: job.incoterm || '',
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
          variety: '',
          caliber: '',
          grade: '',
          incoterm: job.incoterm || '',
          isAuto: true
        });
      }
    });

    let allTxs = [...manualTxs, ...autoTxs];

    if (filterJobId !== 'all') {
      allTxs = allTxs.filter(t => t.relatedId === filterJobId);
    }

    if (filterCurrency !== 'all') {
      allTxs = allTxs.filter(t => (t.currency || 'USD') === filterCurrency);
    }

    return allTxs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, jobs, filterJobId, filterCurrency, allProducts]);

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
        <h2 className="text-2xl font-bold text-destructive">Client ID Not Found In Database</h2>
        <p className="text-muted-foreground mt-2">The record may have been deleted or the route parameter is incorrect.</p>
        <Button onClick={() => navigate('/clients')} className="mt-4">Back to Clients</Button>
      </div>
    );
  }

  const printRow = (tx: any) => {
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
                  return (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-2">
                        {tx.isAuto ? <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span> : <DatePicker value={tx.date ? tx.date.split('T')[0] : ''} onChange={(v) => handleTxUpdate(tx.id, 'date', v)} className="w-28 h-8 text-xs bg-transparent border-transparent hover:border-input focus:border-input p-1" />}
                      </td>
                      <td className="px-4 py-2">
                        {(() => {
                          const linkedJob = jobs.find(j => j.id === tx.relatedId);
                          const incotermText = linkedJob?.incoterm && linkedJob.incoterm !== 'none' ? `[${linkedJob.incoterm}]` : '';
                          if (tx.isAuto) {
                            return <span className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis block w-40">{linkedJob?.title || 'Job'} {incotermText}</span>;
                          }
                          return (
                            <Select value={tx.relatedId || 'none'} onValueChange={(v) => handleTxUpdate(tx.id, 'related_id', v === 'none' ? null : v)}>
                              <SelectTrigger className="h-8 text-xs border-transparent hover:border-input bg-transparent"><SelectValue placeholder="Select Job" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">General (No Job)</SelectItem>
                                {jobs.map(j => <SelectItem key={j.id} value={j.id}>{formatDate(j.createdAt)} - {j.title} {j.incoterm && j.incoterm !== 'none' ? `[${j.incoterm}]` : ''}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-2">
                        {tx.isAuto ? <span className="text-xs text-primary font-medium">{tx.description}</span> : <EditableCell type="text" value={tx.description} onSave={(v) => handleTxUpdate(tx.id, 'description', v)} placeholder="Product..." className="w-full text-xs bg-transparent" />}
                      </td>
                      <td className="px-4 py-2">
                        {tx.isAuto ? <span className="text-xs text-muted-foreground">{tx.variety}</span> : <EditableCell type="text" value={tx.variety} onSave={(v) => handleTxUpdate(tx.id, 'variety', v)} placeholder="Variety" className="w-16 text-xs bg-transparent" />}
                      </td>
                      <td className="px-4 py-2">
                        {tx.isAuto ? <span className="text-xs text-muted-foreground">{tx.caliber}</span> : <EditableCell type="text" value={tx.caliber} onSave={(v) => handleTxUpdate(tx.id, 'caliber', v)} placeholder="Caliber" className="w-16 text-xs bg-transparent" />}
                      </td>
                      <td className="px-4 py-2">
                        {tx.isAuto ? <span className="text-xs text-muted-foreground">{tx.grade}</span> : <EditableCell type="text" value={tx.grade} onSave={(v) => handleTxUpdate(tx.id, 'grade', v)} placeholder="Grade" className="w-16 text-xs bg-transparent" />}
                      </td>
                      <td className="px-4 py-2">
                        {(() => {
                          const linkedJob = jobs.find(j => j.id === tx.relatedId);
                          const qtyText = linkedJob?.numberOfContainers ? `(${linkedJob.numberOfContainers} FCL)` : '';
                          if (tx.isAuto) {
                            return <span className="text-xs text-muted-foreground">{tx.blNumber} {qtyText}</span>;
                          }
                          return (
                            <div className="flex flex-col gap-1 w-full">
                              <EditableCell type="text" value={tx.blNumber} onSave={(v) => handleTxUpdate(tx.id, 'bl_number', v)} placeholder="Container..." className="w-full text-xs bg-transparent" />
                              {qtyText && <span className="text-[10px] text-muted-foreground">{qtyText}</span>}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-2">
                        {tx.isAuto ? <span className="text-xs text-muted-foreground font-medium">{tx.incoterm}</span> : <EditableCell type="text" value={tx.incoterm} onSave={(v) => handleTxUpdate(tx.id, 'incoterm', v)} placeholder="CFR, FOB..." className="w-20 text-xs bg-transparent" />}
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
                        {tx.isAuto ? <span className="text-xs text-muted-foreground">{tx.weightInTons || 0}</span> : <EditableCell type="number" value={tx.weightInTons || 0} onSave={(v) => handleTxUpdate(tx.id, 'weight_in_tons', v)} className="w-20 text-xs bg-transparent text-right" />}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {tx.isAuto ? <span className="text-xs text-muted-foreground">{tx.pricePerTon || 0}</span> : <EditableCell type="number" value={tx.pricePerTon || 0} onSave={(v) => handleTxUpdate(tx.id, 'price_per_ton', v)} className="w-20 text-xs bg-transparent text-right" />}
                      </td>
                      <td className="px-4 py-2 text-right text-red-600 font-medium">
                        {tx.isAuto ? (
                          <span>{tx.amount}</span>
                        ) : tx.type !== 'incoming' ? (
                          <EditableCell type="number" value={tx.amount} onSave={(v) => handleTxUpdate(tx.id, 'amount', v)} className="w-24 text-xs font-medium bg-transparent text-right text-red-600" />
                        ) : (
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-red-600" onClick={() => handleTxUpdate(tx.id, 'type', 'raw_material')}>Set Charge</Button>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-green-600 font-bold">
                        {tx.type === 'incoming' ? (
                          <EditableCell type="number" value={tx.amount} onSave={(v) => handleTxUpdate(tx.id, 'amount', v)} className="w-28 text-base font-bold bg-transparent text-right text-green-600" />
                        ) : (
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-green-600" onClick={() => handleTxUpdate(tx.id, 'type', 'incoming')}>Set Payment</Button>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center no-print">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => printRow(tx)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                          {!tx.isAuto && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteTx(tx.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {clientTransactions.length > 0 && (
              <tfoot className="bg-muted font-bold text-sm">
                <tr>
                  <td colSpan={11} className="px-4 py-4 text-right uppercase">Operations Value:</td>
                  <td colSpan={3} className="px-4 py-4 text-center text-lg text-primary whitespace-nowrap border-l">
                    {formatBalanceObj(totalOperationsObj)}
                  </td>
                </tr>
                <tr className="border-t">
                  <td colSpan={11} className="px-4 py-4 text-right uppercase">Total Payment Received:</td>
                  <td colSpan={3} className="px-4 py-4 text-center text-lg text-success whitespace-nowrap border-l">
                    {formatBalanceObj(totalPaymentsObj)}
                  </td>
                </tr>
                <tr className="border-t">
                  <td colSpan={11} className="px-4 py-4 text-right uppercase">Total Balance Owed by Client:</td>
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
        job={selectedTxForPrint ? jobs.find(j => j.id === selectedTxForPrint.relatedId) : null}
      />
    </div>
  );
}