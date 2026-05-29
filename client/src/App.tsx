import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DocumentManager } from './components/DocumentManager';
import { ChatContainer } from './components/ChatContainer';
import { useChat } from './hooks/useChat';
import type { DocMetadata, Message } from './types';
import { Plus, Brain } from 'lucide-react';


function App() {
  const [documents, setDocuments] = useState<DocMetadata[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  // Cache chats per document to prevent losing conversation history on swap
  const [chatsCache, setChatsCache] = useState<Record<string, Message[]>>({});

  const activeDoc = documents.find(d => d.id === activeDocId) || null;

  // Initialize the SSE chat hook
  const {
    messages,
    sendMessage,
    streaming,
    error,
    clearChat,
    setMessages
  } = useChat(activeDocId, activeDoc?.filename || null);

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
    setShowUpload(false);
  };

  const handleUploadSuccess = (docId: string, filename: string) => {
    fetchDocuments();
    setActiveDocId(docId);
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
          <ChatContainer
            messages={messages}
            onSendMessage={sendMessage}
            streaming={streaming}
            activeDocFilename={activeDoc.filename}
            error={error}
          />
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
