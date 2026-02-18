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
  avgColor: { r: number; g: number; b: number };
  nodeType: NodeType;
  text: string;
  pixelCount: number;
  aspectRatio: number;
}

/**
 * Improved OCR + Canvas Vision extraction:
 * 1. Scan image grid for colored regions using connected-component labeling
 * 2. Classify regions by color (green=in-scope, pink=event, blue=xor, white=interface)
 * 3. Run Tesseract OCR for text extraction
 * 4. Map text to regions by spatial containment/proximity
 * 5. Trace dark pixel paths between regions to detect connections
 */
export async function extractWithOCR(
  imageFile: File,
  onProgress?: (msg: string) => void
): Promise<ExtractionResult> {
  onProgress?.('Loading image...');

  const imageUrl = URL.createObjectURL(imageFile);
  const img = await loadImage(imageUrl);
  
  // Use a reasonable size for analysis (scale down large images)
  const maxDim = 2000;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);

  onProgress?.('Detecting colored shapes...');
  const regions = detectRegions(imageData, w, h);
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
  
  // Scale OCR coordinates to match our canvas
  const ocrScale = scale;
  const scaledWords = words.map((w: any) => ({
    ...w,
    bbox: {
      x0: Math.round(w.bbox.x0 * ocrScale),
      y0: Math.round(w.bbox.y0 * ocrScale),
      x1: Math.round(w.bbox.x1 * ocrScale),
      y1: Math.round(w.bbox.y1 * ocrScale),
    },
  }));
  
  const textBlocks = groupWordsIntoBlocks(scaledWords);
  assignTextToRegions(textBlocks, regions);

  onProgress?.('Tracing connections between shapes...');
  const rawConns = traceConnections(imageData, w, h, regions);

  // Build nodes
  const nodes: EPCNode[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    const text = region.text.trim();
    if (!text || text.length < 2) continue;

    // Try to extract ID pattern like CP-060-020
    const idMatch = text.match(/[A-Z]{2,}-\d{2,}(?:-\d{2,})?/);
    let nodeId: string;
    let label: string;

    if (idMatch) {
      nodeId = idMatch[0];
      label = text.replace(idMatch[0], '').trim() || nodeId;
    } else if (region.nodeType === 'xor') {
      nodeId = `XOR-${nodes.filter(n => n.type === 'xor').length + 1}`;
      label = text || 'XOR';
    } else {
      nodeId = `NODE-${String(nodes.length + 1).padStart(3, '0')}`;
      label = text;
    }

    if (usedIds.has(nodeId)) nodeId = `${nodeId}-${i}`;
    usedIds.add(nodeId);
    (region as any)._nodeId = nodeId;

    nodes.push({
      id: nodeId,
      label: label.slice(0, 200),
      type: region.nodeType,
      description: '',
    });
  }

  // Map connections
  const nodeConnections: EPCConnection[] = rawConns
    .map((conn) => {
      const sourceId = (regions[conn.sourceIdx] as any)?._nodeId;
      const targetId = (regions[conn.targetIdx] as any)?._nodeId;
      if (!sourceId || !targetId || sourceId === targetId) return null;
      return {
        id: crypto.randomUUID(),
        source: sourceId,
        target: targetId,
        label: conn.label || '',
      };
    })
    .filter(Boolean) as EPCConnection[];

  // Deduplicate
  const connSet = new Set<string>();
  const uniqueConns = nodeConnections.filter((c) => {
    const key = `${c.source}->${c.target}`;
    if (connSet.has(key)) return false;
    connSet.add(key);
    return true;
  });

  const fullText = ocrResult.data.text || '';
  const processIdMatch = fullText.match(/([A-Z]{2,}-\d{2,})\b/);

  onProgress?.(`Done! ${nodes.length} nodes, ${uniqueConns.length} connections.`);

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
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ─── Region detection using grid scanning + connected components ───

