import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { read, utils } from 'xlsx';

export function FileViewer({ fileUrl, onClose }: { fileUrl: string | null, onClose: () => void }) {
  const [excelData, setExcelData] = useState<any[][] | null>(null);

  useEffect(() => {
    if (!fileUrl) {
      setExcelData(null);
      return;
    }

    if (fileUrl.startsWith('data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') || 
        fileUrl.startsWith('data:application/vnd.ms-excel') || 
        fileUrl.startsWith('data:text/csv')) {
      
      const loadExcel = async () => {
        try {
          const response = await fetch(fileUrl);
          const arrayBuffer = await response.arrayBuffer();
          const wb = read(arrayBuffer, { type: 'array' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = utils.sheet_to_json(ws, { header: 1 });
          setExcelData(data as any[][]);
        } catch (err) {
          console.error("Failed to parse excel:", err);
        }
      };
      loadExcel();
    } else {
      setExcelData(null);
    }
  }, [fileUrl]);

  return (
    <Dialog open={!!fileUrl} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>View Attachment</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-muted/20 border rounded-lg flex flex-col mt-2 relative">
          {!fileUrl ? null : 
            excelData ? (
              <div className="p-4 w-full h-full overflow-auto inline-block">
                <table className="w-full text-sm text-left border-collapse">
                  <tbody>
                    {excelData.map((row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/10">
                        {row.map((cell, j) => (
                          <td key={j} className={`px-4 py-2 border-r last:border-0 ${i === 0 ? 'font-bold bg-muted/50' : ''}`}>
                            {cell !== undefined && cell !== null ? String(cell) : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) :
            (fileUrl.startsWith('data:application/pdf') || fileUrl.endsWith('.pdf')) ? (
            <iframe src={fileUrl} className="w-full h-full border-0 absolute inset-0" title="PDF Attachment" />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-2">
              <img src={fileUrl} alt="Attachment" className="max-w-full max-h-full object-contain" />
            </div>
          )}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
