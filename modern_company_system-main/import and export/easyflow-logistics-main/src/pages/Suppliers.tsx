import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { getSuppliers, saveSuppliers, getProducts, getJobs, getTransactions, generateId, Supplier, sumByCurrency, computeBalances, formatBalanceObj } from '@/data/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AccountStatement } from '@/components/AccountStatement';
import { Plus, Pencil, Trash2, Users, Globe, Mail, User, Package, DollarSign, Briefcase, Receipt, Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function Suppliers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const products = useMemo(() => getProducts(), []);
  const jobs = useMemo(() => getJobs(), []);
  const transactions = useMemo(() => getTransactions(), []);
  // 1. تأكدي من استدعاء getSuppliers من الـ store
const [suppliers, setSuppliers] = useState<Supplier[]>([]);

useEffect(() => {
  setSuppliers(getSuppliers());
  const interval = setInterval(() => {
    const latest = getSuppliers();
    if (latest.length > 0) {
      setSuppliers(latest);
      clearInterval(interval);
    }
  }, 1000);
  return () => clearInterval(interval);
}, []);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: '', country: '', contact: '', email: '', phone: '', product: '' });

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', country: '', contact: '', email: '', phone: '', product: '' });
    setEditOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, country: s.country, contact: s.contact, email: s.email, phone: s.phone || '', product: s.product || '' });
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Please enter a supplier name.'); return; }
    let updated: Supplier[];
    if (editing) {
      updated = suppliers.map(s => s.id === editing.id ? { ...s, ...form } : s);
      toast.success(`"${form.name}" has been updated! ✨`);
    } else {
      updated = [...suppliers, { id: generateId(), ...form }];
      toast.success(`"${form.name}" has been added! 🎉`);
    }
    setSuppliers(updated);
    saveSuppliers(updated);
    setEditOpen(false);
  };

  const handleDelete = useCallback(() => {
    if (!deleting) return;
    const updated = suppliers.filter(s => s.id !== deleting.id);
    setSuppliers(updated);
    saveSuppliers(updated);
    toast.success(`"${deleting.name}" has been removed.`);
    setDeleting(null);
  }, [deleting, suppliers]);

  return (
    <div>
      <PageHeader title={t('common.suppliers')} description={t('pages.suppliersDesc', 'Manage your global network of crop suppliers and vendor details.')}
        action={<Button onClick={openNew} size="lg"><Plus className="mr-2 h-4 w-4" /> {t('pages.addSupplier', 'Add Supplier')}</Button>} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {suppliers.map(s => {
          const supplierProducts = products.filter(p => p.supplierId === s.id || (p.supplierIds && p.supplierIds.includes(s.id)));
          const supplierJobs = jobs.filter(j => j.supplierId === s.id);
          
          let manualTxs = transactions.filter(t => {
            if (t.type === 'discount') return false;
            if (t.entityId) return t.entityId === s.id;
            if (t.relatedId === s.id) return true;
            if (t.relatedId && supplierJobs.some(j => j.id === t.relatedId)) {
              return t.type === 'raw_material';
            }
            return false;
          });

          const autoTxs: any[] = [];
          supplierJobs.forEach(job => {
            const grossCost = job.rawMaterialCost || ((Number(job.rawMaterialWeight) || 0) * (Number(job.rawMaterialPricePerTon) || 0));
            const suppDisc = job.supplierDiscountPercentage || 0;
            const netCost = grossCost - (grossCost * (suppDisc / 100));
            
            if (netCost > 0 || job.pettyCash > 0) {
              autoTxs.push({ type: 'raw_material', amount: netCost, otherCost: Number(job.pettyCash) || 0, currency: job.currency });
            }
          });

          const supplierTransactions = [...manualTxs, ...autoTxs];

          const totalPaidObj: Record<string, number> = {};
          const balancesObj: Record<string, number> = {};

          supplierTransactions.forEach(t => {
            const currency = t.currency || 'USD';
            if (t.type === 'outgoing') {
              totalPaidObj[currency] = (totalPaidObj[currency] || 0) + t.amount;
              balancesObj[currency] = (balancesObj[currency] || 0) - t.amount;
            } else if (t.type === 'raw_material') {
              balancesObj[currency] = (balancesObj[currency] || 0) + t.amount + (t.otherCost || 0);
            }
          });

          // Filter out zero balances
          Object.keys(balancesObj).forEach(k => { if (Math.abs(balancesObj[k]) < 0.001) delete balancesObj[k]; });
          Object.keys(totalPaidObj).forEach(k => { if (Math.abs(totalPaidObj[k]) < 0.001) delete totalPaidObj[k]; });

          const hasBalances = Object.keys(balancesObj).length > 0;

          return (
            <div key={s.id} className="rounded-xl bg-card p-5 card-shadow transition-shadow hover:card-shadow-hover">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{s.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground"><Globe className="h-3 w-3" />{s.country}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => navigate(`/suppliers/${s.id}`)} className="rounded-md p-1.5 hover:bg-accent" title="Detailed Ledger"><Receipt className="h-4 w-4 text-primary" /></button>
                  <button onClick={() => openEdit(s)} className="rounded-md p-1.5 hover:bg-accent"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  <button onClick={() => { setDeleting(s); setDeleteOpen(true); }} className="rounded-md p-1.5 hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5"><User className="h-3 w-3" />{s.contact || '—'}</div>
                <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{s.email || '—'}</div>
                <div className="flex items-center gap-1.5" dir="ltr"><Phone className="h-3 w-3 shrink-0" /><span className="truncate">{s.phone || '—'}</span></div>
                {s.product && <div className="flex items-center gap-1.5"><Package className="h-3 w-3" /><span className="truncate font-medium">{s.product}</span></div>}
              </div>

              {/* Stats */}
              <div className="mt-4 pt-3 border-t space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Package className="h-3 w-3" />{t('Products', 'Products')}</span>
                  <Badge variant="outline" className="text-xs">{supplierProducts.length}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Briefcase className="h-3 w-3" />{t('Jobs', 'Jobs')}</span>
                  <Badge variant="outline" className="text-xs">{supplierJobs.length}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm items-start">
                  <span className="flex items-center gap-1.5 text-muted-foreground whitespace-nowrap"><DollarSign className="h-3 w-3 mt-0.5" />{t('Total Paid', 'Total Paid')}</span>
                  <span className="font-medium text-success text-xs text-right max-w-[150px]">{formatBalanceObj(totalPaidObj)}</span>
                </div>
                {hasBalances && (
                  <div className="flex items-center justify-between text-sm items-start">
                    <span className="flex items-center gap-1.5 text-muted-foreground whitespace-nowrap"><DollarSign className="h-3 w-3 mt-0.5" />{t('Remaining', 'Remaining')}</span>
                    <span className="font-medium text-warning text-xs text-right max-w-[150px]">
                      {formatBalanceObj(balancesObj)}
                    </span>
                  </div>
                )}
              </div>

              {supplierProducts.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-1.5">Products supplied:</p>
                  <div className="flex flex-wrap gap-1">
                    {supplierProducts.slice(0, 4).map(p => (
                      <Badge key={p.id} variant="secondary" className="text-xs">{p.name}</Badge>
                    ))}
                    {supplierProducts.length > 4 && <Badge variant="outline" className="text-xs">+{supplierProducts.length - 4} more</Badge>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {suppliers.length === 0 && (
        <div className="rounded-xl border-2 border-dashed p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">{t('No suppliers yet', 'No suppliers yet. Add your first vendor to start networking!')}</p>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? t('Edit Supplier', 'Edit Supplier') : t('pages.addSupplier', 'Add Supplier')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t('Supplier Name *', 'Supplier Name *')}</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>{t('Country *', 'Country *')}</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
            <div><Label>{t('Product', 'Product')}</Label><Input value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} /></div>
            <div><Label>{t('Contact Person', 'Contact Person')}</Label><Input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} /></div>
            <div><Label>{t('Email', 'Email')}</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" /></div>
            <div><Label>{t('Phone', 'Phone Number')}</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} type="tel" dir="ltr" className="text-left" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t('Cancel', 'Cancel')}</Button>
            <Button onClick={handleSave}>{editing ? t('Save Changes', 'Save Changes') : t('pages.addSupplier', 'Add Supplier')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete} itemName={deleting?.name || ''} />
    </div>
  );
}
