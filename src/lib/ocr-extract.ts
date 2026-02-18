import Tesseract from 'tesseract.js';
import type { EPCNode, EPCConnection, NodeType } from '@/types/epc';

interface ExtractionResult {
  processId: string;
  processName: string;
  nodes: EPCNode[];
  connections: EPCConnection[];
}

interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DetectedRegion {
  bbox: BBox;
  dominantColor: { r: number; g: number; b: number };
  nodeType: NodeType;
  text: string;
}

/**
 * Hybrid OCR + Canvas Vision extraction pipeline:
 * 1. Detect colored regions (shapes) via flood-fill on downsampled image
 * 2. Run Tesseract OCR to get text + bounding boxes
 * 3. Map OCR text blocks to nearest detected colored region
 * 4. Trace dark lines/arrows between regions to infer connections
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
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  onProgress?.('Detecting colored shape regions...');
  const regions = detectColorRegions(imageData, canvas.width, canvas.height);
  onProgress?.(`Found ${regions.length} shape regions`);

  onProgress?.('Running OCR text recognition...');
  const ocrResult = await Tesseract.recognize(imageUrl, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onProgress?.(`OCR: ${Math.round((m.progress || 0) * 100)}%`);
      }
    },
  });
  URL.revokeObjectURL(imageUrl);

  onProgress?.('Mapping text to shapes...');
  const words = (ocrResult.data as any).words || [];
  const textBlocks = groupWordsIntoBlocks(words);

  // Assign text to nearest region
  for (const block of textBlocks) {
    const text = block.text.trim();
    if (text.length < 2) continue;
    const blockCenter = {
      x: (block.bbox.x0 + block.bbox.x1) / 2,
      y: (block.bbox.y0 + block.bbox.y1) / 2,
    };
    let bestRegion: DetectedRegion | null = null;
    let bestDist = Infinity;
    for (const region of regions) {
      const regionCenter = {
        x: region.bbox.x + region.bbox.w / 2,
        y: region.bbox.y + region.bbox.h / 2,
      };
      // Check if text center is inside or near the region
      const inside =
        blockCenter.x >= region.bbox.x - 10 &&
        blockCenter.x <= region.bbox.x + region.bbox.w + 10 &&
        blockCenter.y >= region.bbox.y - 10 &&
        blockCenter.y <= region.bbox.y + region.bbox.h + 10;
      const dist = Math.hypot(blockCenter.x - regionCenter.x, blockCenter.y - regionCenter.y);
      if (inside && dist < bestDist) {
        bestDist = dist;
        bestRegion = region;
      }
    }
    if (bestRegion) {
      bestRegion.text = bestRegion.text ? bestRegion.text + ' ' + text : text;
    }
  }

  onProgress?.('Tracing arrows between shapes...');
  const connections = traceConnections(imageData, canvas.width, canvas.height, regions);

  // Build nodes from regions that have text
  const nodes: EPCNode[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    const text = region.text.trim();
    if (!text || text.length < 2) continue;

    // Try to extract ID pattern
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

    if (usedIds.has(nodeId)) nodeId = `${nodeId}-${i}`;
    usedIds.add(nodeId);

    // Store region index for connection mapping
    (region as any)._nodeId = nodeId;

    nodes.push({
      id: nodeId,
      label: label.slice(0, 200),
      type: region.nodeType,
      description: '',
    });
  }

  // Map connections from region indices to node IDs
  const nodeConnections: EPCConnection[] = connections
    .map((conn) => {
      const sourceId = (regions[conn.sourceIdx] as any)?._nodeId;
      const targetId = (regions[conn.targetIdx] as any)?._nodeId;
      if (!sourceId || !targetId || sourceId === targetId) return null;
      return {
        id: crypto.randomUUID(),
        source: sourceId,
        target: targetId,
        label: '',
      };
    })
    .filter(Boolean) as EPCConnection[];

  // Deduplicate connections
  const connSet = new Set<string>();
  const uniqueConns = nodeConnections.filter((c) => {
    const key = `${c.source}->${c.target}`;
    if (connSet.has(key)) return false;
    connSet.add(key);
    return true;
  });

  const fullText = ocrResult.data.text || '';
  const processIdMatch = fullText.match(/([A-Z]{2,}-\d{3})\b/);

  onProgress?.(`Extraction complete! ${nodes.length} nodes, ${uniqueConns.length} connections found.`);

  return {
    processId: processIdMatch ? processIdMatch[1] : 'PROCESS-001',
    processName: 'Extracted Process',
    nodes,
    connections: uniqueConns,
  };
}

// ─── Image helpers ───

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ─── Color region detection ───

function detectColorRegions(
  imageData: ImageData,
  width: number,
  height: number
): DetectedRegion[] {
  const data = imageData.data;
  const visited = new Uint8Array(width * height);
  const regions: DetectedRegion[] = [];
  const MIN_REGION_SIZE = Math.max(200, (width * height) / 2000); // adaptive threshold

  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const pi = idx * 4;
      const r = data[pi], g = data[pi + 1], b = data[pi + 2];

      // Skip near-white, near-black, and gray pixels (background / lines)
      if (isNeutral(r, g, b)) continue;

      // Flood fill to find connected colored region
      const result = floodFill(data, width, height, x, y, r, g, b, visited);
      if (result.count >= MIN_REGION_SIZE) {
        const avgR = result.rSum / result.count;
        const avgG = result.gSum / result.count;
        const avgB = result.bSum / result.count;
        const nodeType = classifyNodeType(avgR, avgG, avgB);

        regions.push({
          bbox: { x: result.minX, y: result.minY, w: result.maxX - result.minX, h: result.maxY - result.minY },
          dominantColor: { r: avgR, g: avgG, b: avgB },
          nodeType,
          text: '',
        });
      }
    }
  }

  // Merge overlapping regions of the same type
  return mergeOverlappingRegions(regions);
}

function isNeutral(r: number, g: number, b: number): boolean {
  const avg = (r + g + b) / 3;
  const maxDiff = Math.max(Math.abs(r - avg), Math.abs(g - avg), Math.abs(b - avg));
  // Near white
  if (r > 230 && g > 230 && b > 230) return true;
  // Near black
  if (r < 50 && g < 50 && b < 50) return true;
  // Gray (low saturation)
  if (maxDiff < 20 && avg > 80 && avg < 200) return true;
  return false;
}

interface FloodResult {
  count: number;
  minX: number; minY: number; maxX: number; maxY: number;
  rSum: number; gSum: number; bSum: number;
}

function floodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  refR: number,
  refG: number,
  refB: number,
  visited: Uint8Array
): FloodResult {
  const stack: number[] = [startX, startY];
  const result: FloodResult = {
    count: 0,
    minX: startX, minY: startY, maxX: startX, maxY: startY,
    rSum: 0, gSum: 0, bSum: 0,
  };
  const tolerance = 45;

  while (stack.length > 0) {
    const cy = stack.pop()!;
    const cx = stack.pop()!;
    if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
    const idx = cy * width + cx;
    if (visited[idx]) continue;

    const pi = idx * 4;
    const r = data[pi], g = data[pi + 1], b = data[pi + 2];
    const dr = Math.abs(r - refR), dg = Math.abs(g - refG), db = Math.abs(b - refB);
    if (dr > tolerance || dg > tolerance || db > tolerance) continue;

    visited[idx] = 1;
    result.count++;
    result.rSum += r;
    result.gSum += g;
    result.bSum += b;
    if (cx < result.minX) result.minX = cx;
    if (cy < result.minY) result.minY = cy;
    if (cx > result.maxX) result.maxX = cx;
    if (cy > result.maxY) result.maxY = cy;

    // Use step of 2 for performance
    stack.push(cx + 2, cy, cx - 2, cy, cx, cy + 2, cx, cy - 2);
  }

  return result;
}

function mergeOverlappingRegions(regions: DetectedRegion[]): DetectedRegion[] {
  const merged: DetectedRegion[] = [];
  const used = new Set<number>();

  for (let i = 0; i < regions.length; i++) {
    if (used.has(i)) continue;
    let current = { ...regions[i], bbox: { ...regions[i].bbox } };
    used.add(i);

    for (let j = i + 1; j < regions.length; j++) {
      if (used.has(j)) continue;
      if (regions[j].nodeType !== current.nodeType) continue;
      if (bboxOverlap(current.bbox, regions[j].bbox)) {
        current.bbox = mergeBBox(current.bbox, regions[j].bbox);
        if (regions[j].text) current.text += ' ' + regions[j].text;
        used.add(j);
      }
    }
    // Filter out regions that are too large (probably background)
    const area = current.bbox.w * current.bbox.h;
    const imgArea = 1; // relative check
    if (current.bbox.w < 800 && current.bbox.h < 600) {
      merged.push(current);
    }
  }

  return merged;
}

function bboxOverlap(a: BBox, b: BBox): boolean {
  const margin = 15;
  return !(a.x + a.w + margin < b.x || b.x + b.w + margin < a.x ||
           a.y + a.h + margin < b.y || b.y + b.h + margin < a.y);
}

function mergeBBox(a: BBox, b: BBox): BBox {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

// ─── Node type classification ───

function classifyNodeType(r: number, g: number, b: number): NodeType {
  // Green detection (in-scope steps)
  if (g > 140 && g > r * 1.15 && g > b * 1.15) return 'in-scope';
  // Pink/Red detection (events)
  if (r > 170 && r > g * 1.2 && r > b * 1.05) return 'event';
  // Blue detection (XOR gateways)
  if (b > 140 && b > r * 1.15 && b > g * 1.05) return 'xor';
  // Light/white = interface
  return 'interface';
}

// ─── Arrow/line tracing ───

interface RawConnection {
  sourceIdx: number;
  targetIdx: number;
}

function traceConnections(
  imageData: ImageData,
  width: number,
  height: number,
  regions: DetectedRegion[]
): RawConnection[] {
  const connections: RawConnection[] = [];
  const data = imageData.data;

  // For each pair of regions, check if there's a dark line path between them
  for (let i = 0; i < regions.length; i++) {
    for (let j = 0; j < regions.length; j++) {
      if (i === j) continue;

      const a = regions[i];
      const b = regions[j];
      const aCenterX = a.bbox.x + a.bbox.w / 2;
      const aCenterY = a.bbox.y + a.bbox.h / 2;
      const bCenterX = b.bbox.x + b.bbox.w / 2;
      const bCenterY = b.bbox.y + b.bbox.h / 2;

      // Only check nearby regions (within reasonable distance)
      const dist = Math.hypot(aCenterX - bCenterX, aCenterY - bCenterY);
      if (dist > 600) continue;

      // Check if there's a dark pixel path from bottom of A to top of B (typical top-to-bottom flow)
      const aBottom = { x: Math.round(aCenterX), y: Math.round(a.bbox.y + a.bbox.h) };
      const bTop = { x: Math.round(bCenterX), y: Math.round(b.bbox.y) };

      // Only consider downward connections primarily (or sideways for XOR branches)
      if (bTop.y < aBottom.y - 20 && Math.abs(aCenterX - bCenterX) > 100) continue;

      if (hasLinePath(data, width, height, aBottom, bTop, regions, i, j)) {
        connections.push({ sourceIdx: i, targetIdx: j });
      }
    }
  }

  return connections;
}

function hasLinePath(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  from: { x: number; y: number },
  to: { x: number; y: number },
  regions: DetectedRegion[],
  skipA: number,
  skipB: number
): boolean {
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  if (steps < 10) return false;

  const sampleCount = Math.min(steps, 40);
  let darkPixels = 0;
  let totalSampled = 0;

  for (let s = 1; s < sampleCount - 1; s++) {
    const t = s / sampleCount;
    const x = Math.round(from.x + (to.x - from.x) * t);
    const y = Math.round(from.y + (to.y - from.y) * t);

    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    // Skip points inside other regions
    let insideRegion = false;
    for (let ri = 0; ri < regions.length; ri++) {
      if (ri === skipA || ri === skipB) continue;
      const r = regions[ri];
      if (x >= r.bbox.x && x <= r.bbox.x + r.bbox.w && y >= r.bbox.y && y <= r.bbox.y + r.bbox.h) {
        insideRegion = true;
        break;
      }
    }
    if (insideRegion) continue;

    totalSampled++;

    // Check 3x3 neighborhood for dark pixels (lines are thin)
    let foundDark = false;
    for (let dy = -2; dy <= 2 && !foundDark; dy++) {
      for (let dx = -2; dx <= 2 && !foundDark; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const pi = (ny * width + nx) * 4;
        const r = data[pi], g = data[pi + 1], b = data[pi + 2];
        if (r < 100 && g < 100 && b < 100) foundDark = true;
      }
    }
    if (foundDark) darkPixels++;
  }

  if (totalSampled < 5) return false;
  // At least 30% of sampled points should have dark pixels nearby
  return darkPixels / totalSampled > 0.3;
}

// ─── OCR text grouping ───

interface TextBlock {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

function groupWordsIntoBlocks(words: Tesseract.Word[]): TextBlock[] {
  if (words.length === 0) return [];

  const sorted = [...words].sort((a, b) => {
    if (Math.abs(a.bbox.y0 - b.bbox.y0) < 15) return a.bbox.x0 - b.bbox.x0;
    return a.bbox.y0 - b.bbox.y0;
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

    if (verticalGap < 25 && horizontalGap < 40) {
      current.text += ' ' + word.text;
      current.bbox.x1 = Math.max(current.bbox.x1, word.bbox.x1);
      current.bbox.y1 = Math.max(current.bbox.y1, word.bbox.y1);
      current.bbox.x0 = Math.min(current.bbox.x0, word.bbox.x0);
    } else {
      if (current.text.trim().length > 1) blocks.push(current);
      current = { text: word.text, bbox: { ...word.bbox } };
    }
  }
  if (current.text.trim().length > 1) blocks.push(current);

  return blocks;
}
