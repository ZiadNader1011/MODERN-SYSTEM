import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // ✅ تم إصلاح المسار لـ Vercel
import { PageHeader } from '@/components/PageHeader';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import {
  Container, ContainerProduct, formatDate, uploadFileToSupabase, generateId
} from '@/data/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/DatePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Ship, MapPin, Package, Calendar, Anchor, Camera, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { FileViewer } from '@/components/FileViewer';

const statusColors: Record<string, string> = {
  loading: 'bg-warning/10 text-warning border-warning/20',
  'in-transit': 'bg-info/10 text-info border-info/20',
  arrived: 'bg-success/10 text-success border-success/20',
  cleared: 'bg-muted text-muted-foreground border-border',
};

const statusIcons: Record<string, string> = {
  loading: '📦 ',
  'in-transit': '🚢 ',
  arrived: '✅ ',
  cleared: '🏁 ',
};

// تحديد رابط الباك إند ديناميكياً
const BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://modern-system-flame.vercel.app';

export default function Containers() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<any[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Container | null>(null);
  const [deleting, setDeleting] = useState<Container | null>(null);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // جلب كافة الحاويات والمنتجات من الباك إند السحابي مباشرة عند فتح الصفحة
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [containersRes, productsRes] = await Promise.all([
        fetch(`${BASE_URL}/api/containers`).catch(() => null),
        fetch(`${BASE_URL}/api/products`).catch(() => null)
      ]);

      const containersData = containersRes && containersRes.ok ? await containersRes.json() : [];
      const productsData = productsRes && productsRes.ok ? await productsRes.json() : [];

      setContainers(containersData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching dynamic cloud data:', error);
      toast.error('Failed to sync containers from cloud server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const emptyForm = {
    containerNumber: '', sourcePort: '', destinationPort: '',
    shippingDate: '', arrivalDate: '', status: 'loading' as Container['status'],
    products: [] as ContainerProduct[],
    attachments: [] as { id: string; url: string; description: string; createdAt: string }[],
  };
  const [form, setForm] = useState(emptyForm);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setEditOpen(true);
  };

  const openEdit = (c: Container) => {
    setEditing(c);
    setForm({
      containerNumber: c.containerNumber, sourcePort: c.sourcePort || '',
      destinationPort: c.destinationPort || '', shippingDate: c.shippingDate || '',
      arrivalDate: c.arrivalDate || '', status: c.status,
      products: c.products ? [...c.products] : [],
      attachments: c.attachments ? [...c.attachments] : [],
    });
    setEditOpen(true);
  };

  const addProduct = () => {
    setForm(f => ({ ...f, products: [...f.products, { productId: '', quantity: 0, packages: 0 }] }));
  };

  const updateProduct = (i: number, field: string, value: string | number) => {
    setForm(f => {
      const prods = [...f.products];
      prods[i] = { ...prods[i], [field]: value };
      return { ...f, products: prods };
    });
  };

  const removeProduct = (i: number) => {
    setForm(f => ({ ...f, products: f.products.filter((_, idx) => idx !== i) }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 5MB.');
        return;
      }

      toast.loading("جاري رفع المستند إلى سوبابيز السحابي...", { id: "upload-container-doc" });

      const publicUrl = await uploadFileToSupabase(file, "attachments");

      if (publicUrl) {
        setForm(f => ({
          ...f,
          attachments: [
            ...(f.attachments || []), 
            { 
              id: generateId(), 
              url: publicUrl, 
              description: file.name, 
              createdAt: new Date().toISOString() 
            }
          ]
        }));
        toast.success("تم رفع المستند بنجاح! ✨", { id: "upload-container-doc" });
      } else {
        toast.error("فشل رفع المستند، يرجى المحاولة مرة أخرى.", { id: "upload-container-doc" });
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setForm(f => ({
      ...f,
      attachments: (f.attachments || []).filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!form.containerNumber.trim()) { toast.error('Please enter a container number.'); return; }
    
    // 1. تنظيف وإعداد بيانات المنتجات وتحويلها لأرقام صريحة
    const parsedProducts = (form.products || []).map(p => ({
      productId: p.productId,
      quantity: Number(p.quantity) || 0,
      packages: Number(p.packages) || 0,
      netWeight: Number(p.netWeight) || 0,
      grossWeight: Number(p.grossWeight) || 0,
      packageType: p.packageType || ''
    }));

    // 2. تنظيف التواريخ: إذا كانت نصوص فارغة نحولها إلى null لمنع خطأ الباك إند
    const containerData = { 
      ...form, 
      shippingDate: form.shippingDate && form.shippingDate.trim() !== '' ? form.shippingDate : null,
      arrivalDate: form.arrivalDate && form.arrivalDate.trim() !== '' ? form.arrivalDate : null,
      products: parsedProducts 
    };

    const savingToast = toast.loading('Saving container details to cloud...');

    try {
      let response;
      if (editing) {
        response = await fetch(`${BASE_URL}/api/containers/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(containerData)
        });
      } else {
        response = await fetch(`${BASE_URL}/api/containers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(containerData)
        });
      }

      // لمعرفة السبب الدقيق للخطأ في الـ Console إذا استمرت المشكلة
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("Backend validation error details:", errData);
        throw new Error(errData.error || errData.message || 'Failed to save container on backend server');
      }

      toast.success(editing ? `Container "${form.containerNumber}" updated! ✨` : `Container "${form.containerNumber}" added! 🎉`, { id: savingToast });
      setEditOpen(false);
      fetchAllData(); // إعادة مزامنة الصفحة والبيانات تلقائيًا
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "حدث خطأ أثناء مزامنة بيانات الحاوية.", { id: savingToast });
    }
  };

  const handleDelete = useCallback(async () => {
    if (!deleting) return;
    const deletingToast = toast.loading('Removing container from cloud...');
    try {
      const response = await fetch(`${BASE_URL}/api/containers/${deleting.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete container');
      }

      toast.success(`Container "${deleting.containerNumber}" removed.`, { id: deletingToast });
      setDeleting(null);
      setDeleteOpen(false);
      fetchAllData(); // إعادة تحديث الصفحة فوراً
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "فشل حذف الحاوية من السيرفر الخلفي.", { id: deletingToast });
    }
  }, [deleting]);

  return (
    <div className="notranslate" translate="no">
      <PageHeader title={t('Containers & Shipping', 'Containers & Shipping')} description={t('pages.containersDescRoot', 'Track your containers from port to port. Add products and manage shipping details.')}
        action={<Button onClick={openNew} size="lg"><Plus className="mr-2 h-4 w-4" /> {t('Add Container', 'Add Container')}</Button>} />

      {loading ? (
        <div className="text-center py-10 text-muted-foreground animate-pulse">Syncing shipping containers from server...</div>
      ) : (
        <div className="space-y-4">
          {containers.map(c => (
            <div key={c.id} className="rounded-xl bg-card p-5 card-shadow transition-shadow hover:card-shadow-hover border">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-info/10">
                    <Ship className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{c.containerNumber}</h3>
                    <Badge variant="outline" className={`mt-1 ${statusColors[c.status]}`}>
                      {statusIcons[c.status]}{t(`status.${c.status}`, c.status)}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setDeleting(c); setDeleteOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-2 text-sm">
                  <Anchor className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">{t('From', 'From')}</p><p className="font-medium text-foreground">{c.sourcePort || '—'}</p></div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">{t('To', 'To')}</p><p className="font-medium text-foreground">{c.destinationPort || '—'}</p></div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">{t('Shipped', 'Shipped')}</p><p className="font-medium text-foreground">{c.shippingDate ? formatDate(c.shippingDate) : '—'}</p></div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">Arrival (Est.)</p><p className="font-medium text-foreground">{c.arrivalDate ? formatDate(c.arrivalDate) : '—'}</p></div>
                </div>
              </div>

              {(c.products || []).length > 0 && (
                <div className="mt-4 rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">{t('Products in this container', 'Products in this container')}</p>
                  <div className="space-y-1.5">
                    {(c.products || []).map((cp, i) => {
                      const product = products.find(p => p.id === cp.productId);
                      return (
                        <div key={i} className="flex flex-col gap-1 text-sm border-b pb-1 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Package className="h-3.5 w-3.5 text-primary" />
                              <span className="text-foreground">{product?.name || 'Unknown'}</span>
                            </div>
                            <span className="text-muted-foreground">Qty: {cp.quantity} · {cp.packages} pkgs</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground pl-5">
                            <span>Net/Gross: {[cp.netWeight, cp.grossWeight].filter(Boolean).join('/') || '—'}</span>
                            <span>Type: {cp.packageType || '—'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {c.attachments && c.attachments.length > 0 && (
                <div className="mt-4">
                  <span className="font-semibold text-xs text-muted-foreground block mb-2 uppercase">Attachments</span>
                  <div className="flex gap-2 flex-wrap">
                    {c.attachments.map((att) => (
                      <div
                        key={att.id}
                        onClick={() => setViewingFile(att.url)}
                        className="flex items-center gap-1.5 border rounded-md px-2.5 py-1.5 text-xs cursor-pointer hover:bg-accent transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        {att.description || 'Document'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && containers.length === 0 && (
        <div className="rounded-xl border-2 border-dashed p-12 text-center">
          <Ship className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">No containers tracked yet. Add your first container!</p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? t('Edit Container', 'Edit Container') : t('pages.addContainer', 'Add Container')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t('Container Number *', 'Container Number *')}</Label><Input value={form.containerNumber} onChange={e => setForm(f => ({ ...f, containerNumber: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('Source Port', 'Source Port')}</Label><Input value={form.sourcePort} onChange={e => setForm(f => ({ ...f, sourcePort: e.target.value }))} /></div>
              <div><Label>{t('Destination Port', 'Destination Port')}</Label><Input value={form.destinationPort} onChange={e => setForm(f => ({ ...f, destinationPort: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('Shipping Date', 'Shipping Date')}</Label><DatePicker value={form.shippingDate} onChange={v => setForm(f => ({ ...f, shippingDate: v }))} /></div>
              <div><Label>{t('Arrival Date', 'Arrival Date')}</Label><DatePicker value={form.arrivalDate} onChange={v => setForm(f => ({ ...f, arrivalDate: v }))} /></div>
            </div>
            <div>
              <Label>{t('Status', 'Status')}</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Container['status'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="loading">{t('status.loading', 'Loading')}</SelectItem>
                  <SelectItem value="in-transit">{t('status.in-transit', 'In Transit')}</SelectItem>
                  <SelectItem value="arrived">{t('status.arrived', 'Arrived')}</SelectItem>
                  <SelectItem value="cleared">{t('status.cleared', 'Cleared')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Products */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>{t('Products in Container', 'Products in Container')}</Label>
                <Button variant="outline" size="sm" onClick={addProduct}><Plus className="mr-1 h-3 w-3" /> {t('Add Product', 'Add Product')}</Button>
              </div>
              {(form.products || []).length === 0 && (
                <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3 text-center">{t('No products added yet.', 'No products added yet.')}</p>
              )}
              <div className="space-y-3">
                {(form.products || []).map((cp, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-2 relative" translate="no">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">{t('Product #', 'Product #')}{i + 1}</span>
                      <button onClick={() => removeProduct(i)} className="text-destructive hover:bg-destructive/10 rounded p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <Select value={cp.productId} onValueChange={v => updateProduct(i, 'productId', v)}>
                      <SelectTrigger><SelectValue placeholder={t('Select product', 'Select product')} /></SelectTrigger>
                      <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div><Label className="text-xs">{t('Quantity', 'Quantity')}</Label><Input type="number" step="any" value={cp.quantity === 0 ? '' : cp.quantity} onChange={e => updateProduct(i, 'quantity', e.target.value)} /></div>
                      <div>
                        <Label className="text-xs">Net Weight</Label>
                        <Input type="number" step="any" value={cp.netWeight === 0 ? '' : cp.netWeight} onChange={e => updateProduct(i, 'netWeight', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Gross Weight</Label>
                        <Input type="number" step="any" value={cp.grossWeight === 0 ? '' : cp.grossWeight} onChange={e => updateProduct(i, 'grossWeight', e.target.value)} />
                      </div>
                      <div><Label className="text-xs">{t('Packages', 'Packages Count')}</Label><Input value={cp.packages === 0 ? '' : cp.packages} onChange={e => updateProduct(i, 'packages', e.target.value)} /></div>
                      <div className="col-span-2">
                        <Label className="text-xs">Package Type</Label>
                        <Input placeholder="e.g. Plastic, Cartons, Big Boxes..." value={cp.packageType || ''} onChange={e => updateProduct(i, 'packageType', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attachments Section */}
            <div className="border-t pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <Label>Attachments</Label>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Camera className="h-4 w-4 mr-2" /> Upload File
                </Button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf,.xlsx,.xls,.csv" onChange={handleFileUpload} />
              </div>

              <div className="grid grid-cols-1 gap-3">
                {(form.attachments || []).map((att, i) => (
                  <div key={att.id} className="flex gap-2 items-center border rounded-lg p-2 bg-muted/20">
                    {att.url.startsWith('data:image/') || att.url.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                      <img src={att.url} className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex flex-shrink-0 items-center justify-center">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <Input className="h-8 text-xs flex-1" placeholder="Description..." value={att.description} onChange={e => {
                      setForm(f => {
                        const atts = [...(f.attachments || [])];
                        atts[i] = { ...atts[i], description: e.target.value };
                        return { ...f, attachments: atts };
                      });
                    }} />
                    <button type="button" onClick={() => removeAttachment(i)} className="text-destructive p-1 rounded hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                {(form.attachments || []).length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground bg-muted/30 rounded border border-dashed">
                    No attachments uploaded yet.
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t('Cancel', 'Cancel')}</Button>
            <Button onClick={handleSave}>{editing ? t('Save Changes', 'Save Changes') : t('pages.addContainer', 'Add Container')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete} itemName={deleting?.containerNumber || ''} />
      <FileViewer fileUrl={viewingFile} onClose={() => setViewingFile(null)} />
    </div>
  );
}