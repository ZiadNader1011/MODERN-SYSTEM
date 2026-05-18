import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, MapPin, Briefcase, Calculator } from 'lucide-react';
import { getJobs, getContainers, getSuppliers, getClients, formatDate, getTransactions, getPackingLists } from '@/data/store';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';

export function GlobalSearch() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const jobs = getJobs();
  const containers = getContainers();
  const suppliers = getSuppliers();
  const clients = getClients();
  const transactions = getTransactions();
  const packingLists = getPackingLists();

  // Simple fuzzy matching manually since cmdk requires `value` strings
  const searchResults = () => {
    if (!query) return { jobs: [], containers: [], txs: [], pLists: [] };
    const q = query.toLowerCase();
    
    const matchedJobs = jobs.filter(j => {
      const formattedDate = formatDate(j.createdAt) || '';
      const normalizedDate = formattedDate.replace(/[\-\.\s]+/g, '/');
      const normalizedQuery = q.replace(/[\-\.\s]+/g, '/');
      const dateStringMatch = normalizedQuery.length > 0 && normalizedDate.includes(normalizedQuery);
      
      const rawDateStr = formattedDate.replace(/[^0-9]/g, '');
      const rawQueryStr = q.replace(/[^0-9]/g, '');
      const numericMatch = rawQueryStr.length > 0 && (rawDateStr.includes(rawQueryStr) || String(j.createdAt).replace(/[^0-9]/g, '').includes(rawQueryStr));

      const sSearch = j.supplierId ? suppliers.find(sup => sup.id === j.supplierId)?.name.toLowerCase() || '' : '';
      const cSearch = j.clientId ? clients.find(cli => cli.id === j.clientId)?.name.toLowerCase() || '' : '';

      const containerIds = j.containerIds || (j.containerId ? [j.containerId] : []);
      const contSearch = containerIds.map(cid => {
        const c = containers.find(cont => cont.id === cid);
        return c ? c.containerNumber.toLowerCase() : '';
      }).join(' ');
      
      const jobTxs = transactions.filter(t => t.relatedId === j.id);
      const bankSearch = jobTxs.map(t => t.bank ? t.bank.toLowerCase() : '').join(' ');

      return j.title.toLowerCase().includes(q) ||
        (j.invoiceNumber && j.invoiceNumber.toLowerCase().includes(q)) ||
        (j.blNumber && j.blNumber.toLowerCase().includes(q)) ||
        (j.exportCertificate && j.exportCertificate.toLowerCase().includes(q)) ||
        formattedDate.includes(q) ||
        dateStringMatch ||
        numericMatch ||
        sSearch.includes(q) ||
        cSearch.includes(q) ||
        contSearch.includes(q) ||
        bankSearch.includes(q);
    });

    const matchedContainers = containers.filter(c => {
      const shipDate = formatDate(c.shippingDate) || '';
      const arrDate = formatDate(c.arrivalDate) || '';
      const rawShip = shipDate.replace(/[^0-9]/g, '');
      const rawArr = arrDate.replace(/[^0-9]/g, '');
      const rawQueryStr = q.replace(/[^0-9]/g, '');

      const cDateMatch = rawQueryStr.length > 0 && (rawShip.includes(rawQueryStr) || rawArr.includes(rawQueryStr));

      const relatedJobs = jobs.filter(j => j.containerId === c.id || (j.containerIds && j.containerIds.includes(c.id)));
      const relatedInvoices = relatedJobs.map(j => j.invoiceNumber?.toLowerCase() || '').join(' ');
      const relatedBLs = relatedJobs.map(j => j.blNumber?.toLowerCase() || '').join(' ');

      return c.containerNumber.toLowerCase().includes(q) ||
        c.sourcePort.toLowerCase().includes(q) ||
        c.destinationPort.toLowerCase().includes(q) ||
        cDateMatch ||
        relatedInvoices.includes(q) ||
        relatedBLs.includes(q);
    });

    const matchedTransactions = transactions.filter(t => {
      const qLower = q;
      const formattedDate = formatDate(t.date) || '';
      
      const related = t.relatedId ? jobs.find(x => x.id === t.relatedId)?.title || suppliers.find(x => x.id === t.relatedId)?.name || clients.find(x => x.id === t.relatedId)?.name : '';
      
      const j = jobs.find(x => x.id === t.relatedId);
      const invoiceSearch = j?.invoiceNumber?.toLowerCase() || '';
      const blSearch = j?.blNumber?.toLowerCase() || '';
      
      const directInvoice = t.invoiceNumber?.toLowerCase() || '';
      const directBl = t.blNumber?.toLowerCase() || '';
      
      const containerIds = j ? (j.containerIds || (j.containerId ? [j.containerId] : [])) : [];
      const containerSearch = containerIds.map(cid => {
        const c = containers.find(cont => cont.id === cid);
        return c ? c.containerNumber.toLowerCase() : '';
      }).join(' ');

      const bankSearch = t.bank?.toLowerCase() || '';

      return t.description.toLowerCase().includes(qLower) || 
             t.type.toLowerCase().includes(qLower) ||
             (related && related.toLowerCase().includes(qLower)) ||
             formattedDate.includes(qLower) ||
             invoiceSearch.includes(qLower) ||
             blSearch.includes(qLower) ||
             directInvoice.includes(qLower) ||
             directBl.includes(qLower) ||
             containerSearch.includes(qLower) ||
             bankSearch.includes(qLower) ||
             t.amount.toString().includes(qLower);
    });

    const matchedPackingLists = packingLists.filter(pl => {
      const fd = formatDate(pl.date) || '';
      return (pl.invoiceNumber && pl.invoiceNumber.toLowerCase().includes(q)) ||
             (pl.blNumber && pl.blNumber.toLowerCase().includes(q)) ||
             (pl.containerNumber && pl.containerNumber.toLowerCase().includes(q)) ||
             (pl.clientName && pl.clientName.toLowerCase().includes(q)) ||
             fd.includes(q);
    });

    return { jobs: matchedJobs, containers: matchedContainers, txs: matchedTransactions, pLists: matchedPackingLists };
  };

  const { jobs: jRes, containers: cRes, txs: tRes, pLists: pRes } = searchResults();

  const handleSelectJob = () => {
    setOpen(false);
    navigate('/jobs');
  };

  const handleSelectContainer = () => {
    setOpen(false);
    navigate('/containers');
  };

  return (
    <>
      <Button 
        variant="outline" 
        className="w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        {t('Search by invoice, container, date...')}
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput 
          placeholder={t('Type an invoice number, container, or date...')} 
          value={query} 
          onValueChange={setQuery} 
        />
        <CommandList>
          {query.length > 0 && jRes.length === 0 && cRes.length === 0 && tRes.length === 0 && pRes.length === 0 && (
            <CommandEmpty>{t('No results found.')}</CommandEmpty>
          )}
          
          {jRes.length > 0 && (
            <CommandGroup heading={t('Operations (Jobs)')}>
              {jRes.map((job) => {
                const fd = formatDate(job.createdAt) || '';
                const sName = job.supplierId ? suppliers.find(sup => sup.id === job.supplierId)?.name || '' : '';
                const cName = job.clientId ? clients.find(cli => cli.id === job.clientId)?.name || '' : '';
                const jobContIds = job.containerIds || (job.containerId ? [job.containerId] : []);
                const cNum = jobContIds.map(cid => containers.find(c => c.id === cid)?.containerNumber || '').join(' ');
                const bNames = transactions.filter(t => t.relatedId === job.id).map(t => t.bank || '').join(' ');
                
                return (
                <CommandItem key={job.id} onSelect={handleSelectJob} value={job.id}>
                  <Briefcase className="mr-2 h-4 w-4" />
                  <span>{job.title}</span>
                  {job.invoiceNumber && <span className="ml-2 text-[10px] text-muted-foreground border border-muted-foreground/30 bg-muted/20 rounded px-1.5 py-0.5">INV: {job.invoiceNumber}</span>}
                  {job.blNumber && <span className="ml-2 text-[10px] text-muted-foreground border border-muted-foreground/30 bg-muted/20 rounded px-1.5 py-0.5">B/L: {job.blNumber}</span>}
                  <span className="ml-auto text-xs text-muted-foreground">{formatDate(job.createdAt)}</span>
                </CommandItem>
                );
              })}
            </CommandGroup>
          )}
          
          {cRes.length > 0 && (
            <CommandGroup heading={t('Containers')}>
              {cRes.map((container) => {
                const sd = formatDate(container.shippingDate) || '';
                const ad = formatDate(container.arrivalDate) || '';
                return (
                <CommandItem key={container.id} onSelect={handleSelectContainer} value={container.id}>
                  <MapPin className="mr-2 h-4 w-4" />
                  <span>{container.containerNumber}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{container.sourcePort} → {container.destinationPort}</span>
                </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {tRes.length > 0 && (
            <CommandGroup heading={t('Financials')}>
              {tRes.map((tx) => {
                const fd = formatDate(tx.date) || '';
                const bankInfo = tx.bank || '';
                return (
                <CommandItem key={tx.id} onSelect={() => { setOpen(false); navigate('/financials'); }} value={tx.id}>
                  <Calculator className="mr-2 h-4 w-4" />
                  <span>{tx.description}</span>
                  {bankInfo && <span className="ml-2 text-[10px] text-muted-foreground border border-muted-foreground/30 bg-muted/20 rounded px-1.5 py-0.5">{bankInfo}</span>}
                  
                  {/* Show related invoice/BL if available so user knows why it matched */}
                  {(() => {
                    const j = tx.relatedId ? jobs.find(x => x.id === tx.relatedId) : null;
                    const inv = tx.invoiceNumber || j?.invoiceNumber;
                    const bl = tx.blNumber || j?.blNumber;
                    return (
                      <>
                        {inv && <span className="ml-2 text-[10px] text-muted-foreground border border-muted-foreground/30 bg-muted/20 rounded px-1.5 py-0.5">INV: {inv}</span>}
                        {bl && <span className="ml-2 text-[10px] text-muted-foreground border border-muted-foreground/30 bg-muted/20 rounded px-1.5 py-0.5">B/L: {bl}</span>}
                      </>
                    );
                  })()}

                  <span className="ml-auto text-xs font-semibold">{tx.amount} {tx.currency}</span>
                </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {pRes.length > 0 && (
            <CommandGroup heading={t('Standalone Packing Lists')}>
              {pRes.map((pl) => (
                <CommandItem key={pl.id} onSelect={() => { setOpen(false); navigate('/packing-lists'); }} value={pl.id}>
                  <Briefcase className="mr-2 h-4 w-4" />
                  <span>{pl.clientName || 'Packing List'}</span>
                  {pl.invoiceNumber && <span className="ml-2 text-xs text-muted-foreground border rounded px-1">INV: {pl.invoiceNumber}</span>}
                  {pl.blNumber && <span className="ml-2 text-xs text-muted-foreground border rounded px-1">B/L: {pl.blNumber}</span>}
                  <span className="ml-auto text-xs text-muted-foreground">{formatDate(pl.date)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
