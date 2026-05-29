import fs from 'fs';
import path from 'path';
import { DocMetadata } from '../types';

const METADATA_DIR = path.join(__dirname, '../../uploads');
const METADATA_FILE = path.join(METADATA_DIR, 'metadata.json');

/**
 * Ensures that the uploads directory and metadata file exist
 */
function ensureDirAndFile() {
  if (!fs.existsSync(METADATA_DIR)) {
    fs.mkdirSync(METADATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(METADATA_FILE)) {
    fs.writeFileSync(METADATA_FILE, JSON.stringify([]));
  }
}

/**
 * Reads all document metadata from the JSON file
 */
export function getAllDocuments(): DocMetadata[] {
  ensureDirAndFile();
  try {
    const data = fs.readFileSync(METADATA_FILE, 'utf-8');
    return JSON.parse(data) as DocMetadata[];
  } catch (err) {
    console.error('Error reading document metadata file:', err);
    return [];
  }
}

/**
 * Saves the document list to the JSON file
 */
function saveAllDocuments(docs: DocMetadata[]) {
  ensureDirAndFile();
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(docs, null, 2));
  } catch (err) {
    console.error('Error saving document metadata file:', err);
  }
}

/**
 * Adds a new document metadata entry
 */
export function addDocument(doc: DocMetadata) {
  const docs = getAllDocuments();
  docs.push(doc);
  saveAllDocuments(docs);
}

/**
 * Removes a document entry and deletes its associated PDF file from disk
 */
export function deleteDocument(docId: string): boolean {
  const docs = getAllDocuments();
  const index = docs.findIndex(d => d.id === docId);
  
  if (index === -1) return false;
  
  const [removedDoc] = docs.splice(index, 1);
  saveAllDocuments(docs);

  // Attempt to delete the file on disk (if it exists)
  // Store uploaded files inside METADATA_DIR
  const filePath = path.join(METADATA_DIR, removedDoc.id + '.pdf');
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`Failed to delete PDF file: ${filePath}`, err);
    }
  }

  return true;
}
