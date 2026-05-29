import { Router } from 'express';
import { getAllDocuments, deleteDocument } from '../lib/documentDb';
import { deleteDocVectors } from '../lib/vectordb';

const router = Router();

/**
 * GET /api/documents
 * Returns metadata of all parsed PDF documents
 */
router.get('/', (req, res) => {
  try {
    const docs = getAllDocuments();
    return res.json(docs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to list documents' });
  }
});

/**
 * DELETE /api/documents/:id
 * Deletes document metadata, associated PDF file, and vector chunks in Qdrant
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Document ID is required' });
  }

  try {
    // 1. Delete vectors from Qdrant
    console.log(`Deleting vectors for document: ${id} from Qdrant...`);
    await deleteDocVectors(id);

    // 2. Remove document metadata entry & PDF from filesystem
    console.log(`Deleting metadata & PDF file for document: ${id}...`);
    const success = deleteDocument(id);

    if (!success) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.json({ success: true, message: 'Document and indices deleted successfully' });
  } catch (err: any) {
    console.error(`Failed to delete document ${id}:`, err);
    return res.status(500).json({ error: err.message || 'Failed to delete document data' });
  }
});

export default router;
