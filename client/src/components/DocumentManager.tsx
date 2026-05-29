import React, { useState, useRef } from 'react';
import { UploadCloud, File, AlertCircle, Loader, CheckCircle, Sparkles } from 'lucide-react';
import type { DocMetadata } from '../types';


interface DocumentManagerProps {
  onUploadSuccess: (docId: string, filename: string) => void;
  existingDocs: DocMetadata[];
  onSelectDoc: (docId: string) => void;
  isUploading: boolean;
  setIsUploading: (uploading: boolean) => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  onUploadSuccess,
  existingDocs,
  onSelectDoc,
  isUploading,
  setIsUploading
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadStep, setUploadStep] = useState<'idle' | 'uploading' | 'parsing' | 'embedding' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are supported.');
      setUploadStep('error');
      return;
    }

    setIsUploading(true);
    setUploadStep('uploading');
    setUploadError(null);
    setUploadedFilename(file.name);
    setProgress(15);

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      // Simulate progression from upload to parsing
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev < 40) return prev + 5;
          if (prev < 75) {
            setUploadStep('parsing');
            return prev + 2;
          }
          if (prev < 95) {
            setUploadStep('embedding');
            return prev + 1;
          }
          clearInterval(progressInterval);
          return prev;
        });
      }, 300);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload and parse PDF');
      }

      const data = await res.json();
      setProgress(100);
      setUploadStep('completed');
      
      setTimeout(() => {
        onUploadSuccess(data.docId, file.name);
        // Reset state after success
        setUploadStep('idle');
        setIsUploading(false);
      }, 1200);

    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'An error occurred during file processing');
      setUploadStep('error');
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{
      maxWidth: '640px',
      margin: '60px auto',
      width: '100%',
      padding: '0 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '30px'
    }} className="fade-in">
      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #fff 30%, var(--text-secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '10px'
        }}>
          Knowledge Base Ingestion
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Upload PDF documentation to build a semantic chunk database indexed with Voyage AI embeddings.
        </p>
      </div>

      {/* Main Drag/Drop Zone */}
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className="glass"
        style={{
          borderRadius: '16px',
          border: dragActive ? '2px dashed var(--primary)' : '1px solid var(--border-glass)',
          background: dragActive ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-card)',
          padding: '40px 20px',
          textAlign: 'center',
          cursor: isUploading ? 'default' : 'pointer',
          position: 'relative',
          transition: 'all 0.3s ease'
        }}
      >
        <input 
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleChange}
          style={{ display: 'none' }}
          disabled={isUploading}
        />

        {uploadStep === 'idle' && (
          <div onClick={isUploading ? undefined : onButtonClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.05)'
            }}>
              <UploadCloud size={28} />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '4px' }}>
                Drag and drop your PDF here, or <span style={{ color: 'var(--primary)', textDecoration: 'underline' }}>browse</span>
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Supports standard PDF files up to 25MB
              </p>
            </div>
          </div>
        )}

        {isUploading && uploadStep !== 'completed' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px 0' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader size={36} color="var(--primary)" className="pulse" style={{ animationDuration: '1.5s' }} />
            </div>
            
            <div style={{ width: '100%', maxWidth: '300px' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>
                {uploadStep === 'uploading' && 'Uploading PDF file...'}
                {uploadStep === 'parsing' && 'Parsing PDF pages and layout...'}
                {uploadStep === 'embedding' && 'Embedding content with Voyage AI (voyage-2)...'}
              </p>
              <div style={{
                height: '4px',
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)',
                  width: `${progress}%`,
                  borderRadius: '2px',
                  transition: 'width 0.4s ease'
                }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                {progress}% processed
              </span>
            </div>
          </div>
        )}

        {uploadStep === 'completed' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px 0' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--success)'
            }}>
              <CheckCircle size={28} />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--success)', marginBottom: '4px' }}>
                Index Created!
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Successfully chunked and upserted into Qdrant collection.
              </p>
            </div>
          </div>
        )}

        {uploadStep === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '10px 0' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--danger)'
            }}>
              <AlertCircle size={28} />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--danger)', marginBottom: '4px' }}>
                Processing Failed
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 12px auto' }}>
                {uploadError}
              </p>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadStep('idle');
                }}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing Files Shortcuts (displayed only if there are uploaded documents) */}
      {existingDocs.length > 0 && uploadStep === 'idle' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <span style={{
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--text-secondary)',
            fontWeight: 600
          }}>
            Or select an existing document to chat
          </span>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px'
          }}>
            {existingDocs.slice(0, 4).map(doc => (
              <div
                key={doc.id}
                onClick={() => onSelectDoc(doc.id)}
                className="glass glass-interactive"
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'left'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)'
                }}>
                  <File size={16} />
                </div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <p style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'var(--text-primary)'
                  }} title={doc.filename}>
                    {doc.filename}
                  </p>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {doc.chunkCount} chunks index
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
