'use client';

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, Loader2 } from 'lucide-react';
import { StudySet } from '@/types/studyTypes';
import { exportStudySet } from '@/utils/exportUtils';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  studySet: StudySet;
}

export default function ExportDialog({ isOpen, onClose, studySet }: ExportDialogProps) {
  const [includeProgress, setIncludeProgress] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExport = () => {
    setIsExporting(true);
    
    try {
      // Create a clone of the study set
      const exportData = structuredClone(studySet);
      
      // If not including progress, reset answer and isUserCorrect fields
      if (!includeProgress) {
        exportData.questions = exportData.questions.map(q => ({
          ...q,
          answer: null,
          isUserCorrect: null
        }));
      }
      
      // Create Blob and download link
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a download link and trigger it
      const a = document.createElement('a');
      a.href = url;
      
      // Create a safe filename from the study set title
      const filename = `${exportData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      onClose();
    } catch (error) {
      console.error('Error exporting study set:', error);
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Study Set</DialogTitle>
          <DialogDescription>
            Export &ldquo;{studySet.title}&rdquo; as a JSON file that can be imported later.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <RadioGroup 
            defaultValue={includeProgress ? "with-progress" : "without-progress"}
            onValueChange={(value: string) => setIncludeProgress(value === "with-progress")}
            className="space-y-3"
          >
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="with-progress" id="with-progress" />
              <div className="grid gap-1.5">
                <Label htmlFor="with-progress" className="font-medium">
                  Include progress
                </Label>
                <p className="text-sm text-muted-foreground">
                  Export with your current answers and progress. Best for continuing study later.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="without-progress" id="without-progress" />
              <div className="grid gap-1.5">
                <Label htmlFor="without-progress" className="font-medium">
                  Fresh study set 
                </Label>
                <p className="text-sm text-muted-foreground">
                  Export without answers or progress. Best for sharing with others.
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 