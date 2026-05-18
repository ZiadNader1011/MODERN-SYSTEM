import { useMemo, useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { getJobs, getSuppliers, getContainers, getProducts, getTransactions, getFiles, getClients, getShippingAgents, getShippingAgentRecords, formatCurrency, sumByCurrency, computeBalances, formatBalanceObj } from '@/data/store';
import { Briefcase, Ship, Users, DollarSign, TrendingUp, Archive, Wheat, Calendar, MapPin, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ar } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const statusColors: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/20',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  loading: 'bg-warning/10 text-warning border-warning/20',
  'in-transit': 'bg-info/10 text-info border-info/20',
  arrived: 'bg-success/10 text-success border-success/20',
  cleared: 'bg-muted text-muted-foreground border-border',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // ⚡ العداد السحري الصامت: يجبر الـ useMemo على إعادة الحساب بعد التحميل الخلفي مباشرة
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    // تحديث خفيف جداً بعد 400 ملي ثانية لضمان قراءة الداتا فور تحميل الكاش الخلفي
    const timer = setTimeout(() => {
      setTrigger(1);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // 🚀 ربط الـ useMemo بالـ trigger يضمن تحديث الأرقام تلقائياً وبشكل صامت بدون وميض أو تصفير معلق
  const jobs = useMemo(() => getJobs(), [trigger]);
  const suppliers = useMemo(() => getSuppliers(), [trigger]);
  const containers = useMemo(() => getContainers(), [trigger]);
  const products = useMemo(() => getProducts(), [trigger]);
  const transactions = useMemo(() => getTransactions(), [trigger]);
  const files = useMemo(() => getFiles(), [trigger]);

  const dateLocale = i18n.language === 'ar' ? ar : enUS;
  const formatDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: dateLocale });
    } catch {
      return '—';
    }
  };

  const clients = useMemo(() => getClients(), [trigger]);
  const shippingAgents = useMemo(() => getShippingAgents(), [trigger]);
  const agentRecords = useMemo(() => getShippingAgentRecords(), [trigger]);

  const totalSalesObj: Record<string, number> = {};
  const totalSupplierCostObj: Record<string, number> = {};
  const clientRemainingObj: Record<string, number> = {};
  const supplierRemainingObj: Record<string, number> = {};
  const agentRemainingObj: Record<string, number> = {};
  const totalAgentCostObj: Record<string, number> = {};

  const clientManualTxIds = new Set<string>();
  const supplierManualTxIds = new Set<string>();

  // 1. Base Jobs processing
  jobs.forEach(j => {
    const hasValidProducts = j.products && j.products.some((p: any) => (Number(p.quantity) || 0) > 0 && (Number(p.unitPrice) || 0) > 0);
    const discount = j.discountPercentage || 0;
    
    if (hasValidProducts) {
      j.products.forEach((p: any) => {
        const c = p.currency || j.currency;
        const gross = (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0);
        totalSalesObj[c] = (totalSalesObj[c] || 0) + (gross * (1 - discount / 100));
      });
    } else if (j.totalPrice > 0) {
      totalSalesObj[j.currency] = (totalSalesObj[j.currency] || 0) + (j.totalPrice * (1 - discount / 100));
    }

    const grossCost = j.rawMaterialCost || ((Number(j.rawMaterialWeight) || 0) * (Number(j.rawMaterialPricePerTon) || 0));
    const suppDisc = j.supplierDiscountPercentage || 0;
    const netCost = grossCost - (grossCost * (suppDisc / 100));
    
    if (netCost > 0) {
      totalSupplierCostObj[j.currency] = (totalSupplierCostObj[j.currency] || 0) + netCost;
    }
    if (j.pettyCash > 0) {
      totalSupplierCostObj[j.currency] = (totalSupplierCostObj[j.currency] || 0) + Number(j.pettyCash);
    }
  });

  // 2. Client Ledgers
  const clientBalancesList: { name: string; balances: Record<string, number> }[] = [];
  clients.forEach(c => {
    const cBalances: Record<string, number> = {};
    const clientJobs = jobs.filter(j => j.clientId === c.id);
    let manualTxs = transactions.filter(t => {
      if (t.entityId) return t.entityId === c.id;
      if (t.relatedId === c.id) return true;
      if (t.relatedId && clientJobs.some(j => j.id === t.relatedId)) {
        return t.type === 'incoming';
      }
      return false;
    });

    manualTxs.forEach(t => {
      clientManualTxIds.add(t.id);
      const currency = t.currency || 'USD';
      if (t.type === 'incoming') {
        cBalances[currency] = (cBalances[currency] || 0) - t.amount;
        clientRemainingObj[currency] = (clientRemainingObj[currency] || 0) - t.amount;
      } else {
        cBalances[currency] = (cBalances[currency] || 0) + t.amount;
        clientRemainingObj[currency] = (clientRemainingObj[currency] || 0) + t.amount;
      }
    });

    clientJobs.forEach(job => {
      const hasValidProducts = job.products && job.products.some((p: any) => (Number(p.quantity) || 0) > 0 && (Number(p.unitPrice) || 0) > 0);
      const discount = job.discountPercentage || 0;
      
      if (hasValidProducts) {
        job.products.forEach((p: any) => {
          const currency = p.currency || job.currency;
          const val = (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0);
          const finalVal = val - (val * (discount / 100));
          cBalances[currency] = (cBalances[currency] || 0) + finalVal;
          clientRemainingObj[currency] = (clientRemainingObj[currency] || 0) + finalVal;
        });
      } else if (job.totalPrice > 0) {
        const finalTotal = job.totalPrice - (job.totalPrice * (discount / 100));
        cBalances[job.currency] = (cBalances[job.currency] || 0) + finalTotal;
        clientRemainingObj[job.currency] = (clientRemainingObj[job.currency] || 0) + finalTotal;
      }
    });

    Object.keys(cBalances).forEach(k => { if (Math.abs(cBalances[k]) < 0.01) delete cBalances[k]; });
    if (Object.keys(cBalances).length > 0) {
      clientBalancesList.push({ name: c.name, balances: cBalances });
    }
  });

  // 3. Supplier Ledgers
  const supplierBalancesList: { name: string; balances: Record<string, number> }[] = [];
  suppliers.forEach(s => {
    const sBalances: Record<string, number> = {};
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

    manualTxs.forEach(t => {
      supplierManualTxIds.add(t.id);
      const currency = t.currency || 'USD';
      if (t.type === 'outgoing') {
        sBalances[currency] = (sBalances[currency] || 0) - t.amount;
        supplierRemainingObj[currency] = (supplierRemainingObj[currency] || 0) - t.amount;
      } else if (t.type === 'raw_material') {
        const costAmt = t.amount + (t.otherCost || 0);
        totalSupplierCostObj[currency] = (totalSupplierCostObj[currency] || 0) + costAmt;
        sBalances[currency] = (sBalances[currency] || 0) + costAmt;
        supplierRemainingObj[currency] = (supplierRemainingObj[currency] || 0) + costAmt;
      }
    });

    supplierJobs.forEach(job => {
      const grossCost = job.rawMaterialCost || ((Number(job.rawMaterialWeight) || 0) * (Number(job.rawMaterialPricePerTon) || 0));
      const suppDisc = job.supplierDiscountPercentage || 0;
      const cost = grossCost - (grossCost * (suppDisc / 100));
      if (cost > 0) {
        sBalances[job.currency] = (sBalances[job.currency] || 0) + cost;
        supplierRemainingObj[job.currency] = (supplierRemainingObj[job.currency] || 0) + cost;
      }
      if (job.pettyCash > 0) {
        sBalances[job.currency] = (sBalances[job.currency] || 0) + Number(job.pettyCash);
        supplierRemainingObj[job.currency] = (supplierRemainingObj[job.currency] || 0) + Number(job.pettyCash);
      }
    });

    Object.keys(sBalances).forEach(k => { if (Math.abs(sBalances[k]) < 0.01) delete sBalances[k]; });
    if (Object.keys(sBalances).length > 0) {
      supplierBalancesList.push({ name: s.name, balances: sBalances });
    }
  });

  // 4. Agent Ledgers
  agentRecords.forEach(r => {
    if (r.costEgp) { agentRemainingObj['EGP'] = (agentRemainingObj['EGP'] || 0) + r.costEgp; totalAgentCostObj['EGP'] = (totalAgentCostObj['EGP'] || 0) + r.costEgp; }
    if (r.costEuro) { agentRemainingObj['EUR'] = (agentRemainingObj['EUR'] || 0) + r.costEuro; totalAgentCostObj['EUR'] = (totalAgentCostObj['EUR'] || 0) + r.costEuro; }
    if (r.costUsd) { agentRemainingObj['USD'] = (agentRemainingObj['USD'] || 0) + r.costUsd; totalAgentCostObj['USD'] = (totalAgentCostObj['USD'] || 0) + r.costUsd; }
  });

  shippingAgents.forEach(a => {
    const agentTxs = transactions.filter(t => t.relatedId === a.id);
    agentTxs.forEach(t => {
      const c = t.currency || 'USD';
      if (t.type === 'outgoing') {
        agentRemainingObj[c] = (agentRemainingObj[c] || 0) - t.amount;
      } else if (t.type === 'incoming') {
        agentRemainingObj[c] = (agentRemainingObj[c] || 0) + t.amount;
      }
    });
  });

  // 5. Net Profit
  const profitObj: Record<string, number> = {};
  Object.entries(totalSalesObj).forEach(([c, v]) => { profitObj[c] = (profitObj[c] || 0) + v; });
  Object.entries(totalSupplierCostObj).forEach(([c, v]) => { profitObj[c] = (profitObj[c] || 0) - v; });
  Object.entries(totalAgentCostObj).forEach(([c, v]) => { profitObj[c] = (profitObj[c] || 0) - v; });

  transactions.forEach(t => {
    const currency = t.currency || 'USD';
    const isAgentTx = shippingAgents.some(a => t.relatedId === a.id);

    if (t.type === 'petty_cash' || t.type === 'discount') {
      profitObj[currency] = (profitObj[currency] || 0) - t.amount;
    } else if (t.type === 'outgoing' && !supplierManualTxIds.has(t.id) && !isAgentTx) {
      profitObj[currency] = (profitObj[currency] || 0) - t.amount;
    } else if (t.type === 'incoming' && !clientManualTxIds.has(t.id) && !isAgentTx) {
      profitObj[currency] = (profitObj[currency] || 0) + t.amount;
    } else if (t.type === 'raw_material' && !clientManualTxIds.has(t.id) && !supplierManualTxIds.has(t.id)) {
      profitObj[currency] = (profitObj[currency] || 0) - t.amount;
    }
  });

  [totalSalesObj, clientRemainingObj, supplierRemainingObj, agentRemainingObj, profitObj].forEach(obj => {
    Object.keys(obj).forEach(k => { if (Math.abs(obj[k]) < 0.01) delete obj[k]; });
  });

  return (
    <div>
      <PageHeader title={t('common.dashboard')} description={t('dashboard.welcome')}
        action={<Button onClick={() => navigate('/jobs')} size="lg"><Briefcase className="me-2 h-4 w-4" /> {t('dashboard.viewAllJobs')}</Button>} />

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-4 mb-8">
        <StatCard title="Total Sales" value={formatBalanceObj(totalSalesObj)} icon={Briefcase} variant="success" description="Net Sales" />
        <StatCard title="Client Remaining" value={formatBalanceObj(clientRemainingObj)} icon={DollarSign} variant="warning" description="Amount remaining from clients">
          {clientBalancesList.length > 0 && (
            <div className="max-h-28 overflow-y-auto space-y-1.5 text-xs pr-1 mt-1 custom-scrollbar">
              {clientBalancesList.map((c, i) => (
                <div key={i} className="flex justify-between items-center bg-background/60 rounded px-2 py-1.5 border border-border/40">
                  <span className="font-medium text-foreground truncate mr-2" title={c.name}>{c.name}</span>
                  <span className="text-muted-foreground whitespace-nowrap">{formatBalanceObj(c.balances)}</span>
                </div>
              ))}
            </div>
          )}
        </StatCard>
        <StatCard title="Supplier Own" value={formatBalanceObj(supplierRemainingObj)} icon={DollarSign} variant="warning" description="Total supplier owes">
          {supplierBalancesList.length > 0 && (
            <div className="max-h-28 overflow-y-auto space-y-1.5 text-xs pr-1 mt-1 custom-scrollbar">
              {supplierBalancesList.map((s, i) => (
                <div key={i} className="flex justify-between items-center bg-background/60 rounded px-2 py-1.5 border border-border/40">
                  <span className="font-medium text-foreground truncate mr-2" title={s.name}>{s.name}</span>
                  <span className="text-muted-foreground whitespace-nowrap">{formatBalanceObj(s.balances)}</span>
                </div>
              ))}
            </div>
          )}
        </StatCard>
        <StatCard title="Agent Remaining" value={formatBalanceObj(agentRemainingObj)} icon={Ship} variant="info" description="Total agent remaining" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-8">
        <StatCard title={t('common.containers')} value={containers.length} icon={Ship} variant="info" />
        <StatCard title={t('dashboard.cropsProducts')} value={products.length} icon={Wheat} variant="default" />
        <StatCard title={t('dashboard.payments')} value={transactions.length} icon={DollarSign} variant="success" />
        <StatCard title={t('dashboard.documents')} value={files.length} icon={Archive} variant="warning" />
      </div>

      {/* Recent Jobs */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-semibold text-foreground">{t('dashboard.recentJobs')}</h2>
        <Tooltip>
          <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
          <TooltipContent><p>{i18n.language === 'ar' ? 'أحدث الصفقات قيد المعالجة حالياً.' : 'The most recent trading deals currently in progress.'}</p></TooltipContent>
        </Tooltip>
      </div>
      <div className="space-y-3 mb-8">
        {jobs.slice(0, 5).map(job => {
          const supplier = suppliers.find(s => s.id === job.supplierId);
          const container = containers.find(c => c.id === job.containerId);
          
          const jobTransactions = transactions.filter(p => p.relatedId && String(p.relatedId) === String(job.id));
          const incomingObj = sumByCurrency(jobTransactions.filter(t => t.type === 'incoming'), t => t.currency, t => t.amount);

          const jobProductsValuationObjGross = job.products && job.products.length > 0
            ? job.products.reduce((acc, p) => {
                const c = p.currency || job.currency;
                acc[c] = (acc[c] || 0) + ((Number(p.quantity) || 0) * (Number(p.unitPrice) || 0));
                return acc;
              }, {} as Record<string, number>)
            : { [job.currency]: job.totalPrice };

          // 🚀 الحماية الحديدية للـ Type Casting هنا لإنهاء الأخطاء الحسابية تماماً في الـ TypeScript
          const jobProductsValuationObj = Object.fromEntries(
            Object.entries(jobProductsValuationObjGross).map(([c, v]) => [c, Number(v) * (1 - (job.discountPercentage || 0) / 100)])
          );

          const formatMultiTotal = (obj: Record<string, number>) => {
            const parts = Object.entries(obj).filter(([_, v]) => v !== 0).map(([c, v]) => formatCurrency(v, c));
            return parts.length ? parts.join(' | ') : formatCurrency(0, job.currency);
          };

          return (
            <div key={job.id} className="rounded-xl bg-card p-4 card-shadow hover:card-shadow-hover transition-shadow cursor-pointer"
              onClick={() => navigate('/jobs')}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground text-sm">{t(`mockData.${job.title}`, job.title)}</h3>
                    <Badge variant="outline" className={`text-xs ${statusColors[job.status]}`}>{t(`status.${job.status}`)}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{supplier ? t(`mockData.${supplier.name}`, supplier.name) : ''}</span>
                    {container && <span className="flex items-center gap-1"><Ship className="h-3 w-3" />{container.containerNumber}</span>}
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(job.createdAt)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-foreground">{formatMultiTotal(jobProductsValuationObj)}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.paid')} <span className="text-success">{formatBalanceObj(incomingObj)}</span></p>
                </div>
              </div>
            </div>
          );
        })}
        {jobs.length === 0 && (
          <div className="rounded-xl border-2 border-dashed p-10 text-center">
            <Briefcase className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-muted-foreground">{t('dashboard.noJobsYet')}</p>
          </div>
        )}
      </div>

      {/* Active Containers */}
      {containers.filter(c => c.status !== 'cleared').length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold text-foreground">{t('dashboard.activeShipments')}</h2>
            <Tooltip>
              <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
              <TooltipContent><p>{i18n.language === 'ar' ? 'حاويات الشحن التي لم تصل بعد وتشمل الشحنات قيد التحميل وتلك التي في البحر.' : 'Containers that have not been delivered yet, including those loading and in-transit.'}</p></TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {containers.filter(c => c.status !== 'cleared').map(c => (
              <div key={c.id} className="rounded-xl bg-card p-4 card-shadow cursor-pointer hover:card-shadow-hover transition-shadow"
                onClick={() => navigate('/containers')}>
                <div className="flex items-center gap-2 mb-2">
                  <Ship className="h-4 w-4 text-info" />
                  <span className="font-medium text-foreground text-sm">{c.containerNumber}</span>
                  <Badge variant="outline" className={`text-xs ${statusColors[c.status]}`}>{t(`status.${c.status}`)}</Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {t(`mockData.${c.sourcePort}`, c.sourcePort)} → {t(`mockData.${c.destinationPort}`, c.destinationPort)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}