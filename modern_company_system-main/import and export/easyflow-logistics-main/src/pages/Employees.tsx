import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { getEmployees, saveEmployees, getTransactions, generateId, Employee, formatCurrency } from '@/data/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Users, Phone, Briefcase, DollarSign, Printer } from 'lucide-react';
import { toast } from 'sonner';

export default function Employees() {
  const { t } = useTranslation();
  const transactions = useMemo(() => getTransactions(), []);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', jobTitle: '' });


  const [employees, setEmployees] = useState<Employee[]>([]);

useEffect(() => {
  setEmployees(getEmployees());
  const timer = setTimeout(() => {
    setEmployees(getEmployees());
  }, 600);
  return () => clearTimeout(timer);
}, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', phone: '', jobTitle: '' });
    setEditOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({ name: emp.name, phone: emp.phone, jobTitle: emp.jobTitle });
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!form.name) {
      toast.error('Name is required');
      return;
    }
    const empData: Employee = {
      ...form,
      id: editing ? editing.id : generateId(),
    };
    
    let updated;
    if (editing) {
      updated = employees.map(e => e.id === editing.id ? empData : e);
      toast.success('Employee updated successfully');
    } else {
      updated = [...employees, empData];
      toast.success('Employee added successfully');
    }
    
    setEmployees(updated);
    saveEmployees(updated);
    setEditOpen(false);
  };

  const handleDelete = () => {
    if (!deleting) return;
    const updated = employees.filter(e => e.id !== deleting.id);
    setEmployees(updated);
    saveEmployees(updated);
    toast.success('Employee removed');
    setDeleting(null);
  };

  return (
    <div className="pb-10">
      <div className="no-print">
        <PageHeader 
          title={t('Employees', 'Employees (الموظفين)')} 
          description={t('pages.employeesDesc', 'Manage staff and track their received payments/salaries.')}
          action={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => window.print()} size="lg"><Printer className="mr-2 h-4 w-4" /> Print Report</Button>
              <Button onClick={openNew} size="lg"><Plus className="mr-2 h-4 w-4" /> Add Employee</Button>
            </div>
          } 
        />
      </div>

      <div className="hidden print:block mb-8 text-center border-b pb-4">
        <h1 className="text-3xl font-bold">Employees Payment Report (تقرير الموظفين)</h1>
        <p className="text-xs mt-2 text-gray-500">Generated on: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {employees.map(emp => {
          // Calculate total payments received by this employee from transactions
          // "outgoing" transaction linked to this employee = payment given to employee
          let paidEgp = 0, paidUsd = 0, paidEuro = 0;
          transactions.filter(t => t.relatedId === emp.id && t.type === 'outgoing').forEach(t => {
            if (t.currency === 'EGP') paidEgp += t.amount;
            else if (t.currency === 'USD') paidUsd += t.amount;
            else if (t.currency === 'EUR') paidEuro += t.amount;
          });

          return (
            <div key={emp.id} className="rounded-xl bg-card p-5 shadow-sm border transition-shadow hover:shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{emp.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Briefcase className="h-3 w-3" /> {emp.jobTitle || 'No Title'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(emp)} className="rounded-md p-1.5 hover:bg-accent"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button onClick={() => { setDeleting(emp); setDeleteOpen(true); }} className="rounded-md p-1.5 hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2 text-sm">
                  {emp.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground" dir="ltr">
                      <Phone className="h-3.5 w-3.5" /> <span>{emp.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payments Summary */}
              <div className="mt-5 pt-4 border-t">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  <DollarSign className="h-3.5 w-3.5 text-success" /> Total Payments Received
                </div>
                <div className="space-y-1">
                  {paidEgp > 0 && <div className="flex justify-between text-sm"><span>EGP:</span> <span className="font-bold text-success">{formatCurrency(paidEgp, 'EGP')}</span></div>}
                  {paidUsd > 0 && <div className="flex justify-between text-sm"><span>USD:</span> <span className="font-bold text-success">{formatCurrency(paidUsd, 'USD')}</span></div>}
                  {paidEuro > 0 && <div className="flex justify-between text-sm"><span>EUR:</span> <span className="font-bold text-success">{formatCurrency(paidEuro, 'EUR')}</span></div>}
                  
                  {paidEgp === 0 && paidUsd === 0 && paidEuro === 0 && (
                    <p className="text-xs text-muted-foreground italic">No payments recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {employees.length === 0 && (
        <div className="rounded-xl border-2 border-dashed p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">No employees found. Add one to get started.</p>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" />
            </div>
            <div>
              <Label>Job Title</Label>
              <Input value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} placeholder="e.g. Accountant" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} type="tel" dir="ltr" className="text-left" placeholder="+20 123 456 7890" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Add Employee'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete} itemName={deleting?.name || ''} />
    </div>
  );
}
