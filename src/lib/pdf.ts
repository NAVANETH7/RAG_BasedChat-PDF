import pdfParse from 'pdf-parse';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Chunk } from '../types';

/**
 * Custom page render function for pdf-parse to inject page markers
 */
function renderPage(pageData: any): Promise<string> {
  return pageData.getTextContent().then((textContent: any) => {
    let lastY: number | undefined;
    let text = '';
    for (const item of textContent.items) {
      if (lastY === item.transform[5] || lastY === undefined) {
        text += item.str;
      } else {
        text += '\n' + item.str;
      }
      lastY = item.transform[5];
    }
    return `\n--- PAGE_START_${pageData.pageIndex + 1} ---\n` + text;
  });
}

/**
 * Parses PDF file and returns text annotated with page markers
 */
export async function parsePDF(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer, {
    pagerender: renderPage
  });
  return data.text;
}

/**
 * Chunks PDF text using page markers to track original page numbers
 */
export function chunkText(
  text: string,
  docId: string,
  filename: string,
  chunkSize = 500,
  overlap = 50
): Chunk[] {
  if (chunkSize <= overlap) {
    throw new Error('chunkSize must be greater than overlap');
  }

  // Split content using the page markers injected during parsing
  const pageMatches = text.split(/--- PAGE_START_(\d+) ---/);
  const chunks: Chunk[] = [];
  let chunkIdx = 0;

  // pageMatches[0] is everything before the first page marker (usually empty or whitespace)
  for (let i = 1; i < pageMatches.length; i += 2) {
    const pageNum = parseInt(pageMatches[i], 10);
    const pageText = pageMatches[i + 1] || '';

    // Split page text by whitespace into words
    const words = pageText.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    let wIdx = 0;
    while (wIdx < words.length) {
      const sliceWords = words.slice(wIdx, wIdx + chunkSize);
      const chunkTextContent = sliceWords.join(' ');
      
      chunks.push({
        id: uuidv4(),
        text: chunkTextContent,
        pageNum,
        chunkIdx,
        docId,
        filename
      });

      chunkIdx++;
      
      // If we've processed all words, break
      if (wIdx + chunkSize >= words.length) {
        break;
      }
      
      wIdx += (chunkSize - overlap);
    }
  }

  // Fallback: If no page markers were matched (e.g. malformed or single-page string without markers)
  if (chunks.length === 0 && text.trim().length > 0) {
    const words = text.split(/\s+/).filter(Boolean);
    let wIdx = 0;
    while (wIdx < words.length) {
      const sliceWords = words.slice(wIdx, wIdx + chunkSize);
      chunks.push({
        id: uuidv4(),
        text: sliceWords.join(' '),
        pageNum: 1,
        chunkIdx,
        docId,
        filename
      });
      chunkIdx++;
      if (wIdx + chunkSize >= words.length) break;
      wIdx += (chunkSize - overlap);
    }
  }

  return chunks;
}

