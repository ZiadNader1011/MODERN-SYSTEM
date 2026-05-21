import { useState, useCallback, useMemo, useEffect } from 'react'; // 👈 أضفنا useEffect هنا
import { useTranslation } from '../../node_modules/react-i18next';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { getClients, saveClients, getJobs, getTransactions, generateId, Client, sumByCurrency, computeBalances, formatBalanceObj } from '@/data/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AccountStatement } from '@/components/AccountStatement';
import { Plus, Pencil, Trash2, Users, Globe, Mail, User, Briefcase, DollarSign, Receipt, Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function Clients() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]); // 👈 جعلنا البداية مصفوفة فارغة مؤقتاً

  // ============================================================================
  // 🔥 المزامنة التلقائية عند فتح الصفحة وعمل ريفريش لمنع اختفاء البيانات 🔥
  // ============================================================================
  useEffect(() => {
    // 1. جلب البيانات من الكاش فوراً إذا كانت متوفرة
    setClients(getClients());

    // 2. عمل فحص دوري خفيف (Polling) كل ثانية حتى تكتمل عملية الـ Initialize للمخزن
    const interval = setInterval(() => {
      const latestClients = getClients();
      if (latestClients.length > 0) {
        setClients(latestClients);
        clearInterval(interval); // أوقف الفحص بمجرد ظهور البيانات
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);
  // ============================================================================

  const jobs = useMemo(() => getJobs(), []);
  const transactions = useMemo(() => getTransactions(), []);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: '', country: '', contact: '', email: '', phone: '', telephone: '', fax: '', vat: '', address: '', dhl: '', agentName: '' });

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', country: '', contact: '', email: '', phone: '', telephone: '', fax: '', vat: '', address: '', dhl: '', agentName: '' });
    setEditOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({ name: c.name, country: c.country, contact: c.contact, email: c.email, phone: c.phone || '', telephone: c.telephone || '', fax: c.fax || '', vat: c.vat || '', address: c.address || '', dhl: c.dhl || '', agentName: c.agentName || '' });
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Please enter a client name.'); return; }
    let updated: Client[];
    if (editing) {
      updated = clients.map(c => c.id === editing.id ? { ...c, ...form } : c);
      toast.success(`"${form.name}" has been updated! ✨`);
    } else {
      updated = [...clients, { id: generateId(), ...form }];
      toast.success(`"${form.name}" has been added! 🎉`);
    }
    setClients(updated);
    saveClients(updated);
    setEditOpen(false);
  };

  const handleDelete = useCallback(() => {
    if (!deleting) return;
    const updated = clients.filter(c => c.id !== deleting.id);
    setClients(updated);
    saveClients(updated);
    toast.success(`"${deleting.name}" has been removed.`);
    setDeleting(null);
  }, [deleting, clients]);

  return (
    <div>
      <PageHeader title={t('common.clients', 'Clients')} description={t('pages.clientsDesc', 'Manage your network of clients and buyers.')}
        action={<Button onClick={openNew} size="lg"><Plus className="mr-2 h-4 w-4" /> {t('pages.addClient', 'Add Client')}</Button>} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clients.map(c => {
          const clientJobs = jobs.filter(j => j.clientId === c.id);

          let manualTxs = transactions.filter(t => {
            if (t.entityId) return t.entityId === c.id;
            if (t.relatedId === c.id) return true;
            if (t.relatedId && clientJobs.some(j => j.id === t.relatedId)) {
              return t.type === 'incoming';
            }
            return false;
          });

          const autoTxs: any[] = [];
          clientJobs.forEach(job => {
            const hasValidProducts = job.products && job.products.some(p => (Number(p.quantity) || 0) > 0 && (Number(p.unitPrice) || 0) > 0);
            const discount = job.discountPercentage || 0;
            if (hasValidProducts) {
              const currTotals: Record<string, number> = {};
              job.products.forEach(p => {
                const currency = p.currency || job.currency;
                const val = (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0);
                const finalVal = val - (val * (discount / 100));
                currTotals[currency] = (currTotals[currency] || 0) + finalVal;
              });
              Object.entries(currTotals).forEach(([currency, val]) => {
                if (val > 0) autoTxs.push({ type: 'raw_material', amount: val, currency });
              });
            } else if (job.totalPrice > 0) {
              const finalTotal = job.totalPrice - (job.totalPrice * (discount / 100));
              autoTxs.push({ type: 'raw_material', amount: finalTotal, currency: job.currency });
            }
          });

          const clientTransactions = [...manualTxs, ...autoTxs];

          const jobValueObj: Record<string, number> = {};
          const balancesObj: Record<string, number> = {};

          clientTransactions.forEach(t => {
            const currency = t.currency || 'USD';
            if (t.type === 'incoming') {
              balancesObj[currency] = (balancesObj[currency] || 0) - t.amount;
            } else {
              jobValueObj[currency] = (jobValueObj[currency] || 0) + t.amount;
              balancesObj[currency] = (balancesObj[currency] || 0) + t.amount;
            }
          });

          Object.keys(balancesObj).forEach(k => { if (Math.abs(balancesObj[k]) < 0.001) delete balancesObj[k]; });
          Object.keys(jobValueObj).forEach(k => { if (Math.abs(jobValueObj[k]) < 0.001) delete jobValueObj[k]; });

          const hasBalances = Object.keys(balancesObj).length > 0;

          return (
            <div key={c.id} className="rounded-xl bg-card p-5 shadow-sm border transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{c.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground"><Globe className="h-3 w-3" />{c.country}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => navigate(`/clients/${c.id}`)} className="rounded-md p-1.5 hover:bg-accent" title="Detailed Ledger"><Receipt className="h-4 w-4 text-primary" /></button>
                  <button onClick={() => openEdit(c)} className="rounded-md p-1.5 hover:bg-accent"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  <button onClick={() => { setDeleting(c); setDeleteOpen(true); }} className="rounded-md p-1.5 hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5"><User className="h-3 w-3" />{c.contact || '—'}</div>
                <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{c.email || '—'}</div>
                <div className="flex items-center gap-1.5" dir="ltr"><Phone className="h-3 w-3 shrink-0" /><span className="truncate">{c.phone || '—'}</span></div>
                {c.dhl && <div className="flex items-center gap-1.5"><Badge variant="secondary" className="text-[10px]">DHL</Badge> <span className="truncate">{c.dhl}</span></div>}
                {c.agentName && <div className="flex items-center gap-1.5"><Badge variant="secondary" className="text-[10px]">Agent</Badge> <span className="truncate">{c.agentName}</span></div>}
              </div>

              {/* Stats */}
              <div className="mt-4 pt-3 border-t space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Briefcase className="h-3 w-3" />{t('Jobs', 'Operations')}</span>
                  <Badge variant="outline" className="text-xs">{clientJobs.length}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><DollarSign className="h-3 w-3" />{t('Total Job Value', 'Operations Value')}</span>
                  <span className="font-medium text-xs">{formatBalanceObj(jobValueObj)}</span>
                </div>
                {hasBalances && (
                  <div className="flex items-center justify-between text-sm items-start">
                    <span className="flex items-center gap-1.5 text-muted-foreground whitespace-nowrap"><DollarSign className="h-3 w-3 mt-0.5" />{t('Remaining Balance', 'Client Owes')}</span>
                    <span className="font-medium text-destructive/80 text-xs text-right max-w-[150px]">
                      {formatBalanceObj(balancesObj)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {clients.length === 0 && (
        <div className="rounded-xl border-2 border-dashed p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">{t('No clients yet', 'No clients yet. Add your first buyer!')}</p>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? t('Edit Client', 'Edit Client') : t('pages.addClient', 'Add Client')}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
            <div><Label>{t('Client Name *', 'Client Name *')}</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>{t('Country *', 'Country *')}</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
            <div><Label>{t('Address', 'Address')}</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div><Label>{t('Contact Person', 'Contact Person')}</Label><Input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} /></div>
<div><Label>{t('Email', 'Email')}</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" /></div>
            <div><Label>{t('Mobile', 'Mobile Number')}</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} type="tel" dir="ltr" className="text-left" /></div>
            <div><Label>{t('Telephone', 'Telephone')}</Label><Input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} type="tel" dir="ltr" className="text-left" /></div>
            <div><Label>{t('Fax', 'Fax')}</Label><Input value={form.fax} onChange={e => setForm(f => ({ ...f, fax: e.target.value }))} type="tel" dir="ltr" className="text-left" /></div>
            <div><Label>{t('VAT Number', 'VAT Number')}</Label><Input value={form.vat} onChange={e => setForm(f => ({ ...f, vat: e.target.value }))} dir="ltr" className="text-left" /></div>
            <div><Label>DHL ADDRESS</Label><Input value={form.dhl} onChange={e => setForm(f => ({ ...f, dhl: e.target.value }))} /></div>
            <div><Label>Agent Name</Label><Input value={form.agentName} onChange={e => setForm(f => ({ ...f, agentName: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t('Cancel', 'Cancel')}</Button>
            <Button onClick={handleSave}>{editing ? t('Save Changes', 'Save Changes') : t('pages.addClient', 'Add Client')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete} itemName={deleting?.name || ''} />
    </div>
  );
}