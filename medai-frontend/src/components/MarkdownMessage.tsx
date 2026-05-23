import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownMessageProps {
  content: string;
  variant?: 'ai' | 'user';
  fontSize?: number;
}

/** Insert line breaks before markdown block elements when the model returns one long line. */
function normalizeMarkdown(text: string): string {
  return text
    .replace(/\s*(#{1,3}\s)/g, '\n\n$1')
    .replace(/\s(\d+\.\s+\*\*)/g, '\n$1')
    .replace(/\s(\d+\.\s+[A-Za-z])/g, '\n$1')
    .replace(/\s([-*]\s+\*\*)/g, '\n$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const MarkdownMessage: React.FC<MarkdownMessageProps> = ({
  content,
  variant = 'ai',
  fontSize = 16,
}) => {
  const textColor = variant === 'user' ? '#000e1a' : '#d0e4f0';
  const dimColor = variant === 'user' ? 'rgba(0,14,26,0.75)' : 'rgba(180,220,240,0.75)';
  const accentColor = variant === 'user' ? '#006680' : '#00e5ff';

  return (
    <div className="markdown-message" style={{ color: textColor, fontSize, lineHeight: 1.85, fontFamily: 'Outfit, sans-serif' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 style={{ fontSize: fontSize + 6, fontWeight: 800, color: textColor, margin: '0 0 14px', letterSpacing: -0.5 }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ fontSize: fontSize + 4, fontWeight: 700, color: textColor, margin: '20px 0 12px' }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ fontSize: fontSize + 2, fontWeight: 700, color: accentColor, margin: '18px 0 10px' }}>
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p style={{ margin: '0 0 12px', color: dimColor }}>{children}</p>
          ),
          strong: ({ children }) => (
            <strong style={{ fontWeight: 700, color: textColor }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em style={{ fontStyle: 'italic', color: dimColor }}>{children}</em>
          ),
          ul: ({ children }) => (
            <ul style={{ margin: '8px 0 14px', paddingLeft: 22, listStyleType: 'disc' }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ margin: '8px 0 14px', paddingLeft: 22, listStyleType: 'decimal' }}>{children}</ol>
          ),
          li: ({ children }) => (
            <li style={{ marginBottom: 8, color: dimColor }}>{children}</li>
          ),
          hr: () => (
            <hr style={{ border: 'none', borderTop: '1px solid rgba(0,229,255,0.12)', margin: '18px 0' }} />
          ),
          blockquote: ({ children }) => (
            <blockquote style={{
              margin: '12px 0', padding: '10px 16px',
              borderLeft: `3px solid ${accentColor}`,
              background: variant === 'user' ? 'rgba(0,14,26,0.06)' : 'rgba(0,229,255,0.05)',
              borderRadius: '0 8px 8px 0',
              color: dimColor,
            }}>
              {children}
            </blockquote>
          ),
          code: ({ className, children }) => {
            const isBlock = className?.includes('language-');
            if (isBlock) {
              return (
                <pre style={{
                  margin: '12px 0', padding: '14px 16px', borderRadius: 8, overflowX: 'auto',
                  background: variant === 'user' ? 'rgba(0,14,26,0.08)' : 'rgba(0,8,20,0.6)',
                  border: '1px solid rgba(0,229,255,0.12)',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: fontSize - 2,
                }}>
                  <code>{children}</code>
                </pre>
              );
            }
            return (
              <code style={{
                padding: '2px 6px', borderRadius: 4,
                background: variant === 'user' ? 'rgba(0,14,26,0.08)' : 'rgba(0,229,255,0.08)',
                fontFamily: 'JetBrains Mono, monospace', fontSize: fontSize - 2, color: accentColor,
              }}>
                {children}
              </code>
            );
          },
        }}
      >
        {normalizeMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownMessage;
