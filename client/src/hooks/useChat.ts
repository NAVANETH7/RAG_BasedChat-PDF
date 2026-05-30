import { useState, useCallback } from 'react';
import type { Message, Chunk } from '../types';


export function useChat(docId: string | null, filename: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setStreaming(false);
  }, []);

  const sendMessage = useCallback(async (
    question: string,
    temperature = 0.7,
    similarityThreshold = 0.70
  ) => {
    if (!docId) {
      setError('No active document selected.');
      return;
    }
    if (!question.trim()) return;

    setStreaming(true);
    setError(null);

    // Save history *before* adding the new message pair
    const historyToSend = [...messages];

    // Append user message and empty assistant message locally
    setMessages(prev => [
      ...prev,
      { role: 'user', content: question, timestamp: Date.now() },
      { role: 'assistant', content: '', sources: [], timestamp: Date.now() }
    ]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          docId,
          filename,
          messages: historyToSend,
          temperature,
          similarityThreshold
        }),
      });


      if (!response.ok) {
        const errText = await response.text();
        let errMsg = 'Failed to initiate chat stream';
        try {
          const parsed = JSON.parse(errText);
          errMsg = parsed.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      if (!response.body) {
        throw new Error('Readable stream not supported by server response.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        
        // Save the last partial chunk back to buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine.startsWith('data:')) continue;

          const jsonStr = cleanLine.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.token) {
              setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                  lastMsg.content += data.token;
                }
                return updated;
              });
            }

            if (data.done) {
              setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                  lastMsg.sources = data.sources as Chunk[];
                }
                return updated;
              });
              setStreaming(false);
            }

            if (data.error) {
              throw new Error(data.error);
            }
          } catch (jsonErr: any) {
            console.error('Error parsing SSE packet:', jsonErr);
            // If it's a model level error that was thrown inside the try catch, propagate it
            if (jsonErr.message && !jsonErr.message.includes('JSON')) {
              throw jsonErr;
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Chat stream error:', err);
      setError(err.message || 'An unknown error occurred during streaming.');
      setMessages(prev => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.content = `Error: ${err.message || 'Stream disconnected'}`;
        }
        return updated;
      });
      setStreaming(false);
    }
  }, [docId, filename, messages]);

  return {
    messages,
    sendMessage,
    streaming,
    error,
    clearChat,
    setMessages
  };
}
