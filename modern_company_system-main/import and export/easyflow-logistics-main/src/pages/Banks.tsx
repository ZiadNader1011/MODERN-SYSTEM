import { useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getTransactions, saveTransactions, formatDate, formatCurrency, EGYPTIAN_BANKS, Transaction, getJobs, getSuppliers, getClients, generateId, getBankBalances, saveBankBalances, BankBalances } from '@/data/store';
import { PageHeader } from '@/components/PageHeader';
import { Building2, Plus, Receipt, Pencil, Trash2, Paperclip, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/DatePicker';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { FileViewer } from '@/components/FileViewer';
import { toast } from 'sonner';

export default function Banks() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>(() => getTransactions());
  const [bankBalancesState, setBankBalancesState] = useState<BankBalances>(() => getBankBalances());
  
  // Extract only banks that have at least one transaction or a balance profile
  const bankNames = useMemo(() => {
    const banksInUse = new Set<string>();
    transactions.forEach(t => {
      if (t.bank && t.bank.trim() !== '') {
        banksInUse.add(t.bank.trim());
      }
    });
    Object.keys(bankBalancesState).forEach(b => banksInUse.add(b.trim()));
    return Array.from(banksInUse).sort();
  }, [transactions]);

  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  
  // Delete & Edit states
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState({ 
    type: 'incoming' as Transaction['type'], 
    relatedId: 'none', 
    amount: '', 
    currency: 'USD', 
    date: '', 
    description: '', 
    bank: '',
    blNumber: '',
    weightInTons: undefined as number | undefined,
    packages: undefined as number | undefined,
    attachmentUrl: ''
  });

  const [balanceAdjustOpen, setBalanceAdjustOpen] = useState(false);
  const [balanceForm, setBalanceForm] = useState({ currency: 'USD', amount: '' });

  // Attachment states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingForTx, setUploadingForTx] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<string | null>(null);

  // Data for form dropdowns
  const jobs = useMemo(() => getJobs(), []);
  const suppliers = useMemo(() => getSuppliers(), []);
  const clients = useMemo(() => getClients(), []);

  // Group transactions by bank
  const getBankFiltered = (bankName: string) => {
    return transactions.filter(t => t.bank?.trim() === bankName)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleDelete = () => {
    if (!deleting) return;
    const updated = transactions.filter(p => p.id !== deleting.id);
    setTransactions(updated);
    saveTransactions(updated);
    toast.success('Record removed.');
    setDeleting(null);
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
      weightInTons: t.weightInTons,
      packages: t.packages,
      attachmentUrl: (t as any).attachmentUrl || ''
    });
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
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
      weightInTons: form.weightInTons,
      packages: form.packages,
      attachmentUrl: form.attachmentUrl || undefined,
      createdAt: editing ? editing.createdAt : new Date().toISOString(),
    } as Transaction;
    
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setForm(f => ({ ...f, attachmentUrl: event.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDirectUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingForTx) return;
    
    // Check file size (e.g. max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadingForTx(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const url = event.target.result as string;
        const updatedTransactions = transactions.map(t => 
          t.id === uploadingForTx ? { ...t, attachmentUrl: url } : t
        );
        setTransactions(updatedTransactions);
        saveTransactions(updatedTransactions);
        toast.success('Attachment added successfully!');
        setUploadingForTx(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      toast.error('Error reading file attachment');
      setUploadingForTx(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const linkableEntities = [
    { label: '--- Jobs ---', isLabel: true, value: 'label-jobs' },
    ...jobs.map(j => ({ label: `Job: ${j.title}`, value: j.id })),
    { label: '--- Suppliers ---', isLabel: true, value: 'label-suppliers' },
    ...suppliers.map(s => ({ label: `Supplier: ${s.name}`, value: s.id })),
    { label: '--- Clients ---', isLabel: true, value: 'label-clients' },
    ...clients.map(c => ({ label: `Client: ${c.name}`, value: c.id }))
  ];

  // Compute balance for a bank:
  // Incoming = +
  // Outgoing / Petty Cash / Raw Material = -
  const getBankBalance = (bankName: string) => {
    const txs = getBankFiltered(bankName);
    const balanceByCurrency: Record<string, number> = {};
    
    txs.forEach(t => {
      const cur = t.currency || 'USD';
      if (!balanceByCurrency[cur]) balanceByCurrency[cur] = 0;
      
      if (t.type === 'incoming') {
        balanceByCurrency[cur] += t.amount;
      } else if (t.type !== 'discount') { // discount doesn't usually hit the bank account directly? or is it just ignored? usually outgoing/petty limit hits
        balanceByCurrency[cur] -= t.amount;
      }
    });

    const initial = bankBalancesState[bankName] || {};
    Object.keys(initial).forEach(cur => {
      if (!balanceByCurrency[cur]) balanceByCurrency[cur] = 0;
      balanceByCurrency[cur] += initial[cur];
    });

    return balanceByCurrency;
  };

  const handleAdjustBalance = () => {
    if (!selectedBank) return;
    const amount = parseFloat(balanceForm.amount);
    if (isNaN(amount)) { toast.error("Invalid amount"); return; }
    
    const updated = { ...bankBalancesState };
    if (!updated[selectedBank]) updated[selectedBank] = {};
    updated[selectedBank][balanceForm.currency] = amount;
    
    setBankBalancesState(updated);
    saveBankBalances(updated);
    toast.success("Starting balance updated successfully!");
    setBalanceForm({ currency: 'USD', amount: '' });
    setBalanceAdjustOpen(false);
  };

  return (
    <div>
      <PageHeader 
        title={t('Banks & Accounts', 'Banks')} 
        description={t('pages.banksDesc', 'Manage your bank accounts and view specific ledgers.')} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bankNames.map(bank => {
          const balances = getBankBalance(bank);
          const hasBalances = Object.keys(balances).length > 0;
          const txs = getBankFiltered(bank);

          return (
            <div key={bank} className="rounded-xl border bg-card p-6 shadow-sm flex flex-col cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedBank(bank)}>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 p-3 rounded-full text-primary">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{bank}</h3>
                  <p className="text-xs text-muted-foreground">{txs.length} Transactions</p>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t space-y-3">
                {Object.keys(bankBalancesState[bank] || {}).length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Adjusted Starting Balance</h4>
                    {Object.entries(bankBalancesState[bank] || {}).map(([cur, amount]) => (
                      <div key={cur} className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{cur}</span>
                        <span>{formatCurrency(amount as number, cur)}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Current Total Balance</h4>
                  {!hasBalances && <span className="text-sm">0.00</span>}
                {Object.entries(balances).map(([cur, amount]) => (
                  <div key={cur} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{cur}</span>
                    <span className={`font-semibold ${amount < 0 ? 'text-destructive' : 'text-success'}`}>
                      {formatCurrency(amount, cur)}
                    </span>
                  </div>
                ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {bankNames.length === 0 && (
        <div className="rounded-xl border-2 border-dashed p-12 text-center mt-6">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-semibold">No Banks Found</h3>
          <p className="mt-2 text-muted-foreground max-w-sm mx-auto text-sm">
            You haven't assigned any transactions to a bank yet. Open the Financials Daybook and link transactions to a Bank name to see them here.
          </p>
        </div>
      )}

      {/* Bank Details Modal */}
      <Dialog open={!!selectedBank} onOpenChange={() => setSelectedBank(null)}>
         <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
              <DialogHeader className="no-print">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg text-primary">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">Bank Ledger: {selectedBank || ''}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground cursor-pointer hover:underline text-primary" onClick={() => setBalanceAdjustOpen(true)}>Adjust Starting Balances</p>
                      {selectedBank && Object.keys(bankBalancesState[selectedBank] || {}).length > 0 && (
                        <span className="text-xs text-muted-foreground border-l pl-2">
                          Starting: {Object.entries(bankBalancesState[selectedBank] || {}).map(([c, a]) => `${formatCurrency(a, c)}`).join(' | ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="absolute top-4 right-12">
                  <Button variant="secondary" onClick={() => window.print()} className="h-8 text-xs">
                    <Printer className="mr-2 h-3.5 w-3.5" /> Print / Share
                  </Button>
                </div>
              </DialogHeader>

              <div className="hidden print:block mb-8 text-center border-b pb-4 mt-4">
                <h1 className="text-3xl font-bold">Bank Statement (كشف حساب بنكي)</h1>
                <h2 className="text-xl mt-2">{selectedBank}</h2>
                <p className="text-xs mt-2 text-gray-500">Generated on: {new Date().toLocaleDateString()}</p>
                {selectedBank && Object.keys(bankBalancesState[selectedBank] || {}).length > 0 && (
                  <p className="text-sm mt-1">Starting Balance: {Object.entries(bankBalancesState[selectedBank] || {}).map(([c, a]) => `${formatCurrency(a, c)}`).join(' | ')}</p>
                )}
              </div>

              {/* Transactions Table for this bank */}
              <div className="mt-4 border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {getBankFiltered(selectedBank || '').map(t => (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(t.date)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={
                            t.type === 'incoming' ? 'border-success text-success' :
                            t.type === 'outgoing' ? 'border-destructive text-destructive' :
                            'border-primary text-primary'
                          }>
                            {t.type.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {t.description}
                          {t.attachmentUrl && (
                            <div className="mt-1">
                              <button onClick={() => setViewingFile(t.attachmentUrl!)} className="text-primary hover:underline text-xs flex items-center gap-1">
                                <Receipt className="h-3 w-3" /> View Attachment
                              </button>
                            </div>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${t.type === 'incoming' ? 'text-success' : 'text-destructive'}`}>
                          {t.type === 'incoming' ? '+' : '-'}{formatCurrency(t.amount, t.currency || 'USD')}
                        </td>
                        <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                          <button onClick={() => { setUploadingForTx(t.id); fileInputRef.current?.click(); }} title="Attach File" className="rounded-md p-1.5 hover:bg-accent text-muted-foreground"><Paperclip className="h-4 w-4"/></button>
                          <button onClick={() => openEdit(t)} title="Edit" className="rounded-md p-1.5 hover:bg-accent text-muted-foreground"><Pencil className="h-4 w-4"/></button>
                          <button onClick={() => { setDeleting(t); setDeleteOpen(true); }} title="Delete" className="rounded-md p-1.5 hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4"/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
         </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete} itemName={deleting?.description || ''} />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Transaction Record</DialogTitle></DialogHeader>
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
              <Label>Description / Note *</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div>
              <Label>Attachment (Photo/PDF/Excel)</Label>
              <Input type="file" accept="image/*,.pdf,.xlsx,.xls,.csv" onChange={handleFileUpload} />
              {form.attachmentUrl && (
                <p className="text-xs text-muted-foreground mt-1">Attachment uploaded successfully.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={handleSaveEdit}>{t('pages.saveChanges', 'Save Changes')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={balanceAdjustOpen} onOpenChange={setBalanceAdjustOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Starting Balance - {selectedBank}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Starting Amount</Label>
              <div className="flex gap-2 mt-1">
                <Input type="number" step="any" value={balanceForm.amount} onChange={e => setBalanceForm(f => ({ ...f, amount: e.target.value }))} className="flex-1" />
                <Select value={balanceForm.currency} onValueChange={v => setBalanceForm(f => ({ ...f, currency: v }))}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceAdjustOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={handleAdjustBalance}>{t('pages.saveChanges', 'Save Changes')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden File Input for Direct Attach */}
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf,.xlsx,.xls,.csv" onChange={handleDirectUpload} />

      {/* File Viewer Component */}
      <FileViewer fileUrl={viewingFile} onClose={() => setViewingFile(null)} />
    </div>
  );
}
