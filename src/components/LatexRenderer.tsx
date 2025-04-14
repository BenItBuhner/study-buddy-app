'use client';

import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface LatexRendererProps {
  content: string;
  isBlock?: boolean;
}

export default function LatexRenderer({ content, isBlock = false }: LatexRendererProps) {
  // Process content to handle LaTeX expressions
  const processContent = (text: string): React.ReactNode[] => {
    // Regular expressions to match inline and block LaTeX
    const inlineRegex = /\\\\?\((.+?)\\\\?\)/g;
    const blockRegex = /\\\\?\[(.+?)\\\\?\]/g;

    // Split the content by LaTeX expressions
    const segments: { type: 'text' | 'inline' | 'block'; content: string }[] = [];
    let lastIndex = 0;
    let match;

    // Find all inline LaTeX expressions
    while ((match = inlineRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }
      segments.push({ type: 'inline', content: match[1] });
      lastIndex = match.index + match[0].length;
    }

    // Find all block LaTeX expressions
    while ((match = blockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }
      segments.push({ type: 'block', content: match[1] });
      lastIndex = match.index + match[0].length;
    }

    // Add any remaining text
    if (lastIndex < text.length) {
      segments.push({ type: 'text', content: text.slice(lastIndex) });
    }

    // Render each segment
    return segments.map((segment, index) => {
      if (segment.type === 'text') {
        return <span key={index}>{segment.content}</span>;
      } else if (segment.type === 'inline') {
        try {
          return <InlineMath key={index} math={segment.content} />;
        } catch (error) {
          console.error('Error rendering inline LaTeX:', error);
          return <span key={index} className="text-red-500">Error in LaTeX: {segment.content}</span>;
        }
      } else {
        // Block math
        try {
          return <BlockMath key={index} math={segment.content} />;
        } catch (error) {
          console.error('Error rendering block LaTeX:', error);
          return <span key={index} className="text-red-500">Error in LaTeX: {segment.content}</span>;
        }
      }
    });
  };

  if (isBlock) {
    try {
      return <BlockMath math={content} />;
    } catch (error) {
      console.error('Error rendering block LaTeX:', error);
      return <span className="text-red-500">Error in LaTeX: {content}</span>;
    }
  } else if (content.includes('\\(') || content.includes('\\[')) {
    // Process mixed text and LaTeX
    return <>{processContent(content)}</>;
  } else {
    // Just inline LaTeX
    try {
      return <InlineMath math={content} />;
    } catch (error) {
      console.error('Error rendering inline LaTeX:', error);
      return <span className="text-red-500">Error in LaTeX: {content}</span>;
    }
  }
}