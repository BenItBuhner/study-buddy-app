'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage 
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAIGeneration, Attachment, AttachmentType } from '@/contexts/AIGenerationContext';
import { StudySet } from '@/types/studyTypes';
import { loadAIApiKey, loadAIModelPreference } from '@/utils/cookieUtils';
import { Loader2, X, PlusCircle, FileText, Link as LinkIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { v4 as uuidv4 } from 'uuid';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AnimatePresence } from 'framer-motion';

// Define types for custom properties we add to DOM elements
interface ScrollableElement extends Element {
  scrollAnimation?: number;
  scrollTimeout?: NodeJS.Timeout;
}

// Form schema validation
const formSchema = z.object({
  apiKey: z.string().min(1, { message: 'API key is required' }),
  model: z.string().min(1, { message: 'Model is required' }),
  prompt: z.string().min(10, { message: 'Prompt should be at least 10 characters' }),
  url: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AIGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudySetGenerated: (studySet: StudySet) => void;
}

export default function AIGenerationModal({ isOpen, onClose, onStudySetGenerated }: AIGenerationModalProps) {
  const { streamText } = useAIGeneration();
  
  // Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiKey: '',
      model: 'gemini-2.0-flash',
      prompt: '',
      url: '',
    },
  });

  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState(0);
  const [streamedText, setStreamedText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const streamContainerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  // Load saved API key and model preference on mount and when modal opens
  useEffect(() => {
    if (isOpen) {
      const savedApiKey = loadAIApiKey();
      const savedModel = loadAIModelPreference();
      
      if (savedApiKey) {
        form.setValue('apiKey', savedApiKey);
      }
      
      if (savedModel) {
        form.setValue('model', savedModel);
      }
    }
  }, [isOpen, form]);

  // Optimized auto-scroll with FAST, smooth, glitch-free motion
  useEffect(() => {
    if (!isStreaming || !scrollAreaRef.current) return;
    
    // Get the viewport element
    const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as ScrollableElement | null;
    if (!viewport) return;
    
    // Ensure auto-scroll is enabled during generation
    if (isGenerating && !autoScrollEnabled) {
      setAutoScrollEnabled(true);
    }
    
    // Keep track of the last animation ID
    let animationId: number | null = null;
    
    // Animation function - using standard cubic ease-in-out but faster
    const smoothScrollToBottom = () => {
      // Check if we should scroll
      if (!autoScrollEnabled && !isGenerating) return;
      
      // Get scroll positions
      const start = viewport.scrollTop;
      const target = viewport.scrollHeight - viewport.clientHeight;
      const distance = target - start;
      
      // Only scroll if needed
      if (distance <= 1) return;
      
      // Cancel any existing animation
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
      
      // Animation parameters - Significantly reduced duration for speed
      const duration = 75; // Reduced from 700ms to 350ms for much faster scroll
      const startTime = performance.now();
      
      // Animation step
      const step = (timestamp: number) => {
        const elapsed = timestamp - startTime;
        let progress = Math.min(elapsed / duration, 1);
        
        // Standard Cubic Ease-In-Out function for smoothness
        progress = progress < 0.5 
          ? 4 * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
          
        // Apply scroll position - use Math.floor to avoid jitters
        viewport.scrollTop = Math.floor(start + distance * progress);
        
        // Continue animation or clean up
        if (elapsed < duration) {
          animationId = requestAnimationFrame(step);
        } else {
          // Ensure we land exactly at the bottom
          viewport.scrollTop = target;
          animationId = null;
        }
      };
      
      // Start the animation
      animationId = requestAnimationFrame(step);
    };
    
    // Check regularly if scrolling is needed - increased frequency
    const checkInterval = setInterval(smoothScrollToBottom, 25); // Check every 60ms (was 80ms)
    
    // Periodic force re-enable during generation
    const forceReenableId = setInterval(() => {
      if (isGenerating && !autoScrollEnabled) {
        setAutoScrollEnabled(true);
        // Trigger an immediate scroll check
        smoothScrollToBottom();
      }
    }, 500); // Keep 500ms check
    
    // Cleanup
    return () => {
      clearInterval(checkInterval);
      clearInterval(forceReenableId);
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isStreaming, autoScrollEnabled, isGenerating]);
  
  // Simplified scroll handler - only detect scrolling away while not generating
  useEffect(() => {
    if (!isStreaming || !scrollAreaRef.current) return;
    
    const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as ScrollableElement | null;
    if (!viewport) return;
    
    // Add property for animation tracking
    viewport.scrollAnimation = 0;
    
    const handleScroll = () => {
      // Only consider disabling when not actively generating
      if (isGenerating) return;
      
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      // Within 40% of viewport height from bottom
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - (clientHeight * 0.4);
      
      // Only track auto-scroll state when not generating
      setAutoScrollEnabled(isNearBottom);
    };
    
    viewport.addEventListener('scroll', handleScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [isStreaming, autoScrollEnabled, isGenerating]);

  // Function to fetch content from a URL using a CORS proxy
  const fetchUrlContent = async (url: string): Promise<string> => {
    setIsUrlLoading(true);
    try {
      // Use a more reliable CORS proxy
      const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(corsProxyUrl, { 
        method: 'GET',
        headers: {
          'Content-Type': 'text/plain',
        },
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch URL (${response.status}): ${response.statusText}`);
      }
      
      const html = await response.text();
      if (!html || html.trim() === '') {
        throw new Error('Received empty content from URL');
      }
      return html;
    } catch (err) {
      console.error('Error fetching URL content:', err);
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('URL fetch timed out after 10 seconds');
      }
      throw new Error(`Failed to load URL: ${err instanceof Error ? err.message : 'Server returned 404 or connection error'}`);
    } finally {
      setIsUrlLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      // Default file type
      let fileType: AttachmentType = 'other';
      
      // Determine file type
      if (file.type.startsWith('image/')) {
        fileType = 'image';
      } else if (file.type === 'application/pdf') {
        fileType = 'pdf';
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        fileType = 'text';
      }

      // Create a new attachment with initial empty content
      const newAttachment: Attachment = {
        id: uuidv4(),
        type: fileType,
        name: file.name,
        content: '',
        size: file.size,
      };
      
      // Add attachment to state immediately (with empty content)
      setAttachments(prev => [...prev, newAttachment]);

      // Read file based on type
      const reader = new FileReader();
      
      reader.onload = () => {
        const result = reader.result as string;
        
        // Update the attachment with content once loaded
        setAttachments(prev => {
          return prev.map(att => 
            att.id === newAttachment.id 
              ? { ...att, content: result } 
              : att
          );
        });
      };
      
      reader.onerror = () => {
        console.error('Error reading file:', file.name);
        // Remove the attachment on error
        setAttachments(prev => prev.filter(a => a.id !== newAttachment.id));
      };
      
      // Start reading
      if (fileType === 'text') {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Add URL as attachment
  const handleAddUrl = async () => {
    if (!currentUrl.trim()) return;
    
    try {
      setIsUrlLoading(true);
      // Extract hostname for display
      // const hostname = new URL(currentUrl).hostname;
      
      // Create initial attachment object
      const newAttachment: Attachment = {
        id: uuidv4(),
        type: 'url',
        name: currentUrl.trim(),
        content: currentUrl.trim(),
        htmlContent: '',
      };
      
      // Add to attachments list immediately to show loading state
      setAttachments(prev => [...prev, newAttachment]);
      
      // Fetch HTML content
      const html = await fetchUrlContent(currentUrl.trim());
      
      // Update attachment with HTML content
      setAttachments(prev => {
        return prev.map(att => 
          att.id === newAttachment.id 
            ? { ...att, htmlContent: html } 
            : att
        );
      });
      
      setCurrentUrl('');
    } catch (err) {
      setError(`Failed to load URL: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Remove failed attachment
      setAttachments(prev => prev.filter(a => a.content !== currentUrl.trim()));
    } finally {
      setIsUrlLoading(false);
    }
  };

  // Remove attachment
  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => {
      const filtered = prev.filter(a => a.id !== id);
      if (currentAttachmentIndex >= filtered.length && filtered.length > 0) {
        setCurrentAttachmentIndex(filtered.length - 1);
      }
      return filtered;
    });
  };

  // Navigation for attachment carousel
  const handlePrevAttachment = () => {
    setCurrentAttachmentIndex(prev => 
      prev > 0 ? prev - 1 : attachments.length - 1
    );
  };

  const handleNextAttachment = () => {
    setCurrentAttachmentIndex(prev => 
      prev < attachments.length - 1 ? prev + 1 : 0
    );
  };

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setAttachments([]);
      setCurrentAttachmentIndex(0);
      setError(null);
      setStreamedText('');
      setIsStreaming(false);
      setAutoScrollEnabled(true);
    }
  }, [isOpen, form]);

  // Handle form submission with streaming
  const onSubmit = async (data: FormValues) => {
    try {
      setIsGenerating(true);
      setIsStreaming(true);
      setError(null);
      setStreamedText('');
      
      // Use the streaming API
      await streamText(
        data.apiKey,
        data.model,
        data.prompt,
        attachments,
        // Stream update callback
        (text) => {
          // Find only the new text that was added
          // const newChunk = text.slice(streamedText.length);
          // setLastChunk(newChunk);
          setStreamedText(text);
        },
        // Complete callback
        (studySet) => {
          setIsGenerating(false);
          setIsStreaming(false);
          onStudySetGenerated(studySet);
          onClose();
        },
        // Error callback
        (err) => {
          console.error('Error generating study set:', err);
          setError(err.message || 'Failed to generate study set.');
          setIsGenerating(false);
          setIsStreaming(false);
        }
      );
    } catch (err) {
      console.error('Error setting up streaming:', err);
      setError(err instanceof Error ? err.message : 'Failed to set up streaming.');
      setIsGenerating(false);
      setIsStreaming(false);
    }
  };

  // Simple HTML text extractor
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

  // Render attachment preview
  const renderAttachmentPreview = (attachment: Attachment) => {
    switch (attachment.type) {
      case 'image':
        return (
          <div className="relative w-full h-36 overflow-hidden rounded-md bg-muted">
            {attachment.content ? (
              <Image 
                src={attachment.content} 
                alt={attachment.name || 'Uploaded image preview'}
                layout="fill"
                objectFit="contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground">
                <Image src="/placeholder.svg" alt="Loading placeholder" width={32} height={32} className="h-8 w-8 mb-2" />
                <p className="text-sm">Loading image preview...</p>
              </div>
            )}
          </div>
        );
      case 'url':
        return (
          <div className="flex flex-col gap-2 p-2 rounded-md bg-muted">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              <span className="text-sm truncate">{attachment.content}</span>
            </div>
            {attachment.htmlContent && (
              <div className="text-xs mt-1 p-2 bg-background/50 rounded border border-border h-24 overflow-auto">
                <p className="font-medium mb-1">Content Preview:</p>
                <div className="opacity-70 whitespace-pre-wrap overflow-hidden">
                  {extractTextFromHtml(attachment.htmlContent).substring(0, 300)}...
                </div>
              </div>
            )}
          </div>
        );
      case 'pdf':
      case 'text':
      default:
        return (
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
            <FileText className="w-4 h-4" />
            <span className="text-sm truncate">{attachment.name || 'File attachment'}</span>
          </div>
        );
    }
  };

  // Function to render streaming text
  const renderStreamedText = () => {
    if (!streamedText) {
      return <p className="text-muted-foreground">Waiting for AI response...</p>;
    }

    // Split on newlines to properly format different lines
    const lines = streamedText.split('\n');
    
    return (
      <div>
        {lines.map((line, index) => (
          <div key={index} className="transition-opacity duration-300">
            {line || " "}
            {index < lines.length - 1 && <br />}
          </div>
        ))}
        {/* Spacer at the bottom */}
        <div style={{ height: '60px' }}></div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Study Set with AI</DialogTitle>
          <DialogDescription>
            Create a new study set using AI. You can provide a prompt and attach files or URLs to help the AI generate relevant questions.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Google AI API Key</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your Google AI API key" 
                        type="password"
                        className="w-full"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">Get API Key</a>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem className="md:col-span-1">
                    <FormLabel>Model</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="gemini-2.0-flash">2.0 Flash</SelectItem>
                        <SelectItem value="gemini-2.0-flash-thinking-exp-01-21">2.0 Flash Thinking</SelectItem>
                        <SelectItem value="gemini-2.5-pro-exp-03-25">2.5 Pro (Exp)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs invisible">
                      &nbsp;
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt (Topic for Study Set)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe what you want to study, e.g., 'Advanced calculus with derivatives and integrals'"
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* URL Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Add URL to reference (e.g., Wikipedia article)"
                value={currentUrl}
                onChange={(e) => setCurrentUrl(e.target.value)}
                className="flex-1"
                disabled={isUrlLoading}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddUrl}
                disabled={!currentUrl.trim() || isUrlLoading}
              >
                {isUrlLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add URL
                  </>
                )}
              </Button>
            </div>

            {/* File Upload */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                multiple
                accept="image/*,application/pdf,text/plain"
              />
              <Button 
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Upload Files (Images, PDFs, Text)
              </Button>
            </div>

            {/* Attachments Carousel */}
            {attachments.length > 0 && (
              <div className="border rounded-md p-4 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Attachments ({attachments.length})</h4>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handlePrevAttachment}
                      disabled={attachments.length <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs">
                      {currentAttachmentIndex + 1} / {attachments.length}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleNextAttachment}
                      disabled={attachments.length <= 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {attachments.length > 0 && (
                  <div className="relative">
                    {renderAttachmentPreview(attachments[currentAttachmentIndex])}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => handleRemoveAttachment(attachments[currentAttachmentIndex].id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Remove attachment</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}

                {/* Attachment Badges */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {attachments.map((att, index) => (
                    <Badge 
                      key={att.id} 
                      variant={index === currentAttachmentIndex ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setCurrentAttachmentIndex(index)}
                    >
                      {att.type === 'image' ? 
                        <Image src="/image-icon.svg" alt="Image icon" width={12} height={12} className="h-3 w-3 mr-1" /> :
                      att.type === 'pdf' ? 
                        <FileText className="h-3 w-3 mr-1" /> :
                      att.type === 'text' ? 
                        <FileText className="h-3 w-3 mr-1" /> :
                      att.type === 'url' ? 
                        <LinkIcon className="h-3 w-3 mr-1" /> :
                        <FileText className="h-3 w-3 mr-1" /> // Default icon
                      }
                      <span className="truncate max-w-[150px]">
                        {att.type === 'url' ? new URL(att.content).hostname : att.name}
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Streaming AI Response Preview */}
            {isStreaming && (
              <div className="border rounded-md p-3 space-y-2">
                <h4 className="text-sm font-medium flex items-center">
                  <span className="flex-1">AI Response</span>
                  {isGenerating && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      Generating...
                    </span>
                  )}
                </h4>
                <div className="relative" ref={streamContainerRef}>
                  {/* Top fade gradient - more prominent */}
                  <div className="absolute top-0 left-0 right-0 h-8 z-10 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none rounded-t"></div>
                  
                  <ScrollArea 
                    className="h-40 w-full rounded border p-2 bg-background text-sm font-sans whitespace-pre-wrap overflow-hidden" 
                    ref={scrollAreaRef}
                  >
                    <div className="p-1 relative">
                      <AnimatePresence mode="wait">
                        {renderStreamedText()}
                      </AnimatePresence>
                    </div>
                  </ScrollArea>
                  
                  {/* Bottom fade gradient - more prominent */}
                  <div className="absolute bottom-0 left-0 right-0 h-10 z-10 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none rounded-b"></div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-destructive/15 p-3 rounded-md">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isGenerating}>
                Cancel
              </Button>
              <Button type="submit" disabled={isGenerating}>
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isGenerating ? 'Generating...' : 'Generate Study Set'}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        {/* Add an extra div at the bottom that always stays at the end of content */}
        <div id="stream-end-anchor" ref={(el: HTMLDivElement | null) => {
          if (el && autoScrollEnabled) {
            // Ensure this element is visible when auto-scroll is enabled
            setTimeout(() => {
              el.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 50);
          }
        }}></div>
      </DialogContent>
    </Dialog>
  );
} 