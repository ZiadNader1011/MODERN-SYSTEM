import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from '../../node_modules/react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import {
  getTransactions, saveTransactions, getSuppliers, getJobs, getClients, getContainers, getShippingAgents, getEmployees,
  generateId, Transaction, formatCurrency, formatDate, EGYPTIAN_BANKS
} from '@/data/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/DatePicker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Plus, Trash2, DollarSign, TrendingUp, TrendingDown, Book, Calendar, Pencil
} from 'lucide-react';
import { toast } from 'sonner';

export default function Financials() {
  const { t } = useTranslation();
  
  // States لجميع البيانات القادمة من المتجر
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [shippingAgents, setShippingAgents] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // ============================================================================
  // 🔥 المزامنة الفورية والدورية لكل الجداول لضمان عدم اختفائها 🔥
  // ============================================================================
  useEffect(() => {
    const loadAllData = () => {
      setTransactions(getTransactions());
      setSuppliers(getSuppliers());
      setClients(getClients());
      setJobs(getJobs());
      setContainers(getContainers());
      setShippingAgents(getShippingAgents());
      setEmployees(getEmployees());
    };

    loadAllData(); // تحميل فوري

    // تحديثات متتالية سريعة للتأكد من استقرار البيانات بعد اتصال الباك إند
    const t1 = setTimeout(loadAllData, 300);
    const t2 = setTimeout(loadAllData, 800);
    const t3 = setTimeout(loadAllData, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);
  // ============================================================================

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const emptyForm = { 
    type: 'incoming' as Transaction['type'], 
    relatedId: 'none', 
    amount: '', 
    currency: 'USD', 
    date: new Date().toISOString().split('T')[0], 
    description: '', 
    bank: '',
    blNumber: '',
    invoiceNumber: '',
    weightInTons: undefined as number | undefined,
    packages: undefined as number | undefined
  };
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterEntityId, setFilterEntityId] = useState<string>('all');

  const visibleTransactions = useMemo(() => {
    return transactions;
  }, [transactions]);

  // تعديل دالة الحساب لتعتمد مباشرة على visibleTransactions الحالية في الـ State
  const sumByCurrency = (type: string) => {
    const subset = visibleTransactions.filter(t => t.type === type);
    const obj = subset.reduce((acc, t) => { acc[t.currency] = (acc[t.currency] || 0) + t.amount; return acc; }, {} as Record<string, number>);
    const parts = Object.entries(obj).map(([cur, val]) => formatCurrency(val, cur));
    return parts.length ? parts.join(' | ') : '0';
  };

  const incomingTotalStr = sumByCurrency('incoming');
  const outgoingTotalStr = sumByCurrency('outgoing');
  const rawMaterialTotalStr = sumByCurrency('raw_material');
  const pettyCashTotalStr = sumByCurrency('petty_cash');

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setEditOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setForm({
      type: t.type,
      relatedId: t.relatedId || 'none',
      amount: t.amount.toString(),
      currency: t.currency,
      date: t.date,
      description: t.description,
      bank: t.bank || '',
      blNumber: t.blNumber || '',
      invoiceNumber: t.invoiceNumber || '',
      weightInTons: t.weightInTons,
      packages: t.packages
    });
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Please enter a valid amount.'); return; }
    if (!form.date) { toast.error('Please enter a date.'); return; }
    if (!form.description) { toast.error('Please enter a description.'); return; }

    const tx: Transaction = {
      id: editing ? editing.id : generateId(),
      relatedId: form.relatedId === 'none' ? undefined : form.relatedId,
      type: form.type,
      amount: parseFloat(form.amount),
      currency: form.currency,
      date: form.date,
      description: form.description,
      bank: form.bank || undefined,
      blNumber: form.blNumber || undefined,
      invoiceNumber: form.invoiceNumber || undefined,
      weightInTons: form.weightInTons,
      packages: form.packages,
      createdAt: editing ? editing.createdAt : new Date().toISOString(),
    };
    
    let updated: Transaction[];
    if (editing) {
      updated = transactions.map(t => t.id === editing.id ? tx : t);
      toast.success('Transaction updated successfully! ✏️');
    } else {
      updated = [...transactions, tx];
      toast.success('Transaction recorded successfully! 💰');
    }
    
    setTransactions(updated);
    saveTransactions(updated);
    setEditOpen(false);
  };

  const handleDelete = useCallback(() => {
    if (!deleting) return;
    const updated = transactions.filter(p => p.id !== deleting.id);
    setTransactions(updated);
    saveTransactions(updated);
    toast.success('Record removed.');
    setDeleting(null);
  }, [deleting, transactions]);

  // تحديث بناء قائمة الكيانات لتعمل بشكل ديناميكي صحيح مع الـ States الجديدة
  const linkableEntities = useMemo(() => [
    { label: '--- Jobs ---', isLabel: true, value: 'label-jobs' },
    ...jobs.map(j => ({ label: `Job: ${j.title}`, value: j.id })),
    { label: '--- Suppliers ---', isLabel: true, value: 'label-suppliers' },
    ...suppliers.map(s => ({ label: `Supplier: ${s.name}`, value: s.id })),
    { label: '--- Clients ---', isLabel: true, value: 'label-clients' },
    ...clients.map(c => ({ label: `Client: ${c.name}`, value: c.id })),
    { label: '--- Shipping Agents ---', isLabel: true, value: 'label-agents' },
    ...shippingAgents.map(a => ({ label: `Agent: ${a.name}`, value: a.id })),
    { label: '--- Employees ---', isLabel: true, value: 'label-employees' },
    ...employees.map(e => ({ label: `Employee: ${e.name}`, value: e.id }))
  ], [jobs, suppliers, clients, shippingAgents, employees]);

  const getRelatedEntityName = (id?: string) => {
    if (!id) return null;
    const j = jobs.find(x => x.id === id);
    if (j) return `Job: ${j.title}`;
    const s = suppliers.find(x => x.id === id);
    if (s) return `Supplier: ${s.name}`;
    const c = clients.find(x => x.id === id);
    if (c) return `Client: ${c.name}`;
    const a = shippingAgents.find(x => x.id === id);
    if (a) return `Agent: ${a.name}`;
    const e = employees.find(x => x.id === id);
    if (e) return `Employee: ${e.name}`;
    return null;
  };

  const entitiesOptions = useMemo(() => {
    switch (filterCategory) {
      case 'jobs': return jobs.map(x => ({ label: x.title, value: x.id }));
      case 'clients': return clients.map(x => ({ label: x.name, value: x.id }));
      case 'suppliers': return suppliers.map(x => ({ label: x.name, value: x.id }));
      case 'agents': return shippingAgents.map(x => ({ label: x.name, value: x.id }));
      case 'employees': return employees.map(x => ({ label: x.name, value: x.id }));
      default: return [];
    }
  }, [filterCategory, jobs, clients, suppliers, shippingAgents, employees]);

  const handleCategoryChange = (val: string) => {
    setFilterCategory(val);
    setFilterEntityId('all');
  };

  const filteredTransactions = useMemo(() => {
    return visibleTransactions
      .filter(t => {
        if (filterCategory !== 'all' && filterEntityId !== 'all') {
          const j = jobs.find(x => x.id === t.relatedId);
          
          if (filterCategory === 'jobs') {
            if (t.relatedId !== filterEntityId) return false;
          } else if (filterCategory === 'clients') {
            const directMatch = t.relatedId === filterEntityId;
            const jobMatch = j && j.clientId === filterEntityId;
            if (!directMatch && !jobMatch) return false;
          } else if (filterCategory === 'suppliers') {
            const directMatch = t.relatedId === filterEntityId;
            const jobMatch = j && j.supplierId === filterEntityId;
            if (!directMatch && !jobMatch) return false;
          } else if (filterCategory === 'agents') {
            if (t.relatedId !== filterEntityId) return false;
          } else if (filterCategory === 'employees') {
            if (t.relatedId !== filterEntityId) return false;
          }
        }

        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        const related = getRelatedEntityName(t.relatedId) || '';
        const formattedDate = formatDate(t.date) || '';
        
        const normalizedDate = formattedDate.replace(/[\-\.\s]+/g, '/');
        const normalizedQuery = q.replace(/[\-\.\s]+/g, '/');
        const dateStringMatch = normalizedQuery.length > 0 && normalizedDate.includes(normalizedQuery);
        
        const rawDateStr = formattedDate.replace(/[^0-9]/g, '');
        const rawQueryStr = q.replace(/[^0-9]/g, '');
        const numericMatch = rawQueryStr.length > 0 && (rawDateStr.includes(rawQueryStr) || t.date.replace(/[^0-9]/g, '').includes(rawQueryStr));

        const directInvoiceSearch = t.invoiceNumber ? t.invoiceNumber.toLowerCase() : '';
        const j = jobs.find(x => x.id === t.relatedId);
        const invoiceSearch = j && j.invoiceNumber ? j.invoiceNumber.toLowerCase() : '';
        const blSearch = j && j.blNumber ? j.blNumber.toLowerCase() : '';
        const directBlSearch = t.blNumber ? t.blNumber.toLowerCase() : '';
        const c = j && j.containerId ? containers.find(cont => cont.id === j.containerId) : null;
        const containerSearch = c ? c.containerNumber.toLowerCase() : '';
        
        const supplierSearch = j && j.supplierId ? suppliers.find(x => x.id === j.supplierId)?.name.toLowerCase() || '' : '';
        const clientSearch = j && j.clientId ? clients.find(x => x.id === j.clientId)?.name.toLowerCase() || '' : '';
        const bankSearch = t.bank ? t.bank.toLowerCase() : '';
        const directSupplierSearch = suppliers.find(x => x.id === t.relatedId)?.name.toLowerCase() || '';
        const directClientSearch = clients.find(x => x.id === t.relatedId)?.name.toLowerCase() || '';
        const agentSearch = shippingAgents.find(x => x.id === t.relatedId)?.name.toLowerCase() || '';
        const employeeSearch = employees.find(x => x.id === t.relatedId)?.name.toLowerCase() || '';

        return t.description.toLowerCase().includes(q) || 
               t.type.replace('_', ' ').toLowerCase().includes(q) ||
               related.toLowerCase().includes(q) ||
               formattedDate.includes(q) ||
               dateStringMatch ||
               numericMatch ||
               t.amount.toString().includes(q) ||
               directInvoiceSearch.includes(q) ||
               invoiceSearch.includes(q) ||
               directBlSearch.includes(q) ||
               blSearch.includes(q) ||
               containerSearch.includes(q) ||
               bankSearch.includes(q) ||
               supplierSearch.includes(q) ||
               clientSearch.includes(q) ||
               directSupplierSearch.includes(q) ||
               directClientSearch.includes(q) ||
               agentSearch.includes(q) ||
               employeeSearch.includes(q);
      })
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [visibleTransactions, filterCategory, filterEntityId, searchTerm, jobs, suppliers, clients, shippingAgents, employees, containers]);

  return (
    <div>
      <PageHeader title={t('Financials', 'Financials - Daybook / يومية')} description={t('pages.financialsDescRoot', "Track all payments and transactions across the system.")}
        action={<Button onClick={openNew} size="lg"><Plus className="mr-2 h-4 w-4" /> Add Transaction</Button>} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-8">
        <StatCard title="Total Incoming" value={incomingTotalStr} icon={TrendingUp} variant="success" description="Revenues & Collections" />
        <StatCard title="Total Outgoing" value={outgoingTotalStr} icon={TrendingDown} variant="warning" description="Payments & Expenses" />
        <StatCard title="Total Raw Material" value={rawMaterialTotalStr} icon={DollarSign} variant="warning" description="Material costs" />
        <StatCard title="Total Other Costs" value={pettyCashTotalStr} icon={DollarSign} variant="info" description="Other costs" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Book className="h-5 w-5"/> Daybook (يومية)</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="jobs">Operations</SelectItem>
              <SelectItem value="clients">Clients</SelectItem>
              <SelectItem value="suppliers">Suppliers</SelectItem>
              <SelectItem value="agents">Shipping Agents</SelectItem>
              <SelectItem value="employees">Employees</SelectItem>
            </SelectContent>
          </Select>

          {filterCategory !== 'all' && (
            <Select value={filterEntityId} onValueChange={setFilterEntityId}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Select Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All in Category</SelectItem>
                {entitiesOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Input 
            placeholder="Search daybook... (بحث)" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-[200px] h-9" 
          />
        </div>
      </div>

      <div className="bg-card shadow-sm border rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground text-xs uppercase">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Invoice / B/L</th>
              <th className="px-4 py-3">Bank</th>
              <th className="px-4 py-3">Related To</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">No records match your search.</td></tr>
            ) : (
              filteredTransactions.map(t => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap"><Calendar className="h-3 w-3 inline mr-1 text-muted-foreground"/> {formatDate(t.date)}</td>
                  <td className="px-4 py-4"><Badge variant="outline">{t.type.replace('_', ' ')}</Badge></td>
                  <td className="px-4 py-4">{t.description}</td>
                  <td className="px-4 py-4 text-xs font-medium">
                    {t.invoiceNumber ? <div className="text-primary font-bold">{t.invoiceNumber}</div> : null}
                    {t.blNumber ? <div className="text-muted-foreground">{t.blNumber}</div> : null}
                    {!t.invoiceNumber && !t.blNumber && '—'}
                  </td>
                  <td className="px-4 py-4 text-xs font-medium text-muted-foreground">{t.bank || '—'}</td>
                  <td className="px-4 py-4 text-muted-foreground max-w-[200px] truncate">{getRelatedEntityName(t.relatedId) || '—'}</td>
                  <td className={`px-4 py-4 text-right font-semibold ${t.type === 'incoming' ? 'text-success' : t.type === 'outgoing' ? 'text-destructive' : ''}`}>
                    {formatCurrency(t.amount, t.currency || 'USD')}
                  </td>
                  <td className="px-4 py-4 text-right flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(t)} className="rounded-md p-1.5 hover:bg-accent text-muted-foreground"><Pencil className="h-4 w-4"/></button>
                    <button onClick={() => { setDeleting(t); setDeleteOpen(true); }} className="rounded-md p-1.5 hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4"/></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Transaction Record</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Record Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({...f, type: v as Transaction['type']}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="incoming">Incoming (إيرادات / تحصيلات)</SelectItem>
                  <SelectItem value="outgoing">Outgoing (مدفوعات)</SelectItem>
                  <SelectItem value="petty_cash">Other Cost (التكاليف والنثريات)</SelectItem>
                  <SelectItem value="raw_material">Raw Material (شراء خام)</SelectItem>
                  <SelectItem value="discount">Discount (خصم)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Link to Entity (Optional)</Label>
              <Select value={form.relatedId} onValueChange={v => setForm(f => ({ ...f, relatedId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select link" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Link</SelectItem>
                  {linkableEntities.map(e => (
                    <SelectItem key={e.value} value={e.value} disabled={'isLabel' in e}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Bank (Optional)</Label>
              <Select value={form.bank} onValueChange={v => setForm(f => ({ ...f, bank: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select or type bank name" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Bank</SelectItem>
                  {EGYPTIAN_BANKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Invoice Number (Optional)</Label>
                <Input value={form.invoiceNumber} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} placeholder="e.g. INV-2023" />
              </div>
              <div>
                <Label>B/L Number (Optional)</Label>
                <Input value={form.blNumber} onChange={e => setForm(f => ({ ...f, blNumber: e.target.value }))} placeholder="e.g. BL123456" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount *</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="number" step="any" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="flex-1" />
                  <Select value={form.currency} onValueChange={(v) => setForm(f => ({ ...f, currency: v }))}>
                    <SelectTrigger className="w-24"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="EGP">EGP (ج.م)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Date *</Label>
                <DatePicker value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} />
              </div>
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete} itemName={`${deleting ? formatCurrency(deleting.amount, deleting.currency) : ''} record`} />
    </div>
  );
}