import { useState, useEffect, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemName: string;
}

export function DeleteConfirmDialog({ open, onOpenChange, onConfirm, itemName }: DeleteConfirmDialogProps) {
  const [countdown, setCountdown] = useState(3);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) {
      setCountdown(3);
      setDeleting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!deleting) return;
    if (countdown <= 0) {
      onConfirm();
      onOpenChange(false);
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [deleting, countdown, onConfirm, onOpenChange]);

  const handleDelete = useCallback(() => {
    setDeleting(true);
  }, []);

  const handleCancel = useCallback(() => {
    setDeleting(false);
    setCountdown(3);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md notranslate" translate="no">
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center">Are you sure you want to delete this?</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            You're about to delete <span className="font-semibold text-foreground">{itemName}</span>. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          {deleting ? (
            <>
              <p className="text-center text-sm text-muted-foreground">
                Deleting in <span className="font-bold text-destructive text-lg">{countdown}</span> second{countdown !== 1 ? 's' : ''}…
              </p>
              <Button variant="outline" onClick={handleCancel} className="w-full">
                Cancel — Keep this item
              </Button>
            </>
          ) : (
            <div className="flex w-full gap-2">
              <Button variant="outline" onClick={handleCancel} className="flex-1">
                No, keep it
              </Button>
              <Button variant="destructive" onClick={handleDelete} className="flex-1">
                Yes, delete it
              </Button>
            </div>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
