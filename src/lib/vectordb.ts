import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
import { Chunk } from '../types';

dotenv.config();

const client = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY || undefined,
  checkCompatibility: false
});

const COLLECTION = 'pdf_chunks';

const VECTOR_SIZE = 1024; // voyage-2 default output dimensions

/**
 * Ensures the Qdrant collection exists and is configured correctly
 */
export async function ensureCollection() {
  try {
    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION);
    
    if (!exists) {
      console.log(`Creating Qdrant collection: "${COLLECTION}"...`);
      await client.createCollection(COLLECTION, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine'
        }
      });
      console.log(`Collection "${COLLECTION}" created successfully.`);
    }

    // Ensure the payload index on "docId" keyword field exists (required by Qdrant Cloud for filters)
    try {
      await client.createPayloadIndex(COLLECTION, {
        field_name: 'docId',
        field_schema: 'keyword',
        wait: true
      });
    } catch (indexErr) {
      // Ignore errors if index already exists
    }
  } catch (err: any) {
    console.error('Failed to initialize Qdrant collection:', err.message);
    throw err;
  }
}


/**
 * Upserts chunks with their embedding vectors to Qdrant
 */
export async function upsertChunks(chunks: Chunk[], vectors: number[][]) {
  if (chunks.length !== vectors.length) {
    throw new Error('Chunks and vectors arrays must be of equal length');
  }

  await ensureCollection();

  const points = chunks.map((chunk, i) => ({
    id: chunk.id,
    vector: vectors[i],
    payload: {
      text: chunk.text,
      docId: chunk.docId,
      chunkIdx: chunk.chunkIdx,
      pageNum: chunk.pageNum,
      filename: chunk.filename
    }
  }));

  try {
    await client.upsert(COLLECTION, {
      wait: true,
      points
    });
  } catch (err: any) {
    console.error('Failed to upsert points into Qdrant:', err.message);
    throw err;
  }
}

/**
 * Searches for similar chunks in Qdrant for a specific document
 */
export interface ScoredChunk extends Chunk {
  score: number;
}

export async function searchSimilar(
  queryVector: number[],
  docId: string,
  topK = 5,
  scoreThreshold = 0.70
): Promise<ScoredChunk[]> {
  try {
    const filter = docId === 'global' ? undefined : {
      must: [
        {
          key: 'docId',
          match: {
            value: docId
          }
        }
      ]
    };

    const results = await client.search(COLLECTION, {
      vector: queryVector,
      limit: topK,
      filter,
      score_threshold: scoreThreshold
    });


    return results.map(r => ({
      id: r.id as string,
      text: r.payload?.text as string,
      pageNum: r.payload?.pageNum as number || 1,
      chunkIdx: r.payload?.chunkIdx as number || 0,
      docId: r.payload?.docId as string,
      filename: r.payload?.filename as string || '',
      score: r.score
    }));
  } catch (err: any) {
    console.error('Failed to search Qdrant:', err.message);
    throw err;
  }
}

/**
 * Deletes all points associated with a specific document ID
 */
export async function deleteDocVectors(docId: string) {
  try {
    await client.delete(COLLECTION, {
      filter: {
        must: [
          {
            key: 'docId',
            match: {
              value: docId
            }
          }
        ]
      }
    });
  } catch (err: any) {
    console.error(`Failed to delete vectors for docId ${docId}:`, err.message);
    throw err;
  }
}
