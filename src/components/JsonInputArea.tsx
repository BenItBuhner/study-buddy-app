'use client';

import React, { useState } from 'react';
import { StudySet } from '@/types/studyTypes';

interface JsonInputAreaProps {
  onJsonLoaded: (studySet: StudySet) => void;
}

export default function JsonInputArea({ onJsonLoaded }: JsonInputAreaProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle direct text input
  const handleTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonInput(event.target.value);
    setError(null);
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        setJsonInput(content);
        setLoading(false);
      } catch (err) {
        setError('Failed to read the file.');
        setLoading(false);
      }
    };
    
    reader.onerror = () => {
      setError('Failed to read the file.');
      setLoading(false);
    };
    
    reader.readAsText(file);
  };

  // Process and validate JSON
  const processJson = () => {
    if (!jsonInput.trim()) {
      setError('Please enter JSON data or upload a file.');
      return;
    }

    try {
      setLoading(true);
      const parsedData = JSON.parse(jsonInput);

      // Basic validation
      if (!parsedData.title) {
        throw new Error('Missing required field: title');
      }
      
      if (!parsedData.questions || !Array.isArray(parsedData.questions) || parsedData.questions.length === 0) {
        throw new Error('Missing or invalid questions array');
      }

      // More detailed validation
      parsedData.questions.forEach((question: any, index: number) => {
        if (!question.id) {
          throw new Error(`Question at index ${index} is missing an id`);
        }
        
        if (!question.type || !['multiple-choice', 'text-input'].includes(question.type)) {
          throw new Error(`Question ${question.id} has an invalid or missing type`);
        }
        
        if (!question.text || !Array.isArray(question.text) || question.text.length === 0) {
          throw new Error(`Question ${question.id} is missing text content`);
        }
        
        if (question.type === 'multiple-choice') {
          if (!question.options || !Array.isArray(question.options) || question.options.length === 0) {
            throw new Error(`Multiple-choice question ${question.id} is missing options`);
          }
          
          const hasCorrectOption = question.options.some((opt: any) => opt.isCorrect === true);
          if (!hasCorrectOption) {
            throw new Error(`Multiple-choice question ${question.id} has no correct option marked`);
          }
        }
        
        if (question.type === 'text-input') {
          if (!question.correctAnswers || !Array.isArray(question.correctAnswers) || question.correctAnswers.length === 0) {
            throw new Error(`Text input question ${question.id} is missing correctAnswers`);
          }
        }
      });

      // Default values for missing fields
      if (!parsedData.settings) {
        parsedData.settings = { persistSession: true };
      } else if (parsedData.settings.persistSession === undefined) {
        parsedData.settings.persistSession = true;
      }

      // Initialize answer and isUserCorrect fields
      parsedData.questions = parsedData.questions.map((q: any) => ({
        ...q,
        answer: null,
        isUserCorrect: null,
      }));

      // Success - pass the data to parent
      onJsonLoaded(parsedData);
      setError(null);
    } catch (err) {
      setError(`Invalid JSON: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Load Study Set</h3>
      
      {/* Text Area Input */}
      <div className="mb-4">
        <label htmlFor="json-input" className="block text-sm font-medium text-gray-700 mb-1">
          Paste JSON:
        </label>
        <textarea
          id="json-input"
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={jsonInput}
          onChange={handleTextareaChange}
          placeholder='{"title": "My Study Set", "questions": [...]}'
        />
      </div>
      
      {/* File Upload */}
      <div className="mb-4">
        <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-1">
          Or upload a JSON file:
        </label>
        <input
          type="file"
          id="file-upload"
          accept=".json"
          onChange={handleFileUpload}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {/* Load Button */}
      <button
        onClick={processJson}
        disabled={loading}
        className={`w-full py-2 px-4 rounded-md ${
          loading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {loading ? 'Processing...' : 'Load Study Set'}
      </button>
    </div>
  );
}