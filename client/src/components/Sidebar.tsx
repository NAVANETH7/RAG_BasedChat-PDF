import React from 'react';
import { FileText, Trash2, Database, Brain, Sparkles, MessageSquare, Plus } from 'lucide-react';
import type { DocMetadata } from '../types';


interface SidebarProps {
  documents: DocMetadata[];
  activeDocId: string | null;
  onSelectDoc: (docId: string) => void;
  onDeleteDoc: (docId: string) => Promise<void>;
  onShowUpload: () => void;
  isUploading: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  documents,
  activeDocId,
  onSelectDoc,
  onDeleteDoc,
  onShowUpload,
  isUploading
}) => {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="sidebar-container" style={{
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-glass)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Header Logo */}
      <div className="sidebar-header" style={{
        padding: '24px',
        borderBottom: '1px solid var(--border-glass)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
        }}>
          <Brain size={18} color="#fff" className="pulse" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
            RAG<span style={{ color: 'var(--primary)', fontWeight: 700 }}>Doc</span>
          </h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={10} color="var(--secondary)" /> AI-Powered PDF Chat
          </span>
        </div>
      </div>

      {/* Library Title & Actions */}
      <div style={{
        padding: '20px 20px 10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: 'var(--text-secondary)'
        }}>
          Documents Library
        </span>
        <button 
          onClick={onShowUpload}
          disabled={isUploading}
          style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px dashed var(--primary)',
            borderRadius: '4px',
            color: 'var(--primary)',
            padding: '4px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.75rem',
            transition: 'all 0.2s'
          }}
          className="glass-interactive"
        >
          <Plus size={12} /> Add PDF
        </button>
      </div>

      {/* Document List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 12px 20px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        {documents.length === 0 ? (
          <div style={{
            padding: '30px 15px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            border: '1px dashed var(--border-glass)',
            borderRadius: '8px',
            margin: '10px 8px'
          }}>
            No PDFs indexed.
            <br />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click "Add PDF" to get started</span>
          </div>
        ) : (
          documents.map(doc => {
            const isActive = doc.id === activeDocId;
            return (
              <div
                key={doc.id}
                onClick={() => onSelectDoc(doc.id)}
                className={`glass ${isActive ? 'active-document' : 'glass-interactive'}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  borderColor: isActive ? 'var(--border-glass-active)' : 'var(--border-glass)',
                  background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-card)',
                  boxShadow: isActive ? 'var(--shadow-glow)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: 'calc(100% - 30px)',
                }}>
                  <div style={{
                    background: isActive ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '6px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}>
                    <FileText size={16} color={isActive ? '#fff' : 'var(--text-secondary)'} />
                  </div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <p style={{
                      fontSize: '0.85rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: '2px'
                    }}>
                      {doc.filename}
                    </p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {formatSize(doc.size)} • {doc.chunkCount} chunks
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if(confirm(`Are you sure you want to delete "${doc.filename}"? This will delete all Qdrant vectors.`)) {
                      onDeleteDoc(doc.id);
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s, background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--danger)';
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Database/System Status Indicator */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--border-glass)',
        background: 'rgba(0, 0, 0, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={14} color="var(--success)" />
          <span>Qdrant (Vector DB)</span>
        </div>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'var(--success)',
          boxShadow: '0 0 8px var(--success)'
        }} />
      </div>
    </div>
  );
};
