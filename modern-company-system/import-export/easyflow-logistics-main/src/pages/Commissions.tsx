import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { generateId, Commission, formatDate, formatCurrency } from '@/data/store';
import { compressImage } from '@/utils/imageCompression';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/DatePicker';
import { FileViewer } from '@/components/FileViewer';
import { Plus, Pencil, Trash2, FileText, Calendar, Camera, Briefcase, UserCircle, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabaseClient';
import axios from 'axios';

export default function Commissions() {
  const { t } = useTranslation();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Commission | null>(null);
  const [deleting, setDeleting] = useState<Commission | null>(null);
  
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'https://modern-system-flame.vercel.app';

  // جلب البيانات عبر الـ API لتوحيد مصدر البيانات ومنع الـ RLS Block
const fetchCommissions = async () => {
    try {
      setLoading(true);
      
      // جلب البيانات باستخدام Axios من الرابط الصحيح
      const response = await axios.get(`${API_URL}/api/commissions`);
      
      // في Axios، البيانات المستلمة تكون دائماً داخل response.data
      setCommissions(response.data || []);
    } catch (error: any) {
      console.error('Error fetching commissions:', error);
      toast.error('Failed to load commissions from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, []);

  const emptyForm = { 
    date: new Date().toISOString().split('T')[0], 
    clientName: '', 
    numberOfContainers: '' as number | string, 
    totalQuantityTon: '' as number | string, 
    commissionPerTon: '' as number | string, 
    currency: 'USD',
    product: '',
    trader: '',
    qualityRepresentative: '',
    attachments: [] as { id: string; url: string; description: string; createdAt: string }[] 
  };
  const [form, setForm] = useState(emptyForm);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setEditOpen(true);
  };

  const openEdit = (c: Commission) => {
    setEditing(c);
    setForm({ 
      date: c.date, 
      clientName: c.clientName, 
      numberOfContainers: c.numberOfContainers, 
      totalQuantityTon: c.totalQuantityTon, 
      commissionPerTon: c.commissionPerTon, 
      currency: c.currency,
      product: c.product,
      trader: c.trader,
      qualityRepresentative: c.qualityRepresentative || '',
      attachments: [...(c.attachments || [])] 
    });
    setEditOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 5MB.');
        return;
      }
      
      const isImage = file.type.startsWith('image/');
      let fileToUpload: File | Blob = file;
      const loadingToast = toast.loading('Uploading file...');

      try {
        if (isImage) {
          const compressedDataUrl = await compressImage(file);
          const res = await fetch(compressedDataUrl);
          fileToUpload = await res.blob();
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${generateId()}-${Date.now()}.${fileExt}`;
        const filePath = `attachments/${fileName}`;

        const { error } = await supabase.storage
          .from('commissions-attachments')
          .upload(filePath, fileToUpload, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('commissions-attachments')
          .getPublicUrl(filePath);

        setForm(f => ({
          ...f,
          attachments: [
            ...f.attachments, 
            { 
              id: generateId(), 
              url: publicUrl, 
              description: '', 
              createdAt: new Date().toISOString() 
            }
          ]
        }));

        toast.success('File uploaded successfully', { id: loadingToast });

      } catch (error: any) {
        console.error('Error uploading:', error);
        toast.error(`Upload failed: ${error.message || 'Unknown error'}`, { id: loadingToast });
      }
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = async (index: number) => {
    const fileUrl = form.attachments[index].url;
    const deletingToast = toast.loading('Deleting file from server...');

    try {
      const filename = fileUrl.split('/').pop();

      if (filename) {
        const { error } = await supabase.storage
          .from('commissions-attachments')
          .remove([`attachments/${filename}`]);

        if (error) throw error;
      }

      setForm(f => ({
        ...f,
        attachments: f.attachments.filter((_, i) => i !== index)
      }));

      toast.success('File deleted successfully', { id: deletingToast });

    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast.error(`Failed to delete file: ${error.message}`, { id: deletingToast });
    }
  };

  // حفظ وتعديل البيانات عبر الـ API
  const handleSave = async () => {
    if (!form.clientName || !form.date) {
      toast.error('Please fill in all required fields');
      return;
    }

    const savingToast = toast.loading('Saving data...');
    const totalQty = Number(form.totalQuantityTon) || 0;
    const commPerTon = Number(form.commissionPerTon) || 0;

    const cData: any = {
      clientName: form.clientName,
      date: form.date,
      trader: form.trader,
      qualityRepresentative: form.qualityRepresentative,
      product: form.product,
      numberOfContainers: Number(form.numberOfContainers) || 0,
      totalQuantityTon: totalQty,
      commissionPerTon: commPerTon,
      currency: form.currency,
      attachments: form.attachments // إرسالها كمصفوفة طبيعية جاهزة للباك إند
    };
    
    try {
      let response;

      if (editing) {
        response = await fetch(`${API_URL}/commissions/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cData)
        });
      } else {
        response = await fetch(`${API_URL}/commissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cData)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save');
      }
      
      toast.success(editing ? 'Commission updated successfully' : 'Commission created successfully', { id: savingToast });
      setEditOpen(false);
      fetchCommissions(); 
    } catch (error: any) {
      console.error('Error saving:', error);
      toast.error(`Save failed: ${error.message}`, { id: savingToast });
    }
  };

  // حذف السجل عبر الـ API
  const handleDelete = async () => {
    if (!deleting) return;
    const deletingToast = toast.loading('Removing record...');
    
    try {
      const response = await fetch(`${API_URL}/commissions/${deleting.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      toast.success('Commission removed', { id: deletingToast });
      setDeleting(null);
      fetchCommissions(); 
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast.error(`Delete failed: ${error.message}`, { id: deletingToast });
    }
  };

  const formTotalCommission = (Number(form.totalQuantityTon) || 0) * (Number(form.commissionPerTon) || 0);

  const isImageUrl = (url: string) => {
    return /\.(jpg|jpeg|png|webp|avif|gif)$/i.test(url) || url.startsWith('data:image/');
  };

  return (
    <div className="pb-10">
      <PageHeader 
        title={t('Commissions', 'Commissions')} 
        description={t('pages.commissionsDesc', 'Calculate and track trader commissions per ton.')}
        action={<Button onClick={openNew} size="lg"><Plus className="mr-2 h-4 w-4" /> Add Commission</Button>} 
      />

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground animate-pulse">Loading commissions from server...</div>
        ) : commissions.map(c => {
          const totalComm = c.totalQuantityTon * c.commissionPerTon;
          
          return (
            <div key={c.id} className="rounded-xl bg-card border shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2.5 rounded-lg">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{c.clientName || 'Unnamed Client'}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <UserCircle className="h-3 w-3" /> Trader: {c.trader || '—'}
                          {c.qualityRepresentative && <span> | Quality Rep: {c.qualityRepresentative}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block mb-0.5 uppercase tracking-wider">Total Commission</span>
                      <span className="text-lg font-bold text-success">{formatCurrency(totalComm, c.currency)}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 bg-muted/30 p-3 rounded-lg text-sm border">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">Date</span>
                      <span className="font-medium flex items-center gap-1"><Calendar className="h-3 w-3 text-muted-foreground" /> {formatDate(c.date)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">Product</span>
                      <span className="font-medium">{c.product || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">Containers</span>
                      <span className="font-medium">{c.numberOfContainers || 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">Currency</span>
                      <span className="font-medium">{c.currency}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-3 ml-2 text-sm">
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono bg-accent px-2 py-0.5 rounded text-xs border">
                      {c.totalQuantityTon} tons
                    </span>
                    <span className="text-muted-foreground text-xs">×</span>
                    <span className="font-mono bg-accent px-2 py-0.5 rounded text-xs border">
                      {formatCurrency(c.commissionPerTon, c.currency)} / ton
                    </span>
                  </div>
                  
                  {c.attachments && c.attachments.length > 0 && (
                    <div className="mt-4 pt-3 border-t">
                      <div className="flex gap-2 flex-wrap">
                        {c.attachments.map((att) => (
                          <div 
                            key={att.id} 
                            onClick={() => setViewingFile(att.url)}
                            className="flex items-center gap-1.5 border rounded-md px-2.5 py-1.5 text-xs cursor-pointer hover:bg-accent transition-colors"
                          >
                            <FileText className="h-3.5 w-3.5 text-primary" /> 
                            {att.description || 'Attached Document'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex sm:flex-col gap-2 border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-4 min-w-[120px]">
                  <Button variant="outline" size="sm" onClick={() => openEdit(c)} className="w-full">
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setDeleting(c); setDeleteOpen(true); }} className="w-full text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && commissions.length === 0 && (
          <div className="rounded-xl border-2 border-dashed p-12 text-center mt-6">
            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">No Commissions</h3>
            <p className="mt-2 text-muted-foreground max-w-sm mx-auto text-sm">
              You haven't recorded any commissions yet. Click "Add Commission" to create one.
            </p>
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Commission' : 'Add Commission'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div>
              <Label>Client Name *</Label>
              <Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="e.g. Global Exports" />
            </div>
            
            <div>
              <Label>Date *</Label>
              <DatePicker value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} />
            </div>

            <div>
              <Label>Trader Name</Label>
              <Input value={form.trader} onChange={e => setForm(f => ({ ...f, trader: e.target.value }))} placeholder="e.g. John Smith" />
            </div>

            <div>
              <Label>Quality Rep. <span className="text-xs text-muted-foreground">(Optional)</span></Label>
              <Input value={form.qualityRepresentative} onChange={e => setForm(f => ({ ...f, qualityRepresentative: e.target.value }))} placeholder="e.g. Sarah Jones" />
            </div>

            <div>
              <Label>Product</Label>
              <Input value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} placeholder="e.g. Wheat" />
            </div>

            <div>
              <Label>Number of Containers</Label>
              <Input type="number" value={form.numberOfContainers} onChange={e => setForm(f => ({ ...f, numberOfContainers: e.target.value }))} placeholder="0" />
            </div>

            <div>
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm(f => ({ ...f, currency: v }))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="EGP">EGP (ج.م)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/40 p-3 rounded-lg border md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <Label>Total Quantity (Tons)</Label>
                <Input type="number" step="any" value={form.totalQuantityTon} onChange={e => setForm(f => ({ ...f, totalQuantityTon: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <Label>Commission / Ton</Label>
                <Input type="number" step="any" value={form.commissionPerTon} onChange={e => setForm(f => ({ ...f, commissionPerTon: e.target.value }))} placeholder="0" />
              </div>
              <div className="bg-background rounded p-2 border border-success/30 flex flex-col justify-center h-10">
                <span className="text-[10px] uppercase text-muted-foreground leading-none mb-1">Automatic Total</span>
                <span className="font-bold text-success leading-none">{formatCurrency(formTotalCommission, form.currency)}</span>
              </div>
            </div>

            <div className="md:col-span-2 border-t pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <Label>Attachments</Label>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Camera className="h-4 w-4 mr-2" /> Upload File
                </Button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf,.xlsx,.xls,.csv" onChange={handleFileUpload} />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {form.attachments.map((att, i) => (
                  <div key={att.id} className="flex gap-2 items-center border rounded-lg p-2 bg-muted/20">
                    {isImageUrl(att.url) ? (
                      <img src={att.url} className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex flex-shrink-0 items-center justify-center">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <Input className="h-8 text-xs flex-1" placeholder="Description..." value={att.description} onChange={e => {
                      setForm(f => {
                        const atts = [...f.attachments];
                        atts[i] = { ...atts[i], description: e.target.value };
                        return { ...f, attachments: atts };
                      });
                    }} />
                    <button type="button" onClick={() => removeAttachment(i)} className="text-destructive p-1 rounded hover:bg-destructive/10"><Trash2 className="h-4 w-4"/></button>
                  </div>
                ))}
                {form.attachments.length === 0 && (
                  <div className="col-span-full text-center py-4 text-sm text-muted-foreground bg-muted/30 rounded border border-dashed">
                    No attachments uploaded yet.
                  </div>
                )}
              </div>
            </div>

          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Commission</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete} itemName={deleting?.clientName ? `Commission for ${deleting.clientName}` : 'Commission'} />
      <FileViewer fileUrl={viewingFile} onClose={() => setViewingFile(null)} />
    </div>
  );
}