function detectRegions(imageData: ImageData, width: number, height: number): DetectedRegion[] {
  const data = imageData.data;
  const labels = new Int32Array(width * height);
  let nextLabel = 1;
  const regionMap = new Map<number, { 
    minX: number; minY: number; maxX: number; maxY: number;
    rSum: number; gSum: number; bSum: number; count: number;
  }>();

  // Step size for scanning - use 1 for accuracy
  const step = 1;
  
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = y * width + x;
      const pi = idx * 4;
      const r = data[pi], g = data[pi + 1], b = data[pi + 2];

      // Classify this pixel
      const colorType = classifyPixelColor(r, g, b);
      if (colorType === 'none') continue;

      // Check neighbors for same color type
      let assignedLabel = 0;
      
      // Check left neighbor
      if (x > 0) {
        const leftIdx = y * width + (x - 1);
        if (labels[leftIdx] > 0) {
          const li = leftIdx * 4;
          const lr = data[li], lg = data[li + 1], lb = data[li + 2];
          if (classifyPixelColor(lr, lg, lb) === colorType) {
            assignedLabel = labels[leftIdx];
          }
        }
      }
      
      // Check top neighbor
      if (y > 0) {
        const topIdx = (y - 1) * width + x;
        if (labels[topIdx] > 0) {
          const ti = topIdx * 4;
          const tr = data[ti], tg = data[ti + 1], tb = data[ti + 2];
          if (classifyPixelColor(tr, tg, tb) === colorType) {
            if (assignedLabel === 0) {
              assignedLabel = labels[topIdx];
            } else if (labels[topIdx] !== assignedLabel) {
              // Merge: relabel the smaller region
              const keep = Math.min(assignedLabel, labels[topIdx]);
              const remove = Math.max(assignedLabel, labels[topIdx]);
              mergeLabels(labels, width, height, remove, keep, regionMap);
              assignedLabel = keep;
            }
          }
        }
      }

      if (assignedLabel === 0) {
        assignedLabel = nextLabel++;
        regionMap.set(assignedLabel, { minX: x, minY: y, maxX: x, maxY: y, rSum: 0, gSum: 0, bSum: 0, count: 0 });
      }

      labels[idx] = assignedLabel;
      const region = regionMap.get(assignedLabel)!;
      region.rSum += r;
      region.gSum += g;
      region.bSum += b;
      region.count++;
      if (x < region.minX) region.minX = x;
      if (y < region.minY) region.minY = y;
      if (x > region.maxX) region.maxX = x;
      if (y > region.maxY) region.maxY = y;
    }
  }

  // Convert to DetectedRegion, filter by minimum size
  const minPixels = Math.max(100, (width * height) / 5000);
  const result: DetectedRegion[] = [];

  for (const [, info] of regionMap) {
    if (info.count < minPixels) continue;
    const bw = info.maxX - info.minX;
    const bh = info.maxY - info.minY;
    if (bw < 15 || bh < 15) continue;
    // Skip regions that span most of the image (background)
    if (bw > width * 0.8 && bh > height * 0.8) continue;

    const avgR = info.rSum / info.count;
    const avgG = info.gSum / info.count;
    const avgB = info.bSum / info.count;
    const nodeType = classifyNodeType(avgR, avgG, avgB);

    result.push({
      bbox: { x: info.minX, y: info.minY, w: bw, h: bh },
      avgColor: { r: avgR, g: avgG, b: avgB },
      nodeType,
      text: '',
      pixelCount: info.count,
      aspectRatio: bw / Math.max(bh, 1),
    });
  }

  // Merge overlapping regions of same type
  return mergeOverlapping(result);
}

function mergeLabels(
  labels: Int32Array, width: number, height: number,
  from: number, to: number,
  regionMap: Map<number, any>
) {
  const fromInfo = regionMap.get(from);
  const toInfo = regionMap.get(to);
  if (fromInfo && toInfo) {
    toInfo.rSum += fromInfo.rSum;
    toInfo.gSum += fromInfo.gSum;
    toInfo.bSum += fromInfo.bSum;
    toInfo.count += fromInfo.count;
    toInfo.minX = Math.min(toInfo.minX, fromInfo.minX);
    toInfo.minY = Math.min(toInfo.minY, fromInfo.minY);
    toInfo.maxX = Math.max(toInfo.maxX, fromInfo.maxX);
    toInfo.maxY = Math.max(toInfo.maxY, fromInfo.maxY);
  }
  regionMap.delete(from);
  // Relabel pixels (deferred - we'll check on lookup)
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] === from) labels[i] = to;
  }
}

type PixelColorType = 'green' | 'pink' | 'blue' | 'white' | 'none';

function classifyPixelColor(r: number, g: number, b: number): PixelColorType {
  const brightness = (r + g + b) / 3;
  
  // Skip very dark pixels (lines, text)
  if (brightness < 60) return 'none';
  
  // Skip near-gray pixels
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const saturation = maxC > 0 ? (maxC - minC) / maxC : 0;
  
  // Green: high green, decent saturation
  if (g > 120 && g > r * 1.1 && g > b * 1.1 && saturation > 0.15) return 'green';
  
  // Pink/Magenta: high red, decent blue, low green relative
  if (r > 170 && b > 120 && r > g * 1.1 && saturation > 0.1) return 'pink';
  if (r > 200 && r > g * 1.3) return 'pink';
  
  // Blue/Cyan: high blue
  if (b > 150 && b > r * 1.1 && saturation > 0.1) return 'blue';
  if (g > 180 && b > 180 && r < g * 0.85) return 'blue'; // cyan
  
  // White/light shapes: high brightness, low saturation
  if (brightness > 200 && saturation < 0.15) {
    // Only count as "white shape" if not pure white background
    // Background is usually 250+, shapes are slightly off-white
    if (brightness < 250) return 'white';
  }
  
  return 'none';
}

