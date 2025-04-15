'use client';

import React, { useState, useEffect } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

interface LatexRendererProps {
  content: string;
  isBlock?: boolean;
}

export default function LatexRenderer({ content, isBlock = false }: LatexRendererProps) {
  const [hasError, setHasError] = useState(false);
  
  // Reset error state when content changes
  useEffect(() => {
    setHasError(false);
  }, [content]);
  
  // Check if the content is actually LaTeX
  const containsLatex = (text: string): boolean => {
    return text.includes('\\(') || 
           text.includes('\\[') || 
           text.includes('\\begin') || 
           text.includes('\\end') ||
           (text.includes('\\') && /[a-zA-Z]/.test(text));
  };
  
  // Process content to handle LaTeX expressions
  const processContent = (text: string): React.ReactNode[] => {
    // If it doesn't contain any LaTeX markers, just return the text
    if (!containsLatex(text)) {
      return [<span key="plaintext">{text}</span>];
    }
    
    // Regular expressions to match inline and block LaTeX
    const inlineRegex = /(\\\\?\()(.*?)(\\\\?\))/g;
    const blockRegex = /(\\\\?\[)(.*?)(\\\\?\])/g;

    // Split the content by LaTeX expressions
    const segments: { type: 'text' | 'inline' | 'block'; content: string }[] = [];
    let lastIndex = 0;
    let match;

    // Find all inline LaTeX expressions first
    const matches: { index: number; length: number; type: 'inline' | 'block'; content: string }[] = [];
    
    while ((match = inlineRegex.exec(text)) !== null) {
      matches.push({ 
        index: match.index, 
        length: match[0].length, 
        type: 'inline', 
        content: match[2] 
      });
    }
    
    // Then find all block LaTeX expressions
    while ((match = blockRegex.exec(text)) !== null) {
      matches.push({ 
        index: match.index, 
        length: match[0].length, 
        type: 'block', 
        content: match[2] 
      });
    }
    
    // If no LaTeX expressions were found, just return the text
    if (matches.length === 0) {
      return [<span key="plaintext">{text}</span>];
    }
    
    // Sort matches by index to preserve order
    matches.sort((a, b) => a.index - b.index);
    
    // Process all matches in order
    for (const match of matches) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }
      segments.push({ type: match.type, content: match.content });
      lastIndex = match.index + match.length;
    }

    // Add any remaining text
    if (lastIndex < text.length) {
      segments.push({ type: 'text', content: text.slice(lastIndex) });
    }

    // Render each segment
    return segments.map((segment, index) => {
      if (segment.type === 'text') {
        return <span key={index} className="latex-text">{segment.content}</span>;
      } else if (segment.type === 'inline') {
        try {
          // Clean up the LaTeX content - fix common escaping issues
          let cleanedContent = segment.content;
          // Handle double-escaped commands
          cleanedContent = cleanedContent.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
          
          return (
            <span key={index} className="inline-block mx-1">
              <InlineMath math={cleanedContent} />
            </span>
          );
        } catch (error) {
          console.error('Error rendering inline LaTeX:', error, segment.content);
          setHasError(true);
          return (
            <span key={index} className="inline-flex items-center text-[#ff3333] bg-[#ff3333]/10 px-2 py-1 rounded">
              <AlertCircle className="h-3 w-3 mr-1" />
              <code className="text-sm">{segment.content}</code>
            </span>
          );
        }
      } else {
        // Block math
        try {
          // Clean up the LaTeX content - fix common escaping issues
          let cleanedContent = segment.content;
          // Handle double-escaped commands
          cleanedContent = cleanedContent.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
          
          return (
            <div key={index} className="my-2 py-1">
              <BlockMath math={cleanedContent} />
            </div>
          );
        } catch (error) {
          console.error('Error rendering block LaTeX:', error);
          setHasError(true);
          return (
            <div key={index} className="flex items-center text-[#ff3333] bg-[#ff3333]/10 px-3 py-2 my-2 rounded border-l-2 border-[#ff3333]">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <code className="text-sm overflow-x-auto w-full">{segment.content}</code>
            </div>
          );
        }
      }
    });
  };

  // Render pure LaTeX formulas (when not mixed with text)
  const renderPureLatex = () => {
    // Check if this is actually LaTeX content
    if (!containsLatex(content) && !isBlock) {
      return <span>{content}</span>;
    }
    
    try {
      // Clean up the LaTeX content - fix common escaping issues
      let cleanedContent = content;
      // Handle double-escaped commands
      cleanedContent = cleanedContent.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
      
      if (isBlock) {
        return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="my-2 py-1 overflow-x-auto"
          >
            <BlockMath math={cleanedContent} />
          </motion.div>
        );
      } else {
        return (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <InlineMath math={cleanedContent} />
          </motion.span>
        );
      }
    } catch (error) {
      console.error('Error rendering LaTeX:', error, content);
      setHasError(true);
      return (
        <div className="flex items-center text-[#ff3333] bg-[#ff3333]/10 px-3 py-2 rounded border-l-2 border-[#ff3333]">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          <div>
            <p className="font-medium">LaTeX Error</p>
            <code className="text-sm block mt-1 overflow-x-auto">{content}</code>
          </div>
        </div>
      );
    }
  };

  // First check if this is plain text
  if (!containsLatex(content) && !isBlock) {
    return <span>{content}</span>;
  }
  
  if (isBlock) {
    return renderPureLatex();
  } else if (content.includes('\\(') || content.includes('\\[')) {
    // Process mixed text and LaTeX
    return (
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={hasError ? "latex-with-errors" : ""}
      >
        {processContent(content)}
      </motion.span>
    );
  } else {
    // Just pure LaTeX formula or just text
    return renderPureLatex();
  }
}