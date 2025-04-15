'use client';

import React, { useState, useEffect } from 'react';
import { Question } from '@/types/studyTypes';
import LatexRenderer from './LatexRenderer';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, HelpCircle, Check, X } from "lucide-react";
import confetti from 'canvas-confetti';
import 'katex/dist/katex.min.css';

interface QuestionDisplayProps {
  question: Question | null;
  onAnswerSubmit: (questionId: string, answer: string) => void;
  questionIndex?: number; // Optional index for correct sequential numbering
}

export default function QuestionDisplay({ question, onAnswerSubmit, questionIndex }: QuestionDisplayProps) {
  const [inputValue, setInputValue] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  
  // Reset input value when question changes
  useEffect(() => {
    if (question) {
      setInputValue(question.answer || '');
      
      // If the question was just answered correctly, show celebration
      if (question.isUserCorrect === true && !showConfetti) {
        setShowConfetti(true);
        
        // Trigger the confetti animation
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4f46e5', '#3b82f6', '#06b6d4', '#8b5cf6']
        });
        
        // Additional burst after a short delay
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#4f46e5', '#3b82f6', '#06b6d4']
          });
          
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#8b5cf6', '#06b6d4', '#3b82f6']
          });
        }, 300);
      }
      
      // Set showFeedback based on user interaction - ONLY if the user has actually submitted an answer
      setShowFeedback(question.answer !== null && question.isUserCorrect !== null);
    }
  }, [question]);
  
  // Reset confetti state when question changes
  useEffect(() => {
    setShowConfetti(false);
  }, [question?.id]);
  
  // If no question is available, show a placeholder
  if (!question) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="w-full shadow-md">
          <CardContent className="pt-6 text-center p-10">
            <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground text-lg">No question available.</p>
            <p className="text-muted-foreground mt-2">Please load a study set to begin.</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Handle multiple choice selection
  const handleMultipleChoiceSelect = (optionId: string) => {
    // Only allow selection if answer not already submitted
    if (question.isUserCorrect === null) {
      setIsAnimating(true);
      setTimeout(() => {
        onAnswerSubmit(question.id, optionId);
        setIsAnimating(false);
      }, 300);
    }
  };

  // Handle text input submission
  const handleTextSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (question.isUserCorrect === null && inputValue.trim()) {
      setIsAnimating(true);
      setTimeout(() => {
        onAnswerSubmit(question.id, inputValue);
        setIsAnimating(false);
      }, 300);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // Generate a question number display (e.g., "Q1")
  // If questionIndex is provided, use it for consistent sequential numbering
  // Otherwise fall back to extracting a number from the question ID
  const questionNumber = `Q${questionIndex || question.id.replace(/\D/g, '') || '1'}`;

  // Format text with LaTeX support - updated to use LatexRenderer
  const formatText = (text: string) => {
    return <LatexRenderer content={text} />;
  };

  // Determine if the user has submitted an answer
  const hasSubmitted = question.answer !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={isAnimating ? "animate-pulse" : ""}
    >
      <Card className="w-full study-card overflow-hidden border-2">
        <CardHeader className="bg-primary/5 pb-4">
          {/* Question Number Tag - Above on mobile, right-aligned on desktop */}
          <div className="flex justify-end mb-2 sm:mb-0 sm:absolute sm:right-4 sm:top-4">
            <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary z-10 shadow-sm">
              {questionIndex ? `Q${questionIndex}` : questionNumber}
            </div>
          </div>
          
          {/* Question Text - supports multiple paragraphs */}
          <div className="mt-2 sm:mt-4 sm:pr-14">
            {question.text.map((paragraph, index) => (
              <p key={index} className={`mb-3 ${index === 0 ? 'text-lg font-medium' : ''}`}>
                {formatText(paragraph)}
              </p>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Question Input - varies by type */}
          {question.type === 'multiple-choice' ? (
            // Multiple Choice Options
            <div className="space-y-3">
              {question.options.map((option) => {
                const isSelected = hasSubmitted && question.answer === option.id;
                const isCorrect = option.isCorrect;
                const isIncorrect = isSelected && question.isUserCorrect === false;
                
                let optionClass = "w-full text-left p-4 rounded-lg border-2 transition-colors";
                
                if (hasSubmitted && showFeedback) {
                  if (isSelected && question.isUserCorrect) {
                    optionClass += " bg-[#1ed760]/10 border-[#1ed760]";
                  } else if (isSelected && !question.isUserCorrect) {
                    optionClass += " bg-[#ff3333]/10 border-[#ff3333]";
                  } else if (option.isCorrect) {
                    optionClass += " bg-[#1ed760]/5 border-[#1ed760]/50";
                  } else {
                    optionClass += " bg-accent/10 border-accent/20";
                  }
                } else {
                  optionClass += " bg-accent/10 hover:bg-accent/20 border-accent/20";
                  if (isSelected) {
                    optionClass += " border-primary";
                  }
                }
                
                return (
                  <motion.button 
                    key={option.id}
                    type="button"
                    onClick={() => handleMultipleChoiceSelect(option.id)}
                    className={optionClass}
                    whileHover={{ scale: hasSubmitted ? 1 : 1.01 }}
                    whileTap={{ scale: hasSubmitted ? 1 : 0.99 }}
                    disabled={hasSubmitted}
                  >
                    <div className="flex items-start">
                      <div className="flex-grow">
                        <div className="font-medium">
                          {option.id.toUpperCase()}. {formatText(option.text)}
                        </div>
                      </div>
                      
                      {hasSubmitted && showFeedback && (
                        <div className="flex-shrink-0 ml-2">
                          {isSelected && question.isUserCorrect && (
                            <Check className="h-5 w-5 text-[#1ed760]" />
                          )}
                          {isSelected && !question.isUserCorrect && (
                            <X className="h-5 w-5 text-[#ff3333]" />
                          )}
                          {!isSelected && option.isCorrect && (
                            <Check className="h-5 w-5 text-[#1ed760]/50" />
                          )}
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            // Text Input
            <form onSubmit={handleTextSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="answer" className="text-sm font-medium">
                  Your Answer:
                </Label>
                <div className="relative">
                  <Input
                    type="text"
                    id="answer"
                    name="answer"
                    value={inputValue}
                    onChange={handleInputChange}
                    className={`w-full pr-10 ${
                      question.isUserCorrect === true
                        ? 'border-[#1ed760] bg-[#1ed760]/10'
                        : question.isUserCorrect === false
                        ? 'border-[#ff3333] bg-[#ff3333]/10'
                        : ''
                    }`}
                    placeholder="Type your answer here..."
                    disabled={question.isUserCorrect !== null}
                  />
                  {question.isUserCorrect === true && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#1ed760]" />
                  )}
                  {question.isUserCorrect === false && (
                    <XCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#ff3333]" />
                  )}
                </div>
              </div>
              
              {question.isUserCorrect === null && (
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button type="submit" className="w-full">
                    Submit Answer
                  </Button>
                </motion.div>
              )}
            </form>
          )}
        </CardContent>

        {/* Only show the answer feedback AFTER the user has submitted an answer */}
        {question.answer !== null && question.isUserCorrect !== null && hasSubmitted && showFeedback && (
          <CardFooter className="border-t bg-card px-6 py-4">
            <Alert 
              variant={question.isUserCorrect ? "default" : "destructive"} 
              className={`w-full border-l-4 shadow-sm ${
                question.isUserCorrect ? 'border-[#1ed760] border-l-[#1ed760]' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {question.isUserCorrect ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                  >
                    <CheckCircle className="h-5 w-5 text-[#1ed760]" />
                  </motion.div>
                ) : (
                  <XCircle className="h-5 w-5 text-[#ff3333]" />
                )}
                <AlertTitle className="text-base">
                  {question.isUserCorrect 
                    ? (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        Correct Answer!
                      </motion.span>
                    ) 
                    : 'Incorrect Answer'
                  }
                </AlertTitle>
              </div>
              
              {/* Show explanation if available and user is incorrect */}
              {!question.isUserCorrect && 'explanation' in question && question.explanation && (
                <AlertDescription className="mt-4 pb-3 border-b border-[#ff3333]/20">
                  <h3 className="font-medium mb-2 text-base text-[#ff3333]/90">Explanation:</h3>
                  <div className="pl-2 text-sm bg-[#ff3333]/5 p-3 rounded-md">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="explanation-content whitespace-normal"
                    >
                      {formatText(question.explanation)}
                    </motion.div>
                  </div>
                </AlertDescription>
              )}
              
              {/* Show correct answers if user is incorrect */}
              {!question.isUserCorrect && question.type === 'text-input' && (
                <AlertDescription className="mt-4">
                  <div className="flex items-center bg-[#ff3333]/5 p-3 rounded-md">
                    <div className="text-sm">
                      <span className="text-[#ff3333]/90 font-medium">
                        Correct answer{question.correctAnswers.length > 1 ? 's' : ''}:
                      </span>{' '}
                      <span className="font-bold ml-1">
                        {question.correctAnswers.join(' or ')}
                      </span>
                    </div>
                  </div>
                </AlertDescription>
              )}
              
              {question.type === 'multiple-choice' && !question.isUserCorrect && (
                <AlertDescription className="mt-4">
                  <div className="flex items-center bg-[#ff3333]/5 p-3 rounded-md">
                    <div className="text-sm">
                      <span className="text-[#ff3333]/90 font-medium">
                        Correct answer:
                      </span>{' '}
                      <span className="font-bold ml-1">
                        Option {question.options.find(opt => opt.isCorrect)?.id.toUpperCase() || ''}
                      </span>
                    </div>
                  </div>
                </AlertDescription>
              )}
            </Alert>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
} 