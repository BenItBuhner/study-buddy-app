'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface NavigationControlsProps {
  currentIndex: number;
  totalQuestions: number;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export default function NavigationControls({
  currentIndex,
  totalQuestions,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: NavigationControlsProps) {
  return (
    <div className="flex items-center justify-between w-full">
      {/* Progress Indicator */}
      <div className="text-sm text-muted-foreground">
        Question {currentIndex + 1} of {totalQuestions}
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex space-x-2">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={!hasPrevious}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <Button
          onClick={onNext}
          disabled={!hasNext}
        >
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
} 