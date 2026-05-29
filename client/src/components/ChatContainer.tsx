import React, { useRef, useEffect, useState } from 'react';
import { Send, FileText, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { Message } from '../types';
import { SourceViewer } from './SourceViewer';

interface ChatContainerProps {
  messages: Message[];
  onSendMessage: (text: string) => Promise<void>;
  streaming: boolean;
  activeDocFilename: string;
  error: string | null;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  onSendMessage,
  streaming,
  activeDocFilename,
  error
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages on update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || streaming) return;
    onSendMessage(inputValue);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Header Info Bar */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-glass)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <FileText size={18} color="var(--primary)" />
          <span style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'var(--text-primary)'
          }}>
            {activeDocFilename}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={12} color="var(--secondary)" className="pulse" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Voyage-2 + Claude-3.5 RAG</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {messages.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            gap: '16px',
            maxWidth: '400px',
            margin: '0 auto'
          }} className="fade-in">
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid var(--border-glass)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <Bot size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Ask anything about the document
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                Queries are embedded dynamically to retrieve the most contextually relevant excerpts before generation.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  width: '100%',
                  gap: '12px'
                }}
                className="fade-in"
              >
                {/* Bot Icon on the left */}
                {!isUser && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid var(--border-glass-active)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    flexShrink: 0
                  }}>
                    <Bot size={16} />
                  </div>
                )}

                {/* Message bubble */}
                <div
                  className="glass"
                  style={{
                    maxWidth: '80%',
                    padding: '16px 20px',
                    borderRadius: '16px',
                    borderTopRightRadius: isUser ? '4px' : '16px',
                    borderTopLeftRadius: isUser ? '16px' : '4px',
                    backgroundColor: isUser ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card)',
                    borderColor: isUser ? 'var(--border-glass-active)' : 'var(--border-glass)'
                  }}
                >
                  {/* Content text */}
                  {msg.content === '' && streaming && index === messages.length - 1 ? (
                    /* Shimmer placeholder before first token */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '200px' }}>
                      <div className="shimmer" style={{ height: '14px', borderRadius: '4px', width: '100%' }}></div>
                      <div className="shimmer" style={{ height: '14px', borderRadius: '4px', width: '70%' }}></div>
                    </div>
                  ) : (
                    <p style={{
                      fontSize: '0.9rem',
                      lineHeight: '1.6',
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {msg.content}
                    </p>
                  )}

                  {/* Sources cited */}
                  {msg.sources && msg.sources.length > 0 && (
                    <SourceViewer sources={msg.sources} />
                  )}
                </div>

                {/* User Icon on the right */}
                {isUser && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-glass)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    flexShrink: 0
                  }}>
                    <User size={16} />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Global Error Banner */}
        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'var(--danger-glow)',
            border: '1px solid var(--danger)',
            borderRadius: '8px',
            color: 'var(--danger)',
            fontSize: '0.85rem',
            textAlign: 'center',
            margin: '0 auto',
            maxWidth: '500px'
          }}>
            {error}
          </div>
        )}

        {/* Scroll Anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Box */}
      <div style={{
        padding: '20px 24px',
        borderTop: '1px solid var(--border-glass)',
        background: 'rgba(6, 9, 19, 0.6)',
        backdropFilter: 'blur(8px)',
        width: '100%'
      }}>
        <form onSubmit={handleSubmit} style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          maxWidth: '800px',
          margin: '0 auto',
          width: '100%'
        }}>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={streaming ? 'Generating response...' : 'Ask a question about the document...'}
            rows={1}
            disabled={streaming}
            style={{
              width: '100%',
              padding: '16px 60px 16px 20px',
              borderRadius: '24px',
              backgroundColor: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              lineHeight: '1.4',
              fontFamily: 'var(--font-body)',
              resize: 'none',
              outline: 'none',
              transition: 'border-color 0.25s, box-shadow 0.25s',
              overflowY: 'hidden'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-glass-active)';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(99, 102, 241, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-glass)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || streaming}
            style={{
              position: 'absolute',
              right: '8px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
              border: 'none',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)',
              transition: 'all 0.2s',
              opacity: inputValue.trim() && !streaming ? 1 : 0.4
            }}
          >
            {streaming ? (
              <Loader2 size={16} className="pulse" style={{ animationDuration: '1s' }} />
            ) : (
              <Send size={16} />
            )}
          </button>
        </form>
        <span style={{
          display: 'block',
          textAlign: 'center',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          marginTop: '8px'
        }}>
          Press Enter to send. Shift + Enter for newline.
        </span>
      </div>
    </div>
  );
};