function classifyNodeType(r: number, g: number, b: number): NodeType {
  if (g > 120 && g > r * 1.1 && g > b * 1.1) return 'in-scope';
  if (r > 170 && (r > g * 1.2 || (r > 180 && b > 120))) return 'event';
  if (b > 140 && b > r * 1.1) return 'xor';
  return 'interface';
}

function mergeOverlapping(regions: DetectedRegion[]): DetectedRegion[] {
  const merged: DetectedRegion[] = [];
  const used = new Set<number>();

  // Sort by area descending
  const sorted = regions.map((r, i) => ({ r, i })).sort((a, b) => 
    (b.r.bbox.w * b.r.bbox.h) - (a.r.bbox.w * a.r.bbox.h)
  );

  for (const { r: region, i } of sorted) {
    if (used.has(i)) continue;
    let current = { ...region, bbox: { ...region.bbox } };
    used.add(i);

    for (const { r: other, i: j } of sorted) {
      if (used.has(j)) continue;
      if (other.nodeType !== current.nodeType) continue;
      if (bboxOverlap(current.bbox, other.bbox, 20)) {
        current.bbox = mergeBBox(current.bbox, other.bbox);
        current.pixelCount += other.pixelCount;
        if (other.text) current.text += ' ' + other.text;
        used.add(j);
      }
    }
    merged.push(current);
  }
  return merged;
}

function bboxOverlap(a: BBox, b: BBox, margin = 15): boolean {
  return !(a.x + a.w + margin < b.x || b.x + b.w + margin < a.x ||
           a.y + a.h + margin < b.y || b.y + b.h + margin < a.y);
}

