'use client';

import React, { useState } from 'react';
import { StudySet, Question } from '@/types/studyTypes';
import { Button } from '@/components/ui/button';
import { CopyIcon, CheckIcon, BookOpen, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface JsonInputAreaProps {
  onJsonLoaded: (studySet: StudySet) => void;
}

export default function JsonInputArea({ onJsonLoaded }: JsonInputAreaProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [preprocessingInfo, setPreprocessingInfo] = useState<string | null>(null);

  // Handle direct text input
  const handleTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonInput(event.target.value);
    setError(null);
    setPreprocessingInfo(null);
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setPreprocessingInfo(null);

    const reader = new FileReader();
    
    reader.onload = (event: ProgressEvent<FileReader>) => {
      try {
        const content = event.target?.result as string;
        setJsonInput(content);
        setLoading(false);
      } catch (err: unknown) {
        console.error("Error reading file content:", err);
        setError(`Failed to read file content: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };
    
    reader.onerror = () => {
      setError("Failed to read the file.");
      setLoading(false);
    };
    
    reader.readAsText(file);
  };

  // Pre-process JSON to fix common LaTeX and formatting issues
  const preprocessJson = (json: string): string => {
    let preprocessed = json;
    const modifications: string[] = [];
    
    // 1. Better handling of LaTeX expressions with special detection
    // For special LaTeX commands that use braces like \frac{}{}, \sqrt{}, etc.
    const containsLaTeX = /\\[a-zA-Z]+{|\\[\(\)\[\]]|\\frac|\\sqrt|\\text/.test(preprocessed);
    const latexInlinePattern = /\\(\(|\))/g;
    const latexDisplayPattern = /\\(\[|\])/g; 
    const latexCommandPattern = /\\([a-zA-Z]+)(?![a-zA-Z])/g;
    
    // More comprehensive LaTeX detection
    if (containsLaTeX || latexInlinePattern.test(preprocessed) || 
        latexDisplayPattern.test(preprocessed) || latexCommandPattern.test(preprocessed)) {
      
      // Stage 1: Replace LaTeX delimiters first
      preprocessed = preprocessed.replace(/\\(\(|\)|\[|\])/g, '\\\\$1');
      
      // Stage 2: Special handling for LaTeX commands with braces - we do multiple passes
      // to handle nested structures like \frac{a}{b}
      let prevLength = 0;
      let iterCount = 0;
      
      // Keep processing until we've covered all backslashes or hit iteration limit
      while (prevLength !== preprocessed.length && iterCount < 5) {
        prevLength = preprocessed.length;
        
        // Handle commands like \frac, \sqrt, \text, etc.
        preprocessed = preprocessed.replace(/\\([a-zA-Z]+)/g, '\\\\$1');
        
        // Handle escaped backslashes in other contexts
        preprocessed = preprocessed.replace(/([^\\])\\([^\\])/g, '$1\\\\$2');
        
        iterCount++;
      }
      
      modifications.push("Fixed LaTeX escape sequences");
    }
    
    // 2. Handle special characters in strings, particularly for Windows paths
    // This replaces a single backslash with double, except in already escaped sequences
    if (preprocessed.includes('"\\') && !preprocessed.includes('"\\\\"')) {
      preprocessed = preprocessed.replace(/([^\\])\\([^\\])/g, '$1\\\\$2');
      modifications.push("Fixed escaped paths");
    }
    
    // 3. Try to fix missing quotes around property names
    const propertyNameFixPattern = /([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g;
    if (propertyNameFixPattern.test(preprocessed)) {
      preprocessed = preprocessed.replace(propertyNameFixPattern, '$1"$2"$3');
      modifications.push("Added missing quotes around property names");
    }
    
    // 4. Fix trailing commas in arrays and objects
    preprocessed = preprocessed.replace(/,(\s*[\]}])/g, '$1');
    
    // 5. Add missing quotes around string values (only for simple values)
    const stringValueFixPattern = /:\s*([a-zA-Z0-9_]+)(\s*[,}])/g;
    if (stringValueFixPattern.test(preprocessed)) {
      preprocessed = preprocessed.replace(stringValueFixPattern, ': "$1"$2');
      modifications.push("Added missing quotes around string values");
    }
    
    // Return preprocessed JSON
    if (modifications.length > 0) {
      setPreprocessingInfo(`Preprocessing applied: ${modifications.join(", ")}`);
    } else {
      setPreprocessingInfo(null);
    }
    
    return preprocessed;
  };

  // LLM Prompt template with detailed JSON schema information
  const llmPromptTemplate = `
I need help creating a JSON study set for my StudyBuddy app. Please format it exactly according to the schema below. If the set hasn;t been made yet, please inquire on what to make the set on and how; use context history fo reference.

\`\`\`json
{
  "title": "Your Study Set Title",
  "settings": {
    "persistSession": true
  },
  "questions": [
    // Multiple choice question example
    {
      "id": "q1", // Unique identifier for the question
      "type": "multiple-choice", // Must be either "multiple-choice" or "text-input"
      "text": [
        "Main question text goes here. You can include LaTeX formulas like \\\\( x^2 + y^2 = z^2 \\\\)", 
        "Optional additional paragraph or hint"
      ],
      "options": [
        {"id": "a", "text": "First option"},
        {"id": "b", "text": "Second option"},
        {"id": "c", "text": "Correct option", "isCorrect": true}, // Mark the correct option
        {"id": "d", "text": "Fourth option"}
      ]
    },
    // Text input question example with complex LaTeX formula
    {
      "id": "q2",
      "type": "text-input",
      "text": [
        "Question that requires text input. For example: solve \\\\( \\\\frac{2x + 5}{3} = 15 \\\\) for x."
      ],
      "correctAnswers": [
        "20", "x=20", "x = 20" // Multiple acceptable answers
      ],
      "explanation": "Optional explanation: \\\\( \\\\frac{2x + 5}{3} = 15 \\\\) → \\\\( 2x + 5 = 45 \\\\) → \\\\( 2x = 40 \\\\) → \\\\( x = 20 \\\\)"
    },
    // Example with more complex LaTeX
    {
      "id": "q3",
      "type": "text-input",
      "text": [
        "Find the solution to the equation \\\\( \\\\sqrt{x+1} - 3 = 0 \\\\)"
      ],
      "correctAnswers": [
        "8", "x=8"
      ],
      "explanation": "\\\\( \\\\sqrt{x+1} = 3 \\\\) → \\\\( (\\\\sqrt{x+1})^2 = 3^2 \\\\) → \\\\( x+1 = 9 \\\\) → \\\\( x = 8 \\\\)"
    }
  ]
}
\`\`\`

**Important Requirements:**

1. **Structure:**
   - The JSON must include "title", "settings", and "questions" fields.
   - Each question must have a unique "id".
   - The "text" field must be an array of strings, even if there's only one paragraph.

2. **Question Types:**
   - For multiple-choice questions:
     - Must include "options" array with at least 2 options
     - Exactly one option must have "isCorrect": true
     - Each option needs an "id" (a, b, c, etc.) and "text"
   
   - For text-input questions:
     - Must include "correctAnswers" array with at least one acceptable answer
     - Can optionally include an "explanation" field

3. **LaTeX Support (VERY IMPORTANT FOR JSON):**
   - Every single backslash in LaTeX MUST be doubled in JSON strings
   - For inline LaTeX use \\\\( ... \\\\) - note the DOUBLE backslashes
   - For special LaTeX commands like fractions, use \\\\\\\\frac{numerator}{denominator}
   - Examples:
     - Simple formula: "Find \\\\( x^2 \\\\)" (two backslashes)
     - Fraction: "\\\\( \\\\frac{a}{b} \\\\)" (four backslashes)
     - Square root: "\\\\( \\\\sqrt{x} \\\\)" (four backslashes)
   - When in doubt, double every backslash in LaTeX expressions

4. **Do NOT include:**
   - "answer" or "isUserCorrect" fields (these are managed by the app)
   - Any extra fields not in the schema

Please create a study set with as many questions as needed for the user to study given their requirements.
`;

  // Handle copy prompt to clipboard
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(llmPromptTemplate);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_err) {
      console.error('Failed to copy text: ', _err);
    }
  };

  // Provide specific error guidance based on the error
  const getErrorGuidance = (errorMessage: string, position?: number): string => {
    // JSON parsing errors often have a position
    if (position !== undefined) {
      try {
        // Calculate line and column number from position
        const lines = jsonInput.substring(0, position).split('\n');
        const lineNumber = lines.length;
        const columnNumber = lines[lines.length - 1].length + 1;
        
        // Extract the problematic line and nearby context
        const allLines = jsonInput.split('\n');
        const problemLine = allLines[lineNumber - 1] || '';
        const context = problemLine.substring(
          Math.max(0, columnNumber - 20),
          Math.min(problemLine.length, columnNumber + 20)
        );
        
        // Highlight the issue with a marker
        const marker = `${' '.repeat(Math.min(20, columnNumber))}^ Problem may be here`;
        
        return `Error near line ${lineNumber}, column ${columnNumber}:\n${context}\n${marker}`;
      } catch (err) {
        // Fall back to generic position message if calculation fails
        return `Error found near position ${position} in your JSON.`;
      }
    }
    
    // Check for common issues and provide specific guidance
    if (errorMessage.includes('Expected')) {
      return "Syntax error: Check for missing commas, brackets, or quotes.";
    } else if (errorMessage.includes('Unexpected token')) {
      return "Unexpected character: Check your syntax for misplaced punctuation.";
    } else if (errorMessage.includes('Unexpected end of JSON')) {
      return "Your JSON is incomplete. Make sure all brackets and braces are properly closed.";
    } else if (errorMessage.includes('Bad escaped character')) {
      return "Problem with a backslash (\\) character. If you're using LaTeX, remember to double escape backslashes (use \\\\ instead of \\).";
    }
    
    // Generic fallback
    return errorMessage;
  };

  // Process and validate JSON
  const processJson = () => {
    if (!jsonInput.trim()) {
      setError('Please enter JSON data or upload a file.');
      return;
    }

    try {
      setLoading(true);
      
      // Try to preprocess the JSON first to fix common issues
      let preprocessedJson = preprocessJson(jsonInput);
      
      // Handle non-JSON or structured text by attempting cleaning
      let parsedData: any;
      
      try {
        // First attempt to parse the preprocessed JSON
        parsedData = JSON.parse(preprocessedJson);
      } catch (initialError) {
        // In case of failure, try a more aggressive approach for LaTeX content
        const errorMessage = initialError instanceof Error ? initialError.message : 'Unknown parsing error';
        
        // Try the desperate LaTeX fixing approach if the error seems LaTeX-related
        if (errorMessage.includes('position') && 
            (jsonInput.includes('\\(') || jsonInput.includes('\\)') || 
             jsonInput.includes('\\frac') || jsonInput.includes('\\sqrt'))) {
          
          try {
            // More aggressive preprocessing for LaTeX-heavy content
            preprocessedJson = jsonInput.replace(/\\/g, '\\\\');
            parsedData = JSON.parse(preprocessedJson);
            setPreprocessingInfo("Applied aggressive LaTeX escape sequence fixing");
          } catch (_secondError: unknown) {
            // If that also fails, provide detailed error
            const positionMatch = errorMessage.match(/position (\d+)/);
            const errorPosition = positionMatch ? parseInt(positionMatch[1]) : undefined;
            
            // Provide helpful error guidance
            const guidance = getErrorGuidance(errorMessage, errorPosition);
            throw new Error(`${errorMessage}\n\n${guidance}`);
          }
        } else {
          // If not LaTeX-related, provide the regular error
          const positionMatch = errorMessage.match(/position (\d+)/);
          const errorPosition = positionMatch ? parseInt(positionMatch[1]) : undefined;
          
          // Provide helpful error guidance
          const guidance = getErrorGuidance(errorMessage, errorPosition);
          throw new Error(`${errorMessage}\n\n${guidance}`);
        }
      }

      // Basic validation
      if (!parsedData.title) {
        throw new Error('Missing required field: title');
      }
      
      if (!parsedData.questions || !Array.isArray(parsedData.questions) || parsedData.questions.length === 0) {
        throw new Error('Missing or invalid questions array');
      }

      // Ensure study set has an ID and timestamps
      if (!parsedData.id) {
        parsedData.id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      }
      
      // Add timestamps for proper persistence
      parsedData.createdAt = parsedData.createdAt || Date.now();
      parsedData.lastAccessed = Date.now();

      // More detailed validation
      parsedData.questions.forEach((question: Partial<Question>, index: number) => {
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
          if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
            throw new Error(`Multiple-choice question ${question.id} needs at least 2 options`);
          }
          
          const correctOptions = question.options.filter((opt: { id: string; text: string; isCorrect?: boolean }) => opt.isCorrect === true);
          if (correctOptions.length === 0) {
            throw new Error(`Multiple-choice question ${question.id} has no correct option marked (use "isCorrect": true)`);
          } else if (correctOptions.length > 1) {
            throw new Error(`Multiple-choice question ${question.id} has ${correctOptions.length} correct options. Only one should be marked correct.`);
          }
          
          // Check if all options have IDs
          const missingIdOption = question.options.find((opt: { id: string; text: string; isCorrect?: boolean }) => !opt.id);
          if (missingIdOption) {
            throw new Error(`An option in question ${question.id} is missing an "id" field`);
          }
        }
        
        if (question.type === 'text-input') {
          if (!question.correctAnswers || !Array.isArray(question.correctAnswers) || question.correctAnswers.length === 0) {
            throw new Error(`Text input question ${question.id} is missing correctAnswers`);
          }
          
          // Check if all correctAnswers are strings
          const nonStringAnswer = question.correctAnswers.find((ans: string) => typeof ans !== 'string');
          if (nonStringAnswer !== undefined) {
            throw new Error(`Question ${question.id} has a non-string value in correctAnswers`);
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
      parsedData.questions = parsedData.questions.map((q: Partial<Question>) => ({
        ...q,
        answer: null,
        isUserCorrect: null,
      }));

      // Success - pass the data to parent
      onJsonLoaded(parsedData);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Invalid JSON: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* LLM Help Banner */}
      <Card className="p-4 mb-4 bg-primary/5 border-primary/20">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center">
            <BookOpen className="h-5 w-5 text-primary mr-2" />
            <span className="text-sm">
              Need help creating a study set? Copy this prompt to use with ChatGPT or other LLMs!
            </span>
          </div>
          <Button 
            variant="outline" 
            className="min-w-32"
            size="sm" 
            onClick={handleCopyPrompt}
          >
            {copied ? (
              <>
                <CheckIcon className="h-4 w-4 mr-1" /> Copied!
              </>
            ) : (
              <>
                <CopyIcon className="h-4 w-4 mr-1" /> Copy Prompt
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Main Input Area */}
      <div className="bg-card border shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Load Study Set</h3>
        
        {/* Text Area Input */}
        <div className="mb-4">
          <label htmlFor="json-input" className="block text-sm font-medium text-muted-foreground mb-1">
            Paste JSON:
          </label>
          <textarea
            id="json-input"
            rows={8}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            value={jsonInput}
            onChange={handleTextareaChange}
            placeholder='{"title": "My Study Set", "questions": [...]}'
          />
        </div>
        
        {/* File Upload */}
        <div className="mb-4">
          <label htmlFor="file-upload" className="block text-sm font-medium text-muted-foreground mb-1">
            Or upload a JSON file:
          </label>
          <input
            type="file"
            id="file-upload"
            accept=".json"
            onChange={handleFileUpload}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>
        
        {/* Preprocessing Info */}
        {preprocessingInfo && (
          <div className="mb-4 p-3 bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-md text-sm flex items-start">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">JSON Preprocessing Applied</p>
              <p>{preprocessingInfo}</p>
            </div>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm whitespace-pre-line">
            {error}
          </div>
        )}
        
        {/* Load Button */}
        <Button
          onClick={processJson}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Processing...' : 'Load Study Set'}
        </Button>
      </div>
    </div>
  );
}