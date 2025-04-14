'use client';

import React from 'react';
import { Question } from '@/types/studyTypes';
import LatexRenderer from './LatexRenderer';

interface QuestionDisplayProps {
  question: Question | null;
  onAnswerSubmit: (questionId: string, answer: string) => void;
}

export default function QuestionDisplay({ question, onAnswerSubmit }: QuestionDisplayProps) {
  // If no question is available, show a placeholder
  if (!question) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">No question available. Please load a study set.</p>
      </div>
    );
  }

  // Handle multiple choice selection
  const handleMultipleChoiceSelect = (optionId: string) => {
    onAnswerSubmit(question.id, optionId);
  };

  // Handle text input submission
  const handleTextSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const answer = formData.get('answer') as string;
    if (answer.trim()) {
      onAnswerSubmit(question.id, answer);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Question Text - supports multiple paragraphs */}
      <div className="mb-6">
        {question.text.map((paragraph, index) => (
          <p key={index} className="text-gray-700 mb-2">
            <LatexRenderer content={paragraph} />
          </p>
        ))}
      </div>

      {/* Question Input - varies by type */}
      {question.type === 'multiple-choice' ? (
        // Multiple Choice Options
        <div className="space-y-3">
          {question.options.map((option) => (
            <div 
              key={option.id}
              onClick={() => handleMultipleChoiceSelect(option.id)}
              className={`border rounded-md p-3 cursor-pointer transition-colors ${
                question.answer === option.id 
                  ? question.isUserCorrect === true
                    ? 'bg-green-100 border-green-500'
                    : question.isUserCorrect === false
                    ? 'bg-red-100 border-red-500'
                    : 'bg-blue-100 border-blue-500'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <span className="font-medium mr-2">{option.id}.</span>
                <span><LatexRenderer content={option.text} /></span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Text Input
        <form onSubmit={handleTextSubmit} className="space-y-4">
          <div>
            <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-1">
              Your Answer:
            </label>
            <input
              type="text"
              id="answer"
              name="answer"
              defaultValue={question.answer || ''}
              className={`w-full px-4 py-2 border rounded-md ${
                question.isUserCorrect === true
                  ? 'border-green-500 bg-green-50'
                  : question.isUserCorrect === false
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300'
              }`}
              placeholder="Type your answer here..."
            />
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Submit Answer
          </button>
          
          {/* Feedback and Explanation */}
          {question.isUserCorrect !== null && (
            <div className={`mt-4 p-3 rounded-md ${
              question.isUserCorrect ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <p className="font-medium">
                {question.isUserCorrect ? 'Correct!' : 'Incorrect'}
              </p>
              
              {/* Show explanation if available and user is incorrect */}
              {!question.isUserCorrect && question.explanation && (
                <p className="text-sm mt-1">
                  <LatexRenderer content={question.explanation} />
                </p>
              )}
              
              {/* Show correct answers if user is incorrect */}
              {!question.isUserCorrect && question.type === 'text-input' && (
                <p className="text-sm mt-1">
                  Correct answer{question.correctAnswers.length > 1 ? 's' : ''}: {' '}
                  {question.correctAnswers.join(' or ')}
                </p>
              )}
            </div>
          )}
        </form>
      )}
    </div>
  );
} 