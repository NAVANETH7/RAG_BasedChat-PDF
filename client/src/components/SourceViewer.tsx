import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, CheckCircle } from 'lucide-react';
import type { Chunk } from '../types';


interface SourceViewerProps {
  sources: Chunk[];
}

export const SourceViewer: React.FC<SourceViewerProps> = ({ sources }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!sources || sources.length === 0) return null;

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const formatScore = (score?: number) => {
    if (score === undefined) return '';
    return `${Math.round(score * 100)}% Match`;
  };

  return (
    <div style={{
      marginTop: '16px',
      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      paddingTop: '12px',
      width: '100%'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '10px',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-heading)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        <CheckCircle size={12} color="var(--success)" />
        <span>Sources Cited ({sources.length})</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sources.map((source, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <div
              key={source.id || index}
              className="glass"
              style={{
                borderRadius: '8px',
                overflow: 'hidden',
                borderColor: isExpanded ? 'rgba(99, 102, 241, 0.2)' : 'var(--border-glass)',
                background: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.15)',
                transition: 'all 0.2s'
              }}
            >
              {/* Accordion Trigger Header */}
              <div
                onClick={() => toggleExpand(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                className="glass-interactive"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  <FileText size={14} color="var(--text-muted)" />
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: isExpanded ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}>
                    Excerpt {index + 1}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-muted)'
                  }}>
                    Page {source.pageNum}
                  </span>
                  {source.score !== undefined && (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'var(--success)',
                      backgroundColor: 'var(--success-glow)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {formatScore(source.score)}
                    </span>
                  )}
                </div>

                <div>
                  {isExpanded ? (
                    <ChevronUp size={14} color="var(--text-muted)" />
                  ) : (
                    <ChevronDown size={14} color="var(--text-muted)" />
                  )}
                </div>
              </div>

              {/* Collapsed Excerpt text */}
              {isExpanded && (
                <div style={{
                  padding: '12px 14px 14px 14px',
                  fontSize: '0.8rem',
                  lineHeight: '1.5',
                  color: 'var(--text-secondary)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                  whiteSpace: 'pre-wrap',
                  backgroundColor: 'rgba(0, 0, 0, 0.1)'
                }}>
                  {source.text}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
