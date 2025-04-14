'use client';

import React from 'react';

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
    <div className="flex items-center justify-between mt-6">
      {/* Progress Indicator */}
      <div className="text-sm text-gray-500">
        Question {currentIndex + 1} of {totalQuestions}
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          className={`px-4 py-2 rounded-md ${
            hasPrevious
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Previous
        </button>
        
        <button
          onClick={onNext}
          disabled={!hasNext}
          className={`px-4 py-2 rounded-md ${
            hasNext
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
} 