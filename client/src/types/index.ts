export interface Chunk {
  id: string;
  text: string;
  pageNum: number;
  chunkIdx: number;
  docId: string;
  filename: string;
  score?: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Chunk[];
  timestamp?: number;
}

export interface DocMetadata {
  id: string;
  filename: string;
  size: number;
  chunkCount: number;
  uploadedAt: number;
}
