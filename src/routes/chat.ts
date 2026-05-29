import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { embedQuery } from '../lib/embeddings';
import { searchSimilar } from '../lib/vectordb';
import { buildRAGPrompt, formatConversationHistory } from '../lib/rag';
import { Message } from '../types';

dotenv.config();

const router = Router();

router.post('/', async (req, res) => {
  const { question, docId, filename, messages } = req.body;

  if (!question || !docId) {
    return res.status(400).json({ error: 'question and docId are required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    return res.status(500).json({ error: 'Anthropic API key is not configured in .env' });
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Ensure headers are flushed immediately for real-time streaming

  try {
    const anthropic = new Anthropic({ apiKey });

    // 1. Embed the user's latest query
    console.log(`Generating embedding for question: "${question}"...`);
    const queryVector = await embedQuery(question);

    // 2. Search for top-5 chunks in Qdrant with a relevance threshold (e.g., 0.70)
    console.log(`Searching Qdrant for docId: ${docId}...`);
    const similarityThreshold = 0.70;
    const chunks = await searchSimilar(queryVector, docId, 5, similarityThreshold);
    console.log(`Found ${chunks.length} chunks meeting threshold.`);

    // 3. Format the conversation history (excluding the current query)
    const historyMessages: Message[] = Array.isArray(messages) ? messages : [];
    const formattedHistory = formatConversationHistory(historyMessages, 8);

    // 4. Construct the RAG prompt with the matching excerpts
    const ragPrompt = buildRAGPrompt(question, chunks, filename || 'Document');

    // 5. Query Claude API with SSE streaming
    console.log('Sending request to Anthropic Claude...');
    const model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
    
    const stream = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      messages: [
        ...formattedHistory,
        { role: 'user', content: ragPrompt }
      ],
      stream: true
    });

    // 6. Pipe tokens to client
    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta?.type === 'text_delta'
      ) {
        res.write(`data: ${JSON.stringify({ token: chunk.delta.text })}\n\n`);
      }
    }

    // 7. Emit final event containing retrieved sources for citation
    res.write(`data: ${JSON.stringify({ done: true, sources: chunks })}\n\n`);
    res.end();

  } catch (err: any) {
    console.error('Error during SSE stream:', err);
    res.write(`data: ${JSON.stringify({ error: err.message || 'Stream processing failed' })}\n\n`);
    res.end();
  }
});

export default router;
