import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: any | null;
  client: any | null;
  job: any | null;
}

const numberToWords = (num: number) => {
  const a = ['','one ','two ','three ','four ', 'five ','six ','seven ','eight ','nine ','ten ','eleven ','twelve ','thirteen ','fourteen ','fifteen ','sixteen ','seventeen ','eighteen ','nineteen '];
  const b = ['', '', 'twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety'];
  
  let numStr = num.toString();
  if (numStr.length > 9) return 'overflow';
  let n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
  return str.trim().toUpperCase() || 'ZERO';
};

const FormInput = ({ value, onChange, placeholder = '', className = '' }: any) => (
  <input
    type="text"
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={`bg-transparent outline-none w-full border border-transparent hover:border-gray-300 focus:border-blue-500 px-1 py-0.5 text-xs ${className}`}
  />
);

const FormTextarea = ({ value, onChange, placeholder = '', className = '', rows = 3 }: any) => (
  <textarea
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    className={`bg-transparent outline-none w-full border border-transparent hover:border-gray-300 focus:border-blue-500 px-1 py-0.5 text-xs resize-none ${className}`}
  />
);

export function ClientInvoicePrintForm({ open, onOpenChange, transaction, client, job }: Props) {
  const [data, setData] = useState<any>({});

  useEffect(() => {
    if (transaction && client && open) {
      const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      const d = new Date(transaction.date);
      const m = monthNames[d.getMonth()];
      const dayYear = `${d.getDate()}, ${d.getFullYear()}`;
      const invNo = transaction.blNumber || job?.blNumber || `INV-${Math.floor(Math.random() * 100000)}`;

      let desc = transaction.description || 'Product';
      let variety = transaction.variety || job?.products?.[0]?.variety || '';
      if (variety) desc += ` - ${variety}`;

      let amt = transaction.amount || 0;
      let qTon = transaction.weightInTons || 0;
      let pTon = transaction.pricePerTon || 0;
      
      const currency = transaction.currency || 'USD';
      
      const wholePart = Math.floor(amt);
      const textTotal = `${numberToWords(wholePart)} (${currency})`;

      setData({
        invoiceNo: invNo,
        dateDayYear: dayYear,
        dateMonth: m,
        
        toName: client.name || '',
        toAddress: client.address || '',
        toCountry: client.country || '',
        toVat: client.vat || '',
        toTel: client.phone || '',
        toEmail: client.email || '',

        itemDesc: desc,
        packing: 'CARTON BOX',
        qTon: qTon,
        pTon: pTon,
        total: amt,
        
        caliber: transaction.caliber || job?.products?.[0]?.caliber || '',
        fcl: transaction.blNumber || job?.blNumber || '1 40 FT REEFER',
        
        netWtPallets: '20 PALLETS',
        netWtBoxes: '3000 CARTON BOX',
        netWtTons: qTon,
        gwWt: qTon ? (Number(qTon) + 1.5).toFixed(3) : '',
        
        totalText: textTotal,
        currency: currency,

        remarks: `INCOTERMS : ${transaction.incoterm || job?.incoterm || 'FOB'}\nPayment is AGAINST INVOICE AND DOCUMENTS.\n`,
        bankDetails: `BANK NAME: \nACCOUNT NUMBER:\nIBAN:\nSWIFT CODE:\nMODERN ENTERPRISE FOR BUSINESS AND SUPPLIES REG NO:`
      });
    }
  }, [transaction, client, job, open]);

  const updateField = (field: string, value: string) => {
    setData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups for this site to print.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${data.invoiceNo}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { 
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
              margin: 0; 
              padding: 0; 
              color: #000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              font-size: 11px;
            }
            .container {
              width: 100%;
              max-width: 210mm;
              margin: 0 auto;
              box-sizing: border-box;
            }
            
            /* Header */
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              background-color: #fefce8; /* Light yellow tint similar to image */
              padding: 15px 20px;
              margin-bottom: 20px;
            }
            .h-left { width: 30%; font-weight: bold; }
            .h-left .m-blue { color: #1e3a8a; font-size: 16px; }
            .h-left .m-black { color: #000; font-size: 14px; }
            .h-left .m-link { color: #555; font-size: 10px; font-weight: normal; margin-top: 4px; }
            
            .h-center { width: 40%; text-align: center; }
            .h-center img { width: 70px; height: 70px; border-radius: 50%; object-fit: contain; }
            
            .h-right { width: 30%; text-align: right; font-size: 9px; color: #1e3a8a; font-weight: bold; line-height: 1.4; }
            
            /* Inv Info */
            .inv-info {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              margin-bottom: 10px;
              padding: 0 10px;
              font-size: 12px;
            }
            
            /* To Box */
            .to-box {
              border: 2px solid #000;
              padding: 10px;
              margin-bottom: 20px;
              font-weight: bold;
              line-height: 1.5;
              font-size: 11px;
            }
            .to-box .email { color: #2563eb; text-decoration: underline; }
            
            /* Table */
            table {
              width: 100%;
              border-collapse: collapse;
              border: 2px solid #000;
              margin-bottom: 20px;
              text-align: center;
              font-weight: bold;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #000;
              padding: 6px;
            }
            th { border-bottom: 2px solid #000; }
            
            .row-1 td { padding-top: 10px; padding-bottom: 10px; }
            
            /* Remarks & Bank */
            .info-box {
              border: 2px solid #000;
              padding: 8px 10px;
              margin-bottom: 15px;
              font-weight: bold;
              font-size: 10px;
              line-height: 1.4;
            }
            .info-box p { margin: 2px 0; }
            
            /* Signature */
            .signature-area {
              display: flex;
              justify-content: flex-end;
              align-items: center;
              margin-top: 30px;
              padding-right: 50px;
              font-weight: bold;
            }
            .signature-area img {
              width: 150px;
              height: auto;
              margin-left: 10px;
              opacity: 0.8;
            }
          </style>
        </head>
        <body onload="window.print();">
          <div class="container">
            
            <div class="header">
              <div class="h-left">
                <div class="m-blue">Modern Enterprise</div>
                <div class="m-black">For Business & Supplies</div>
                <div class="m-link">www.modernsupplyeg.com</div>
              </div>
              <div class="h-center">
                <img src="https://i.postimg.cc/N0VY5rgN/logo-for-blal.jpg" alt="Logo" onerror="this.style.display='none'" />
              </div>
              <div class="h-right">
                8 Ibn EL GARAH St.<br/>
                Alexandria EGYPT<br/>
                MOHAMED SALEM<br/>
                Tel: (+2)03 541 6446 - (+2) 0100 333 5024<br/>
                GLN:6224011185004
              </div>
            </div>

            <div class="inv-info">
              <div>
                <div>INVOICE: ${data.invoiceNo}</div>
                <div>${data.dateDayYear}</div>
              </div>
              <div>${data.dateMonth}</div>
            </div>

            <div class="to-box">
              TO: ${data.toName}<br/>
              ${data.toAddress}<br/>
              ${data.toCountry}<br/>
              N.I.F. / VAT: ${data.toVat}<br/>
              TEL , ${data.toTel}<br/>
              E MAIL : <span class="email">${data.toEmail}</span>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 8%;"></th>
                  <th style="width: 30%;">ITEM DESCRIPTION</th>
                  <th style="width: 20%;">PACKING</th>
                  <th style="width: 12%;">Q / TON</th>
                  <th style="width: 15%;">PRICE / TON</th>
                  <th style="width: 15%;">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr class="row-1">
                  <td>1-</td>
                  <td>${data.itemDesc}</td>
                  <td>${data.packing}</td>
                  <td>${data.qTon}</td>
                  <td>${data.pTon} ${data.currency}</td>
                  <td>${data.total}</td>
                </tr>
                <tr>
                  <td>Caliber</td>
                  <td>${data.caliber}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td>FCL</td>
                  <td>${data.fcl}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td>NET.WT</td>
                  <td>${data.netWtPallets}</td>
                  <td>${data.netWtBoxes}</td>
                  <td>${data.netWtTons}</td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td>GW. WT</td>
                  <td></td>
                  <td></td>
                  <td>${data.gwWt}</td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td colspan="5" style="text-align: left; padding-left: 20px;">TOTAL</td>
                  <td>${data.total} ${data.currency}</td>
                </tr>
                <tr>
                  <td colspan="6" style="padding: 10px; font-size: 12px; letter-spacing: 1px;">
                    ${data.totalText}
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="info-box">
              <div style="text-decoration: underline; margin-bottom: 5px;">REMARKS:</div>
              <div style="white-space: pre-wrap;">${data.remarks}</div>
            </div>

            <div class="info-box">
              <div style="text-decoration: underline; margin-bottom: 5px;">BANK DETAILS:</div>
              <div style="white-space: pre-wrap;">${data.bankDetails}</div>
            </div>

            <div class="signature-area">
              Signature : 
              <img src="https://i.postimg.cc/ZKHfzH4g/modern-company-signature.png" alt="Stamp" style="width: 180px; margin-left: 15px; object-fit: contain;" />
            </div>

          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!transaction) return null;



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] w-full max-h-[95vh] overflow-y-auto p-0 bg-gray-100">
        <div className="sticky top-0 z-10 flex justify-between items-center p-4 bg-white border-b shadow-sm">
          <h2 className="text-lg font-bold">Printable Client Invoice</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}><X className="h-4 w-4 mr-2" /> Cancel</Button>
            <Button onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print / Export PDF</Button>
          </div>
        </div>

        <div className="p-8 mx-auto my-4 bg-white shadow-md border border-gray-200 text-black font-bold text-xs font-sans" style={{ width: '210mm', minHeight: '297mm' }}>
          
          <div className="flex items-center justify-between bg-yellow-50/50 p-4 mb-4 border-b">
            <div className="w-1/3 font-bold">
              <div className="text-blue-900 text-base">Modern Enterprise</div>
              <div className="text-black text-sm">For Business & Supplies</div>
              <div className="text-gray-600 text-[10px] font-normal mt-1">www.modernsupplyeg.com</div>
            </div>
            <div className="w-1/3 flex justify-center">
              <img src="https://i.postimg.cc/N0VY5rgN/logo-for-blal.jpg" alt="Logo" className="w-16 h-16 rounded-full object-contain" />
            </div>
            <div className="w-1/3 text-right text-[9px] text-blue-900 font-bold leading-relaxed">
              8 Ibn EL GARAH St.<br/>
              Alexandria EGYPT<br/>
              MOHAMED SALEM<br/>
              Tel: (+2)03 541 6446 - (+2) 0100 333 5024<br/>
              GLN:6224011185004
            </div>
          </div>

          <div className="flex justify-between px-2 mb-4">
            <div className="flex items-center gap-2">
              <span>INVOICE:</span>
              <FormInput value={data.invoiceNo} onChange={(v: string) => updateField('invoiceNo', v)} className="w-32" />
            </div>
            <div className="flex items-center gap-2">
              <FormInput value={data.dateDayYear} onChange={(v: string) => updateField('dateDayYear', v)} className="w-24 text-center" />
              <FormInput value={data.dateMonth} onChange={(v: string) => updateField('dateMonth', v)} className="w-16 text-center" />
            </div>
          </div>

          <div className="border-2 border-black p-3 mb-4 space-y-1">
            <div className="flex items-center gap-2"><span>TO:</span><FormInput value={data.toName} onChange={(v: string) => updateField('toName', v)} /></div>
            <FormInput value={data.toAddress} onChange={(v: string) => updateField('toAddress', v)} />
            <FormInput value={data.toCountry} onChange={(v: string) => updateField('toCountry', v)} />
            <div className="flex items-center gap-2"><span>N.I.F. / VAT:</span><FormInput value={data.toVat} onChange={(v: string) => updateField('toVat', v)} /></div>
            <div className="flex items-center gap-2"><span>TEL ,</span><FormInput value={data.toTel} onChange={(v: string) => updateField('toTel', v)} /></div>
            <div className="flex items-center gap-2"><span>E MAIL :</span><FormInput value={data.toEmail} onChange={(v: string) => updateField('toEmail', v)} className="text-blue-600 underline" /></div>
          </div>

          <table className="w-full border-collapse border-2 border-black text-center mb-4">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="border border-black p-1 w-[8%]"></th>
                <th className="border border-black p-1 w-[30%]">ITEM DESCRIPTION</th>
                <th className="border border-black p-1 w-[20%]">PACKING</th>
                <th className="border border-black p-1 w-[12%]">Q / TON</th>
                <th className="border border-black p-1 w-[15%]">PRICE / TON</th>
                <th className="border border-black p-1 w-[15%]">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1">1-</td>
                <td className="border border-black p-1"><FormInput value={data.itemDesc} onChange={(v: string) => updateField('itemDesc', v)} className="text-center" /></td>
                <td className="border border-black p-1"><FormInput value={data.packing} onChange={(v: string) => updateField('packing', v)} className="text-center" /></td>
                <td className="border border-black p-1"><FormInput value={data.qTon} onChange={(v: string) => updateField('qTon', v)} className="text-center" /></td>
                <td className="border border-black p-1"><div className="flex items-center justify-center gap-1"><FormInput value={data.pTon} onChange={(v: string) => updateField('pTon', v)} className="text-center w-16" /><span>{data.currency}</span></div></td>
                <td className="border border-black p-1"><FormInput value={data.total} onChange={(v: string) => updateField('total', v)} className="text-center" /></td>
              </tr>
              <tr>
                <td className="border border-black p-1">Caliber</td>
                <td className="border border-black p-1"><FormInput value={data.caliber} onChange={(v: string) => updateField('caliber', v)} className="text-center" /></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
              </tr>
              <tr>
                <td className="border border-black p-1">FCL</td>
                <td className="border border-black p-1"><FormInput value={data.fcl} onChange={(v: string) => updateField('fcl', v)} className="text-center" /></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
              </tr>
              <tr>
                <td className="border border-black p-1">NET.WT</td>
                <td className="border border-black p-1"><FormInput value={data.netWtPallets} onChange={(v: string) => updateField('netWtPallets', v)} className="text-center" /></td>
                <td className="border border-black p-1"><FormInput value={data.netWtBoxes} onChange={(v: string) => updateField('netWtBoxes', v)} className="text-center" /></td>
                <td className="border border-black p-1"><FormInput value={data.netWtTons} onChange={(v: string) => updateField('netWtTons', v)} className="text-center" /></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
              </tr>
              <tr>
                <td className="border border-black p-1">GW. WT</td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"><FormInput value={data.gwWt} onChange={(v: string) => updateField('gwWt', v)} className="text-center" /></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
              </tr>
              <tr>
                <td colSpan={5} className="border border-black p-2 text-left pl-4">TOTAL</td>
                <td className="border border-black p-2"><div className="flex justify-center gap-1"><span>{data.total}</span><span>{data.currency}</span></div></td>
              </tr>
              <tr>
                <td colSpan={6} className="border border-black p-2">
                  <FormInput value={data.totalText} onChange={(v: string) => updateField('totalText', v)} className="text-center uppercase tracking-wide" />
                </td>
              </tr>
            </tbody>
          </table>

          <div className="border-2 border-black p-2 mb-4">
            <div className="underline mb-1">REMARKS:</div>
            <FormTextarea value={data.remarks} onChange={(v: string) => updateField('remarks', v)} />
          </div>

          <div className="border-2 border-black p-2 mb-8">
            <div className="underline mb-1">BANK DETAILS:</div>
            <FormTextarea value={data.bankDetails} onChange={(v: string) => updateField('bankDetails', v)} rows={7} />
          </div>

          <div className="flex justify-end items-center pr-12">
            <span>Signature :</span>
            <img src="https://i.postimg.cc/ZKHfzH4g/modern-company-signature.png" alt="Stamp" className="w-48 h-auto ml-4 object-contain opacity-90" />
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
