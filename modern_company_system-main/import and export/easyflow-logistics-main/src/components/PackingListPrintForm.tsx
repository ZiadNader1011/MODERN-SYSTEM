import { useState, useRef, useEffect } from 'react';
import { StandalonePackingList } from '@/data/store';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packingList: StandalonePackingList | null;
}
// Render a minimal input that blends into the form
const FormInput = ({ value, onChange, placeholder = '', className = '' }: any) => (
  <input
    type="text"
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={`bg-transparent outline-none w-full border-b border-gray-300 hover:border-gray-400 focus:border-blue-500 py-1 text-sm ${className}`}
  />
);

export function PackingListPrintForm({ open, onOpenChange, packingList }: Props) {
  const [data, setData] = useState<any>({});

  useEffect(() => {
    if (packingList && open) {
      setData({
        companyName: 'Modern enterprise for business and supplies',
        companyAddress: '',
        companyPhone: '',
        companyEmail: '',
        companyWeb: '',

        plNo: packingList.blNumber || '',
        date: packingList.date || '',
        invoiceNo: packingList.invoiceNumber || '',
        invoiceDate: packingList.date || '',
        countryOfOrigin: '',

        exporterName: '',
        exporterAddress: '',
        exporterPhone: '',
        exporterEmail: '',

        consigneeName: packingList.clientName || '',
        consigneeAddress: '',
        consigneePhone: '',
        consigneeEmail: '',

        modeOfTransport: 'Sea Freight',
        vesselVoyage: '',
        portOfLoading: packingList.pol || '',
        portOfDischarge: packingList.pod || '',
        containerNo: packingList.containerNumbers?.join(', ') || packingList.containerNumber || '',
        sealNo: '',
        shippingDate: packingList.shippingDate || '',
        finalDestination: packingList.finalDestination || '',

        products: (packingList.products?.length ? packingList.products : [{
          productName: packingList.productName,
          variety: packingList.variety,
          grade: packingList.grade,
          caliber: packingList.caliber,
          packagesQtyKind: packingList.packagesQtyKind,
          numberOfPackages: packingList.numberOfPackages,
          netWeight: packingList.netWeight,
          grossWeight: packingList.grossWeight,
        }]).map(p => ({ ...p })),

        totalPackages: '',
        totalNetWeight: '',
        totalGrossWeight: '',

        remarks: packingList.note || '',

        preparedByName: '',
        preparedByPosition: '',
        preparedBySignature: '',
        preparedByDate: new Date().toISOString().split('T')[0],
      });
    }
  }, [packingList, open]);

  const updateField = (field: string, value: string) => {
    setData((prev: any) => ({ ...prev, [field]: value }));
  };

  const updateProduct = (index: number, field: string, value: string) => {
    setData((prev: any) => {
      const newProducts = [...(prev.products || [])];
      newProducts[index] = { ...newProducts[index], [field]: value };
      return { ...prev, products: newProducts };
    });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups for this site to print.");
      return;
    }

    // Generate the table rows
    let rowsHtml = '';
    (data.products || []).forEach((p: any, i: number) => {
      rowsHtml += `
        <tr>
          <td>${i + 1}</td>
          <td>${p.productName || ''}</td>
          <td>${p.variety || ''}</td>
          <td>${p.grade || ''}</td>
          <td>${p.caliber || ''}</td>
          <td>${p.packagesQtyKind || ''}</td>
          <td>${p.numberOfPackages || ''}</td>
          <td>${p.netWeight || ''}</td>
          <td>${p.grossWeight || ''}</td>
        </tr>
      `;
    });

    // Fill padding rows to make it look full
    const emptyRows = Math.max(0, 5 - (data.products?.length || 0));
    for (let i = 0; i < emptyRows; i++) {
      rowsHtml += `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Packing List - ${data.plNo || 'Export'}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0; 
              color: #333;
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
            .header-wrap { display: flex; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 15px; }
            .header-left { flex: 1; padding-right: 15px; border-right: 2px solid #e5e7eb; }
            .header-right { flex: 1; padding-left: 15px; }
            .company-name { font-size: 20px; font-weight: bold; color: #1e3a8a; text-transform: uppercase; margin-bottom: 10px; display: flex; align-items: center; gap: 10px; }
            .logo-circle { width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(to top right, #fb923c, #3b82f6, #9333ea); display: flex; align-items: center; justify-content: center; padding: 2px;}
            .logo-inner { width: 100%; height: 100%; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #374151; }
            .contact-item { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; }
            .contact-icon { color: #1e3a8a; width: 20px; text-align: center; font-size: 14px; }
            .doc-title { font-size: 32px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 15px 0; }
            .meta-row { display: flex; margin-bottom: 4px; }
            .meta-label { width: 120px; color: #4b5563; }
            .meta-colon { width: 15px; }
            .meta-value { flex: 1; border-bottom: 1px solid #d1d5db; }
            
            /* Boxes */
            .boxes-row { display: flex; gap: 20px; margin-bottom: 15px; }
            .box { flex: 1; border: 1px solid #d1d5db; border-radius: 4px; overflow: hidden; }
            .box-title { background: #1e3a8a; color: white; padding: 5px 12px; font-weight: bold; font-size: 11px; letter-spacing: 1px; }
            .box-content { padding: 12px; }
            .box-item { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
            .box-icon { color: #1e3a8a; width: 16px; text-align: center; }
            .box-value { flex: 1; border-bottom: 1px solid #e5e7eb; padding-bottom: 2px; min-height: 14px; }
            
            /* Details */
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 30px; row-gap: 8px; }
            .detail-item { display: flex; align-items: center; }
            .detail-icon { color: #1e3a8a; width: 20px; font-size: 14px; }
            .detail-label { width: 120px; color: #374151; }
            .detail-value { flex: 1; border-bottom: 1px solid #e5e7eb; min-height: 14px; }
            
            /* Table */
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #d1d5db; border-radius: 4px; overflow: hidden; }
            th { background: #1e3a8a; color: white; padding: 8px 4px; font-weight: 500; font-size: 10px; border-right: 1px solid #9ca3af; }
            th:last-child { border-right: none; }
            td { padding: 6px 4px; text-align: center; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }
            td:last-child { border-right: none; }
            tfoot td { background: #f9fafb; font-weight: bold; border-top: 1px solid #d1d5db; border-bottom: none; padding: 10px 4px; }
            .text-right { text-align: right; padding-right: 10px; text-transform: uppercase; letter-spacing: 1px; }
            
            /* Footer */
            textarea { width: 100%; border: none; resize: none; font-family: inherit; font-size: inherit; outline: none; }
            .thank-you { text-align: center; color: #1e3a8a; font-style: italic; font-family: serif; margin-top: 20px; position: relative; padding-top: 10px; }
            .thank-you::before { content: ""; position: absolute; left: 0; right: 0; top: 0; border-top: 1px solid #d1d5db; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="container">
            <div class="header-wrap">
              <div class="header-left">
                <div class="company-name">
                  <img src="https://i.postimg.cc/N0VY5rgN/logo-for-blal.jpg" alt="Logo" style="width: 60px; height: 60px; object-fit: contain; margin-right: 12px; border-radius: 50%;" onerror="this.style.display='none'" />
                  MODERN ENTERPRISE FOR BUSINESS AND SUPPLIES
                </div>
                <div class="contact-item"><span class="contact-icon">📍</span><div class="meta-value">${data.companyAddress}</div></div>
                <div class="contact-item"><span class="contact-icon">📞</span><div class="meta-value">${data.companyPhone}</div></div>
                <div class="contact-item"><span class="contact-icon">✉️</span><div class="meta-value">${data.companyEmail}</div></div>
                <div class="contact-item"><span class="contact-icon">🌐</span><div class="meta-value">${data.companyWeb}</div></div>
              </div>
              <div class="header-right">
                <h1 class="doc-title">Packing List</h1>
                <div class="meta-row"><div class="meta-label">Packing List No.</div><div class="meta-colon">:</div><div class="meta-value">${data.plNo}</div></div>
                <div class="meta-row"><div class="meta-label">Date</div><div class="meta-colon">:</div><div class="meta-value">${data.date}</div></div>
                <div class="meta-row"><div class="meta-label">Invoice No.</div><div class="meta-colon">:</div><div class="meta-value">${data.invoiceNo}</div></div>
                <div class="meta-row"><div class="meta-label">Invoice Date</div><div class="meta-colon">:</div><div class="meta-value">${data.invoiceDate}</div></div>
                <div class="meta-row"><div class="meta-label">Country of Origin</div><div class="meta-colon">:</div><div class="meta-value">${data.countryOfOrigin}</div></div>
              </div>
            </div>

            <div class="boxes-row">
              <div class="box">
                <div class="box-title">EXPORTER / SHIPPER</div>
                <div class="box-content">
                  <div class="box-item"><span class="box-icon">👤</span><div class="box-value">${data.exporterName}</div></div>
                  <div class="box-item"><span class="box-icon">📍</span><div class="box-value">${data.exporterAddress}</div></div>
                  <div class="box-item"><span class="box-icon">📞</span><div class="box-value">${data.exporterPhone}</div></div>
                  <div class="box-item"><span class="box-icon">✉️</span><div class="box-value">${data.exporterEmail}</div></div>
                </div>
              </div>
              <div class="box">
                <div class="box-title">CONSIGNEE / IMPORTER</div>
                <div class="box-content">
                  <div class="box-item"><span class="box-icon">👤</span><div class="box-value">${data.consigneeName}</div></div>
                  <div class="box-item"><span class="box-icon">📍</span><div class="box-value">${data.consigneeAddress}</div></div>
                  <div class="box-item"><span class="box-icon">📞</span><div class="box-value">${data.consigneePhone}</div></div>
                  <div class="box-item"><span class="box-icon">✉️</span><div class="box-value">${data.consigneeEmail}</div></div>
                </div>
              </div>
            </div>

            <div class="box" style="margin-bottom: 15px;">
              <div class="box-title">SHIPMENT DETAILS</div>
              <div class="box-content details-grid">
                <div class="detail-item"><span class="detail-icon"></span><div class="detail-label">Mode of Transport</div><div class="meta-colon">:</div><div class="detail-value">${data.modeOfTransport}</div></div>
                <div class="detail-item"><span class="detail-icon"></span><div class="detail-label">Container No.</div><div class="meta-colon">:</div><div class="detail-value">${data.containerNo}</div></div>
                <div class="detail-item"><span class="detail-icon"></span><div class="detail-label">Vessel / Voyage</div><div class="meta-colon">:</div><div class="detail-value">${data.vesselVoyage}</div></div>

                <div class="detail-item"><span class="detail-icon"></span><div class="detail-label">Port of Loading</div><div class="meta-colon">:</div><div class="detail-value">${data.portOfLoading}</div></div>
                <div class="detail-item"><span class="detail-icon"></span><div class="detail-label">Shipping Date</div><div class="meta-colon">:</div><div class="detail-value">${data.shippingDate}</div></div>
                <div class="detail-item"><span class="detail-icon"></span><div class="detail-label">Port of Discharge</div><div class="meta-colon">:</div><div class="detail-value">${data.portOfDischarge}</div></div>
                <div class="detail-item"><span class="detail-icon"></span><div class="detail-label">Final Destination</div><div class="meta-colon">:</div><div class="detail-value">${data.finalDestination}</div></div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Item No.</th><th>Description of Goods</th><th>Variety</th><th>Class / Quality</th>
                  <th>Size</th><th>Packing</th><th>Number of<br/>Packages</th><th>Net Weight<br/>(KG)</th><th>Gross Weight<br/>(KG)</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="6" class="text-right">TOTAL</td>
                  <td>${data.totalPackages}</td>
                  <td>${data.totalNetWeight}</td>
                  <td>${data.totalGrossWeight}</td>
                </tr>
              </tfoot>
            </table>

            <div class="boxes-row" style="margin-bottom: 15px;">
              <div class="box" style="flex: 1.2;">
                <div class="box-title">TOTALS SUMMARY</div>
                <div class="box-content">
                  <div class="detail-item" style="margin-bottom: 8px;"><div class="detail-label" style="width: 160px;">Total Number of Packages</div><div class="meta-colon">:</div><div class="detail-value">${data.totalPackages}</div></div>
                  <div class="detail-item" style="margin-bottom: 8px;"><div class="detail-label" style="width: 160px;">Total Net Weight</div><div class="meta-colon">:</div><div class="detail-value" style="text-align: right; padding-right: 5px;">${data.totalNetWeight}</div><span style="font-size:10px; color:#6b7280;">KG</span></div>
                  <div class="detail-item"><div class="detail-label" style="width: 160px;">Total Gross Weight</div><div class="meta-colon">:</div><div class="detail-value" style="text-align: right; padding-right: 5px;">${data.totalGrossWeight}</div><span style="font-size:10px; color:#6b7280;">KG</span></div>
                </div>
              </div>
              <div class="box" style="flex: 1;">
                <div class="box-title">REMARKS</div>
                <div class="box-content">
                  <div>${data.remarks.replace(/\\n/g, '<br/>') || '&nbsp;'}</div>
                </div>
              </div>
            </div>

            <div class="boxes-row">
              <div style="flex: 1;">
                <!-- Prepared By section removed as requested -->
              </div>
              <div class="box">
                <div class="box-title">COMPANY STAMP & SIGNATURE</div>
                <div class="box-content" style="height: 100px;">
                </div>
              </div>
            </div>

            <div class="thank-you">Thank you for your business!</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!packingList) return null;


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] w-full max-h-[95vh] overflow-y-auto p-0 bg-gray-100">
        <div className="sticky top-0 z-10 flex justify-between items-center p-4 bg-white border-b shadow-sm">
          <h2 className="text-lg font-bold">Printable Packing List</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}><X className="h-4 w-4 mr-2" /> Cancel</Button>
            <Button onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print / Export PDF</Button>
          </div>
        </div>

        {/* The A4 Document Area */}
        <div className="p-8 mx-auto my-4 bg-white shadow-md" style={{ width: '210mm', minHeight: '297mm' }}>

          {/* Header */}
          <div className="flex border-b-2 border-gray-200 pb-6 mb-6">
            <div className="flex-1 pr-6 border-r-2 border-gray-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full shrink-0 flex items-center justify-center overflow-hidden bg-gray-50 border">
                  <img src="https://i.postimg.cc/N0VY5rgN/logo-for-blal.jpg" alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
                <div className="text-xl font-bold text-blue-900 uppercase leading-tight">
                  Modern enterprise for business and supplies
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3"><span className="text-blue-900 text-lg w-5 text-center">📍</span><FormInput value={data.companyAddress} onChange={(v: string) => updateField('companyAddress', v)} /></div>
                <div className="flex items-center gap-3"><span className="text-blue-900 text-lg w-5 text-center">📞</span><FormInput value={data.companyPhone} onChange={(v: string) => updateField('companyPhone', v)} /></div>
                <div className="flex items-center gap-3"><span className="text-blue-900 text-lg w-5 text-center">✉️</span><FormInput value={data.companyEmail} onChange={(v: string) => updateField('companyEmail', v)} /></div>
                <div className="flex items-center gap-3"><span className="text-blue-900 text-lg w-5 text-center">🌐</span><FormInput value={data.companyWeb} onChange={(v: string) => updateField('companyWeb', v)} /></div>
              </div>
            </div>
            <div className="flex-1 pl-6">
              <h1 className="text-4xl font-black text-blue-900 mb-6 uppercase tracking-wider">Packing List</h1>
              <div className="space-y-2 text-sm">
                <div className="flex"><span className="w-32 text-gray-600">Packing List No.</span><span className="w-4">:</span><div className="flex-1"><FormInput value={data.plNo} onChange={(v: string) => updateField('plNo', v)} /></div></div>
                <div className="flex"><span className="w-32 text-gray-600">Date</span><span className="w-4">:</span><div className="flex-1"><FormInput value={data.date} onChange={(v: string) => updateField('date', v)} /></div></div>
                <div className="flex"><span className="w-32 text-gray-600">Invoice No.</span><span className="w-4">:</span><div className="flex-1"><FormInput value={data.invoiceNo} onChange={(v: string) => updateField('invoiceNo', v)} /></div></div>
                <div className="flex"><span className="w-32 text-gray-600">Invoice Date</span><span className="w-4">:</span><div className="flex-1"><FormInput value={data.invoiceDate} onChange={(v: string) => updateField('invoiceDate', v)} /></div></div>
                <div className="flex"><span className="w-32 text-gray-600">Country of Origin</span><span className="w-4">:</span><div className="flex-1"><FormInput value={data.countryOfOrigin} onChange={(v: string) => updateField('countryOfOrigin', v)} /></div></div>
              </div>
            </div>
          </div>

          {/* Exporter & Consignee */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="border border-gray-300 rounded overflow-hidden">
              <div className="bg-blue-900 text-white px-4 py-1.5 font-bold text-sm tracking-wide">EXPORTER / SHIPPER</div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3"><span className="text-blue-900 w-5 text-center">👤</span><FormInput value={data.exporterName} onChange={(v: string) => updateField('exporterName', v)} /></div>
                <div className="flex items-center gap-3"><span className="text-blue-900 w-5 text-center">📍</span><FormInput value={data.exporterAddress} onChange={(v: string) => updateField('exporterAddress', v)} /></div>
                <div className="flex items-center gap-3"><span className="text-blue-900 w-5 text-center">📞</span><FormInput value={data.exporterPhone} onChange={(v: string) => updateField('exporterPhone', v)} /></div>
                <div className="flex items-center gap-3"><span className="text-blue-900 w-5 text-center">✉️</span><FormInput value={data.exporterEmail} onChange={(v: string) => updateField('exporterEmail', v)} /></div>
              </div>
            </div>
            <div className="border border-gray-300 rounded overflow-hidden">
              <div className="bg-blue-900 text-white px-4 py-1.5 font-bold text-sm tracking-wide">CONSIGNEE / IMPORTER</div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3"><span className="text-blue-900 w-5 text-center">👤</span><FormInput value={data.consigneeName} onChange={(v: string) => updateField('consigneeName', v)} /></div>
                <div className="flex items-center gap-3"><span className="text-blue-900 w-5 text-center">📍</span><FormInput value={data.consigneeAddress} onChange={(v: string) => updateField('consigneeAddress', v)} /></div>
                <div className="flex items-center gap-3"><span className="text-blue-900 w-5 text-center">📞</span><FormInput value={data.consigneePhone} onChange={(v: string) => updateField('consigneePhone', v)} /></div>
                <div className="flex items-center gap-3"><span className="text-blue-900 w-5 text-center">✉️</span><FormInput value={data.consigneeEmail} onChange={(v: string) => updateField('consigneeEmail', v)} /></div>
              </div>
            </div>
          </div>

          {/* Shipment Details */}
          <div className="border border-gray-300 rounded overflow-hidden mb-6">
            <div className="bg-blue-900 text-white px-4 py-1.5 font-bold text-sm tracking-wide">SHIPMENT DETAILS</div>
            <div className="p-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div className="flex items-center"><span className="text-blue-900 w-6 text-xl"></span><span className="w-32 text-gray-700">Mode of Transport</span><span className="w-4">:</span><div className="flex-1"><FormInput value={data.modeOfTransport} onChange={(v: string) => updateField('modeOfTransport', v)} /></div></div>
              <div className="flex items-center"><span className="text-blue-900 w-6 text-xl"></span><span className="w-32 text-gray-700">Container No.</span><span className="w-4">:</span><div className="flex-1"><FormInput value={data.containerNo} onChange={(v: string) => updateField('containerNo', v)} /></div></div>
              <div className="flex items-center"><span className="text-blue-900 w-6 text-xl"></span><span className="w-32 text-gray-700">Vessel / Voyage</span><span className="w-4">:</span><div className="flex-1"><FormInput value={data.vesselVoyage} onChange={(v: string) => updateField('vesselVoyage', v)} /></div></div>

              <div className="flex items-center"><span className="text-blue-900 w-6 text-xl"></span><span className="w-32 text-gray-700">Port of Loading</span><span className="w-4">:</span><div className="flex-1"><FormInput value={data.portOfLoading} onChange={(v: string) => updateField('portOfLoading', v)} /></div></div>
              <div className="flex items-center"><span className="text-blue-900 w-6 text-xl"></span><span className="w-32 text-gray-700">Shipping Date</span><span className="w-4">:</span><div className="flex-1"><FormInput value={data.shippingDate} onChange={(v: string) => updateField('shippingDate', v)} /></div></div>
              <div className="flex items-center"><span className="text-blue-900 w-6 text-xl"></span><span className="w-32 text-gray-700">Port of Discharge</span><span className="w-4">:</span><div className="flex-1"><FormInput value={data.portOfDischarge} onChange={(v: string) => updateField('portOfDischarge', v)} /></div></div>
              <div className="flex items-center"><span className="text-blue-900 w-6 text-xl"> </span><span className="w-32 text-gray-700">Final Destination</span><span className="w-4">:</span><div className="flex-1"><FormInput value={data.finalDestination} onChange={(v: string) => updateField('finalDestination', v)} /></div></div>
            </div>
          </div>

          {/* Table */}
          <div className="border border-gray-300 rounded overflow-hidden mb-6">
            <table className="w-full text-sm text-center border-collapse">
              <thead className="bg-blue-900 text-white text-xs tracking-wider">
                <tr>
                  <th className="py-2 px-1 border-r border-gray-400 font-medium">Item No.</th>
                  <th className="py-2 px-1 border-r border-gray-400 font-medium">Description of Goods</th>
                  <th className="py-2 px-1 border-r border-gray-400 font-medium">Variety</th>
                  <th className="py-2 px-1 border-r border-gray-400 font-medium">Class / Quality</th>
                  <th className="py-2 px-1 border-r border-gray-400 font-medium">Size</th>
                  <th className="py-2 px-1 border-r border-gray-400 font-medium">Packing</th>
                  <th className="py-2 px-1 border-r border-gray-400 font-medium">Number of<br />Packages</th>
                  <th className="py-2 px-1 border-r border-gray-400 font-medium">Net Weight<br />(KG)</th>
                  <th className="py-2 px-1 font-medium">Gross Weight<br />(KG)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(data.products || []).map((p: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50 print:hover:bg-transparent">
                    <td className="p-1 border-r border-gray-200"><FormInput className="text-center" value={String(i + 1)} onChange={() => { }} /></td>
                    <td className="p-1 border-r border-gray-200"><FormInput className="text-center" value={p.productName} onChange={(v: string) => updateProduct(i, 'productName', v)} /></td>
                    <td className="p-1 border-r border-gray-200"><FormInput className="text-center" value={p.variety} onChange={(v: string) => updateProduct(i, 'variety', v)} /></td>
                    <td className="p-1 border-r border-gray-200"><FormInput className="text-center" value={p.grade} onChange={(v: string) => updateProduct(i, 'grade', v)} /></td>
                    <td className="p-1 border-r border-gray-200"><FormInput className="text-center" value={p.caliber} onChange={(v: string) => updateProduct(i, 'caliber', v)} /></td>
                    <td className="p-1 border-r border-gray-200"><FormInput className="text-center" value={p.packagesQtyKind} onChange={(v: string) => updateProduct(i, 'packagesQtyKind', v)} /></td>
                    <td className="p-1 border-r border-gray-200"><FormInput className="text-center" value={p.numberOfPackages} onChange={(v: string) => updateProduct(i, 'numberOfPackages', v)} /></td>
                    <td className="p-1 border-r border-gray-200"><FormInput className="text-center" value={p.netWeight} onChange={(v: string) => updateProduct(i, 'netWeight', v)} /></td>
                    <td className="p-1"><FormInput className="text-center" value={p.grossWeight} onChange={(v: string) => updateProduct(i, 'grossWeight', v)} /></td>
                  </tr>
                ))}
                {/* Empty rows for padding if needed, simplified for dynamic data */}
                {Array.from({ length: Math.max(0, 5 - (data.products?.length || 0)) }).map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td className="p-1 border-r border-gray-200"><FormInput className="text-center border-none" value="" onChange={() => { }} /></td>
                    <td className="p-1 border-r border-gray-200"><FormInput className="text-center border-none" value="" onChange={() => { }} /></td>
                    <td className="p-1 border-r border-gray-200"><FormInput className="text-center border-none" value="" onChange={() => { }} /></td>
                    <td className="p-1 border-r border-gray-200"><FormInput className="text-center border-none" value="" onChange={() => { }} /></td>
                    <td className="p-1 border-r border-gray-200"><FormInput className="text-center border-none" value="" onChange={() => { }} /></td>
                    <td className="p-1 border-r border-gray-200"><FormInput className="text-center border-none" value="" onChange={() => { }} /></td>
                    <td className="p-1 border-r border-gray-200"><FormInput className="text-center border-none" value="" onChange={() => { }} /></td>
                    <td className="p-1 border-r border-gray-200"><FormInput className="text-center border-none" value="" onChange={() => { }} /></td>
                    <td className="p-1"><FormInput className="text-center border-none" value="" onChange={() => { }} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-300 font-bold bg-gray-50 print:bg-transparent">
                <tr>
                  <td colSpan={6} className="py-3 px-2 text-center uppercase tracking-widest border-r border-gray-300">Total</td>
                  <td className="py-3 px-1 border-r border-gray-300">
                    <FormInput className="text-center font-bold" placeholder="TOTAL PACKAGES" value={data.totalPackages} onChange={(v: string) => updateField('totalPackages', v)} />
                  </td>
                  <td className="py-3 px-1 border-r border-gray-300">
                    <FormInput className="text-center font-bold" value={data.totalNetWeight} onChange={(v: string) => updateField('totalNetWeight', v)} />
                  </td>
                  <td className="py-3 px-1">
                    <FormInput className="text-center font-bold" value={data.totalGrossWeight} onChange={(v: string) => updateField('totalGrossWeight', v)} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Totals Summary & Remarks */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="border border-gray-300 rounded overflow-hidden flex flex-col">
              <div className="bg-gray-100 font-bold text-xs px-3 py-1.5 border-b border-gray-300 tracking-wide uppercase print:bg-transparent">Totals Summary</div>
              <div className="p-3 space-y-2 text-sm flex-1">
                <div className="flex items-center"><span className="w-40 text-gray-700">Total Number of Packages</span><span className="w-4">:</span><FormInput className="flex-1" value={data.totalPackages} onChange={(v: string) => updateField('totalPackages', v)} /></div>
                <div className="flex items-center"><span className="w-40 text-gray-700">Total Net Weight</span><span className="w-4">:</span><FormInput className="flex-1 text-right pr-2" value={data.totalNetWeight} onChange={(v: string) => updateField('totalNetWeight', v)} /> <span className="text-gray-500 text-xs">KG</span></div>
                <div className="flex items-center"><span className="w-40 text-gray-700">Total Gross Weight</span><span className="w-4">:</span><FormInput className="flex-1 text-right pr-2" value={data.totalGrossWeight} onChange={(v: string) => updateField('totalGrossWeight', v)} /> <span className="text-gray-500 text-xs">KG</span></div>
              </div>
            </div>
            <div className="border border-gray-300 rounded overflow-hidden flex flex-col">
              <div className="bg-gray-100 font-bold text-xs px-3 py-1.5 border-b border-gray-300 tracking-wide uppercase print:bg-transparent">Remarks</div>
              <div className="p-3 flex-1 flex flex-col">
                <textarea
                  value={data.remarks}
                  onChange={(e) => updateField('remarks', e.target.value)}
                  className="w-full flex-1 bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 outline-none resize-none text-sm p-1"
                  placeholder="Enter remarks..."
                />
              </div>
            </div>
          </div>

          {/* Footer Signatures */}
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div className="flex flex-col">
              {/* Prepared By section removed as requested */}
            </div>
            <div className="border border-gray-300 rounded overflow-hidden flex flex-col">
              <div className="bg-gray-100 font-bold text-xs px-3 py-1.5 border-b border-gray-300 tracking-wide uppercase print:bg-transparent">Company Stamp & Signature</div>
              <div className="p-3 flex-1 flex items-center justify-center min-h-[100px]">
                {/* Empty area for stamp */}
              </div>
            </div>
          </div>

          <div className="text-center text-blue-900 font-serif italic border-t border-gray-300 pt-3 mt-4 flex items-center justify-center before:content-[''] before:flex-1 before:border-b before:border-gray-300 before:mr-4 after:content-[''] after:flex-1 after:border-b after:border-gray-300 after:ml-4">
            Thank you for your business!
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
