'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StudySet } from '@/types/studyTypes';
import { useStudySession } from '@/contexts/StudySessionContext';
import { Loader2 } from 'lucide-react';

interface RenameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  studySet: StudySet | null;
}

export default function RenameDialog({ isOpen, onClose, studySet }: RenameDialogProps) {
  const [newTitle, setNewTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Assume renameStudySet exists in context - we'll add it next
  const { renameStudySet } = useStudySession(); 

  useEffect(() => {
    if (studySet) {
      setNewTitle(studySet.title);
      setError(null);
    } else {
      setNewTitle('');
    }
  }, [studySet]);

  const handleSave = async () => {
    if (!studySet || !newTitle.trim()) {
      setError('Title cannot be empty.');
      return;
    }
    if (newTitle.trim() === studySet.title) {
      onClose(); // No changes made
      return;
    }

    setIsSaving(true);
    setError(null);
    
    try {
      await renameStudySet(studySet.id, newTitle.trim());
      onClose();
    } catch (err) {
      console.error("Failed to rename study set:", err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!studySet) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Study Set</DialogTitle>
          <DialogDescription>
            Enter a new title for "{studySet.title}".
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="new-title" className="sr-only">
            New Title
          </Label>
          <Input
            id="new-title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Enter new study set title"
            className={error ? 'border-destructive' : ''}
          />
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !newTitle.trim() || newTitle.trim() === studySet.title}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Title'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 