'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { StudySet } from '@/types/studyTypes';
import {
  loadSessionFromCookie,
  saveSessionToCookie,
  loadAllSessions,
  removeStudySet,
} from '@/utils/cookieUtils';

// Default state - Simplified, state managed directly
// const defaultState = {
//   studySet: null,
//   currentQuestionIndex: 0,
//   isLoading: false,
//   error: null,
// };

// Context type with state and functions
interface StudySessionContextType {
  studySet: StudySet | null;
  currentQuestionIndex: number;
  loadStudySet: (studySet: StudySet | null) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  submitAnswer: (questionId: string, answer: string | null) => void;
  resetSession: () => void;
  getAllSavedSessions: () => StudySet[];
  deleteStudySet: (id: string) => void;
  resetStudySetProgress: (id: string) => void;
  goToQuestion: (index: number) => void;
  saveCurrentSession: () => boolean;
}

// Create the context
const StudySessionContext = createContext<StudySessionContextType | undefined>(undefined);

// Provider component
export function StudySessionProvider({ children }: { children: ReactNode }) {
  const [studySet, setStudySet] = useState<StudySet | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Load session from cookie on initial render
  useEffect(() => {
    // Load the most recent session (assuming no argument does this)
    const allSessions = loadAllSessions();
    if (allSessions.length > 0) {
      allSessions.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
      const mostRecentSession = allSessions[0];
      setStudySet(mostRecentSession);
      // Find the index of the first unanswered question
      const startIndex = mostRecentSession.questions.findIndex(q => q.answer === null);
      setCurrentQuestionIndex(startIndex >= 0 ? startIndex : mostRecentSession.questions.length);
    }
  }, []);

  // Helper function to reset current question state - Unused
  // const resetQuestionState = () => {
  //   setCurrentQuestionIndex(0);
  // };

  // Load a study set
  const loadStudySet = (newStudySet: StudySet | null) => {
    setStudySet(newStudySet);
    setCurrentQuestionIndex(0);
    if (newStudySet) {
      // Find the index of the first unanswered question
      const startIndex = newStudySet.questions.findIndex(q => q.answer === null);
      setCurrentQuestionIndex(startIndex >= 0 ? startIndex : newStudySet.questions.length);
      // Update last accessed time
      const updatedSet = { ...newStudySet, lastAccessed: Date.now() };
      saveSessionToCookie(updatedSet);
      setStudySet(updatedSet);
    }
  };

  // Go to next question
  const nextQuestion = () => {
    if (studySet && currentQuestionIndex < studySet.questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      
      // Save the session after navigation
      const updatedSet = { 
        ...studySet, 
        lastAccessed: Date.now() 
      };
      saveSessionToCookie(updatedSet);
    }
  };

  // Go to previous question
  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
      
      // Save the session after navigation
      if (studySet) {
        const updatedSet = { 
          ...studySet, 
          lastAccessed: Date.now() 
        };
        saveSessionToCookie(updatedSet);
      }
    }
  };

  // Submit an answer
  const submitAnswer = (questionId: string, answer: string | null) => {
    if (!studySet) return;
    
    const updatedQuestions = studySet.questions.map(q => {
      if (q.id === questionId) {
        let isUserCorrect = false;
        if (answer !== null) {
          if (q.type === 'multiple-choice') {
            // Debug logging for multiple-choice questions
            console.log('Multiple choice question:', q.id);
            console.log('User selected option:', answer);
            console.log('Available options:', q.options);
            
            // Log each option with its properties to check isCorrect
            q.options.forEach((opt, index) => {
              console.log(`Option ${index} (${opt.id}):`, {
                text: opt.text,
                isCorrect: opt.isCorrect,
                typeOfIsCorrect: typeof opt.isCorrect
              });
            });
            
            // Find correct option and use explicit boolean check
            const correctOption = q.options.find(opt => opt.isCorrect === true);
            console.log('Correct option found:', correctOption);
            
            // Use explicit boolean check and fallback if no correct option found
            isUserCorrect = (correctOption && answer === correctOption.id) || false;
            console.log('Is user correct:', isUserCorrect);
          } else if (q.type === 'text-input') {
            const normalizedUserAnswer = answer.trim().toLowerCase();
            isUserCorrect = q.correctAnswers.some(correct => 
              correct.trim().toLowerCase() === normalizedUserAnswer
            );
          }
        }
        return { ...q, answer, isUserCorrect };
      }
      return q;
    });
    
    const updatedStudySet = { 
      ...studySet, 
      questions: updatedQuestions,
      lastAccessed: Date.now() 
    };
    setStudySet(updatedStudySet);
    saveSessionToCookie(updatedStudySet);
  };

  // Helper function to explicitly save the current session
  const saveCurrentSession = () => {
    if (studySet) {
      // Update last accessed time and save
      const updatedSet = {
        ...studySet,
        lastAccessed: Date.now()
      };
      saveSessionToCookie(updatedSet);
      return true;
    }
    return false;
  };

  // Reset the current session
  const resetSession = () => {
    if (!studySet) return;
    // Directly modify the current studySet state
    const resetQuestions = studySet.questions.map(q => ({
      ...q,
      answer: null,
      isUserCorrect: null
    }));
    const resetSet = { 
      ...studySet, 
      questions: resetQuestions, 
      lastAccessed: Date.now() 
    };
    setStudySet(resetSet);
    setCurrentQuestionIndex(0);
    saveSessionToCookie(resetSet); // Save the reset state
  };

  // Get all saved sessions
  const getAllSavedSessions = (): StudySet[] => {
    return loadAllSessions();
  };

  // Delete a study set
  const deleteStudySet = (id: string) => {
    removeStudySet(id);
    
    // If the current study set is being deleted, reset the session
    if (studySet && studySet.id === id) {
      setStudySet(null);
      setCurrentQuestionIndex(0);
    }
  };
  
  // Reset progress for a specific study set
  const resetStudySetProgressLocal = (id: string) => {
    // Load the specific session
    const sessionToReset = loadSessionFromCookie(id);
    if (!sessionToReset) return;
    
    // Reset questions
    const resetQuestions = sessionToReset.questions.map(q => ({
      ...q,
      answer: null,
      isUserCorrect: null
    }));
    
    const resetSet = { 
      ...sessionToReset, 
      questions: resetQuestions, 
      lastAccessed: Date.now() 
    };
    
    saveSessionToCookie(resetSet);
    
    // If the current set is the one being reset, update its state
    if (studySet && studySet.id === id) {
      setStudySet(resetSet);
      setCurrentQuestionIndex(0);
    }
  };

  // Go to a specific question index
  const goToQuestion = (index: number) => {
    if (studySet && index >= 0 && index < studySet.questions.length) {
      setCurrentQuestionIndex(index);
      
      // Save the session after navigation
      const updatedSet = { 
        ...studySet, 
        lastAccessed: Date.now() 
      };
      saveSessionToCookie(updatedSet);
    }
  };

  // Context value
  const value: StudySessionContextType = {
    studySet,
    currentQuestionIndex,
    loadStudySet,
    nextQuestion,
    previousQuestion,
    submitAnswer,
    resetSession,
    getAllSavedSessions,
    deleteStudySet,
    resetStudySetProgress: resetStudySetProgressLocal,
    goToQuestion,
    saveCurrentSession,
  };

  return (
    <StudySessionContext.Provider value={value}>
      {children}
    </StudySessionContext.Provider>
  );
}

// Custom hook to use the study session context
export function useStudySession() {
  const context = useContext(StudySessionContext);
  if (context === undefined) {
    throw new Error('useStudySession must be used within a StudySessionProvider');
  }
  return context;
} 