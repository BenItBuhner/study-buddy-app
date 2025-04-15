'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';
import { StudySet, Question } from '@/types/studyTypes';
import AIGenerationModal from '@/components/AIGenerationModal';
import { useStudySession } from './StudySessionContext';
import { useRouter } from 'next/navigation';
import { saveSessionToCookie, saveAIApiKey, saveAIModelPreference } from '@/utils/cookieUtils';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';

interface AIGenerationContextType {
  isAIModalOpen: boolean;
  openAIModal: () => void;
  closeAIModal: () => void;
  processAttachments: (apiKey: string, model: string, prompt: string, attachments: Attachment[]) => Promise<StudySet>;
  streamText: (apiKey: string, model: string, prompt: string, attachments: Attachment[], 
               onStreamUpdate: (text: string) => void, 
               onComplete: (studySet: StudySet) => void,
               onError: (error: Error) => void) => Promise<void>;
  listAvailableModels: (apiKey: string) => Promise<string[]>;
}

// Define attachment types
export type AttachmentType = 'url' | 'image' | 'pdf' | 'text' | 'other';

export interface Attachment {
  id: string;
  type: AttachmentType;
  name: string;
  content: string; // Could be URL, base64 data, or text content
  size?: number;
  htmlContent?: string; // HTML content for URL attachments
}

const AIGenerationContext = createContext<AIGenerationContextType | undefined>(undefined);

interface AIGenerationProviderProps {
  children: ReactNode;
}

