import dotenv from 'dotenv';

dotenv.config();

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const DEFAULT_MODEL = 'voyage-2';

/**
 * Generates embeddings for an array of texts using Voyage AI REST API
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey || apiKey === 'your_voyage_api_key_here') {
    throw new Error('Voyage AI API key is not configured in .env');
  }

  const model = process.env.VOYAGE_MODEL || DEFAULT_MODEL;

  try {
    const res = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: texts,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Voyage AI API request failed with status ${res.status}: ${errorText}`);
    }

    const data = (await res.json()) as any;
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid response structure received from Voyage AI API');
    }

    // Sort by index to maintain correct ordering in case of async responses
    const sortedData = data.data.sort((a: any, b: any) => a.index - b.index);
    return sortedData.map((d: any) => d.embedding);
  } catch (err: any) {
    console.error('Error during Voyage AI embeddings generation:', err.message);
    throw err;
  }
}

/**
 * Generates an embedding vector for a single query text
 */
export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}
