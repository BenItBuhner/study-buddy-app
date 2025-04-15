'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStudySession } from '@/contexts/StudySessionContext';
import QuestionDisplay from '@/components/QuestionDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Home, Award } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import LatexRenderer from '@/components/LatexRenderer';
import { CheckCircle, XCircle } from 'lucide-react';

export default function QuizPage() {
  const router = useRouter();
  const {
    studySet,
    currentQuestionIndex,
    nextQuestion,
    previousQuestion,
    submitAnswer,
    resetSession,
    goToQuestion,
    saveCurrentSession
  } = useStudySession();
  
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  
  // Redirect if no study set is loaded
  useEffect(() => {
    if (!studySet) {
      router.push('/');
    }
  }, [studySet, router]);
  
  // Check if all questions have been answered to show completion screen
  useEffect(() => {
    if (studySet) {
      const allAnswered = studySet.questions.every(q => q.answer !== null);
      setShowCompletionScreen(allAnswered);
      
      // Launch confetti when all questions are answered
      if (allAnswered) {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 }
        });
      }
    }
  }, [studySet]);
  
  // Add a beforeunload event listener to save progress when navigating away
  useEffect(() => {
    // Save session when component unmounts (navigation)
    return () => {
      if (studySet) {
        console.log("Saving session before unmount/navigation");
        saveCurrentSession();
      }
    };
  }, [studySet, saveCurrentSession]);
  
  // Autosave progress periodically (every 30 seconds)
  useEffect(() => {
    if (!studySet) return;
    
    // Set up autosave interval
    const autosaveInterval = setInterval(() => {
      console.log("Autosaving session...");
      saveCurrentSession();
    }, 30000); // Save every 30 seconds
    
    // Clean up on unmount
    return () => clearInterval(autosaveInterval);
  }, [studySet, saveCurrentSession]);
  
  // Handle back navigation without resetting progress
  const handleBackToHome = () => {
    // Save progress before navigation
    saveCurrentSession();
    // Navigate back to home
    router.push('/');
  };
  
  // Handle resetting the session and redirecting to home
  const handleResetSession = () => {
    resetSession();
    router.push('/');
  };
  
  if (!studySet) {
    return null; // Will redirect in the useEffect
  }
  
  const currentQuestion = studySet.questions[currentQuestionIndex];
  
  // Calculate stats
  const answeredCount = studySet.questions.filter(q => q.answer !== null).length;
  const correctCount = studySet.questions.filter(q => q.isUserCorrect === true).length;
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  const totalQuestions = studySet.questions.length;
  const progressPercentage = Math.round((answeredCount / totalQuestions) * 100);
  
  // Completion screen
  if (showCompletionScreen) {
    return (
      <div>
        {/* Navigation Header */}
        <div className="flex items-center justify-between gap-4 bg-primary/5 p-4 rounded-xl mb-6">
          {/* Back Button - Icon only on mobile */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBackToHome}
            className="text-primary sm:hidden" // Show only icon on small screens
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToHome}
            className="text-sm text-primary hidden sm:flex items-center" // Show text on larger screens
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
          </Button>
          
          {/* Title - Centered, truncate */}
          <div className="flex-1 text-center min-w-0">
            <h2 className="text-lg font-semibold truncate">{studySet.title} - Results</h2>
          </div>
          
          {/* Theme Toggle - Right aligned */}
          <div className="flex gap-2">
            <ThemeToggle />
          </div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-2 border-primary/30">
            <CardHeader className="text-center bg-primary/5 pb-6">
              <Award className="h-16 w-16 text-primary mx-auto mb-2" />
              <CardTitle className="text-2xl">Quiz Completed!</CardTitle>
              <CardDescription>You&apos;ve completed the {studySet.title}</CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-secondary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Questions</p>
                  <p className="text-3xl font-bold">{totalQuestions}</p>
                </div>
                
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Correct Answers</p>
                  <p className="text-3xl font-bold text-[#1ed760]">{correctCount}</p>
                </div>
                
                <div className="p-4 bg-secondary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Accuracy</p>
                  <p className={`text-3xl font-bold ${accuracy >= 70 ? 'text-[#1ed760]' : 'text-[#ff3333]'}`}>
                    {accuracy}%
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Question Summary:</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto p-2">
                  {studySet.questions.map((question, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-md flex items-center justify-between cursor-pointer hover:bg-accent/30 transition-colors ${
                        question.isUserCorrect 
                          ? 'bg-[#1ed760]/10 border border-[#1ed760]/30' 
                          : 'bg-[#ff3333]/10 border border-[#ff3333]/30'
                      }`}
                      onClick={() => {
                        goToQuestion(idx);
                        setShowCompletionScreen(false);
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <span className="font-medium mr-2 text-xs">Q{idx + 1}.</span>
                          <div className="text-sm line-clamp-2 flex-1 mr-2">
                            <LatexRenderer content={question.text[0]} />
                          </div>
                          {question.isUserCorrect 
                            ? <CheckCircle className="h-4 w-4 text-[#1ed760]" /> 
                            : <XCircle className="h-4 w-4 text-[#ff3333]" />
                          }
                        </div>
                        {!question.isUserCorrect && question.type === 'text-input' && question.explanation && (
                          <div className="mt-1 text-xs text-[#ff3333]/80 italic line-clamp-1">
                            Correct: {question.correctAnswers[0]}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button variant="outline" onClick={() => setShowCompletionScreen(false)}>
                Review Questions
              </Button>
              <Button onClick={() => handleResetSession()}>
                <Home className="h-4 w-4 mr-2" />
                Return Home
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      {/* Navigation Header */}
      <div className="flex items-center justify-between gap-4 bg-primary/5 p-4 rounded-xl mb-6">
        {/* Back Button - Icon only on mobile */}
        <Button 
          variant="ghost" 
          size="icon" // Use icon size for consistency
          onClick={handleBackToHome}
          className="text-primary sm:hidden" // Icon only on mobile
        >
          <ArrowLeft className="h-5 w-5" /> 
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBackToHome}
          className="text-sm text-primary hidden sm:flex items-center" // Text + icon on larger
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
        </Button>
        
        {/* Title - Centered, truncate */}
        <div className="flex-1 text-center min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold truncate">{studySet.title}</h1>
        </div>
        
        {/* Theme Toggle - Right aligned */}
        <div className="flex gap-2">
          <ThemeToggle />
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-muted h-2 rounded-full mb-8">
        <div 
          className="h-2 rounded-full bg-primary" 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      
      {/* Stats - Adjust layout/spacing */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-4 mb-4">
        <span className={`text-sm font-medium ${accuracy >= 70 ? 'text-[#1ed760]' : 'text-[#ff3333]'}`}>
          Accuracy: {accuracy}%
        </span>
        <span className="text-sm text-muted-foreground">
          {answeredCount}/{totalQuestions} Answered
        </span>
      </div>
      
      {/* Main Content Grid - Stack vertically */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Question Display - First on all layouts */}
        <div className="lg:col-span-8 lg:order-2 order-1">
          <Card className="mb-4">
            <CardContent className="pt-6">
              <QuestionDisplay 
                question={currentQuestion} 
                onAnswerSubmit={submitAnswer}
                questionIndex={currentQuestionIndex + 1}
              />
            </CardContent>
          </Card>
          
          {/* Navigation Controls - Adjust spacing */}
          <div className="flex justify-between items-center mt-4 gap-2">
            <Button 
              variant="outline" 
              size="sm" // Make buttons slightly smaller on mobile
              onClick={previousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            
            <span className="text-xs sm:text-sm text-muted-foreground text-center">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
            
            <Button 
              size="sm" // Make buttons slightly smaller on mobile
              onClick={nextQuestion}
              disabled={currentQuestionIndex === totalQuestions - 1}
            >
              <span className="hidden sm:inline">Next</span>
              <ArrowRight className="h-4 w-4 sm:ml-2" />
            </Button>
          </div>
        </div>
        
        {/* Question List - Always second on mobile, first on lg (left side) */}
        <div className="lg:col-span-4 space-y-4 lg:order-1 order-2">
          <Card>
            {/* Make CardContent height adapt better on mobile */}
            <CardContent className="h-[300px] lg:h-[600px] overflow-y-auto p-3">
              <div className="space-y-2">
                {studySet.questions.map((question, idx) => {
                  const isAnswered = question.answer !== null;
                  const isCorrect = question.isUserCorrect === true;
                  const isActive = idx === currentQuestionIndex;
                  
                  return (
                    <div 
                      key={idx}
                      className={`p-3 rounded-md border-2 cursor-pointer transition-colors hover:bg-accent/30 flex items-start gap-3 ${
                        isActive ? 'border-primary bg-primary/5' : 'border-accent/20'
                      }`}
                      onClick={() => goToQuestion(idx)}
                    >
                      <div className="mt-1">
                        {isAnswered ? (
                          isCorrect ? (
                            <CheckCircle className="h-5 w-5 text-[#1ed760]" />
                          ) : (
                            <XCircle className="h-5 w-5 text-[#ff3333]" />
                          )
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground opacity-50"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 overflow-hidden">
                        <span className={`font-medium text-sm ${isActive ? 'text-primary' : ''}`}>Q{idx + 1}.</span>
                        <div className="text-sm line-clamp-2 mt-1">
                          <LatexRenderer content={question.text[0]} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          {/* Return to Study Set List button - Moved down to be after question list */}
          <div className="flex justify-center mt-6 sm:mt-4">
            <Button 
              variant="outline" 
              onClick={handleResetSession}
            >
              <Home className="h-4 w-4 mr-2" />
              Return Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 