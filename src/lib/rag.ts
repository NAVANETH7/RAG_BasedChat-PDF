import { Chunk, Message } from '../types';

/**
 * Builds the structured RAG prompt containing instructions, context excerpts, and the question.
 */
export function buildRAGPrompt(
  question: string,
  contextChunks: Chunk[],
  filename: string
): string {
  // Format the context excerpts with page numbers
  const context = contextChunks
    .map((c, i) => `[Excerpt ${i + 1}] (Page ${c.pageNum})\n${c.text}`)
    .join('\n\n---\n\n');

  return `You are a helpful assistant that answers questions about the document "${filename}".

Use ONLY the following excerpts from the document to answer the question.
If the answer is not found in the excerpts, say "I couldn't find that information in the document."
Always cite which excerpt number(s) and page number(s) you used to formulate your answer (e.g. "[Excerpt 1 (Page 3)]").

DOCUMENT EXCERPTS:
${context || 'No matching document excerpts were found with sufficient similarity.'}

QUESTION: ${question}

ANSWER:`;
}

/**
 * Prepares and limits conversation history to the last N messages for the model context.
 * Filters out sources or extra metadata and formats it exactly as the Anthropic API expects.
 */
export function formatConversationHistory(
  messages: Message[],
  limit = 8
): { role: 'user' | 'assistant'; content: string }[] {
  // Filter out any messages that don't match standard roles, and slice the last N
  const cleanMessages = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-limit);

  return cleanMessages.map(m => ({
    role: m.role,
    content: m.content
  }));
}
