import { useState, useRef, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; 
import { PageHeader } from '@/components/PageHeader';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { generateId, StandalonePackingList, PackingListProduct, formatDate, getContainers, uploadFileToSupabase } from '@/data/store';
import { compressImage } from '@/utils/imageCompression';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DatePicker } from '@/components/DatePicker';
import { FileViewer } from '@/components/FileViewer';
import { PackingListPrintForm } from '@/components/PackingListPrintForm';
import { Plus, Pencil, Trash2, FileText, Calendar, Camera, PackageSearch, FileBox, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabaseClient'; // 🔗 استيراد عميل سوبابيز

export default function PackingLists() {
  const { t } = useTranslation();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<StandalonePackingList | null>(null);
  const [deleting, setDeleting] = useState<StandalonePackingList | null>(null);
  const [printing, setPrinting] = useState<StandalonePackingList | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  
  const [packingLists, setPackingLists] = useState<StandalonePackingList[]>([]);
  const [isLoading, setIsLoading] = useState(true);

 const fetchPackingLists = async () => {
  try {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('packing_lists') 
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    const formattedData = (data || []).map((row: any) => ({
      id: row.id,
      date: row.date,
      // تأكد أن الحقل يقرأ من الاسم الصحيح في سوبابيز (غالباً bl_number)
      blNumber: row.bl_number || row.blNumber,               
      containerNumber: row.container_number || row.containerNumber, 
      clientName: row.client_name || row.clientName,          
      invoiceNumber: row.invoice_number || row.invoiceNumber,     
      customRelease: row.custom_release || row.customRelease,     
      note: row.note,
      dhlNumber: row.dhl_number || row.dhlNumber,
      productName: row.product_name,
      variety: row.variety,
      grade: row.grade,
      caliber: row.caliber,
      packagesQtyKind: row.packages_qty_kind,
      numberOfPackages: row.number_of_packages,
      netWeight: row.net_weight,
      grossWeight: row.gross_weight,
      shippingAgent: row.shipping_agent,
      pol: row.pol,
      pod: row.pod,
      finalDestination: row.final_destination,
      shippingDate: row.shipping_date,
      numberOfContainers: row.number_of_containers,
      containerNumbers: row.container_numbers || [],
      numberOfProducts: row.number_of_products,
      products: row.products || [],
      attachments: row.attachments || []
    }));

    setPackingLists(formattedData);
  } catch (error: any) {
    console.error('Error fetching packing lists:', error);
    toast.error('Failed to load packing lists from cloud');
  } finally {
    setIsLoading(false);
  }
};

  useEffect(() => {
    fetchPackingLists();
  }, []);

  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const containersList = useMemo(() => getContainers(), []);

  const emptyForm = { 
    date: new Date().toISOString().split('T')[0], 
    blNumber: '', 
    containerNumber: '', 
    clientName: '', 
    invoiceNumber: '', 
    customRelease: '', 
    note: '',
    dhlNumber: '',
    productName: '',
    variety: '',
    grade: '',
    caliber: '',
    packagesQtyKind: '',
    numberOfPackages: '',
    netWeight: '',
    grossWeight: '',
    shippingAgent: '',
    pol: '',
    pod: '',
    finalDestination: '',
    shippingDate: '',
    numberOfContainers: '' as string | number,
    containerNumbers: [] as string[],
    numberOfProducts: '' as string | number,
    products: [] as PackingListProduct[],
    attachments: [] as { id: string; url: string; description: string; createdAt: string }[] 
  };
  const [form, setForm] = useState(emptyForm);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setEditOpen(true);
  };

  const openEdit = (pl: StandalonePackingList) => {
    setEditing(pl);
    setForm({ 
      date: pl.date, 
      blNumber: pl.blNumber, 
      containerNumber: pl.containerNumber, 
      clientName: pl.clientName, 
      invoiceNumber: pl.invoiceNumber, 
      customRelease: pl.customRelease, 
      note: pl.note,
      dhlNumber: pl.dhlNumber || '',
      productName: pl.productName || '',
      variety: pl.variety || '',
      grade: pl.grade || '',
      caliber: pl.caliber || '',
      packagesQtyKind: pl.packagesQtyKind || '',
      numberOfPackages: pl.numberOfPackages || '',
      netWeight: pl.netWeight || '',
      grossWeight: pl.grossWeight || '',
      shippingAgent: pl.shippingAgent || '',
      pol: pl.pol || '',
      pod: pl.pod || '',
      finalDestination: pl.finalDestination || '',
      shippingDate: pl.shippingDate || '',
      numberOfContainers: pl.numberOfContainers || '',
      containerNumbers: [...(pl.containerNumbers || [])],
      numberOfProducts: pl.numberOfProducts || '',
      products: [...(pl.products || [])],
      attachments: [...(pl.attachments || [])] 
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
      
      toast.loading("جاري رفع المستند إلى السحابة...", { id: "upload-packing-doc" });

      let fileToUpload = file;
      const isImage = file.type.startsWith('image/');
      
      if (isImage) {
        try {
          const compressedBase64 = await compressImage(file);
          const res = await fetch(compressedBase64);
          const blob = await res.blob();
          fileToUpload = new File([blob], file.name, { type: file.type });
        } catch (error) {
          console.error("Image compression failed, uploading original.", error);
        }
      }

      const publicUrl = await uploadFileToSupabase(fileToUpload, "attachments");

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
        toast.success("تم رفع المستند بنجاح! ✨", { id: "upload-packing-doc" });
      } else {
        toast.error("فشل رفع المستند، يرجى المحاولة مرة أخرى.", { id: "upload-packing-doc" });
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setForm(f => ({
      ...f,
      attachments: f.attachments.filter((_, i) => i !== index)
    }));
  };

 const handleSave = async () => {
  const recordId = editing ? editing.id : generateId();

  // تحويل البيانات لتوافق أسماء أعمدة قاعدة البيانات (Snake Case)
  const dbData = {
    id: recordId,
    date: form.date,
    bl_number: form.blNumber,               // تعديل من blNumber إلى bl_number
    container_number: form.containerNumber,   // تعديل لتوافق الجدول
    client_name: form.clientName,            // تعديل لتوافق الجدول
    invoice_number: form.invoiceNumber,      // تعديل لتوافق الجدول
    custom_release: form.customRelease,      // تعديل لتوافق الجدول
    note: form.note,
    dhl_number: form.dhlNumber,
    product_name: form.productName,
    variety: form.variety,
    grade: form.grade,
    caliber: form.caliber,
    packages_qty_kind: form.packagesQtyKind,
    number_of_packages: form.numberOfPackages,
    net_weight: form.netWeight,
    gross_weight: form.grossWeight,
    shipping_agent: form.shippingAgent,
    pol: form.pol,
    pod: form.pod,
    final_destination: form.finalDestination,
    shipping_date: form.shippingDate,
    number_of_containers: Number(form.numberOfContainers) || 0,
    container_numbers: form.containerNumbers.slice(0, Number(form.numberOfContainers) || 0),
    number_of_products: Number(form.numberOfProducts) || 0,
    products: form.products.slice(0, Number(form.numberOfProducts) || 0),
    attachments: form.attachments
  };

  const savingToast = toast.loading('Saving changes to Supabase Cloud...');

  try {
    const { error } = await supabase
      .from('packing_lists')
      .upsert(dbData, { onConflict: 'id' });

    if (error) throw error;

    toast.success(editing ? 'Packing List updated successfully' : 'Packing List created successfully', { id: savingToast });
    setEditOpen(false);
    fetchPackingLists(); 
  } catch (error: any) {
    console.error('Database Save Error:', error);
    toast.error(`Save failed: ${error.message}`, { id: savingToast });
  }
};

  // 3️⃣ دالة الحذف المعدلة لمسح السجل من قاعدة البيانات السحابية
  const handleDelete = async () => {
    if (!deleting) return;
    const deletingToast = toast.loading('Removing packing list from server...');

    try {
      const { error } = await supabase
        .from('packing_lists')
        .delete()
        .eq('id', deleting.id);

      if (error) throw error;

      toast.success('Packing List removed completely', { id: deletingToast });
      setDeleting(null);
      fetchPackingLists(); // تحديث القائمة فوراً
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete: ${error.message}`, { id: deletingToast });
    }
  };

  return (
    <div className="pb-10">
      <PageHeader 
        title={t('Packing Lists', 'Standalone Packing Lists')} 
        description={t('pages.packingListsDesc', 'Manage packing lists independently from operations.')}
        action={<Button onClick={openNew} size="lg"><Plus className="mr-2 h-4 w-4" /> Add Packing List</Button>} 
      />

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground animate-pulse">Loading packing lists from server...</div>
        ) : packingLists.map(pl => (
          <div key={pl.id} className="rounded-xl bg-card border shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-primary/10 p-2 rounded-md">
                    <FileBox className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold">
                    {pl.clientName || 'Unnamed Client'} 
                    {pl.invoiceNumber && <span className="text-muted-foreground font-normal ml-2 text-sm">| INV: {pl.invoiceNumber}</span>}
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 mt-4 text-sm border-b pb-4">
                  <div><span className="text-muted-foreground block text-[10px] uppercase">Date</span><span className="font-medium flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(pl.date)}</span></div>
                  <div><span className="text-muted-foreground block text-[10px] uppercase">B/L Number</span><span className="font-medium font-mono">{pl.blNumber || '—'}</span></div>
                  <div><span className="text-muted-foreground block text-[10px] uppercase">Custom Release</span><span className="font-medium">{pl.customRelease || '—'}</span></div>
                  
                  {pl.containerNumber && <div><span className="text-muted-foreground block text-[10px] uppercase">Container</span><span className="font-medium">{pl.containerNumber}</span></div>}
                  
                  {pl.containerNumbers && pl.containerNumbers.length > 0 && (
                    <div className="col-span-2 md:col-span-4 mt-2">
                      <span className="text-muted-foreground block text-[10px] uppercase mb-1">Containers ({pl.numberOfContainers})</span>
                      <div className="flex flex-wrap gap-2">
                        {pl.containerNumbers.map((c, i) => <span key={i} className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{c || 'Unnamed'}</span>)}
                      </div>
                    </div>
                  )}
                  
                  <div className="col-span-2 md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 mt-2 pt-2 border-t border-dashed">
                    <div><span className="text-muted-foreground block text-[10px] uppercase">Shipping Agent</span><span className="font-medium">{pl.shippingAgent || '—'}</span></div>
                    <div><span className="text-muted-foreground block text-[10px] uppercase">DHL Number</span><span className="font-medium">{pl.dhlNumber || '—'}</span></div>
                    <div><span className="text-muted-foreground block text-[10px] uppercase">Shipping Date</span><span className="font-medium">{pl.shippingDate ? formatDate(pl.shippingDate) : '—'}</span></div>
                    <div className="hidden md:block"></div>
                    <div><span className="text-muted-foreground block text-[10px] uppercase">POL</span><span className="font-medium">{pl.pol || '—'}</span></div>
                    <div><span className="text-muted-foreground block text-[10px] uppercase">POD / Final Dest</span><span className="font-medium">{[pl.pod, pl.finalDestination].filter(Boolean).join(' ➔ ') || '—'}</span></div>
                  </div>
                  
                  {pl.productName && (
                    <div className="col-span-2 md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 mt-2 pt-2 border-t border-dashed">
                      <div className="col-span-2 md:col-span-4 font-semibold text-xs text-primary mb-1">Legacy Product</div>
                      <div><span className="text-muted-foreground block text-[10px] uppercase">Product Name</span><span className="font-medium">{pl.productName || '—'}</span></div>
                      <div><span className="text-muted-foreground block text-[10px] uppercase">Variety / Grade</span><span className="font-medium">{[pl.variety, pl.grade].filter(Boolean).join(' - ') || '—'}</span></div>
                      <div><span className="text-muted-foreground block text-[10px] uppercase">Caliber</span><span className="font-medium">{pl.caliber || '—'}</span></div>
                      <div><span className="text-muted-foreground block text-[10px] uppercase">Net / Gross Wt</span><span className="font-medium">{[pl.netWeight, pl.grossWeight].filter(Boolean).join(' / ') || '—'}</span></div>
                      <div><span className="text-muted-foreground block text-[10px] uppercase">Packages / Qty</span><span className="font-medium">{[pl.numberOfPackages, pl.packagesQtyKind].filter(Boolean).join(' | ') || '—'}</span></div>
                    </div>
                  )}

                  {pl.products && pl.products.length > 0 && (
                    <div className="col-span-2 md:col-span-4 space-y-3 mt-3">
                      <div className="font-semibold text-xs text-primary mb-1 border-t border-dashed pt-3">Products List ({pl.numberOfProducts})</div>
                      {pl.products.map((p, idx) => (
                        <div key={idx} className="bg-muted/30 p-3 rounded-lg border text-xs grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                          <div className="col-span-2 md:col-span-4 font-semibold text-primary/80 border-b pb-1 mb-1 flex justify-between">
                            <span>#{idx + 1} {p.productName || 'Unnamed Product'}</span>
                          </div>
                          <div><span className="text-muted-foreground block text-[10px] uppercase">Variety / Grade</span><span className="font-medium">{[p.variety, p.grade].filter(Boolean).join(' - ') || '—'}</span></div>
                          <div><span className="text-muted-foreground block text-[10px] uppercase">Caliber</span><span className="font-medium">{p.caliber || '—'}</span></div>
                          <div><span className="text-muted-foreground block text-[10px] uppercase">Net / Gross Wt</span><span className="font-medium">{[p.netWeight, p.grossWeight].filter(Boolean).join(' / ') || '—'}</span></div>
                          <div><span className="text-muted-foreground block text-[10px] uppercase">Packages / Qty</span><span className="font-medium">{[p.numberOfPackages, p.packagesQtyKind].filter(Boolean).join(' | ') || '—'}</span></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {pl.note && (
                  <div className="mt-3 bg-muted/40 p-2 rounded text-sm text-foreground">
                    <span className="font-semibold text-xs block mb-1">Note:</span>
                    {pl.note}
                  </div>
                )}
                
                {pl.attachments && pl.attachments.length > 0 && (
                  <div className="mt-4">
                    <span className="font-semibold text-xs text-muted-foreground block mb-2 uppercase">Attachments</span>
                    <div className="flex gap-2 flex-wrap">
                      {pl.attachments.map((att) => (
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

              <div className="flex sm:flex-col gap-2 border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-3">
                <Button variant="outline" size="sm" onClick={() => { setPrinting(pl); setPrintOpen(true); }} className="flex-1 sm:flex-none">
                  <Printer className="h-4 w-4 mr-2" /> Print
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(pl)} className="flex-1 sm:flex-none">
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setDeleting(pl); setDeleteOpen(true); }} className="flex-1 sm:flex-none text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              </div>
            </div>
          </div>
        ))}

        {!isLoading && packingLists.length === 0 && (
          <div className="rounded-xl border-2 border-dashed p-12 text-center mt-6">
            <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">No Packing Lists</h3>
            <p className="mt-2 text-muted-foreground max-w-sm mx-auto text-sm">
              You haven't created any standalone packing lists yet. Click "Add Packing List" to get started.
            </p>
          </div>
        )}
      </div>

      {/* باقي كود الـ Dialog الـ JSX مـثـل مـا هـو دون أي تـغـيـيـرات */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Packing List' : 'Add Packing List'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Client Name</Label>
              <Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="e.g. Acme Corp" />
            </div>
            <div>
              <Label>Date</Label>
              <DatePicker value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} />
            </div>
            <div>
              <Label>B/L Number (رقم البوليصة)</Label>
              <Input value={form.blNumber} onChange={e => setForm(f => ({ ...f, blNumber: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Containers</Label>
              <div className="flex gap-2 items-center mb-2">
                <Input type="number" min="0" placeholder="Number of Containers..." className="w-48" value={form.numberOfContainers} onChange={e => {
                  const val = parseInt(e.target.value) || 0;
                  setForm(f => {
                    const newNames = [...f.containerNumbers];
                    while (newNames.length < val) newNames.push('');
                    return { ...f, numberOfContainers: val || '', containerNumbers: newNames };
                  });
                }} />
              </div>
              {(Number(form.numberOfContainers) || 0) > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  <datalist id="existing-containers-list">
                    {containersList.map(c => <option key={c.id} value={c.containerNumber} />)}
                  </datalist>
                  {Array.from({ length: Number(form.numberOfContainers) || 0 }).map((_, idx) => (
                    <Input key={idx} list="existing-containers-list" placeholder={`Container ${idx + 1}`} value={form.containerNumbers[idx] || ''} onChange={e => {
                      setForm(f => {
                        const newNames = [...f.containerNumbers];
                        newNames[idx] = e.target.value;
                        return { ...f, containerNumbers: newNames };
                      });
                    }} />
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Invoice Number</Label>
              <Input value={form.invoiceNumber} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} />
            </div>
            <div>
              <Label>Custom Release (الافراج الجمركي)</Label>
              <Input value={form.customRelease} onChange={e => setForm(f => ({ ...f, customRelease: e.target.value }))} />
            </div>
            <div className="md:col-span-2 border-t pt-4 mt-2">
              <h4 className="text-sm font-semibold mb-3 text-primary">Shipment Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs">Shipping Agent</Label>
                  <Input value={form.shippingAgent} onChange={e => setForm(f => ({ ...f, shippingAgent: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">DHL Number</Label>
                  <Input value={form.dhlNumber} onChange={e => setForm(f => ({ ...f, dhlNumber: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Shipping Date</Label>
                  <DatePicker value={form.shippingDate} onChange={v => setForm(f => ({ ...f, shippingDate: v }))} />
                </div>
                <div className="hidden md:block"></div>
                <div>
                  <Label className="text-xs">POL (Port of Loading)</Label>
                  <Input value={form.pol} onChange={e => setForm(f => ({ ...f, pol: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">POD (Port of Discharge)</Label>
                  <Input value={form.pod} onChange={e => setForm(f => ({ ...f, pod: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Final Destination</Label>
                  <Input value={form.finalDestination} onChange={e => setForm(f => ({ ...f, finalDestination: e.target.value }))} className="h-8 text-sm" />
                </div>
              </div>
            </div>
            <div className="md:col-span-2 border-t pt-4 mt-2">
              <div className="flex items-center gap-4 mb-4">
                <h4 className="text-sm font-semibold text-primary whitespace-nowrap">Product Details</h4>
                <div className="flex-1 max-w-xs">
                  <Input type="number" min="0" placeholder="Number of Products..." value={form.numberOfProducts} onChange={e => {
                    const val = parseInt(e.target.value) || 0;
                    setForm(f => {
                      const newProds = [...f.products];
                      while (newProds.length < val) newProds.push({ id: generateId() });
                      return { ...f, numberOfProducts: val || '', products: newProds };
                    });
                  }} className="h-8 text-sm" />
                </div>
              </div>
              <div className="space-y-6">
                {Array.from({ length: Number(form.numberOfProducts) || 0 }).map((_, idx) => {
                  const p = form.products[idx] || {};
                  const updateP = (field: string, val: any) => setForm(f => {
                    const newProds = [...f.products];
                    newProds[idx] = { ...newProds[idx], [field]: val };
                    return { ...f, products: newProds };
                  });
                  return (
                    <div key={idx} className="border p-4 rounded-lg bg-muted/10 relative">
                      <div className="absolute top-2 right-2 text-xs font-bold text-muted-foreground">Product #{idx + 1}</div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                        <div>
                          <Label className="text-xs">Product Name</Label>
                          <Input value={p.productName || ''} onChange={e => updateP('productName', e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Variety</Label>
                          <Input value={p.variety || ''} onChange={e => updateP('variety', e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Grade</Label>
                          <Input value={p.grade || ''} onChange={e => updateP('grade', e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Caliber</Label>
                          <Input value={p.caliber || ''} onChange={e => updateP('caliber', e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">No. of Packages</Label>
                          <Input value={p.numberOfPackages || ''} onChange={e => updateP('numberOfPackages', e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Packages (Qty & Kind)</Label>
                          <Input value={p.packagesQtyKind || ''} onChange={e => updateP('packagesQtyKind', e.target.value)} className="h-8 text-sm" placeholder="e.g. 10 Boxes" />
                        </div>
                        <div>
                          <Label className="text-xs">Net Weight</Label>
                          <Input value={p.netWeight || ''} onChange={e => updateP('netWeight', e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Gross Weight</Label>
                          <Input value={p.grossWeight || ''} onChange={e => updateP('grossWeight', e.target.value)} className="h-8 text-sm" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="md:col-span-2">
              <Label>Note / Info</Label>
              <Textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Any additional information..." className="h-20" />
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
                    {att.url.startsWith('data:image/') || att.url.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
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
            <Button onClick={handleSave}>Save Packing List</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete} itemName={deleting?.clientName ? `Packing List for ${deleting.clientName}` : 'Packing List'} />
      <FileViewer fileUrl={viewingFile} onClose={() => setViewingFile(null)} />
      <PackingListPrintForm open={printOpen} onOpenChange={setPrintOpen} packingList={printing} />
    </div>
  );
}