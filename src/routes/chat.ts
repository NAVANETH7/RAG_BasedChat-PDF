import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (
    (!anthropicApiKey || anthropicApiKey === 'your_anthropic_api_key_here') &&
    (!geminiApiKey || geminiApiKey === 'your_gemini_api_key_here')
  ) {
    return res.status(500).json({ error: 'Neither Anthropic nor Gemini API key is configured in .env' });
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Ensure headers are flushed immediately for real-time streaming

  try {
    // 1. Embed the user's latest query
    console.log(`Generating embedding for question: "${question}"...`);
    const queryVector = await embedQuery(question);

    // 2. Search for top-5 chunks in Qdrant with a relevance threshold (e.g., 0.70)
    console.log(`Searching Qdrant for docId: ${docId}...`);
    const similarityThreshold = 0.70;
    const chunks = await searchSimilar(queryVector, docId, 5, similarityThreshold);
    console.log(`Found ${chunks.length} chunks meeting threshold.`);

    // 3. Construct the RAG prompt with the matching excerpts
    const ragPrompt = buildRAGPrompt(question, chunks, filename || 'Document');

    const historyMessages: Message[] = Array.isArray(messages) ? messages : [];

    // 4. Stream response using Gemini if key is provided, else Claude
    if (geminiApiKey && geminiApiKey !== 'your_gemini_api_key_here') {
      console.log('Sending request to Google Gemini...');
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const geminiModelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const model = genAI.getGenerativeModel({ model: geminiModelName });

      // Format conversation history for Gemini (role 'user' or 'model')
      const cleanHistory = historyMessages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-8);

      const contents = cleanHistory.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      // Add the latest RAG prompt query at the end
      contents.push({
        role: 'user',
        parts: [{ text: ragPrompt }]
      });

      const result = await model.generateContentStream({ contents });

      for await (const chunk of result.stream) {
        const token = chunk.text();
        if (token) {
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
        }
      }
    } else {
      console.log('Sending request to Anthropic Claude...');
      const anthropic = new Anthropic({ apiKey: anthropicApiKey! });
      const formattedHistory = formatConversationHistory(historyMessages, 8);
      const modelName = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
      
      const stream = await anthropic.messages.create({
        model: modelName,
        max_tokens: 1024,
        messages: [
          ...formattedHistory,
          { role: 'user', content: ragPrompt }
        ],
        stream: true
      });

      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta?.type === 'text_delta'
        ) {
          res.write(`data: ${JSON.stringify({ token: chunk.delta.text })}\n\n`);
        }
      }
    }

    // 5. Emit final event containing retrieved sources for citation
    res.write(`data: ${JSON.stringify({ done: true, sources: chunks })}\n\n`);
    res.end();

  } catch (err: any) {
    console.error('Error during SSE stream:', err);
    res.write(`data: ${JSON.stringify({ error: err.message || 'Stream processing failed' })}\n\n`);
    res.end();
  }
});

export default router;

