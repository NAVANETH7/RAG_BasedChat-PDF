import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DocumentManager } from './components/DocumentManager';
import { ChatContainer } from './components/ChatContainer';
import { useChat } from './hooks/useChat';
import type { DocMetadata, Message } from './types';
import { Plus, Brain, FileText } from 'lucide-react';



function App() {
  const [documents, setDocuments] = useState<DocMetadata[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  // Cache chats per document to prevent losing conversation history on swap
  const [chatsCache, setChatsCache] = useState<Record<string, Message[]>>({});

  // Premium Features States
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.70);
  const [isPdfPanelOpen, setIsPdfPanelOpen] = useState(false);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfDocId, setPdfDocId] = useState<string | null>(null);

  const activeDoc = documents.find(d => d.id === activeDocId) || null;

  // Initialize the SSE chat hook (sends 'global' as docId if global search toggle is active)
  const {
    messages,
    sendMessage,
    streaming,
    error,
    clearChat,
    setMessages
  } = useChat(isGlobalSearch ? 'global' : activeDocId, activeDoc?.filename || null);


  // 1. Fetch document list on load
  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      if (!res.ok) throw new Error('Failed to fetch documents list');
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error('Error fetching documents list:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // 2. Sync useChat hook messages with our cache when document switches
  useEffect(() => {
    if (activeDocId) {
      setMessages(chatsCache[activeDocId] || []);
    } else {
      setMessages([]);
    }
  }, [activeDocId, setMessages]);

  // 3. Keep cache up-to-date when hook messages change
  useEffect(() => {
    if (activeDocId && messages.length > 0) {
      setChatsCache(prev => ({
        ...prev,
        [activeDocId]: messages
      }));
    }
  }, [messages, activeDocId]);

  const handleSelectDoc = (docId: string) => {
    setActiveDocId(docId);
    setPdfDocId(docId);
    setIsPdfPanelOpen(false); // reset panel when changing active docs
    setShowUpload(false);
  };

  const handleUploadSuccess = (docId: string, filename: string) => {
    fetchDocuments();
    setActiveDocId(docId);
    setPdfDocId(docId);
    setIsPdfPanelOpen(false);
    setShowUpload(false);
  };


  const handleDeleteDoc = async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete document');
      
      // Update local state
      setDocuments(prev => prev.filter(d => d.id !== docId));
      
      // Clean cache
      setChatsCache(prev => {
        const copy = { ...prev };
        delete copy[docId];
        return copy;
      });

      if (activeDocId === docId) {
        setActiveDocId(null);
        clearChat();
        setShowUpload(true);
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document.');
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar navigation panel */}
      <Sidebar
        documents={documents}
        activeDocId={activeDocId}
        onSelectDoc={handleSelectDoc}
        onDeleteDoc={handleDeleteDoc}
        onShowUpload={() => setShowUpload(true)}
        isUploading={isUploading}
      />

      {/* Main Content Area */}
      <main style={{
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'transparent'
      }}>
        {showUpload ? (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflowY: 'auto'
          }}>
            <DocumentManager
              onUploadSuccess={handleUploadSuccess}
              existingDocs={documents}
              onSelectDoc={handleSelectDoc}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
            />
          </div>
        ) : activeDocId && activeDoc ? (
          <div className="main-content-split">
            <div className="chat-pane">
              <ChatContainer
                messages={messages}
                onSendMessage={sendMessage}
                streaming={streaming}
                activeDocFilename={activeDoc.filename}
                error={error}
                temperature={temperature}
                setTemperature={setTemperature}
                similarityThreshold={similarityThreshold}
                setSimilarityThreshold={setSimilarityThreshold}
                isGlobalSearch={isGlobalSearch}
                setIsGlobalSearch={setIsGlobalSearch}
                onSourceClick={(pageNum, sourceDocId) => {
                  setPdfPage(pageNum);
                  setPdfDocId(sourceDocId);
                  setIsPdfPanelOpen(true);
                }}
              />
            </div>

            {/* Premium Side-by-Side Interactive PDF Viewer */}
            {isPdfPanelOpen && pdfDocId && (
              <div className="pdf-pane-panel fade-in">
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border-glass)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(0,0,0,0.2)',
                  minHeight: '53px'
                }}>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '80%'
                  }}>
                    <FileText size={14} color="var(--primary)" />
                    {documents.find(d => d.id === pdfDocId)?.filename || 'Document'} (Page {pdfPage})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPdfPanelOpen(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}
                    className="glass-interactive"
                  >
                    Close
                  </button>
                </div>
                <div className="pdf-iframe-container">
                  <iframe
                    src={`/pdf-files/${pdfDocId}.pdf#page=${pdfPage}`}
                    className="pdf-iframe"
                    title="PDF Document Preview"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (

          /* Empty Welcoming State (should not happen normally since showUpload is toggled) */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            gap: '12px'
          }}>
            <Brain size={48} className="pulse" />
            <p>Select a document from the sidebar library or click "+" to add a new PDF.</p>
            <button onClick={() => setShowUpload(true)} className="btn btn-primary" style={{ marginTop: '10px' }}>
              <Plus size={16} /> Add Document
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
