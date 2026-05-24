import { useState, useEffect, useMemo } from 'react';
import { useParams as useRouterParams, useNavigate as useRouterNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  getSuppliers, getJobs, getTransactions,
  formatDate, formatCurrency, formatBalanceObj, Job, Transaction
} from '@/data/store';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Printer, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/DatePicker';
import axios from '@/api/axios';

/* ================= Editable Cell ================= */
function EditableCell({ value, type = 'text', onSave }: any) {
  const [val, setVal] = useState(value ?? '');

  useEffect(() => {
    setVal(value ?? '');
  }, [value]);

  return (
    <input
      type={type}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onSave(type === 'number' ? Number(val) : val)}
      className="bg-transparent outline-none border rounded px-1"
    />
  );
}

export default function SupplierDetails() {
  const { id } = useRouterParams();
  const navigate = useRouterNavigate();
  const { t } = useTranslation();

  const suppliers = useMemo(() => getSuppliers(), []);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [filterJobId, setFilterJobId] = useState('all');
  const [filterCurrency, setFilterCurrency] = useState('all');

  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);

  const [newRecordAmount, setNewRecordAmount] = useState('');
  const [newRecordDesc, setNewRecordDesc] = useState('');
  const [newRecordJobId, setNewRecordJobId] = useState('none');
  const [newRecordCurrency, setNewRecordCurrency] = useState('USD');

  /* ================= LOAD ================= */
  useEffect(() => {
    setJobs(getJobs());
    axios.get('/transactions')
      .then(res => setTransactions(res.data))
      .catch(() => setTransactions(getTransactions()));
  }, []);

  const supplier = suppliers.find(s => String(s.id) === String(id));

  /* ================= FILTERED TX ================= */
  const supplierTransactions = useMemo(() => {
    const jobIds = jobs
      .filter(j => String(j.supplierId) === String(id))
      .map(j => String(j.id));

    return transactions
      .filter(t => {
        if (t.type === 'discount') return false;

     const supplierId =
  (t as any).supplier_id ??
  (t as any).supplierId ??
  (t as any).entity_id;

        const relatedId =
          (t as any).related_id ??
          (t as any).relatedId;

        const belongsToSupplier =
          String(supplierId) === String(id);

        const belongsToJob =
          relatedId && jobIds.includes(String(relatedId));

        return belongsToSupplier || belongsToJob;
      })
      .map(t => ({
        ...t,
        relatedId: String((t as any).related_id ?? (t as any).relatedId ?? 'none')
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, jobs, id]);

  /* ================= ADD ROW ================= */
  const handleAddExcelRow = async () => {
    const supplierId = Number(id);
    if (!supplierId) return toast.error("Invalid supplier");

    const jobId =
      newRecordJobId !== 'none'
        ? Number(newRecordJobId)
        : undefined;

    const payload = {
      supplierId,
      jobId,
      type: 'raw_material',
      amount: 1,
      currency: filterCurrency === 'all' ? 'USD' : filterCurrency,
      date: new Date().toISOString().split('T')[0],
      description: 'New Raw Material Entry',
      blNumber: '-',
      weightInTons: 0,
      pricePerTon: 0,
      otherCost: 0
    };

    try {
      const res = await axios.post('/transactions', payload);
      console.log(res.data);

      // ربط المعرفات لضمان عدم اختفاء السطر فوراً من الـ useMemo
      const newTx = {
  ...res.data,
  supplierId: supplierId,
  supplier_id: supplierId,
  entity_id: supplierId,
  related_id: jobId ?? null,
  relatedId: jobId ? String(jobId) : null
};

      setTransactions(prev => [...prev, newTx]);
      console.log(newTx);
      toast.success("Row added");
    } catch {
      toast.error("Failed to add");
    }
  };

  /* ================= ADD PAYMENT ================= */
  const handleAddRecord = async () => {
    const supplierId = Number(id);
    if (!supplierId) return toast.error("Invalid supplier");

    const jobId =
      newRecordJobId !== 'none'
        ? Number(newRecordJobId)
        : undefined;

    const payload = {
      supplierId,
      jobId,
      type: 'outgoing',
      amount: Number(newRecordAmount),
      currency: newRecordCurrency,
      date: new Date().toISOString().split('T')[0],
      description: newRecordDesc || 'Payment'
    };

    try {
      const res = await axios.post('/transactions', payload);
      console.log(res.data);

      // تعديل ذكي: ربط المعرفات يدوياً هنا أيضاً لمنع اختفاء إيصال الدفع فوراً
      const newPayment = {
        ...res.data,
        supplierId,
        supplier_id: supplierId,
        entity_id: supplierId,
        jobId,
        related_id: jobId,
        relatedId: jobId ? String(jobId) : 'none'
      };

      setTransactions(prev => [...prev, newPayment]);

      setIsAddRecordOpen(false);
      setNewRecordAmount('');
      setNewRecordDesc('');
      toast.success("Payment added");
    } catch {
      toast.error("Failed to add payment");
    }
  };

  /* ================= UI ================= */
  if (!supplier) return <div>Supplier not found</div>;

  return (
    <div>
      <h1>Supplier: {supplier.name}</h1>

      <Button onClick={handleAddExcelRow}>Add Row</Button>

      <table>
        <tbody>
          {supplierTransactions.map(tx => (
            <tr key={tx.id}>
              <td>{tx.date}</td>
              <td>{tx.description}</td>
              <td>{tx.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add Payment Dialog */}
      <Dialog open={isAddRecordOpen} onOpenChange={setIsAddRecordOpen}>
        <DialogContent>
          <Label>Amount</Label>
          <Input value={newRecordAmount} onChange={e => setNewRecordAmount(e.target.value)} />

          <Label>Currency</Label>
          <Select value={newRecordCurrency} onValueChange={setNewRecordCurrency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="EGP">EGP</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleAddRecord}>Save</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}