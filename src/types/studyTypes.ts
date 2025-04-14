// Basic question types
export type QuestionType = 'multiple-choice' | 'text-input';

// Multiple choice option
export interface Option {
  id: string;
  text: string;
  isCorrect?: boolean;
}

// Base question interface
export interface BaseQuestion {
  id: string;
  type: QuestionType;
  text: string[];
  answer: string | null;
  isUserCorrect: boolean | null;
}

// Multiple choice question
export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: Option[];
}

// Text input question
export interface TextInputQuestion extends BaseQuestion {
  type: 'text-input';
  correctAnswers: string[];
  explanation?: string;
}

// Union type for all question types
export type Question = MultipleChoiceQuestion | TextInputQuestion;

// Settings interface
export interface StudySettings {
  persistSession: boolean;
}

// Complete study set
export interface StudySet {
  title: string;
  settings: StudySettings;
  questions: Question[];
}

// State for the study session
export interface StudySessionState {
  studySet: StudySet | null;
  currentQuestionIndex: number;
  isLoading: boolean;
  error: string | null;
} 