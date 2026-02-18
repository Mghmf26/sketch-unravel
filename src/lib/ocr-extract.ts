import Tesseract from 'tesseract.js';
import type { EPCNode, EPCConnection, NodeType } from '@/types/epc';

interface ExtractionResult {
  processId: string;
  processName: string;
  nodes: EPCNode[];
  connections: EPCConnection[];
}

/**
 * OCR + heuristic-based extraction.
 * 1. Run Tesseract OCR to get text + bounding boxes
 * 2. Analyze pixel colors around each text block to determine node type
 * 3. Use spatial relationships to infer connections
 */
export async function extractWithOCR(
  imageFile: File,
  onProgress?: (msg: string) => void
): Promise<ExtractionResult> {
  onProgress?.('Loading image...');

  const imageUrl = URL.createObjectURL(imageFile);
  const img = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  onProgress?.('Running OCR text recognition...');

  const result = await Tesseract.recognize(imageUrl, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onProgress?.(`OCR: ${Math.round((m.progress || 0) * 100)}%`);
      }
    },
  });

  URL.revokeObjectURL(imageUrl);

  onProgress?.('Analyzing text blocks and colors...');

  const words = (result.data as any).words || [];

  // Group words into text blocks by proximity
  const blocks = groupWordsIntoBlocks(words);

  // Analyze color around each block to determine node type
  const nodes: EPCNode[] = [];
  const usedIds = new Set<string>();

  for (const block of blocks) {
    const dominantColor = getDominantColor(ctx, block.bbox);
    const nodeType = classifyNodeType(dominantColor);
    const text = block.text.trim();

    if (!text || text.length < 2) continue;

    // Try to extract ID pattern (e.g., AL-020-010)
    const idMatch = text.match(/[A-Z]{2,}-\d{3}(?:-\d{3})?/);
    let nodeId: string;
    let label: string;

    if (idMatch) {
      nodeId = idMatch[0];
      label = text.replace(idMatch[0], '').trim() || nodeId;
    } else {
      nodeId = `NODE-${String(nodes.length + 1).padStart(3, '0')}`;
      label = text;
    }

    // Skip if too short or likely noise
    if (label.length < 2 && !idMatch) continue;

    // Avoid duplicates
    if (usedIds.has(nodeId)) {
      nodeId = `${nodeId}-${nodes.length}`;
    }
    usedIds.add(nodeId);

    nodes.push({
      id: nodeId,
      label: label.slice(0, 200),
      type: nodeType,
      description: '',
    });
  }

  onProgress?.('Inferring connections from layout...');

  // Simple spatial connection inference: sort blocks top-to-bottom, left-to-right
  // and connect sequentially
  const sortedNodes = [...nodes];
  const connections: EPCConnection[] = [];

  // Connect nodes in sequence (top-to-bottom flow)
  for (let i = 0; i < sortedNodes.length - 1; i++) {
    connections.push({
      id: crypto.randomUUID(),
      source: sortedNodes[i].id,
      target: sortedNodes[i + 1].id,
      label: '',
    });
  }

  // Try to extract process ID from the overall text
  const fullText = result.data.text || '';
  const processIdMatch = fullText.match(/([A-Z]{2,}-\d{3})\b/);

  onProgress?.('Extraction complete! Please review and adjust the results.');

  return {
    processId: processIdMatch ? processIdMatch[1] : 'PROCESS-001',
    processName: 'Extracted Process',
    nodes,
    connections,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

interface TextBlock {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

function groupWordsIntoBlocks(words: Tesseract.Word[]): TextBlock[] {
  if (words.length === 0) return [];

  // Sort by position
  const sorted = [...words].sort((a, b) => {
    const aDiff = a.bbox.y0;
    const bDiff = b.bbox.y0;
    if (Math.abs(aDiff - bDiff) < 15) return a.bbox.x0 - b.bbox.x0;
    return aDiff - bDiff;
  });

  const blocks: TextBlock[] = [];
  let current: TextBlock = {
    text: sorted[0].text,
    bbox: { ...sorted[0].bbox },
  };

  for (let i = 1; i < sorted.length; i++) {
    const word = sorted[i];
    const verticalGap = Math.abs(word.bbox.y0 - current.bbox.y0);
    const horizontalGap = word.bbox.x0 - current.bbox.x1;

    // Group words that are close together
    if (verticalGap < 20 && horizontalGap < 30) {
      current.text += ' ' + word.text;
      current.bbox.x1 = Math.max(current.bbox.x1, word.bbox.x1);
      current.bbox.y1 = Math.max(current.bbox.y1, word.bbox.y1);
    } else {
      if (current.text.trim().length > 1) blocks.push(current);
      current = { text: word.text, bbox: { ...word.bbox } };
    }
  }
  if (current.text.trim().length > 1) blocks.push(current);

  return blocks;
}

function getDominantColor(
  ctx: CanvasRenderingContext2D,
  bbox: { x0: number; y0: number; x1: number; y1: number }
): { r: number; g: number; b: number } {
  const padding = 5;
  const x = Math.max(0, bbox.x0 - padding);
  const y = Math.max(0, bbox.y0 - padding);
  const w = Math.min(ctx.canvas.width - x, bbox.x1 - bbox.x0 + padding * 2);
  const h = Math.min(ctx.canvas.height - y, bbox.y1 - bbox.y0 + padding * 2);

  if (w <= 0 || h <= 0) return { r: 255, g: 255, b: 255 };

  const imageData = ctx.getImageData(x, y, w, h);
  const data = imageData.data;

  let rSum = 0, gSum = 0, bSum = 0, count = 0;

  // Sample border pixels for background color
  for (let i = 0; i < data.length; i += 4) {
    const px = (i / 4) % w;
    const py = Math.floor((i / 4) / w);
    if (px < 3 || px >= w - 3 || py < 3 || py >= h - 3) {
      rSum += data[i];
      gSum += data[i + 1];
      bSum += data[i + 2];
      count++;
    }
  }

  if (count === 0) return { r: 255, g: 255, b: 255 };
  return { r: rSum / count, g: gSum / count, b: bSum / count };
}

function classifyNodeType(color: { r: number; g: number; b: number }): NodeType {
  const { r, g, b } = color;

  // Green detection (in-scope steps)
  if (g > 150 && g > r * 1.2 && g > b * 1.2) return 'in-scope';

  // Pink/Red detection (events)
  if (r > 180 && r > g * 1.3 && r > b * 1.1) return 'event';

  // Blue detection (XOR gateways)
  if (b > 150 && b > r * 1.2 && b > g * 1.1) return 'xor';

  // Default to interface (white/light)
  return 'interface';
}
