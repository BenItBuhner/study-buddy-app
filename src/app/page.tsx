'use client';

import React, { useState, useEffect } from 'react';
import { useStudySession } from '@/contexts/StudySessionContext';
import JsonInputArea from '@/components/JsonInputArea';
import { StudySet /*, Question // Unused */ } from '@/types/studyTypes';
// import Link from 'next/link'; // Unused
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PlusCircle, 
  // FilePlus, // Unused
  Trash2, 
  RotateCcw, 
  BookOpen,
  Clock,
  AlertCircle,
  Sparkles,
  Download,
  Pencil,
  Pin,
  PinOff,
  Type
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAIGeneration } from '@/contexts/AIGenerationContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { exportStudySet } from '@/utils/exportUtils';
import RenameDialog from '@/components/RenameDialog';

export default function Home() {
  const router = useRouter();
  const {
    // studySet, // Unused in this component
    loadStudySet,
    // resetSession, // Unused in this component
    getAllSavedSessions,
    deleteStudySet,
    resetStudySetProgress,
    renameStudySet,
    togglePinStudySet
  } = useStudySession();
  const { openAIModal } = useAIGeneration();

  const [savedSessions, setSavedSessions] = useState<StudySet[]>([]);
  const [jsonInputVisible, setJsonInputVisible] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [studySetToDelete, setStudySetToDelete] = useState<string | null>(null);
  const [studySetToReset, setStudySetToReset] = useState<string | null>(null);
  const [studySetToRename, setStudySetToRename] = useState<StudySet | null>(null);

  // Load all saved sessions from cookies
  const loadSavedSessions = React.useCallback(() => {
    const sessions = getAllSavedSessions();
    // Sort by pinned status first, then by last accessed time (most recent first)
    sessions.sort((a, b) => {
      // If both have the same pinned status, sort by lastAccessed descending
      if (a.isPinned === b.isPinned) {
        return (b.lastAccessed || 0) - (a.lastAccessed || 0);
      }
      // Pinned items come first (true sorts before false/undefined)
      return a.isPinned ? -1 : 1;
    });
    setSavedSessions(sessions);
  }, [getAllSavedSessions]); // Added getAllSavedSessions dependency for useCallback

  // Load saved sessions on mount
  useEffect(() => {
    loadSavedSessions();
  }, [loadSavedSessions]); // Added loadSavedSessions dependency

  // Calculate stats for a study set
  const calculateStats = (set: StudySet) => {
    const totalQuestions = set.questions.length;
    const answeredQuestions = set.questions.filter(q => q.answer !== null).length;
    const correctAnswers = set.questions.filter(q => q.isUserCorrect === true).length;
    
    const completionPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
    const accuracyPercentage = answeredQuestions > 0 
      ? Math.round((correctAnswers / answeredQuestions) * 100) 
      : 0;
      
    return {
      completionPercentage,
      accuracyPercentage,
      answeredQuestions,
      totalQuestions,
      correctAnswers
    };
  };
  
  // Filter active (in-progress or completed) study sets
  const getActiveSessions = () => {
    return savedSessions.filter(session => {
      const stats = calculateStats(session);
      return stats.answeredQuestions > 0;
    });
  };

  // Handle loading a study set and redirecting to quiz page
  const handleLoadStudySet = (set: StudySet) => {
    loadStudySet(set);
    router.push('/quiz');
  };

  // Handle JSON loading
  const handleJsonLoaded = (loadedStudySet: StudySet) => {
    handleLoadStudySet(loadedStudySet);
    setJsonInputVisible(false);
  };

  // Permanently delete a study set
  const handleDeleteStudySet = (id: string) => {
    setStudySetToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  // Reset progress for a study set
  const handleResetStudySet = (id: string) => {
    setStudySetToReset(id);
    setResetDialogOpen(true);
  };

  // Format date for display
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle exporting a study set
  const handleExportStudySet = (e: React.MouseEvent, session: StudySet, withProgress: boolean = false) => {
    e.stopPropagation();
    exportStudySet(session, withProgress);
  };

  // Confirm deleting a study set
  const confirmDeleteStudySet = () => {
    if (studySetToDelete) {
      deleteStudySet(studySetToDelete);
      loadSavedSessions(); // Refresh the list
      setDeleteDialogOpen(false);
      setStudySetToDelete(null);
    }
  };
  
  // Confirm resetting a study set's progress
  const confirmResetStudySet = () => {
    if (studySetToReset) {
      resetStudySetProgress(studySetToReset);
      loadSavedSessions(); // Refresh the list
      setResetDialogOpen(false);
      setStudySetToReset(null);
    }
  };

  // Handle opening the rename dialog
  const handleOpenRenameDialog = (e: React.MouseEvent, session: StudySet) => {
    e.stopPropagation(); // Prevent card click
    setStudySetToRename(session);
    setRenameDialogOpen(true);
  };

  // Handle closing the rename dialog
  const handleCloseRenameDialog = () => {
    setRenameDialogOpen(false);
    setStudySetToRename(null);
    // Refresh the list after potential rename
    loadSavedSessions(); 
  };

  // Handle toggling the pin status
  const handleTogglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent card click
    togglePinStudySet(id);
    // Refresh the list immediately to show the change
    loadSavedSessions(); 
  };

  return (
    <div>
      {/* Navigation Header */}
      <div className="flex flex-row items-center justify-between gap-4 bg-primary/5 p-4 rounded-xl mb-6">
        {/* Left side - Removed Recent sessions */}
        <div>
          {/* Placeholder or leave empty */}
        </div>
        
        {/* Theme Toggle - Right aligned */}
        <div className="flex gap-2">
          <ThemeToggle />
        </div>
      </div>
      
      {/* Main Content Grid - Make it stack vertically on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Study Sets List (Order 1 on mobile) */}
        <div className="lg:col-span-5 space-y-4 order-1 lg:order-none">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Active Study Sets</CardTitle>
              <CardDescription>Sets you&apos;re currently working on</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
              {getActiveSessions().length > 0 ? (
                getActiveSessions().map((session) => {
                  const stats = calculateStats(session);
                  return (
                    <div 
                      key={session.id} 
                      className="border rounded-lg p-3 hover:bg-accent/30 transition-colors relative group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="cursor-pointer flex-1" onClick={() => handleLoadStudySet(session)}>
                          <h3 className="font-medium break-words">{session.title}</h3>
                          <div className="text-sm text-muted-foreground mt-1">
                            {stats.answeredQuestions} of {stats.totalQuestions} answered
                          </div>
                          {stats.answeredQuestions > 0 && (
                            <div className="flex items-center mt-1 text-sm">
                              <span className="mr-1">Accuracy:</span>
                              <span className={stats.accuracyPercentage >= 70 ? "text-[#1ed760]" : "text-[#ff3333]"}>
                                {stats.accuracyPercentage}%
                              </span>
                            </div>
                          )}
                          {session.lastAccessed && (
                            <div className="text-xs mt-1 text-muted-foreground flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Last used: {formatDate(session.lastAccessed)}
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0 flex flex-col items-end gap-1">
                          {stats.answeredQuestions > 0 ? 
                            (stats.answeredQuestions === stats.totalQuestions ? (
                              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full whitespace-nowrap">
                                Completed
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-1 bg-[#1ed760]/10 text-[#1ed760] rounded-full whitespace-nowrap">
                                In progress
                              </span>
                            )) : (
                              <span className="text-xs px-2 py-1 bg-accent/20 text-muted-foreground rounded-full whitespace-nowrap">
                                Not started
                              </span>
                            )}
                          {/* Controls - Reset progress button instead of delete */}
                          <div className="opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResetStudySet(session.id);
                              }}
                              title="Reset progress"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-muted h-2 rounded-full mt-3">
                        <div 
                          className="h-2 rounded-full bg-primary" 
                          style={{ width: `${stats.completionPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                  <AlertCircle className="h-10 w-10 mb-2 text-primary/50" />
                  <p className="mb-1">No active study sets</p>
                  <p className="text-sm">Start a set to see it here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Input Area or Dashboard (Order 2 on mobile) */}
        <div className="lg:col-span-7 order-2 lg:order-none">
          {jsonInputVisible ? (
            <Card>
              <CardHeader>
                <CardTitle>Add New Study Set</CardTitle>
                <CardDescription>Paste your JSON or upload a file</CardDescription>
              </CardHeader>
              <CardContent>
                <JsonInputArea onJsonLoaded={handleJsonLoaded} />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setJsonInputVisible(false)}>
                  Cancel
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>All Study Sets</CardTitle>
                    <CardDescription>Your complete library</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={() => setJsonInputVisible(true)}
                      className="shrink-0"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      New Set
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => openAIModal()}
                      className="shrink-0"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI Generate
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {savedSessions.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {savedSessions.map((session) => {
                        const stats = calculateStats(session);
                        return (
                          <Card 
                            key={session.id}
                            className="border-2 border-primary/10 hover:border-primary/30 transition-colors cursor-pointer relative group"
                            onClick={() => handleLoadStudySet(session)}
                          >
                            <CardContent className="p-6 flex flex-col items-center text-center">
                              <BookOpen className="h-12 w-12 text-primary/50 mb-4" />
                              <h3 className="font-medium mb-1 line-clamp-1 break-all">{session.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {stats.answeredQuestions} of {stats.totalQuestions} answered
                              </p>
                              
                              {/* Status badge */}
                              {stats.answeredQuestions > 0 ? 
                                (stats.answeredQuestions === stats.totalQuestions ? (
                                  <span className="text-xs px-2 py-1 mt-2 bg-primary/10 text-primary rounded-full inline-block">
                                    Completed
                                  </span>
                                ) : (
                                  <span className="text-xs px-2 py-1 mt-2 bg-[#1ed760]/10 text-[#1ed760] rounded-full inline-block">
                                    In progress
                                  </span>
                                )) : (
                                  <span className="text-xs px-2 py-1 mt-2 bg-accent/20 text-muted-foreground rounded-full inline-block">
                                    Not started
                                  </span>
                                )}
                              
                              {/* Control buttons - top right */}
                              <div className="absolute top-2 right-2 flex space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary ${session.isPinned ? 'text-primary' : ''}`}
                                  onClick={(e) => handleTogglePin(e, session.id)}
                                  title={session.isPinned ? "Unpin set" : "Pin set"}
                                >
                                  {session.isPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary"
                                  onClick={(e) => handleOpenRenameDialog(e, session)}
                                  title="Rename set"
                                >
                                  <Type className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent card click
                                    openAIModal(session); // Pass session to edit
                                  }}
                                  title="Edit with AI"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary"
                                  onClick={(e) => handleExportStudySet(e, session, false)}
                                  title="Export set"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteStudySet(session.id);
                                  }}
                                  title="Delete set"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 flex flex-col items-center">
                      <AlertCircle className="h-16 w-16 mb-4 text-primary/50" />
                      <p className="text-lg font-medium mb-2">No study sets yet!</p>
                      <p className="text-muted-foreground mb-6">Create your first set to get started</p>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <Button 
                          size="lg"
                          onClick={() => setJsonInputVisible(true)}
                        >
                          <PlusCircle className="mr-2 h-5 w-5" />
                          Create New Study Set
                        </Button>
                        <Button 
                          size="lg"
                          variant="outline"
                          onClick={() => openAIModal()}
                        >
                          <Sparkles className="mr-2 h-5 w-5" />
                          Generate with AI
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this study set and all of your progress.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteStudySet} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Progress?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all progress for this study set.
              Your answers will be cleared, but the set will remain in your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResetStudySet} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Reset Progress
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Rename Dialog */}
      <RenameDialog 
        isOpen={renameDialogOpen}
        onClose={handleCloseRenameDialog}
        studySet={studySetToRename}
      />
    </div>
  );
}
