import { useState, useMemo, useRef } from 'react';
import { useParams as useRouterParams, useNavigate as useRouterNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  getShippingAgents, getShippingAgentRecords, saveShippingAgentRecords, generateId, ShippingAgentRecord, formatDate, formatCurrency, getTransactions,
  getJobs, saveTransactions
} from '@/data/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, FileText, Printer, Plus, Pencil, Trash2, Paperclip, Receipt, Briefcase } from 'lucide-react';
import { DatePicker } from '@/components/DatePicker';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { FileViewer } from '@/components/FileViewer';
import { toast } from 'sonner';

export default function ShippingAgentDetails() {
  const { id } = useRouterParams();
  const navigate = useRouterNavigate();
  const { t } = useTranslation();

  const agents = useMemo(() => getShippingAgents(), []);
  const transactions = useMemo(() => getTransactions(), []);
  const jobs = useMemo(() => getJobs(), []);
  const [records, setRecords] = useState<ShippingAgentRecord[]>(() => getShippingAgentRecords());

  const agent = agents.find(a => a.id === id);

  const agentTransactions = useMemo(() => {
    return transactions.filter(t => t.relatedId === id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, id]);

  const agentRecords = useMemo(() => {
    return records.filter(r => r.agentId === id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, id]);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingAgentRecord | null>(null);
  const [deleting, setDeleting] = useState<ShippingAgentRecord | null>(null);
  
  const [form, setForm] = useState({
    date: '',
    jobId: 'none',
    blNumber: '',
    country: '',
    containerCount: '',
    costEgp: '',
    costEgpNote: '',
    costEuro: '',
    costEuroNote: '',
    costUsd: '',
    costUsdNote: '',
    pdfUrl: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewingFile, setViewingFile] = useState<string | null>(null);

  if (!agent) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold">Shipping Agent not found</h2>
        <Button onClick={() => navigate('/shipping-agents')} className="mt-4">Back to Shipping Agents</Button>
      </div>
    );
  }

  const openNew = () => {
    setEditing(null);
    setForm({
      date: new Date().toISOString().slice(0, 10),
      jobId: 'none',
      blNumber: '',
      country: '',
      containerCount: '',
      costEgp: '',
      costEgpNote: '',
      costEuro: '',
      costEuroNote: '',
      costUsd: '',
      costUsdNote: '',
      pdfUrl: ''
    });
    setEditOpen(true);
  };

  const openEdit = (r: ShippingAgentRecord) => {
    setEditing(r);
    setForm({
      date: r.date,
      jobId: r.jobId || 'none',
      blNumber: r.blNumber || '',
      country: r.country || '',
      containerCount: r.containerCount?.toString() || '',
      costEgp: r.costEgp?.toString() || '',
      costEgpNote: r.costEgpNote || '',
      costEuro: r.costEuro?.toString() || '',
      costEuroNote: r.costEuroNote || '',
      costUsd: r.costUsd?.toString() || '',
      costUsdNote: r.costUsdNote || '',
      pdfUrl: r.pdfUrl || ''
    });
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!form.date) { toast.error('Please select a date.'); return; }
    
    const record: ShippingAgentRecord = {
      id: editing ? editing.id : generateId(),
      agentId: agent.id,
      jobId: form.jobId === 'none' ? undefined : form.jobId,
      date: form.date,
      blNumber: form.blNumber,
      country: form.country,
      containerCount: form.containerCount ? parseInt(form.containerCount) : undefined,
      costEgp: form.costEgp ? parseFloat(form.costEgp) : undefined,
      costEgpNote: form.costEgpNote,
      costEuro: form.costEuro ? parseFloat(form.costEuro) : undefined,
      costEuroNote: form.costEuroNote,
      costUsd: form.costUsd ? parseFloat(form.costUsd) : undefined,
      costUsdNote: form.costUsdNote,
      pdfUrl: form.pdfUrl,
      createdAt: editing ? editing.createdAt : new Date().toISOString(),
    };

    let updated: ShippingAgentRecord[];
    if (editing) {
      updated = records.map(r => r.id === editing.id ? record : r);
      toast.success('Record updated!');
    } else {
      updated = [...records, record];
      toast.success('Record added!');
    }
    
    setRecords(updated);
    saveShippingAgentRecords(updated);
    
    setRecords(updated);
    saveShippingAgentRecords(updated);
    
    setEditOpen(false);
  };

  const handleDelete = () => {
    if (!deleting) return;
    const updated = records.filter(r => r.id !== deleting.id);
    setRecords(updated);
    saveShippingAgentRecords(updated);
    setRecords(updated);
    saveShippingAgentRecords(updated);
    
    toast.success('Record removed.');
    setDeleting(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.');
      if (e.target) e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setForm(f => ({ ...f, pdfUrl: event.target!.result as string }));
        toast.success('File attached to form.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Calculate totals
  let totalEgp = 0;
  let totalEuro = 0;
  let totalUsd = 0;

  agentRecords.forEach(r => {
    if (r.costEgp) totalEgp += r.costEgp;
    if (r.costEuro) totalEuro += r.costEuro;
    if (r.costUsd) totalUsd += r.costUsd;
  });

  // Calculate payments
  let paidEgp = 0;
  let paidEuro = 0;
  let paidUsd = 0;

  agentTransactions.forEach(t => {
    if (t.type === 'outgoing') {
      if (t.currency === 'EGP') paidEgp += t.amount;
      else if (t.currency === 'EUR') paidEuro += t.amount;
      else if (t.currency === 'USD') paidUsd += t.amount;
    } else if (t.type === 'incoming') {
      if (t.currency === 'EGP') paidEgp -= t.amount;
      else if (t.currency === 'EUR') paidEuro -= t.amount;
      else if (t.currency === 'USD') paidUsd -= t.amount;
    }
  });

  const remainingEgp = totalEgp - paidEgp;
  const remainingEuro = totalEuro - paidEuro;
  const remainingUsd = totalUsd - paidUsd;

  return (
    <div className="pb-10">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/shipping-agents')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              Agent Ledger: {agent.name}
            </h1>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {agent.address && <span className="flex items-center gap-1"><strong>Address:</strong> {agent.address}</span>}
              {agent.email && <span className="flex items-center gap-1"><strong>Email:</strong> {agent.email}</span>}
              {agent.telephone && <span className="flex items-center gap-1" dir="ltr"><strong>Telephone:</strong> {agent.telephone}</span>}
              {agent.personalNumber && <span className="flex items-center gap-1" dir="ltr"><strong>Personal Number:</strong> {agent.personalNumber}</span>}
              {agent.attachmentUrl && (
                <button onClick={() => setViewingFile(agent.attachmentUrl!)} className="flex items-center gap-1 text-primary hover:underline">
                  <Paperclip className="h-3.5 w-3.5" /> <strong>Agent Document</strong>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Add Record
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print / Share (كشف حساب)
          </Button>
        </div>
      </div>

      <div className="hidden print:block mb-8 text-center border-b pb-4">
        <h1 className="text-3xl font-bold">Account Statement (كشف حساب)</h1>
        <h2 className="text-xl mt-2">{agent.name}</h2>
        <p className="text-sm mt-1">{agent.address || ''}</p>
        <p className="text-xs mt-2 text-gray-500">Generated on: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto w-full">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-muted/80 text-muted-foreground text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-4 border-b">Date</th>
              <th className="px-4 py-4 border-b">B/L Number</th>
              <th className="px-4 py-4 border-b">Country</th>
              <th className="px-4 py-4 border-b text-center">Containers</th>
              <th className="px-4 py-4 border-b text-right">Cost (EGP)</th>
              <th className="px-4 py-4 border-b text-right">Cost (EUR)</th>
              <th className="px-4 py-4 border-b text-right">Cost (USD)</th>
              <th className="px-4 py-4 border-b text-center">Attachment</th>
              <th className="px-4 py-4 border-b w-16"></th>
            </tr>
          </thead>
          <tbody>
            {agentRecords.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                  <FileText className="mx-auto h-8 w-8 mb-2 opacity-20" />
                  No records found for this shipping agent.
                </td>
              </tr>
            ) : (
              agentRecords.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-xs">
                    <div className="flex flex-col gap-1">
                      <span>{formatDate(row.date)}</span>
                      {row.jobId && (
                        <Badge variant="outline" className="w-fit bg-primary/5">
                          <Briefcase className="h-3 w-3 mr-1" />
                          {jobs.find(j => j.id === row.jobId)?.title || 'Linked Job'}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.blNumber || '-'}</td>
                  <td className="px-4 py-3">{row.country || '-'}</td>
                  <td className="px-4 py-3 text-center">{row.containerCount || '-'}</td>
                  
                  <td className="px-4 py-3 text-right">
                    {row.costEgp ? (
                      <div>
                        <div className="font-bold">{formatCurrency(row.costEgp, 'EGP')}</div>
                        {row.costEgpNote && <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[120px]" title={row.costEgpNote}>{row.costEgpNote}</div>}
                      </div>
                    ) : '-'}
                  </td>
                  
                  <td className="px-4 py-3 text-right">
                    {row.costEuro ? (
                      <div>
                        <div className="font-bold">{formatCurrency(row.costEuro, 'EUR')}</div>
                        {row.costEuroNote && <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[120px]" title={row.costEuroNote}>{row.costEuroNote}</div>}
                      </div>
                    ) : '-'}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {row.costUsd ? (
                      <div>
                        <div className="font-bold">{formatCurrency(row.costUsd, 'USD')}</div>
                        {row.costUsdNote && <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[120px]" title={row.costUsdNote}>{row.costUsdNote}</div>}
                      </div>
                    ) : '-'}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {row.pdfUrl ? (
                      <button onClick={() => setViewingFile(row.pdfUrl!)} className="text-primary hover:bg-primary/10 px-2 py-1.5 rounded-md inline-flex items-center gap-1.5 text-xs font-medium border border-primary/20">
                        <Paperclip className="h-3.5 w-3.5" /> View
                      </button>
                    ) : '-'}
                  </td>

                  <td className="px-4 py-3 text-right flex justify-end gap-1">
                    <button onClick={() => openEdit(row)} title="Edit" className="rounded-md p-1.5 hover:bg-accent text-muted-foreground"><Pencil className="h-3.5 w-3.5"/></button>
                    <button onClick={() => { setDeleting(row); setDeleteOpen(true); }} title="Delete" className="rounded-md p-1.5 hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5"/></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {agentRecords.length > 0 && (
            <tfoot className="bg-muted font-bold text-sm">
              <tr>
                <td colSpan={4} className="px-4 py-4 text-right">TOTAL COSTS:</td>
                <td className="px-4 py-4 text-right text-lg whitespace-nowrap">{formatCurrency(totalEgp, 'EGP')}</td>
                <td className="px-4 py-4 text-right text-lg whitespace-nowrap">{formatCurrency(totalEuro, 'EUR')}</td>
                <td className="px-4 py-4 text-right text-lg whitespace-nowrap">{formatCurrency(totalUsd, 'USD')}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card shadow-sm border rounded-xl p-5 text-center">
          <div className="text-sm font-medium text-muted-foreground mb-1">Remaining (USD)</div>
          <div className={`text-2xl font-bold ${remainingUsd > 0 ? 'text-destructive' : 'text-success'}`}>{formatCurrency(remainingUsd, 'USD')}</div>
          <div className="text-xs text-muted-foreground mt-1">Total Paid: {formatCurrency(paidUsd, 'USD')}</div>
        </div>
        <div className="bg-card shadow-sm border rounded-xl p-5 text-center">
          <div className="text-sm font-medium text-muted-foreground mb-1">Remaining (EUR)</div>
          <div className={`text-2xl font-bold ${remainingEuro > 0 ? 'text-destructive' : 'text-success'}`}>{formatCurrency(remainingEuro, 'EUR')}</div>
          <div className="text-xs text-muted-foreground mt-1">Total Paid: {formatCurrency(paidEuro, 'EUR')}</div>
        </div>
        <div className="bg-card shadow-sm border rounded-xl p-5 text-center">
          <div className="text-sm font-medium text-muted-foreground mb-1">Remaining (EGP)</div>
          <div className={`text-2xl font-bold ${remainingEgp > 0 ? 'text-destructive' : 'text-success'}`}>{formatCurrency(remainingEgp, 'EGP')}</div>
          <div className="text-xs text-muted-foreground mt-1">Total Paid: {formatCurrency(paidEgp, 'EGP')}</div>
        </div>
      </div>

      {agentTransactions.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Payments & Transactions</h3>
          <div className="rounded-xl border bg-card p-4 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {agentTransactions.map(t => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/10">
                    <td className="px-4 py-2">{formatDate(t.date)}</td>
                    <td className="px-4 py-2"><Badge variant="outline">{t.type}</Badge></td>
                    <td className="px-4 py-2">{t.description}</td>
                    <td className={`px-4 py-2 text-right font-bold ${t.type === 'incoming' ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(t.amount, t.currency || 'USD')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Record' : 'Add Record'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Date *</Label><DatePicker value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} /></div>
            <div>
              <Label>Link to Job</Label>
              <Select value={form.jobId} onValueChange={v => setForm(f => ({ ...f, jobId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select Job (Optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Job Linked</SelectItem>
                  {jobs.map(j => <SelectItem key={j.id} value={j.id}>{formatDate(j.createdAt)} - {j.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>B/L Number</Label><Input value={form.blNumber} onChange={e => setForm(f => ({ ...f, blNumber: e.target.value }))} /></div>
            <div><Label>Country</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
            <div><Label>Number of Containers</Label><Input type="number" value={form.containerCount} onChange={e => setForm(f => ({ ...f, containerCount: e.target.value }))} /></div>
            
            <div className="col-span-1 md:col-span-2 border-t pt-4 mt-2">
              <h4 className="font-medium text-sm mb-3">Costs</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted/30 p-3 rounded-lg border space-y-3">
                  <div>
                    <Label className="text-xs">Cost (EGP)</Label>
                    <Input type="number" step="any" value={form.costEgp} onChange={e => setForm(f => ({ ...f, costEgp: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">EGP Note</Label>
                    <Input value={form.costEgpNote} onChange={e => setForm(f => ({ ...f, costEgpNote: e.target.value }))} />
                  </div>
                </div>

                <div className="bg-muted/30 p-3 rounded-lg border space-y-3">
                  <div>
                    <Label className="text-xs">Cost (EUR)</Label>
                    <Input type="number" step="any" value={form.costEuro} onChange={e => setForm(f => ({ ...f, costEuro: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">EUR Note</Label>
                    <Input value={form.costEuroNote} onChange={e => setForm(f => ({ ...f, costEuroNote: e.target.value }))} />
                  </div>
                </div>

                <div className="bg-muted/30 p-3 rounded-lg border space-y-3">
                  <div>
                    <Label className="text-xs">Cost (USD)</Label>
                    <Input type="number" step="any" value={form.costUsd} onChange={e => setForm(f => ({ ...f, costUsd: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">USD Note</Label>
                    <Input value={form.costUsdNote} onChange={e => setForm(f => ({ ...f, costUsdNote: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 border-t pt-4 mt-2">
              <Label>Attachment (Photo/PDF/Excel)</Label>
              <div className="flex items-center gap-3 mt-1">
                <Input type="file" accept="image/*,.pdf,.xlsx,.xls,.csv" onChange={handleFileUpload} className="flex-1" />
                {form.pdfUrl && <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white shrink-0">Attached</Badge>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete} itemName="this record" />

      {/* File Viewer Component */}
      <FileViewer fileUrl={viewingFile} onClose={() => setViewingFile(null)} />
    </div>
  );
}
