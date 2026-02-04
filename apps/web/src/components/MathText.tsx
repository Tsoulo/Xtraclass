// @ts-ignore - react-katex types not available
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  children: string;
  className?: string;
}

export default function MathText({ children, className = '' }: MathTextProps) {
  if (!children) return null;

  const parts: (string | JSX.Element)[] = [];
  let currentIndex = 0;
  let text = children;

  const patterns = [
    { regex: /\\\[([\s\S]*?)\\\]/g, type: 'block' },
    { regex: /\$\$([\s\S]*?)\$\$/g, type: 'block' },
    { regex: /\\\((.*?)\\\)/g, type: 'inline' },
    { regex: /\$([^\$\n]+?)\$/g, type: 'inline' },
  ];

  const matches: Array<{ start: number; end: number; content: string; type: 'inline' | 'block' }> = [];

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.regex);
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[1],
        type: pattern.type as 'inline' | 'block',
      });
    }
  }

  matches.sort((a, b) => a.start - b.start);

  const nonOverlappingMatches: typeof matches = [];
  for (const match of matches) {
    if (nonOverlappingMatches.length === 0) {
      nonOverlappingMatches.push(match);
    } else {
      const last = nonOverlappingMatches[nonOverlappingMatches.length - 1];
      if (match.start >= last.end) {
        nonOverlappingMatches.push(match);
      }
    }
  }

  if (nonOverlappingMatches.length === 0) {
    return <span className={className}>{children}</span>;
  }

  nonOverlappingMatches.forEach((match, index) => {
    if (match.start > currentIndex) {
      parts.push(text.substring(currentIndex, match.start));
    }

    try {
      if (match.type === 'block') {
        parts.push(
          <BlockMath key={`block-${index}`} math={match.content.trim()} />
        );
      } else {
        parts.push(
          <InlineMath key={`inline-${index}`} math={match.content.trim()} />
        );
      }
    } catch (error) {
      console.error('KaTeX rendering error:', error);
      parts.push(match.content);
    }

    currentIndex = match.end;
  });

  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex));
  }

  return <span className={className}>{parts}</span>;
}
