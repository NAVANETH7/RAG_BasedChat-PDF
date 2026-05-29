import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';

import uploadRouter from './routes/upload';
import chatRouter from './routes/chat';
import documentsRouter from './routes/documents';
import { ensureCollection } from './lib/vectordb';


dotenv.config();

// Disable TLS signature verification to bypass leaf certificate lookup failures (common in Windows dev environments)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


const app = express();
const PORT = process.env.PORT || 3001;

// Ensure upload directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Rate limiters to prevent API abuse
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // limit each IP to 15 chat queries per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many chat queries, please wait a moment before trying again.' }
});

const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit upload attempts to 10 files per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many uploads, please try again later.' }
});

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for dev simplicity, can narrow for production
  methods: ['GET', 'POST', 'DELETE']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static directory for uploads (optional, if we want to display/embed source PDF directly in browser iframe)
app.use('/pdf-files', express.static(uploadsDir));

// Routes
app.use('/api/upload', uploadLimiter, uploadRouter);
app.use('/api/chat', chatLimiter, chatRouter);
app.use('/api/documents', documentsRouter);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`========================================`);
  console.log(` RAG Chat PDF Backend running on port ${PORT}`);
  console.log(` Qdrant DB target: ${process.env.QDRANT_URL || 'http://localhost:6333'}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
  console.log(`========================================`);

  try {
    await ensureCollection();
    console.log('Qdrant collection and keyword indices verified.');
  } catch (err: any) {
    console.error('Failed to initialize Qdrant at startup:', err.message);
  }
});

