'use client';

import React from 'react';
import { useStudySession } from '@/contexts/StudySessionContext';
import QuestionDisplay from '@/components/QuestionDisplay';
import NavigationControls from '@/components/NavigationControls';
import JsonInputArea from '@/components/JsonInputArea';
import { StudySet } from '@/types/studyTypes';

export default function Home() {
  const {
    studySet,
    currentQuestionIndex,
    loadStudySet,
    submitAnswer,
    nextQuestion,
    previousQuestion
  } = useStudySession();

  // Get current question
  const currentQuestion = studySet?.questions[currentQuestionIndex] || null;
  const totalQuestions = studySet?.questions.length || 0;

  // Calculate navigation state
  const hasPrevious = currentQuestionIndex > 0;
  const hasNext = studySet !== null && currentQuestionIndex < (studySet.questions.length - 1);

  // Handle JSON loading
  const handleJsonLoaded = (loadedStudySet: StudySet) => {
    loadStudySet(loadedStudySet);
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">
        {studySet ? studySet.title : 'Welcome to StudyBuddy'}
      </h2>
      
      {/* Show JSON input if no study set is loaded, otherwise show study interface */}
      {!studySet ? (
        <div className="w-full max-w-3xl">
          <JsonInputArea onJsonLoaded={handleJsonLoaded} />
          
          {/* Sample Quizzes */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-4">
            <h3 className="text-lg font-semibold mb-2">Sample Quizzes</h3>
            <p className="text-gray-600 mb-4">Try one of our sample quizzes:</p>
            <div className="flex flex-wrap gap-3">
              <a 
                href="/sample-math-quiz.json" 
                target="_blank" 
                className="bg-blue-100 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-200 transition-colors"
              >
                Math Quiz
              </a>
              <a 
                href="/sample-physics-quiz.json" 
                target="_blank" 
                className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-md hover:bg-indigo-200 transition-colors"
              >
                Physics Quiz
              </a>
            </div>
            <p className="text-gray-500 text-sm mt-2">
              Click to view, then copy and paste into the JSON input area above.
            </p>
          </div>
          
          {/* Sample JSON Example */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-4">
            <h3 className="text-lg font-semibold mb-2">JSON Format Example</h3>
            <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-auto max-h-[300px]">
              {`{
  "title": "Basic Math Quiz",
  "settings": {
    "persistSession": true
  },
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "text": [
        "What is 2 + 2?",
        "Choose the correct answer."
      ],
      "options": [
        {"id": "a", "text": "3"},
        {"id": "b", "text": "4", "isCorrect": true},
        {"id": "c", "text": "5"},
        {"id": "d", "text": "22"}
      ]
    },
    {
      "id": "q2",
      "type": "text-input",
      "text": [
        "What is \\\\(\\\\frac{1}{2} + \\\\frac{1}{4}\\\\) as a decimal?"
      ],
      "correctAnswers": [
        "0.75",
        ".75",
        "3/4"
      ],
      "explanation": "\\\\(\\\\frac{1}{2} + \\\\frac{1}{4} = \\\\frac{2}{4} + \\\\frac{1}{4} = \\\\frac{3}{4} = 0.75\\\\)"
    }
  ]
}`}
            </pre>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-3xl">
          {/* Question Display */}
          <QuestionDisplay 
            question={currentQuestion} 
            onAnswerSubmit={submitAnswer}
          />
          
          {/* Navigation Controls */}
          <NavigationControls 
            currentIndex={currentQuestionIndex}
            totalQuestions={totalQuestions}
            onPrevious={previousQuestion}
            onNext={nextQuestion}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
          />
          
          {/* Reset Button */}
          <div className="mt-8 text-center">
            <button
              onClick={() => loadStudySet(null as any)}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Load Different Study Set
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
