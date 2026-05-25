import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, FileSpreadsheet, UploadCloud, XCircle } from 'lucide-react';
import { useBulkImportUsers } from '@/hooks/useUserManagement';
import { downloadUsersImportTemplate, parseUsersCsv } from '@/lib/users-csv';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type BulkImportUsersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ImportResultState = {
  status: 'success' | 'failed';
  title: string;
  description: string;
  errors?: Array<{ email: string; message: string }>;
};

const BulkImportUsersDialog: React.FC<BulkImportUsersDialogProps> = ({ open, onOpenChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resultDialog, setResultDialog] = useState<ImportResultState | null>(null);
  const bulkImportMutation = useBulkImportUsers();

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setIsDragging(false);
    }
  }, [open]);

  const selectFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: 'Invalid file',
        description: 'Please select a CSV file.',
        variant: 'destructive',
      });
      return;
    }
    setSelectedFile(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) selectFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) selectFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const text = await selectedFile.text();
      const users = parseUsersCsv(text);
      const result = await bulkImportMutation.mutateAsync(users);

      onOpenChange(false);
      setSelectedFile(null);

      if (result.created > 0 && result.failed === 0) {
        setResultDialog({
          status: 'success',
          title: 'Upload Successful',
          description: `${result.created} user(s) imported successfully.`,
        });
        return;
      }

      if (result.created === 0) {
        setResultDialog({
          status: 'failed',
          title: 'Upload Failed',
          description: 'No users were imported. Please check your CSV and try again.',
          errors: result.errors,
        });
        return;
      }

      setResultDialog({
        status: 'failed',
        title: 'Upload Partially Failed',
        description: `${result.created} imported, ${result.failed} failed.`,
        errors: result.errors,
      });
    } catch (err) {
      onOpenChange(false);
      setSelectedFile(null);
      setResultDialog({
        status: 'failed',
        title: 'Upload Failed',
        description: (err as Error).message,
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
          <div className="border-b px-6 py-4">
            <DialogHeader className="space-y-0 text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                  <FileSpreadsheet className="h-5 w-5 text-orange-600" />
                </div>
                <DialogTitle className="text-xl font-semibold text-gray-900">Bulk Upload Users</DialogTitle>
              </div>
            </DialogHeader>
          </div>

          <div className="px-6 py-5">
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onClick={() => !bulkImportMutation.isPending && fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors',
                isDragging
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-gray-200 bg-slate-50/80 hover:border-orange-300 hover:bg-orange-50/60',
                bulkImportMutation.isPending && 'pointer-events-none opacity-60',
              )}
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                <UploadCloud className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-center text-base font-semibold text-orange-600">
                Click here or drag & drop your file
              </p>
              <p className="mt-1 text-center text-sm text-orange-500/90">CSV files</p>
              {selectedFile && (
                <p className="mt-3 max-w-full truncate text-center text-sm font-medium text-gray-700">
                  {selectedFile.name}
                </p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {selectedFile && (
              <Button
                type="button"
                className="mt-4 h-11 w-full bg-orange-500 text-base font-semibold hover:bg-orange-600"
                disabled={bulkImportMutation.isPending}
                onClick={handleUpload}
              >
                {bulkImportMutation.isPending ? 'Uploading...' : 'Upload Files'}
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between border-t bg-gray-50/80 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="h-10 bg-white"
              onClick={downloadUsersImportTemplate}
              disabled={bulkImportMutation.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 bg-white px-6"
              onClick={() => onOpenChange(false)}
              disabled={bulkImportMutation.isPending}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resultDialog} onOpenChange={(isOpen) => !isOpen && setResultDialog(null)}>
        <DialogContent className="max-w-md text-center">
          <div className="flex flex-col items-center gap-4 py-2">
            {resultDialog?.status === 'success' ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-9 w-9 text-green-600" />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-9 w-9 text-red-600" />
              </div>
            )}
            <div className="space-y-2">
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {resultDialog?.title}
              </DialogTitle>
              <p className="text-sm text-gray-600">{resultDialog?.description}</p>
            </div>
            {resultDialog?.errors && resultDialog.errors.length > 0 && (
              <div className="max-h-40 w-full overflow-y-auto rounded-lg border bg-gray-50 p-3 text-left text-xs text-gray-700">
                {resultDialog.errors.slice(0, 8).map((error) => (
                  <p key={`${error.email}-${error.message}`} className="mb-1 last:mb-0">
                    <span className="font-medium">{error.email}:</span> {error.message}
                  </p>
                ))}
                {resultDialog.errors.length > 8 && (
                  <p className="mt-2 text-gray-500">+{resultDialog.errors.length - 8} more errors</p>
                )}
              </div>
            )}
            <Button
              type="button"
              className={cn(
                'mt-2 w-full',
                resultDialog?.status === 'success'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700',
              )}
              onClick={() => setResultDialog(null)}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BulkImportUsersDialog;
