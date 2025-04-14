'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Question, StudySet, StudySessionState } from '@/types/studyTypes';
import { 
  saveSessionToCookie, 
  loadSessionFromCookie, 
  clearSessionCookie 
} from '@/utils/cookieUtils';

// Default state
const defaultState: StudySessionState = {
  studySet: null,
  currentQuestionIndex: 0,
  isLoading: false,
  error: null,
};

// Context type with state and functions
interface StudySessionContextType extends StudySessionState {
  loadStudySet: (studySet: StudySet | null) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  submitAnswer: (questionId: string, answer: string) => void;
  resetSession: () => void;
}

// Create context
const StudySessionContext = createContext<StudySessionContextType | undefined>(undefined);

// Provider component
export function StudySessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StudySessionState>(defaultState);

  // Load session from cookie on initial render
  useEffect(() => {
    const savedSession = loadSessionFromCookie();
    if (savedSession) {
      setState({
        ...defaultState,
        studySet: savedSession,
      });
    }
  }, []);

  // Get current question
  const currentQuestion = state.studySet?.questions[state.currentQuestionIndex] || null;

  // Load a study set
  const loadStudySet = (studySet: StudySet | null) => {
    setState({
      ...defaultState,
      studySet,
    });

    // Handle cookie based on the new state
    if (studySet && studySet.settings.persistSession) {
      saveSessionToCookie(studySet);
    } else {
      clearSessionCookie();
    }
  };

  // Navigate to next question
  const nextQuestion = () => {
    if (!state.studySet) return;
    
    const nextIndex = state.currentQuestionIndex + 1;
    if (nextIndex < state.studySet.questions.length) {
      setState({
        ...state,
        currentQuestionIndex: nextIndex,
      });
    }
  };

  // Navigate to previous question
  const previousQuestion = () => {
    if (state.currentQuestionIndex > 0) {
      setState({
        ...state,
        currentQuestionIndex: state.currentQuestionIndex - 1,
      });
    }
  };

  // Submit an answer for the current question
  const submitAnswer = (questionId: string, answer: string) => {
    if (!state.studySet) return;

    const updatedQuestions = state.studySet.questions.map((question) => {
      if (question.id === questionId) {
        let isCorrect: boolean;
        
        if (question.type === 'multiple-choice') {
          // For multiple choice, check if the selected option is correct
          const selectedOption = question.options.find(opt => opt.id === answer);
          isCorrect = selectedOption?.isCorrect === true;
        } else {
          // For text input, check if the answer matches any of the correct answers
          isCorrect = question.correctAnswers.some(
            correctAnswer => correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase()
          );
        }

        return {
          ...question,
          answer,
          isUserCorrect: isCorrect,
        };
      }
      return question;
    });

    // Create updated study set
    const updatedStudySet = {
      ...state.studySet,
      questions: updatedQuestions,
    };

    // Update state
    setState({
      ...state,
      studySet: updatedStudySet,
    });

    // Save to cookie if persistence is enabled
    if (updatedStudySet.settings.persistSession) {
      saveSessionToCookie(updatedStudySet);
    }
  };

  // Reset the session
  const resetSession = () => {
    setState(defaultState);
    clearSessionCookie();
  };

  // Context value
  const value = {
    ...state,
    loadStudySet,
    nextQuestion,
    previousQuestion,
    submitAnswer,
    resetSession,
  };

  return (
    <StudySessionContext.Provider value={value}>
      {children}
    </StudySessionContext.Provider>
  );
}

// Custom hook to use the context
export function useStudySession() {
  const context = useContext(StudySessionContext);
  
  if (context === undefined) {
    throw new Error('useStudySession must be used within a StudySessionProvider');
  }
  
  return context;
} 