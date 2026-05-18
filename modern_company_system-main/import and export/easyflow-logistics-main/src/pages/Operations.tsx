import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { getShipmentOperations, saveShipmentOperations, generateId, ShipmentOperation, formatDate, getJobs, getClients, getContainers } from '@/data/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/DatePicker';
import { FileViewer } from '@/components/FileViewer';
import { compressImage } from '@/utils/imageCompression';
import { Plus, Pencil, Trash2, Calendar, ClipboardList, Camera, FileText, Wheat, Ship } from 'lucide-react';
import { toast } from 'sonner';

export default function Operations() {
  const { t } = useTranslation();
  const [operations, setOperations] = useState<ShipmentOperation[]>(getShipmentOperations);
  const jobs = getJobs();
  const clients = getClients();
  const containers = getContainers();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<ShipmentOperation | null>(null);
  const [deleting, setDeleting] = useState<ShipmentOperation | null>(null);

  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emptyForm = { 
    operationDate: new Date().toISOString().split('T')[0], 
    jobId: '', 
    clientName: '', 
    product: '',
    numberOfContainers: '',
    quantity: '', 
    loadingDate: new Date().toISOString().split('T')[0], 
    containerNumber: '', 
    responsiblePerson: '',
    qualityRepresentative: '',
    notes: '',
    attachments: [] as { id: string; url: string; description: string; createdAt: string }[]
  };
  const [form, setForm] = useState(emptyForm);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setEditOpen(true);
  };

  const openEdit = (op: ShipmentOperation) => {
    setEditing(op);
    setForm({ 
      operationDate: op.operationDate || op.jobDate || new Date().toISOString().split('T')[0], 
      jobId: op.jobId ? op.jobId.toString() : 'none', 
      clientName: op.clientName, 
      product: op.product || '',
      numberOfContainers: op.numberOfContainers || '',
      quantity: op.quantity, 
      loadingDate: op.loadingDate, 
      containerNumber: op.containerNumber, 
      responsiblePerson: op.responsiblePerson || '',
      qualityRepresentative: op.qualityRepresentative || '',
      notes: op.notes,
      attachments: [...(op.attachments || [])]
    });
    setEditOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isImage = file.type.startsWith('image/');
      let url = '';
      if (isImage) {
        url = await compressImage(file);
      } else {
        url = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
      }
      setForm(f => ({
        ...f,
        attachments: [...f.attachments, { id: generateId(), url, description: '', createdAt: new Date().toISOString() }]
      }));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setForm(f => ({
      ...f,
      attachments: f.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    const finalJobId = form.jobId && form.jobId !== 'none' ? Number(form.jobId) : null;

    const opData: ShipmentOperation = {
      ...form,
      jobId: finalJobId as any, 
      id: editing ? editing.id : generateId(),
      createdAt: editing ? editing.createdAt : new Date().toISOString(),
    };
    
    let updated;
    if (editing) {
      updated = operations.map(o => o.id === editing.id ? opData : o);
      toast.success(t('Operation updated successfully', 'Operation updated successfully'));
    } else {
      updated = [...operations, opData];
      toast.success(t('Operation created successfully', 'Operation created successfully'));
    }
    
    updated.sort((a,b) => new Date(b.operationDate || b.jobDate || '').getTime() - new Date(a.operationDate || a.jobDate || '').getTime());
    
    setOperations(updated);
    saveShipmentOperations(updated);
    setEditOpen(false);
  };

  const handleDelete = () => {
    if (!deleting) return;
    const updated = operations.filter(o => o.id !== deleting.id);
    setOperations(updated);
    saveShipmentOperations(updated);
    toast.success(t('Operation removed', 'Operation removed'));
    setDeleting(null);
  };

  return (
    <div className="pb-10">
      <PageHeader 
        title={t('Operations', 'التشغيل')} 
        description={t('pages.operationsDesc', 'Manage shipment operations and reference data.')}
        action={<Button onClick={openNew} size="lg"><Plus className="mr-2 h-4 w-4" /> {t('Add Operation', 'Add Operation')}</Button>} 
      />

      <div className="space-y-4">
        {operations.map(op => (
          <div key={op.id} className="rounded-xl bg-card border shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-primary/10 p-2 rounded-md">
                    <ClipboardList className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold">
                    {op.clientName || 'Unnamed Client'} 
                    {op.jobId && op.jobId.toString() !== 'none' && (
                      <span className="text-muted-foreground font-normal ml-2 text-sm">
                        | Job: {jobs.find(j => String(j.id) === String(op.jobId))?.title || op.jobId}
                      </span>
                    )}
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 mt-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase">{t('Operation Date', 'تاريخ العملية')}</span>
                    <span className="font-medium flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(op.operationDate || op.jobDate)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase">{t('Loading Date', 'تاريخ تحميل الحاوية')}</span>
                    <span className="font-medium flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(op.loadingDate)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase">{t('Product', 'المنتج')}</span>
                    <span className="font-medium flex items-center gap-1"><Wheat className="h-3 w-3" /> {op.product || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase">{t('Number of Containers', 'عدد الحاويات')}</span>
                    <span className="font-medium flex items-center gap-1"><Ship className="h-3 w-3" /> {op.numberOfContainers || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase">{t('Container Number', 'رقم الحاوية')}</span>
                    <span className="font-medium font-mono">{op.containerNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase">{t('Quantity', 'الكمية')}</span>
                    <span className="font-medium">{op.quantity || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase">{t('Responsible Person', 'Responsible Person')}</span>
                    <span className="font-medium">{op.responsiblePerson || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase">{t('Quality Rep.', 'مندوب الجودة')}</span>
                    <span className="font-medium">{op.qualityRepresentative || '—'}</span>
                  </div>
                </div>

                {op.attachments && op.attachments.length > 0 && (
                  <div className="mt-4">
                    <span className="font-semibold text-xs text-muted-foreground block mb-2 uppercase">{t('Attachments', 'المرفقات')}</span>
                    <div className="flex gap-2 flex-wrap">
                      {op.attachments.map((att) => (
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

                {op.notes && (
                  <div className="mt-4 bg-muted/40 p-3 rounded text-sm text-foreground">
                    <span className="font-semibold text-xs block mb-1 uppercase text-muted-foreground">{t('Notes', 'ملاحظات')}</span>
                    <p className="whitespace-pre-wrap">{op.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex sm:flex-col gap-2 border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-3">
                <Button variant="outline" size="sm" onClick={() => openEdit(op)} className="flex-1 sm:flex-none">
                  <Pencil className="h-4 w-4 mr-2" /> {t('Edit', 'Edit')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setDeleting(op); setDeleteOpen(true); }} className="flex-1 sm:flex-none text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 mr-2" /> {t('Delete', 'Delete')}
                </Button>
              </div>
            </div>
          </div>
        ))}

        {operations.length === 0 && (
          <div className="rounded-xl border-2 border-dashed p-12 text-center mt-6">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">{t('No Operations', 'No Operations')}</h3>
            <p className="mt-2 text-muted-foreground max-w-sm mx-auto text-sm">
              {t('You haven\'t added any shipment operations yet.', 'You haven\'t added any shipment operations yet.')}
            </p>
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('Edit Operation', 'تعديل بيانات التشغيل') : t('Add Operation', 'إضافة بيانات تشغيل')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div>
              <Label>{t('Operation Date', 'تاريخ العملية')}</Label>
              <DatePicker value={form.operationDate} onChange={v => setForm(f => ({ ...f, operationDate: v }))} />
            </div>

            <div>
              <Label>{t('Loading Date', 'تاريخ تحميل الحاوية')}</Label>
              <DatePicker value={form.loadingDate} onChange={v => setForm(f => ({ ...f, loadingDate: v }))} />
            </div>

            <div>
              <Label>{t('Link to Job', 'ربط بالعملية')}</Label>
              {/* تم تنظيف الـ Select من التكرار والتداخل البرمجي بنجاح ✅ */}
              <Select 
                value={form.jobId || 'none'} 
                onValueChange={(v) => {
                  const j = jobs.find(x => String(x.id) === String(v));
                  setForm(f => ({ 
                    ...f, 
                    jobId: v, 
                    clientName: j ? clients.find(c => c.id === j.clientId)?.name || f.clientName : f.clientName, 
                    numberOfContainers: j ? j.numberOfContainers?.toString() || f.numberOfContainers : f.numberOfContainers, 
                    containerNumber: j && j.containerId ? containers.find(c => c.id === j.containerId)?.containerNumber || f.containerNumber : f.containerNumber 
                  }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select a job" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Link</SelectItem>
                  {jobs.map(j => <SelectItem key={j.id} value={String(j.id)}>{j.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('Client Name', 'اسم العميل')}</Label>
              <Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} />
            </div>

            <div>
              <Label>{t('Product', 'المنتج')}</Label>
              <Input value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} />
            </div>

            <div>
              <Label>{t('Quantity', 'الكمية')}</Label>
              <Input value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>

            <div>
              <Label>{t('Number of Containers', 'عدد الحاويات')} <span className="text-xs text-muted-foreground">(Optional)</span></Label>
              <Input value={form.numberOfContainers} onChange={e => setForm(f => ({ ...f, numberOfContainers: e.target.value }))} />
            </div>

            <div>
              <Label>{t('Container Number', 'رقم الحاوية')} <span className="text-xs text-muted-foreground">(Optional)</span></Label>
              <Input value={form.containerNumber} onChange={e => setForm(f => ({ ...f, containerNumber: e.target.value }))} />
            </div>

            <div>
              <Label>{t('Responsible Person', 'Responsible Person')} <span className="text-xs text-muted-foreground">(Optional)</span></Label>
              <Input value={form.responsiblePerson} onChange={e => setForm(f => ({ ...f, responsiblePerson: e.target.value }))} />
            </div>

            <div>
              <Label>{t('Quality Rep.', 'مندوب الجودة')} <span className="text-xs text-muted-foreground">(Optional)</span></Label>
              <Input value={form.qualityRepresentative} onChange={e => setForm(f => ({ ...f, qualityRepresentative: e.target.value }))} />
            </div>

            <div className="md:col-span-2">
              <Label>{t('Notes', 'ملاحظات')}</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-20" />
            </div>

            <div className="md:col-span-2 border-t pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <Label>{t('Attachments', 'المرفقات')}</Label>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Camera className="h-4 w-4 mr-2" /> {t('Upload File', 'رفع ملف')}
                </Button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf,.xlsx,.xls,.csv" onChange={handleFileUpload} />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {form.attachments.map((att, i) => (
                  <div key={att.id} className="flex gap-2 items-center border rounded-lg p-2 bg-muted/20">
                    {att.url.startsWith('data:image/') ? (
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
              </div>
            </div>

          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t('Cancel', 'Cancel')}</Button>
            <Button onClick={handleSave}>{t('Save', 'Save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete} itemName={deleting?.jobId ? `${t('Operation')} ${deleting.jobId}` : t('Operation')} />
      <FileViewer fileUrl={viewingFile} onClose={() => setViewingFile(null)} />
    </div>
  );
}