function mergeBBox(a: BBox, b: BBox): BBox {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

// ─── Text mapping ───

function assignTextToRegions(textBlocks: TextBlock[], regions: DetectedRegion[]) {
  for (const block of textBlocks) {
    const text = block.text.trim();
    if (text.length < 2) continue;
    
    const bCx = (block.bbox.x0 + block.bbox.x1) / 2;
    const bCy = (block.bbox.y0 + block.bbox.y1) / 2;
    
    let bestRegion: DetectedRegion | null = null;
    let bestDist = Infinity;

    for (const region of regions) {
      const rCx = region.bbox.x + region.bbox.w / 2;
      const rCy = region.bbox.y + region.bbox.h / 2;

      // Check containment (text center inside region bbox with margin)
      const margin = 30;
      const inside =
        bCx >= region.bbox.x - margin &&
        bCx <= region.bbox.x + region.bbox.w + margin &&
        bCy >= region.bbox.y - margin &&
        bCy <= region.bbox.y + region.bbox.h + margin;

      if (!inside) continue;

      const dist = Math.hypot(bCx - rCx, bCy - rCy);
      if (dist < bestDist) {
        bestDist = dist;
        bestRegion = region;
      }
    }

    // Also try proximity if no containment match (for labels near XOR nodes)
    if (!bestRegion) {
      for (const region of regions) {
        const rCx = region.bbox.x + region.bbox.w / 2;
        const rCy = region.bbox.y + region.bbox.h / 2;
        const dist = Math.hypot(bCx - rCx, bCy - rCy);
        const maxProximity = Math.max(region.bbox.w, region.bbox.h) * 1.5;
        if (dist < maxProximity && dist < bestDist) {
          bestDist = dist;
          bestRegion = region;
        }
      }
    }

    if (bestRegion) {
      bestRegion.text = bestRegion.text ? bestRegion.text + ' ' + text : text;
    }
  }
}

// ─── Connection tracing ───

interface RawConnection {
  sourceIdx: number;
  targetIdx: number;
  label: string;
}

function traceConnections(
  imageData: ImageData,
  width: number,
  height: number,
  regions: DetectedRegion[]
): RawConnection[] {
  const connections: RawConnection[] = [];
  const data = imageData.data;

  for (let i = 0; i < regions.length; i++) {
    for (let j = 0; j < regions.length; j++) {
      if (i === j) continue;

      const a = regions[i];
      const b = regions[j];
      const aCx = a.bbox.x + a.bbox.w / 2;
      const aCy = a.bbox.y + a.bbox.h / 2;
      const bCx = b.bbox.x + b.bbox.w / 2;
      const bCy = b.bbox.y + b.bbox.h / 2;

      const dist = Math.hypot(aCx - bCx, aCy - bCy);
      // Max reasonable distance for connection
      if (dist > Math.max(width, height) * 0.6) continue;

      // Find edge points closest to each other
      const aEdge = getEdgePoint(a.bbox, bCx, bCy);
      const bEdge = getEdgePoint(b.bbox, aCx, aCy);

      if (hasLinePath(data, width, height, aEdge, bEdge, regions, i, j)) {
        connections.push({ sourceIdx: i, targetIdx: j, label: '' });
      }
    }
  }

  // Remove duplicate/reverse connections - keep the one going left-to-right or top-to-bottom
  const deduped: RawConnection[] = [];
  const seen = new Set<string>();
  for (const c of connections) {
    const key = `${Math.min(c.sourceIdx, c.targetIdx)}-${Math.max(c.sourceIdx, c.targetIdx)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    
    // Determine direction: source should be earlier in flow (left/top)
    const a = regions[c.sourceIdx];
    const b = regions[c.targetIdx];
    const aCx = a.bbox.x + a.bbox.w / 2;
    const bCx = b.bbox.x + b.bbox.w / 2;
    const aCy = a.bbox.y + a.bbox.h / 2;
    const bCy = b.bbox.y + b.bbox.h / 2;
    
    // Prefer left-to-right, then top-to-bottom
    if (aCx > bCx + 50 || (Math.abs(aCx - bCx) < 50 && aCy > bCy + 20)) {
      deduped.push({ sourceIdx: c.targetIdx, targetIdx: c.sourceIdx, label: '' });
    } else {
      deduped.push(c);
    }
  }

  return deduped;
}

function getEdgePoint(bbox: BBox, targetX: number, targetY: number): { x: number; y: number } {
  const cx = bbox.x + bbox.w / 2;
  const cy = bbox.y + bbox.h / 2;
  
  const dx = targetX - cx;
  const dy = targetY - cy;
  const angle = Math.atan2(dy, dx);
  
  // Find intersection with bbox edge
  const hw = bbox.w / 2;
  const hh = bbox.h / 2;
  
  let ex: number, ey: number;
  if (Math.abs(Math.cos(angle)) * hh > Math.abs(Math.sin(angle)) * hw) {
    // Intersects left or right edge
    ex = cx + Math.sign(dx) * hw;
    ey = cy + Math.tan(angle) * Math.sign(dx) * hw;
  } else {
    // Intersects top or bottom edge
    ey = cy + Math.sign(dy) * hh;
    ex = cx + (1 / Math.tan(angle)) * Math.sign(dy) * hh;
  }
  
  return { x: Math.round(ex), y: Math.round(ey) };
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
  const pathLen = Math.hypot(to.x - from.x, to.y - from.y);
  if (pathLen < 10) return false;

  const sampleCount = Math.min(Math.round(pathLen), 60);
  let darkPixels = 0;
  let totalSampled = 0;

  for (let s = 2; s < sampleCount - 2; s++) {
    const t = s / sampleCount;
    const x = Math.round(from.x + (to.x - from.x) * t);
    const y = Math.round(from.y + (to.y - from.y) * t);

    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    // Skip if inside another region
    let insideOther = false;
    for (let ri = 0; ri < regions.length; ri++) {
      if (ri === skipA || ri === skipB) continue;
      const r = regions[ri];
      if (x >= r.bbox.x - 5 && x <= r.bbox.x + r.bbox.w + 5 &&
          y >= r.bbox.y - 5 && y <= r.bbox.y + r.bbox.h + 5) {
        insideOther = true;
        break;
      }
    }
    if (insideOther) continue;

    totalSampled++;

    // Check neighborhood for dark pixels (lines)
    let foundDark = false;
    for (let dy = -3; dy <= 3 && !foundDark; dy++) {
      for (let dx = -3; dx <= 3 && !foundDark; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const pi = (ny * width + nx) * 4;
        if (data[pi] < 80 && data[pi + 1] < 80 && data[pi + 2] < 80) {
          foundDark = true;
        }
      }
    }
    if (foundDark) darkPixels++;
  }

  if (totalSampled < 4) return false;
  return darkPixels / totalSampled > 0.25;
}

// ─── OCR text grouping ───

interface TextBlock {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

function groupWordsIntoBlocks(words: any[]): TextBlock[] {
  if (words.length === 0) return [];

  // Filter low-confidence words
  const filtered = words.filter((w: any) => w.confidence > 30);
  if (filtered.length === 0) return [];

  const sorted = [...filtered].sort((a: any, b: any) => {
    if (Math.abs(a.bbox.y0 - b.bbox.y0) < 20) return a.bbox.x0 - b.bbox.x0;
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

    if (verticalGap < 30 && horizontalGap < 50) {
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
