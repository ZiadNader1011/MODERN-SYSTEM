import { useState, useCallback, useRef } from 'react';
import { useTranslation } from '../../node_modules/react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { StatCard } from '@/components/StatCard';
import { getFiles, saveFiles, getJobs, generateId, UploadedFile, formatDate } from '@/data/store';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, Trash2, FileText, Image, File, Archive as ArchiveIcon, Filter, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { FileViewer } from '@/components/FileViewer';

const typeLabels: Record<string, string> = {
  bl: 'Bill of Lading',
  invoice: 'Invoice',
  image: 'Product Image',
  other: 'Other Document',
};

const typeIcons: Record<string, typeof FileText> = {
  bl: FileText,
  invoice: FileText,
  image: Image,
  other: File,
};

export default function ArchivePage() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<UploadedFile[]>(getFiles);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<UploadedFile | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [uploadType, setUploadType] = useState<string>('image');
  const [uploadJobId, setUploadJobId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jobs = getJobs();

  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const filteredFiles = filterType === 'all' ? files : files.filter(f => f.type === filterType);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    if (fileList.length > 5) {
      toast.error('You can only upload up to 5 files at a time to prevent memory issues.');
      return;
    }
    const newFiles: UploadedFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Max size is 5MB.`);
        continue;
      }
      const url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });
      newFiles.push({
        id: generateId(),
        name: file.name,
        type: uploadType as UploadedFile['type'],
        jobId: uploadJobId === 'none' ? '' : uploadJobId,
        url,
        uploadedAt: new Date().toISOString(),
      });
    }
    if (newFiles.length > 0) {
      const updated = [...files, ...newFiles];
      setFiles(updated);
      saveFiles(updated);
      toast.success(`${newFiles.length} file${newFiles.length > 1 ? 's' : ''} uploaded successfully! 🎉`);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = useCallback(() => {
    if (!deleting) return;
    const updated = files.filter(f => f.id !== deleting.id);
    setFiles(updated);
    saveFiles(updated);
    toast.success(`"${deleting.name}" has been removed.`);
    setDeleting(null);
  }, [deleting, files]);

  return (
    <div>
      <PageHeader title={t('Upload & Archive', 'Upload & Archive')} description={t('pages.archiveDescRoot', 'Upload, organize, and access all your documents, invoices, and images.')} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <StatCard title={t('Total Files', 'Total Files')} value={files.length} icon={ArchiveIcon} variant="info" />
        <StatCard title={t('Invoices', 'Invoices')} value={files.filter(f => f.type === 'invoice').length} icon={FileText} variant="warning" />
        <StatCard title={t('Images', 'Images')} value={files.filter(f => f.type === 'image').length} icon={Image} variant="success" />
      </div>

      {/* Upload area */}
      <div className="rounded-xl bg-card p-5 card-shadow mb-6">
        <h3 className="font-semibold text-foreground mb-3">{t('Upload New Files', 'Upload New Files')}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t('Select the file type and (optionally) link it to a job', 'Select the file type and (optionally) link it to a job, then choose your files.')}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label className="text-xs">{t('File Type', 'File Type')}</Label>
            <Select value={uploadType} onValueChange={setUploadType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bl">{t('Bill of Lading', 'Bill of Lading')}</SelectItem>
                <SelectItem value="invoice">{t('Invoice', 'Invoice')}</SelectItem>
                <SelectItem value="image">{t('Product Image', 'Product Image')}</SelectItem>
                <SelectItem value="other">{t('Other Document', 'Other Document')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="text-xs">{t('Link to Job (optional)', 'Link to Job (optional)')}</Label>
            <Select value={uploadJobId} onValueChange={setUploadJobId}>
              <SelectTrigger><SelectValue placeholder={t('No job linked', 'No job linked')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('No job linked', 'No job linked')}</SelectItem>
                {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" id="file-upload" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv" />
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> {t('Choose Files', 'Choose Files')}
            </Button>
          </div>
        </div>
      </div>

      {/* Filter and list */}
      <div className="flex items-center gap-3 mb-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Files', 'All Files')}</SelectItem>
            <SelectItem value="bl">{t('Bills of Lading', 'Bills of Lading')}</SelectItem>
            <SelectItem value="invoice">{t('Invoices', 'Invoices')}</SelectItem>
            <SelectItem value="image">{t('Images', 'Images')}</SelectItem>
            <SelectItem value="other">{t('Other', 'Other')}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredFiles.map(f => {
          const Icon = typeIcons[f.type] || File;
          const job = jobs.find(j => j.id === f.jobId);
          return (
            <div key={f.id} className="rounded-xl bg-card p-4 card-shadow flex items-start gap-3 hover:card-shadow-hover transition-shadow">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent">
                <Icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground">{typeLabels[f.type]}</p>
                {job && <p className="text-xs text-muted-foreground mt-0.5">Job: {job.title}</p>}
                <p className="text-xs text-muted-foreground">{formatDate(f.uploadedAt)}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => setViewingFile(f.url)} className="rounded-md p-1.5 hover:bg-primary/10 text-primary">
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { setDeleting(f); setDeleteOpen(true); }} className="rounded-md p-1.5 hover:bg-destructive/10 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredFiles.length === 0 && (
        <div className="rounded-xl border-2 border-dashed p-12 text-center">
          <ArchiveIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">No files found. Upload your first document above!</p>
        </div>
      )}

      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete} itemName={deleting?.name || ''} />

      <FileViewer fileUrl={viewingFile} onClose={() => setViewingFile(null)} />
    </div>
  );
}
