import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Transaction, getTransactions, saveTransactions, generateId, formatCurrency, formatDate, EGYPTIAN_BANKS } from '@/data/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/DatePicker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, ArrowRight, ArrowLeft, Receipt, DollarSign, Percent, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  entityId: number | string;
  entityType: 'job' | 'supplier' | 'client';
  entityName: string;
  onUpdate?: () => void;
}

export function AccountStatement({ entityId, entityType, entityName, onUpdate }: Props) {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>(getTransactions().filter(t => t.relatedId === entityId));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: 'incoming' as Transaction['type'],
    amount: '' as string | number,
    currency: 'USD',
    bank: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const handleSave = () => {
    const parsedAmount = parseFloat(form.amount as string);
    if (!parsedAmount || parsedAmount <= 0) { toast.error('Amount must be positive'); return; }
    if (!form.description.trim()) { toast.error('Description is required'); return; }

    const newTx: Transaction = {
      id: generateId(),
      relatedId: String(entityId), // تحويل الرقم لنص لإرضاء TypeScript
      type: form.type,
      amount: parsedAmount,
      currency: form.currency,
      date: form.date,
      bank: form.bank,
      description: form.description,
      createdAt: new Date().toISOString()
    };

    const allTx = getTransactions();
    allTx.push(newTx);
    saveTransactions(allTx);
    
    setTransactions([...transactions, newTx]);
    setOpen(false);
    toast.success('Transaction added to account statement.');
    if (onUpdate) onUpdate();
  };

  const handleDelete = (txId: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    const allTx = getTransactions().filter(t => t.id !== txId);
    saveTransactions(allTx);
    setTransactions(transactions.filter(t => t.id !== txId));
    toast.success('Record removed.');
    if (onUpdate) onUpdate();
  };

  const sumByCurrency = (type: string) => {
    const subset = transactions.filter(t => t.type === type);
    const obj = subset.reduce((acc, t) => { acc[t.currency] = (acc[t.currency] || 0) + t.amount; return acc; }, {} as Record<string, number>);
    const parts = Object.entries(obj).map(([cur, val]) => formatCurrency(val, cur));
    return parts.length ? parts.join(' | ') : '0';
  };

  const incomingTotalStr = sumByCurrency('incoming');
  const outgoingTotalStr = sumByCurrency('outgoing');
  const rawMaterialTotalStr = sumByCurrency('raw_material');
  const pettyCashTotalStr = sumByCurrency('petty_cash');
  const discountTotalStr = sumByCurrency('discount');

  // Example balance calc depending on perspective:
  // If this is a Client, incoming means they paid us. Outgoing means we refunded them.
  // If this is a Supplier, outgoing means we paid them. Incoming means they refunded us.
  
  return (
    <div className="mt-6 border-t pt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          {t('Account Statement', 'Account Statement')} ({entityName})
        </h3>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Record</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="p-3 bg-muted/40 rounded-lg border">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowRight className="h-3 w-3 text-success"/> {t('Payments In')}</p>
          <p className="font-semibold text-success">{incomingTotalStr}</p>
        </div>
        <div className="p-3 bg-muted/40 rounded-lg border">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowLeft className="h-3 w-3 text-destructive"/> {t('Payments Out')}</p>
          <p className="font-semibold text-destructive">{outgoingTotalStr}</p>
        </div>
        <div className="p-3 bg-muted/40 rounded-lg border">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3 text-warning"/> {t('Other Cost')}</p>
          <p className="font-semibold">{pettyCashTotalStr}</p>
        </div>
        <div className="p-3 bg-muted/40 rounded-lg border">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Percent className="h-3 w-3 text-primary"/> {t('Discounts Applied')}</p>
          <p className="font-semibold">{discountTotalStr}</p>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground text-xs uppercase">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No records found.</td>
              </tr>
            ) : (
              transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">{formatDate(t.date)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={
                      t.type === 'incoming' ? 'border-success text-success' :
                      t.type === 'outgoing' ? 'border-destructive text-destructive' :
                      'border-primary text-primary'
                    }>
                      {t.type.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {t.description}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${t.type === 'incoming' ? 'text-success' : t.type === 'outgoing' ? 'text-destructive' : ''}`}>
                    {formatCurrency(t.amount, t.currency || 'USD')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(t.id)} className="text-destructive hover:bg-destructive/10 p-1.5 rounded"><Trash2 className="h-4 w-4"/></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Account Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Record Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({...f, type: v as Transaction['type']}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="incoming">Incoming Payment (Client pays us)</SelectItem>
                  <SelectItem value="outgoing">Outgoing Payment (We pay Supplier)</SelectItem>
                  <SelectItem value="petty_cash">Other Cost (التكاليف والنثريات)</SelectItem>
                  <SelectItem value="raw_material">Raw Material Purchase (شراء خام)</SelectItem>
                  <SelectItem value="discount">Discount Applied (خصم)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('Amount *')}</Label>
              <div className="flex gap-2 mt-1">
                <Input type="number" step="any" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} className="flex-1" />
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
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="e.g. advance payment" />
            </div>

            <div>
              <Label>Bank / Treasury</Label>
              <Select value={form.bank} onValueChange={v => setForm(f => ({ ...f, bank: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select or type bank name" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Bank</SelectItem>
                  {EGYPTIAN_BANKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date</Label>
              <DatePicker value={form.date} onChange={v => setForm(f => ({...f, date: v}))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
