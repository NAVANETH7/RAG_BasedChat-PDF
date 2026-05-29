import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { parsePDF, chunkText } from '../lib/pdf';
import { embedTexts } from '../lib/embeddings';
import { ensureCollection, upsertChunks } from '../lib/vectordb';
import { addDocument } from '../lib/documentDb';

const router = Router();
const uploadDir = path.join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer temporary storage config
const upload = multer({ dest: uploadDir });

router.post('/', upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded' });
  }

  const tempPath = req.file.path;
  const docId = uuidv4();
  const destPath = path.join(uploadDir, `${docId}.pdf`);

  try {
    // 1. Move file to its permanent name under uploads/
    fs.renameSync(tempPath, destPath);

    // 2. Parse text from the PDF (page-annotated)
    const text = await parsePDF(destPath);
    
    // 3. Chunk text into sliding window fragments
    const chunks = chunkText(text, docId, req.file.originalname);

    if (chunks.length === 0) {
      // Clean up file if empty
      fs.unlinkSync(destPath);
      return res.status(400).json({ error: 'Failed to extract text from the PDF file or PDF is empty.' });
    }

    // 4. Ensure Qdrant collection is ready
    await ensureCollection();

    // 5. Generate embeddings in batches of 32 to stay within API rate limits
    const BATCH_SIZE = 32;
    console.log(`Starting embedding generation for ${chunks.length} chunks...`);
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const batchTexts = batch.map(c => c.text);
      
      // Call Voyage AI API
      const vectors = await embedTexts(batchTexts);
      
      // Upsert batch to Qdrant
      await upsertChunks(batch, vectors);
    }
    
    console.log('Embedding and Qdrant ingestion finished.');

    // 6. Record metadata in the JSON database
    const fileStats = fs.statSync(destPath);
    const docMeta = {
      id: docId,
      filename: req.file.originalname,
      size: fileStats.size,
      chunkCount: chunks.length,
      uploadedAt: Date.now()
    };
    
    addDocument(docMeta);

    // 7. Respond with document ID and details
    return res.json({
      success: true,
      docId,
      filename: req.file.originalname,
      chunks: chunks.length,
      message: 'PDF processed, embedded, and indexed successfully'
    });

  } catch (err: any) {
    console.error('Error during upload ingestion pipeline:', err);
    
    // Clean up files in case of failure
    if (fs.existsSync(destPath)) {
      try { fs.unlinkSync(destPath); } catch {}
    } else if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch {}
    }

    return res.status(500).json({ error: err.message || 'Internal server error during PDF ingestion' });
  }
});

export default router;
