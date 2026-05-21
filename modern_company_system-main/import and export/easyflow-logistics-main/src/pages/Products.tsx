import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { getProducts, saveProducts, getSuppliers, generateId, Product } from '@/data/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Wheat } from 'lucide-react';
import { toast } from 'sonner';

export default function Products() {
  const { t } = useTranslation();
  const suppliers = getSuppliers();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const emptyForm = { name: '', category: '', supplierId: '', numberOfSuppliers: '' as string | number, supplierIds: [] as string[] };
  const [form, setForm] = useState(emptyForm);

  // 1. تأكدي من استدعاء getProducts من الـ store
const [products, setProducts] = useState<Product[]>([]);

useEffect(() => {
  setProducts(getProducts());
  const interval = setInterval(() => {
    const latest = getProducts();
    if (latest.length > 0) {
      setProducts(latest);
      clearInterval(interval);
    }
  }, 1000);
  return () => clearInterval(interval);
}, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setEditOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ 
      name: p.name, 
      category: p.category, 
      supplierId: p.supplierId,
      numberOfSuppliers: p.numberOfSuppliers || (p.supplierIds?.length) || (p.supplierId ? 1 : ''),
      supplierIds: p.supplierIds ? [...p.supplierIds] : (p.supplierId ? [p.supplierId] : [])
    });
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Please enter a product name.'); return; }
    
    const formData = {
      ...form,
      numberOfSuppliers: Number(form.numberOfSuppliers) || 0,
      supplierIds: form.supplierIds.slice(0, Number(form.numberOfSuppliers) || 0),
      supplierId: form.supplierIds[0] || '', // keep legacy populated
    };

    let updated: Product[];
    if (editing) {
      updated = products.map(p => p.id === editing.id ? { ...p, ...formData } : p);
      toast.success(`"${form.name}" has been updated! ✨`);
    } else {
      updated = [...products, { id: generateId(), ...formData }];
      toast.success(`"${form.name}" has been added! 🎉`);
    }
    setProducts(updated);
    saveProducts(updated);
    setEditOpen(false);
  };

  const handleDelete = useCallback(() => {
    if (!deleting) return;
    const updated = products.filter(p => p.id !== deleting.id);
    setProducts(updated);
    saveProducts(updated);
    toast.success(`"${deleting.name}" has been removed.`);
    setDeleting(null);
  }, [deleting, products]);

  return (
    <div>
      <PageHeader title={t('common.products')} description={t('pages.productsDesc', 'Catalog of agricultural crops and commodities along with their standard pricing.')}
        action={<Button onClick={openNew} size="lg"><Plus className="mr-2 h-4 w-4" /> {t('pages.addProduct', 'Add Product')}</Button>} />

      <div className="overflow-x-auto rounded-xl bg-card card-shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('Product', 'Product')}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">{t('Category', 'Category')}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">{t('Supplier', 'Supplier')}</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('Actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const pSuppliers = p.supplierIds && p.supplierIds.length > 0
                ? p.supplierIds.map(id => suppliers.find(s => s.id === id)?.name || 'Unknown').join(', ')
                : (suppliers.find(s => s.id === p.supplierId)?.name || '—');
                
              return (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Wheat className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{p.category}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    <div className="max-w-[200px] truncate" title={pSuppliers}>{pSuppliers}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="rounded-md p-1.5 hover:bg-accent"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button onClick={() => { setDeleting(p); setDeleteOpen(true); }} className="rounded-md p-1.5 hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="p-12 text-center">
            <Wheat className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">No products yet. Add your first crop or product!</p>
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? t('Edit Product', 'Edit Product') : t('pages.addProduct', 'Add New Product')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('Product Name *', 'Product Name *')}</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>{t('Category', 'Category')}</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
            </div>
            
            <div className="border-t pt-4">
              <Label>Number of Suppliers</Label>
              <Input type="number" min="0" placeholder="Enter number..." value={form.numberOfSuppliers} onChange={e => {
                const val = parseInt(e.target.value) || 0;
                setForm(f => {
                  const newIds = [...f.supplierIds];
                  while (newIds.length < val) newIds.push('');
                  return { ...f, numberOfSuppliers: val || '', supplierIds: newIds };
                });
              }} />
            </div>

            {(Number(form.numberOfSuppliers) || 0) > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {Array.from({ length: Number(form.numberOfSuppliers) || 0 }).map((_, idx) => (
                  <div key={idx}>
                    <Label className="text-xs">Supplier {idx + 1}</Label>
                    <Select value={form.supplierIds[idx] || ''} onValueChange={v => {
                      setForm(f => {
                        const newIds = [...f.supplierIds];
                        newIds[idx] = v;
                        return { ...f, supplierIds: newIds };
                      });
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select supplier..." /></SelectTrigger>
                      <SelectContent>
                        {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t('Cancel', 'Cancel')}</Button>
            <Button onClick={handleSave}>{editing ? t('Save Changes', 'Save Changes') : t('pages.addProduct', 'Add Product')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete} itemName={deleting?.name || ''} />
    </div>
  );
}
