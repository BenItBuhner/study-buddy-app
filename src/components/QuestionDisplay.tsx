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
  onAnswerSubmit: (questionId: string, answer: string | null) => void;
  questionIndex?: number; // Optional index for correct sequential numbering
}

// Helper function to check if the answer is correct
const checkAnswer = (question: Question, userAnswer: string | null): boolean => {
  if (userAnswer === null) return false;
  
  if (question.type === 'multiple-choice') {
    const correctOption = question.options.find(opt => opt.isCorrect);
    return userAnswer === correctOption?.id;
  } else if (question.type === 'text-input') {
    // Case-insensitive and trim whitespace for text inputs
    const normalizedUserAnswer = userAnswer.trim().toLowerCase();
    return question.correctAnswers.some(correct => 
      correct.trim().toLowerCase() === normalizedUserAnswer
    );
  }
  
  return false;
};

export default function QuestionDisplay({ question, onAnswerSubmit, questionIndex }: QuestionDisplayProps) {
  const [inputValue, setInputValue] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showAnswerDirectly, setShowAnswerDirectly] = useState(false); // State for Give Up
  
  // Reset input value and manage feedback visibility when question changes
  useEffect(() => {
    if (question) {
      setInputValue(question.answer || '');
      setHasSubmitted(question.answer !== null);
      // setShowAnswerDirectly(false); // DO NOT reset here - only reset on Try Again or new question load
      
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
    }
  }, [question, showConfetti]); // Keep showConfetti dependency for its logic

  // Reset confetti state when question ID changes (navigating to a different question)
  useEffect(() => {
    setShowConfetti(false);
    // Also reset the Give Up state when navigating to a NEW question
    setShowAnswerDirectly(false); 
  }, [question?.id]);

  // Effect for confetti
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (showConfetti) {
      timeoutId = setTimeout(() => setShowConfetti(false), 3000);
    }
    return () => clearTimeout(timeoutId);
  }, [showConfetti]);
  
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
    if (hasSubmitted) return; // Don't allow changes after submission
    setInputValue(optionId);
    
    // Auto-submit the answer for multiple-choice questions
    if (question && question.type === 'multiple-choice') {
      console.log("Auto-submitting multiple-choice answer:", optionId);
      onAnswerSubmit(question.id, optionId);
      setHasSubmitted(true);
      
      const isActuallyCorrect = checkAnswer(question, optionId);
      if (isActuallyCorrect) {
        setShowConfetti(true);
      }
    }
  };

  // Handle text input submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Prevent default form submission behavior
    e.preventDefault();
    
    if (!inputValue) return;
    
    onAnswerSubmit(question.id, inputValue);
    setHasSubmitted(true);
    
    const isActuallyCorrect = checkAnswer(question, inputValue);

    if (isActuallyCorrect) {
      setShowConfetti(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (hasSubmitted) return; // Don't allow changes after submission
    setInputValue(e.target.value);
  };

  // Handle Give Up button click
  const handleGiveUp = () => {
    if (!question) return;
    setShowAnswerDirectly(true); // Trigger answer reveal locally
    setHasSubmitted(true);       // Lock input
    onAnswerSubmit(question.id, null); // Submit null (counts as incorrect)
  };

  // Handle Try Again button click
  const handleTryAgain = () => {
    setInputValue("");          // Clear input
    setHasSubmitted(false);      // Allow input again
    setShowAnswerDirectly(false); // Hide revealed answer if Give Up was clicked before Try Again
  };

  // Generate a question number display (e.g., "Q1")
  // If questionIndex is provided, use it for consistent sequential numbering
  // Otherwise fall back to extracting a number from the question ID
  const questionNumber = `Q${questionIndex || question.id.replace(/\D/g, '') || '1'}`;

  // Format text with LaTeX support - updated to use LatexRenderer
  const formatText = (text: string) => {
    return <LatexRenderer content={text} />;
  };

  // Render feedback (correct/incorrect)
  const renderFeedback = () => {
    // Show feedback if the user submitted an answer OR if they clicked Give Up
    // Also ensure the question object exists
    if (!question || (!hasSubmitted && !showAnswerDirectly)) return null;

    // Determine correctness status, defaulting to incorrect if giving up
    const isCorrect = showAnswerDirectly ? false : question.isUserCorrect === true;

    return (
      <CardFooter className="border-t bg-card px-6 py-4">
        <Alert 
          variant={isCorrect ? "default" : "destructive"} 
          className={`w-full border-l-4 shadow-sm ${
            isCorrect ? 'border-[#1ed760] border-l-[#1ed760]' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            {isCorrect ? (
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
              {isCorrect 
                ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    Correct Answer!
                  </motion.span>
                ) 
                : showAnswerDirectly 
                ? 'Answer Revealed' // Different title for Give Up
                : 'Incorrect Answer'
              }
            </AlertTitle>
          </div>
          
          {/* Show explanation if available and NOT correct (or if given up) */}
          {!isCorrect && 'explanation' in question && question.explanation && (
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
          
          {/* Show correct text answers if NOT correct (or if given up) */}
          {!isCorrect && question.type === 'text-input' && (
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
          
          {/* Show correct MC answer if NOT correct (or if given up) */}
          {!isCorrect && question.type === 'multiple-choice' && (
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
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
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
            // Fragment to group MC options and buttons
            <>
              {/* Multiple Choice Options */}
              <div className="space-y-3">
                {question.options.map((option) => {
                  const isSelected = inputValue === option.id;
                  const showResult = hasSubmitted || showAnswerDirectly;
                  const isActuallyCorrect = option.isCorrect === true;
                  const wasUserCorrect = showAnswerDirectly ? false : question.isUserCorrect === true;
                  
                  let optionClass = "w-full text-left p-4 rounded-lg border-2 transition-colors";
                  
                  if (showResult) {
                    if (isSelected && wasUserCorrect) {
                      optionClass += " bg-[#1ed760]/10 border-[#1ed760]";
                    } else if (isSelected && !wasUserCorrect) {
                      optionClass += " bg-[#ff3333]/10 border-[#ff3333]";
                    } else if (isActuallyCorrect) {
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
                      onClick={() => !showResult && handleMultipleChoiceSelect(option.id)} 
                      className={optionClass}
                      whileHover={{ scale: showResult ? 1 : 1.01 }}
                      whileTap={{ scale: showResult ? 1 : 0.99 }}
                      disabled={showResult}
                    >
                      <div className="flex items-start">
                        <div className="flex-grow">
                          <div className="font-medium">
                            {option.id.toUpperCase()}. {formatText(option.text)}
                          </div>
                        </div>
                        {showResult && (
                          <div className="flex-shrink-0 ml-2">
                            {isActuallyCorrect && (
                              <Check className="h-5 w-5 text-[#1ed760]" />
                            )}
                            {isSelected && !isActuallyCorrect && (
                              <X className="h-5 w-5 text-[#ff3333]" />
                            )}
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              
              {/* Buttons for Multiple Choice: Try Again, Give Up */}
              {!hasSubmitted && (
                <div className="flex justify-end mt-4"> 
                  <Button type="button" variant="outline" onClick={handleGiveUp}>
                    Give Up
                  </Button>
                </div>
              )}
              {/* Show Try Again if submitted incorrectly OR if gave up */}
              {(hasSubmitted && !question.isUserCorrect) || showAnswerDirectly ? (
                <div className="flex justify-end mt-4"> 
                  <Button type="button" variant="outline" onClick={handleTryAgain}>
                    Try Again
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            // Text Input
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    disabled={hasSubmitted}
                  />
                  {question.isUserCorrect === true && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#1ed760]" />
                  )}
                  {question.isUserCorrect === false && (
                    <XCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#ff3333]" />
                  )}
                </div>
              </div>
              
              {/* Buttons: Submit, Try Again, Give Up */}
              {!hasSubmitted && (
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Button type="submit" className="flex-1">
                    Submit Answer
                  </Button>
                  <Button type="button" variant="outline" className="flex-1" onClick={handleGiveUp}>
                    Give Up
                  </Button>
                </div>
              )}
              {/* Show Try Again if submitted incorrectly OR if gave up */}
              {(hasSubmitted && !question.isUserCorrect) || showAnswerDirectly ? (
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={handleTryAgain}>
                    Try Again
                  </Button>
                </div>
              ) : null}
            </form>
          )}
        </CardContent>

        {/* Conditionally render feedback only if submitted or given up */}
        {(hasSubmitted || showAnswerDirectly) && renderFeedback()}
      </Card>
    </motion.div>
  );
} 