export function AIGenerationProvider({ children }: AIGenerationProviderProps) {
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const { loadStudySet } = useStudySession();
  const router = useRouter();

  const openAIModal = () => {
    setIsAIModalOpen(true);
  };

  const closeAIModal = () => {
    setIsAIModalOpen(false);
  };

  // Function to extract JSON from text
  const extractJsonFromText = (text: string): string | null => {
    try {
      const start = text.indexOf('{');
      if (start === -1) return null;
      
      let depth = 0;
      let end = -1;
      
      for (let i = start; i < text.length; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      
      if (end === -1) return null;
      
      return text.substring(start, end + 1);
    } catch (err) {
      console.error('Error extracting JSON:', err);
      return null;
    }
  };

  // Function to extract text from HTML content
  const extractTextFromHtml = (html: string): string => {
    // Remove script and style tags and their contents first
    const withoutScriptStyle = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Remove all HTML tags
    const textOnly = withoutScriptStyle.replace(/<[^>]*>/g, ' ');
    
    // Replace multiple whitespace with a single space
    const cleanText = textOnly
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .trim();
    
    return cleanText;
  };

  // Process attachments and generate study set using Google Gen AI
  const processAttachments = async (apiKey: string, modelName: string, prompt: string, attachments: Attachment[]): Promise<StudySet> => {
    try {
      // Determine maxOutputTokens based on model
      let maxOutputTokens = 8192; // Default for unknown or Flash
      if (modelName === "gemini-2.0-flash-thinking-exp-01-21" || modelName === "gemini-2.5-pro-exp-03-25") {
        maxOutputTokens = 65536;
      } else if (modelName === "gemini-2.0-flash") {
        maxOutputTokens = 8192;
      }
      
      // Initialize the Generative AI model
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });

      // Build the prompt template
      const promptTemplate = `
I need help creating a JSON study set for my StudyBuddy app. Please format it exactly according to the schema below.

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

Please create a study set with questions about the following topic:
${prompt}
`;

      // Prepare the generation parts
      const parts: Part[] = [{ text: promptTemplate }];

      // Add attachments as parts (if any)
      for (const attachment of attachments) {
        if (attachment.type === 'image') {
          // For images, add them as inline parts
          if (attachment.content.startsWith('data:image')) {
            const base64Data = attachment.content.split(',')[1];
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg', // Adjust based on actual image type
              },
            });
            parts.push({ text: `\nThe above image is called: ${attachment.name}\n` });
          }
        } else if (attachment.type === 'text') {
          // For text files, add their content directly
          parts.push({ text: `\nContent from ${attachment.name}:\n${attachment.content}\n` });
        } else if (attachment.type === 'url') {
          // For URLs, include the HTML content if available
          if (attachment.htmlContent) {
            // Add the URL as reference
            parts.push({ text: `\n--- Content from URL: ${attachment.content} ---\n` });
            
            // Clean HTML and include a truncated version (to avoid token limits)
            const cleanedHtml = extractTextFromHtml(attachment.htmlContent);
            const truncatedContent = cleanedHtml.substring(0, 10000);
            parts.push({ text: truncatedContent });
            
            parts.push({ text: `\n--- End of content from URL: ${attachment.content} ---\n` });
          } else {
            // Fallback to just mentioning the URL
            parts.push({ text: `\nPlease use information from this URL: ${attachment.content}\n` });
          }
        } else {
          // For other types, just mention them
          parts.push({ text: `\nContent referenced from ${attachment.name} (${attachment.type})\n` });
        }
      }

      // Generate content
      const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: maxOutputTokens,
        },
      });

      const response = result.response;
      const responseText = response.text();
      
      if (!responseText) {
        throw new Error('No response text generated');
      }

      // Extract JSON from the response
      const jsonText = extractJsonFromText(responseText);
      
      if (!jsonText) {
        throw new Error('Failed to extract valid JSON from the response');
      }

      // Parse and validate the JSON
      const parsedData = JSON.parse(jsonText);
      
      // Basic validation
      if (!parsedData.title) {
        throw new Error('Generated JSON is missing a title');
      }
      
      if (!parsedData.questions || !Array.isArray(parsedData.questions) || parsedData.questions.length === 0) {
        throw new Error('Generated JSON is missing questions');
      }

      // Prepare study set with all required fields
      const studySet: StudySet = {
        ...parsedData,
        id: uuidv4(),
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        settings: {
          ...(parsedData.settings || {}),
          persistSession: true,
        },
        // Initialize answer and isUserCorrect fields
        questions: parsedData.questions.map((q: Partial<Question>) => ({
          ...q,
          answer: null,
          isUserCorrect: null,
        }))
      };

      // Save API key and model preference for future use
      saveAIApiKey(apiKey);
      saveAIModelPreference(modelName);

      return studySet;

    } catch (error) {
      console.error('Error processing attachments:', error);
      throw error;
    }
  };

  // Stream text from AI and process it incrementally
  const streamText = async (
    apiKey: string, 
    modelName: string, 
    prompt: string, 
    attachments: Attachment[],
    onStreamUpdate: (text: string) => void,
    onComplete: (studySet: StudySet) => void,
    onError: (error: Error) => void
  ): Promise<void> => {
    // For gemini-2.5-pro models, implement fallback from exp to preview if needed
    const tryWithFallback = async (currentModelName: string): Promise<void> => {
      try {
        // Determine maxOutputTokens based on model
        let maxOutputTokens = 8192; // Default for unknown or Flash
        if (currentModelName === "gemini-2.0-flash-thinking-exp-01-21" || 
            currentModelName.includes("gemini-2.5")) {
          maxOutputTokens = 65536;
        } else if (currentModelName === "gemini-2.0-flash") {
          maxOutputTokens = 8192;
        }

        // Initialize the Generative AI model
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: currentModelName });

        // Build the prompt template - same as in processAttachments
        const promptTemplate = `
I need help creating a JSON study set for my StudyBuddy app. Please format it exactly according to the schema below.

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

Please create a study set with questions about the following topic:
${prompt}
`;

        // Prepare the generation parts - same as in processAttachments
        const parts: Part[] = [{ text: promptTemplate }];

        // Add attachments as parts (if any) - same as in processAttachments
        for (const attachment of attachments) {
          if (attachment.type === 'image') {
            // For images, add them as inline parts
            if (attachment.content.startsWith('data:image')) {
              const base64Data = attachment.content.split(',')[1];
              parts.push({
                inlineData: {
                  data: base64Data,
                  mimeType: 'image/jpeg', // Adjust based on actual image type
                },
              });
              parts.push({ text: `\nThe above image is called: ${attachment.name}\n` });
            }
          } else if (attachment.type === 'text') {
            // For text files, add their content directly
            parts.push({ text: `\nContent from ${attachment.name}:\n${attachment.content}\n` });
          } else if (attachment.type === 'url') {
            // For URLs, include the HTML content if available
            if (attachment.htmlContent) {
              // Add the URL as reference
              parts.push({ text: `\n--- Content from URL: ${attachment.content} ---\n` });
              
              // Clean HTML and include a truncated version (to avoid token limits)
              const cleanedHtml = extractTextFromHtml(attachment.htmlContent);
              const truncatedContent = cleanedHtml.substring(0, 10000);
              parts.push({ text: truncatedContent });
              
              parts.push({ text: `\n--- End of content from URL: ${attachment.content} ---\n` });
            } else {
              // Fallback to just mentioning the URL
              parts.push({ text: `\nPlease use information from this URL: ${attachment.content}\n` });
            }
          } else {
            // For other types, just mention them
            parts.push({ text: `\nContent referenced from ${attachment.name} (${attachment.type})\n` });
          }
        }

        // Set up streaming for the generation
        let fullResponseText = '';
        
        const result = await model.generateContentStream({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: maxOutputTokens,
          },
        });

        // Process the stream
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullResponseText += chunkText;
          onStreamUpdate(fullResponseText);
        }

        // After streaming is complete, try to extract and process the JSON
        // Extract JSON from the response
        const jsonText = extractJsonFromText(fullResponseText);
        
        if (!jsonText) {
          throw new Error('Failed to extract valid JSON from the response');
        }

        // Parse and validate the JSON
        const parsedData = JSON.parse(jsonText);
        
        // Basic validation
        if (!parsedData.title) {
          throw new Error('Generated JSON is missing a title');
        }
        
        if (!parsedData.questions || !Array.isArray(parsedData.questions) || parsedData.questions.length === 0) {
          throw new Error('Generated JSON is missing questions');
        }

        // Prepare study set with all required fields
        const studySet: StudySet = {
          ...parsedData,
          id: uuidv4(),
          createdAt: Date.now(),
          lastAccessed: Date.now(),
          settings: {
            ...(parsedData.settings || {}),
            persistSession: true,
          },
          // Initialize answer and isUserCorrect fields
          questions: parsedData.questions.map((q: Partial<Question>) => ({
            ...q,
            answer: null,
            isUserCorrect: null,
          }))
        };

        // Save API key and model preference for future use
        saveAIApiKey(apiKey);
        saveAIModelPreference(currentModelName);

        // Call the completion callback with the study set
        onComplete(studySet);
        
      } catch (error: unknown) {
        console.error('Error streaming text:', error);
        
        // Check if this is a model not found error and we're using the first version of Gemini 2.5
        if (currentModelName === 'gemini-2.5-pro-exp-03-25' && 
            error instanceof Error &&
            error.message && 
            error.message.includes('models/') && 
            error.message.includes('is not found')) {
          
          console.log('Trying fallback model: gemini-2.5-pro-preview-03-25');
          // Try with the fallback model
          try {
            await tryWithFallback('gemini-2.5-pro-preview-03-25');
          } catch (fallbackError) {
            onError(fallbackError instanceof Error ? fallbackError : new Error('Unknown error occurred during fallback streaming'));
          }
        } else {
          // Different error or we're already using the fallback, so propagate the error
          onError(error instanceof Error ? error : new Error('Unknown error occurred during streaming'));
        }
      }
    };
    
    // Start with the requested model
    try {
      await tryWithFallback(modelName);
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Unknown error occurred during streaming'));
    }
  };

  const handleStudySetGenerated = (studySet: StudySet) => {
    // Ensure the study set has all required properties for proper saving
    const preparedStudySet: StudySet = {
      ...studySet,
      // Generate ID if not present
      id: studySet.id || uuidv4(),
      // Add timestamps
      createdAt: studySet.createdAt || Date.now(),
      lastAccessed: Date.now(),
      // Ensure settings exist and have persistSession set to true
      settings: {
        ...(studySet.settings || {}),
        persistSession: true
      },
      // Initialize question state for all questions
      questions: studySet.questions.map(q => ({
        ...q,
        answer: q.answer ?? null,
        isUserCorrect: q.isUserCorrect ?? null
      }))
    };

    // Manually save the study set to cookies first to ensure it's persisted
    saveSessionToCookie(preparedStudySet);
    
    // Then load it into the active session context
    loadStudySet(preparedStudySet);
    
    // Navigate to the quiz page
    router.push('/quiz');
  };

  // Function to list available models from Google Gen AI
  const listAvailableModels = async (apiKey: string): Promise<string[]> => {
    try {
      // Initialize the Generative AI with the API key
      // Note: We're not using genAI directly in this function, but keeping the API call
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey);
      
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      
      // Parse the response
      const data = await response.json();
      
      // Extract model names from the response
      const availableModels = data.models
        .filter((model: { name: string; supportedGenerationMethods: string[] }) => 
          // Filter for Gemini models that support generateContent
          model.name.includes('gemini') && 
          model.supportedGenerationMethods.includes('generateContent')
        )
        .map((model: { name: string }) => {
          // Extract just the model name from the full path
          const parts = model.name.split('/');
          return parts[parts.length - 1];
        });
      
      return availableModels;
    } catch (error) {
      console.error('Error listing models:', error);
      // Return a fallback list of models that are commonly available
      return [
        'gemini-2.0-flash',
        'gemini-2.0-flash-thinking-exp-01-21',
        'gemini-2.5-pro-exp-03-25'
      ];
    }
  };

  return (
    <AIGenerationContext.Provider
      value={{
        isAIModalOpen,
        openAIModal,
        closeAIModal,
        processAttachments,
        streamText,
        listAvailableModels
      }}
    >
      {children}
      <AIGenerationModal 
        isOpen={isAIModalOpen} 
        onClose={closeAIModal} 
        onStudySetGenerated={handleStudySetGenerated} 
      />
    </AIGenerationContext.Provider>
  );
}

export function useAIGeneration() {
  const context = useContext(AIGenerationContext);
  if (context === undefined) {
    throw new Error('useAIGeneration must be used within an AIGenerationProvider');
  }
  return context;
} 