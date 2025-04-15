'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Question, StudySet, StudySessionState } from '@/types/studyTypes';
import { 
  saveSessionToCookie, 
  loadSessionFromCookie, 
  getCurrentSession,
  removeStudySet,
  loadAllSessions,
  clearAllSessionCookies
} from '@/utils/cookieUtils';
import { v4 as uuidv4 } from 'uuid';

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
  getAllSavedSessions: () => StudySet[];
  deleteStudySet: (id: string) => void;
  resetStudySetProgress: (id: string) => void;
  goToQuestion: (index: number) => void;
}

// Create context
const StudySessionContext = createContext<StudySessionContextType | undefined>(undefined);

// Provider component
export function StudySessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StudySessionState>(defaultState);

  // Load session from cookie on initial render
  useEffect(() => {
    const savedSession = getCurrentSession();
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
    // If studySet exists, ensure all questions have answer and isUserCorrect initialized as null
    if (studySet) {
      // Generate ID if not present
      if (!studySet.id) {
        studySet = {
          ...studySet,
          id: uuidv4(),
          createdAt: Date.now(),
          lastAccessed: Date.now()
        };
      } else {
        studySet = {
          ...studySet,
          lastAccessed: Date.now()
        };
      }

      // Ensure settings exists and has persistSession property
      if (!studySet.settings) {
        studySet = {
          ...studySet,
          settings: { persistSession: true }
        };
      } else if (studySet.settings.persistSession === undefined) {
        studySet = {
          ...studySet,
          settings: { 
            ...studySet.settings,
            persistSession: true 
          }
        };
      }

      // Process questions
      studySet = {
        ...studySet,
        questions: studySet.questions.map(question => ({
          ...question,
          answer: question.answer ?? null,
          isUserCorrect: question.isUserCorrect ?? null
        }))
      };
    }

    setState({
      ...defaultState,
      studySet,
    });

    // Always save to cookie if study set exists and persistSession is true
    if (studySet && studySet.settings.persistSession) {
      saveSessionToCookie(studySet);
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

  // Navigate directly to a specific question index
  const goToQuestion = (index: number) => {
    if (!state.studySet) return;
    if (index >= 0 && index < state.studySet.questions.length) {
      setState({
        ...state,
        currentQuestionIndex: index,
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
      lastAccessed: Date.now()
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
  };

  // Get all saved sessions
  const getAllSavedSessions = (): StudySet[] => {
    return loadAllSessions();
  };

  // Delete a study set
  const deleteStudySet = (id: string) => {
    removeStudySet(id);
    
    // If the current study set is being deleted, reset the session
    if (state.studySet?.id === id) {
      resetSession();
    }
  };

  // Reset progress of a study set without deleting it
  const resetStudySetProgress = (id: string) => {
    // Get the study set
    const studySet = loadSessionFromCookie(id);
    
    if (studySet) {
      // Reset all questions' progress
      const resetQuestions = studySet.questions.map(question => ({
        ...question,
        answer: null,
        isUserCorrect: null
      }));
      
      // Create updated study set with reset progress
      const updatedStudySet = {
        ...studySet,
        questions: resetQuestions,
        lastAccessed: Date.now()
      };
      
      // Save back to storage
      saveSessionToCookie(updatedStudySet);
      
      // If this is the currently loaded study set, update state
      if (state.studySet?.id === id) {
        setState({
          ...state,
          studySet: updatedStudySet
        });
      }
    }
  };

  // Context value
  const value = {
    ...state,
    loadStudySet,
    nextQuestion,
    previousQuestion,
    submitAnswer,
    resetSession,
    getAllSavedSessions,
    deleteStudySet,
    resetStudySetProgress,
    goToQuestion,
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