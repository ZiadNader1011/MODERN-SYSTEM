import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getJobs, getSuppliers, getClients, getProducts, getContainers, getTransactions, formatCurrency, formatDate } from '@/data/store';
import { AccountStatement } from '@/components/AccountStatement';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { FileViewer } from '@/components/FileViewer';
import { ArrowLeft, Briefcase, Users, Ship, Calendar, Wheat, DollarSign, FileText } from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/20',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const jobs = useMemo(() => getJobs(), []);
  const suppliers = useMemo(() => getSuppliers(), []);
  const clients = useMemo(() => getClients(), []);
  const products = useMemo(() => getProducts(), []);
  const containers = useMemo(() => getContainers(), []);
  
  const [txTrigger, setTxTrigger] = useState(0);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const transactions = useMemo(() => getTransactions(), [txTrigger]);

  const job = jobs.find(j => j.id === id);

  if (!job) {
    return <div className="p-12 text-center text-muted-foreground">Operation not found. <Button variant="link" onClick={() => navigate('/jobs')}>Go back</Button></div>;
  }

  const supplier = suppliers.find(s => s.id === job.supplierId);
  const client = clients.find(c => c.id === job.clientId);
  const container = containers.find(c => c.id === job.containerId);

  // Computed from Job base form
  const baseDiscount = job.totalPrice * ((job.discountPercentage || 0) / 100);
  const baseRawMatCost = (job.rawMaterialCost || 0);
  const pettyCashCost = (job.pettyCash || 0);

  // Transactions linked to this Job
  const jobTxs = transactions.filter(t => t.relatedId === job.id);
  const sumByCurr = (filterFn: (t: any) => boolean, mapFn: (t: any) => number = t => t.amount) => {
    return jobTxs.filter(filterFn).reduce((acc, t) => {
      const c = t.currency || job.currency;
      acc[c] = (acc[c] || 0) + mapFn(t);
      return acc;
    }, {} as Record<string, number>);
  };

  const mergeCurr = (...objs: Record<string, number>[]) => {
    const res: Record<string, number> = {};
    objs.forEach(o => {
      Object.entries(o).forEach(([c, v]) => {
        if(v !== 0) res[c] = (res[c] || 0) + v;
      });
    });
    return res;
  };

  const formatMulti = (obj: Record<string, number>) => {
    const parts = Object.entries(obj).filter(([_,v]) => v !== 0).map(([c, v]) => formatCurrency(v, c));
    return parts.length ? parts.join(' | ') : formatCurrency(0, job.currency);
  };
  
  const isMultiZero = (obj: Record<string, number>) => Object.values(obj).every(v => v === 0);

  const txIncomingObj = sumByCurr(t => t.type === 'incoming');
  const txOutgoingObj = sumByCurr(t => t.type === 'outgoing');
  const txPettyCashObj = sumByCurr(t => t.type === 'petty_cash');
  const txRawMatObj = sumByCurr(t => t.type === 'raw_material');
  const txOtherCostObj = sumByCurr(t => t.type === 'raw_material', t => Number(t.otherCost) || 0);
  const txDiscountObj = sumByCurr(t => t.type === 'discount');

  const grossRawMatCost = job.rawMaterialCost || 0;
  const netRawMatCost = grossRawMatCost - (grossRawMatCost * ((job.supplierDiscountPercentage || 0) / 100));
  const baseOtherObj = { [job.currency]: pettyCashCost };
  const baseRawMatObj = { [job.currency]: netRawMatCost };
  const hasValidProducts = job.products && job.products.some(p => (Number(p.quantity) || 0) > 0 && (Number(p.unitPrice) || 0) > 0);
  const jobProductsValuationObjGross = hasValidProducts 
    ? job.products.reduce((acc, p) => {
        const c = p.currency || job.currency;
        acc[c] = (acc[c] || 0) + ((Number(p.quantity) || 0) * (Number(p.unitPrice) || 0));
        return acc;
      }, {} as Record<string, number>)
    : { [job.currency]: job.totalPrice };

  const jobProductsValuationObj = Object.fromEntries(
    Object.entries(jobProductsValuationObjGross).map(([c, v]) => [c, v * (1 - (job.discountPercentage || 0) / 100)])
  );

  const baseDiscountObj = Object.fromEntries(
    Object.entries(jobProductsValuationObjGross).map(([c, v]) => [c, v * ((job.discountPercentage || 0) / 100)])
  );

  const totalOtherCostsObj = mergeCurr(baseOtherObj, txPettyCashObj, txOtherCostObj);
  const totalRawMatObj = mergeCurr(baseRawMatObj, txRawMatObj);
  const totalDiscountObj = mergeCurr(baseDiscountObj, txDiscountObj);
  
  const totalAccumulatedObj = mergeCurr(totalOtherCostsObj, totalRawMatObj, totalDiscountObj);
  const totalSupplierOtherObj = mergeCurr(totalOtherCostsObj, totalRawMatObj);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="outline" size="icon" onClick={() => navigate('/jobs')}><ArrowLeft className="h-4 w-4" /></Button>
        <PageHeader title={job.title} description={`Type: ${job.operationType.toUpperCase()} | Ledger & Details`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Operation Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary"/> Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Current Status:</span>
                <Badge variant="outline" className={statusColors[job.status]}>{t(`status.${job.status}`, job.status)}</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Created Date:</span>
                <span className="font-medium"><Calendar className="h-3 w-3 inline mr-1 text-muted-foreground"/>{formatDate(job.createdAt)}</span>
              </div>
              {client && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Client:</span>
                  <span className="font-medium flex items-center"><Users className="h-3 w-3 mr-1 text-muted-foreground"/> {client.name}</span>
                </div>
              )}
              {supplier && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Supplier:</span>
                  <span className="font-medium flex items-center"><Users className="h-3 w-3 mr-1 text-muted-foreground"/> {supplier.name}</span>
                </div>
              )}
              {container && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Container:</span>
                  <span className="font-medium flex items-center"><Ship className="h-3 w-3 mr-1 text-muted-foreground"/> {container.containerNumber}</span>
                </div>
              )}
              {job.blNumber && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">B/L Number:</span>
                  <span className="font-mono">{job.blNumber}</span>
                </div>
              )}
              {job.packingListUrl && (
                <div className="flex justify-between items-center text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Packing List:</span>
                  <button onClick={() => setViewingFile(job.packingListUrl!)} className="text-primary hover:underline flex items-center gap-1 font-medium">
                    <FileText className="h-4 w-4" /> View
                  </button>
                </div>
              )}
            </div>
            
            {job.notes && (
              <div className="mt-4 pt-4 border-t">
                <span className="text-xs font-medium text-muted-foreground mb-1 block">Notes</span>
                <p className="text-sm bg-muted/30 p-2 rounded">{job.notes}</p>
              </div>
            )}
            
            {(job.numberOfReps || 0) > 0 && (
              <div className="mt-4 pt-4 border-t">
                <span className="text-xs font-medium text-muted-foreground mb-2 block">Quality Representatives ({job.numberOfReps})</span>
                <div className="grid grid-cols-2 gap-2">
                  {job.repNames?.map((name, i) => (
                    <div key={i} className="text-sm bg-muted/30 p-1.5 px-3 rounded border flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{i + 1}.</span>
                      <span className="font-medium">{name || 'Unnamed Rep'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-card border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><DollarSign className="h-5 w-5 text-warning"/> Summary Aggregation</h3>
            <div className="bg-background p-3 rounded border font-mono space-y-2 text-sm">
              <div className="flex justify-between font-bold text-lg pb-2 border-b">
                <span>Products Valuation (Net Result):</span> 
                <span>{formatMulti(jobProductsValuationObj)}</span>
              </div>
              
              {!isMultiZero(txIncomingObj) && (
                <div className="flex justify-between text-success text-xs pt-2">
                  <span>Total Incoming Payments:</span> 
                  <span>{formatMulti(txIncomingObj)}</span>
                </div>
              )}
              
              {!isMultiZero(txOutgoingObj) && (
                <div className="flex justify-between text-destructive text-xs">
                  <span>Total Outgoing Payments:</span>
                  <span>{formatMulti(txOutgoingObj)}</span>
                </div>
              )}

              {!isMultiZero(totalAccumulatedObj) && (
                <div className="flex justify-between text-warning text-xs pt-2 border-t border-dashed">
                  <span>Total Accumulated Costs & Discounts:</span>
                  <span>{formatMulti(totalAccumulatedObj)}</span>
                </div>
              )}

              {!isMultiZero(totalSupplierOtherObj) && (
                <div className="pt-2 border-t border-dashed mt-2">
                  <div className="space-y-1 text-[11px] text-muted-foreground mb-2 px-2">
                    {grossRawMatCost > 0 && <div className="flex justify-between"><span>Base Supplier Cost (Net):</span><span>{formatCurrency(netRawMatCost, job.currency)}</span></div>}
                    {!isMultiZero(txRawMatObj) && <div className="flex justify-between"><span>Ledger Supplier Cost (Rows):</span><span>{formatMulti(txRawMatObj)}</span></div>}
                    {pettyCashCost > 0 && <div className="flex justify-between"><span>Base Other Cost (Job Edit):</span><span>{formatCurrency(pettyCashCost, job.currency)}</span></div>}
                    {!isMultiZero(txOtherCostObj) && <div className="flex justify-between"><span>Ledger Other Cost (Rows):</span><span>{formatMulti(txOtherCostObj)}</span></div>}
                    {!isMultiZero(txPettyCashObj) && <div className="flex justify-between"><span>Ledger Petty Cash (Rows):</span><span>{formatMulti(txPettyCashObj)}</span></div>}
                  </div>
                  <div className="flex justify-between text-destructive text-sm font-bold pt-2 border-t border-dashed">
                    <span>Total Cost (Supplier + Other):</span>
                    <span>{formatMulti(totalSupplierOtherObj)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {job.products.length > 0 && (
            <div className="bg-card border rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Wheat className="h-5 w-5 text-primary"/> Linked Products</h3>
              <div className="space-y-2">
                {job.products.map((jp, i) => {
                  const prod = products.find(p => p.id === jp.productId);
                  const pCurr = jp.currency || job.currency;
                  return (
                    <div key={i} className="flex flex-col text-sm border-b pb-2 last:border-0 last:pb-0">
                      <div className="font-medium flex items-center flex-wrap gap-2">
                        <span>{prod?.name || 'Unknown Product'}</span>
                        {(jp.variety || jp.caliber || jp.grade) && (
                          <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {[jp.variety, jp.caliber, jp.grade].filter(Boolean).join(' - ')}
                          </span>
                        )}
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {jp.quantity} × {formatCurrency(jp.unitPrice, pCurr)} = {formatCurrency(jp.quantity * jp.unitPrice, pCurr)}
                        {jp.packages && ` | ${jp.packages} pkgs${jp.packageType ? ` (${jp.packageType})` : ''}`}
                        {jp.numberOfPallets > 0 && ` | ${jp.numberOfPallets} pallets`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Ledger / Account Statement */}
        <div className="lg:col-span-2">
          <div className="bg-card border rounded-xl p-6 shadow-sm min-h-full">
            <h2 className="text-xl font-bold mb-2 text-foreground">Operation Ledger</h2>
            <p className="text-muted-foreground text-sm mb-6">Manage all standalone transactions, raw material costs, and other costs continuously for this operation.</p>
            
            <AccountStatement 
              entityId={job.id} 
              entityType="job" 
              entityName={job.title} 
              onUpdate={() => setTxTrigger(prev => prev + 1)}
            />
          </div>
        </div>

      </div>

      <FileViewer fileUrl={viewingFile} onClose={() => setViewingFile(null)} />
    </div>
  );
}
