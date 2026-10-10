const LOGO_SRC = '/logo.png';
const LOGO_COLOR = '#800020';
const LOGO_WIDTH_RATIO = 0.3;
const LOGO_PADDING_RATIO = 0.016;

export type RoomQrItem = { masterProductId: number; name: string; url: string };

export const roomQrUrl = (domain: string, masterProductId: number) => `${domain.replace(/\/$/, '')}/m?room=${masterProductId}`;

let logoPromise: Promise<HTMLImageElement> | null = null;

function loadLogo(): Promise<HTMLImageElement> {
  if (!logoPromise) {
    logoPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => { logoPromise = null; reject(new Error('LOGO_LOAD_FAILED')); };
      img.src = LOGO_SRC;
    });
  }
  return logoPromise;
}

function tintLogo(img: HTMLImageElement, width: number, height: number, color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  return canvas;
}

export function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function createRoomQrCanvas(url: string, size = 1440): Promise<HTMLCanvasElement> {
  const { toCanvas } = await import('qrcode');
  const canvas = document.createElement('canvas');
  await toCanvas(canvas, url, { width: size, margin: 1, errorCorrectionLevel: 'H', color: { dark: '#000000', light: '#ffffff' } });
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  try {
    const logo = await loadLogo();
    const logoWidth = Math.round(canvas.width * LOGO_WIDTH_RATIO);
    const logoHeight = Math.round(logoWidth * (logo.naturalHeight / logo.naturalWidth));
    const x = Math.round((canvas.width - logoWidth) / 2);
    const y = Math.round((canvas.height - logoHeight) / 2);
    const pad = Math.round(canvas.width * LOGO_PADDING_RATIO);
    ctx.fillStyle = '#ffffff';
    roundedRectPath(ctx, x - pad, y - pad, logoWidth + pad * 2, logoHeight + pad * 2, pad);
    ctx.fill();
    ctx.drawImage(tintLogo(logo, logoWidth, logoHeight, LOGO_COLOR), x, y, logoWidth, logoHeight);
  } catch {
    return canvas;
  }
  return canvas;
}

export async function createRoomQrDataUrl(url: string, size = 1440): Promise<string> {
  const canvas = await createRoomQrCanvas(url, size);
  return canvas.toDataURL('image/png');
}

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const MARGIN_MM = 12;
const GAP_MM = 8;
const COLS = 2;
const ROWS = 3;
const CELL_W_MM = (PAGE_W_MM - MARGIN_MM * 2 - GAP_MM * (COLS - 1)) / COLS;
const CELL_H_MM = (PAGE_H_MM - MARGIN_MM * 2 - GAP_MM * (ROWS - 1)) / ROWS;
const PX_PER_MM = 12;
const FRAME_COLOR = '#800020';

function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, centerX: number, startY: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  words.some(word => {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) current = candidate;
    else { lines.push(current); current = word; }
    return lines.length === maxLines;
  });
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    if (lines.join(' ').length < text.length) lines[maxLines - 1] = `${last}…`;
  }
  lines.forEach((line, i) => ctx.fillText(line, centerX, startY + i * lineHeight));
  return lines.length;
}

async function renderTile(item: RoomQrItem): Promise<HTMLCanvasElement> {
  const width = Math.round(CELL_W_MM * PX_PER_MM);
  const height = Math.round(CELL_H_MM * PX_PER_MM);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const labelH = Math.round(height * 0.17);
  const frameH = height - labelH;
  const frameW = width;
  const border = Math.max(2, Math.round(width * 0.006));
  const radius = Math.round(width * 0.045);

  ctx.strokeStyle = FRAME_COLOR;
  ctx.lineWidth = border;
  roundedRectPath(ctx, border / 2, border / 2, frameW - border, frameH - border, radius);
  ctx.stroke();

  const innerPad = Math.round(width * 0.07);
  const qrSize = Math.min(frameW, frameH) - innerPad * 2;
  const qrCanvas = await createRoomQrCanvas(item.url, 1440);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(qrCanvas, Math.round((frameW - qrSize) / 2), Math.round((frameH - qrSize) / 2), qrSize, qrSize);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const nameSize = Math.round(height * 0.045);
  ctx.font = `700 ${nameSize}px "Segoe UI", Roboto, Arial, sans-serif`;
  ctx.fillStyle = '#111827';
  const lineHeight = Math.round(nameSize * 1.25);
  const usedLines = drawWrappedText(ctx, item.name, width / 2, frameH + Math.round(labelH * 0.14), width * 0.92, lineHeight, 2);

  const idSize = Math.round(height * 0.032);
  ctx.font = `400 ${idSize}px "Segoe UI", Roboto, Arial, sans-serif`;
  ctx.fillStyle = '#6b7280';
  ctx.fillText(`Room ID: ${item.masterProductId}`, width / 2, frameH + Math.round(labelH * 0.14) + usedLines * lineHeight + Math.round(idSize * 0.3));
  return canvas;
}

export async function buildRoomQrPdf(items: RoomQrItem[]): Promise<Blob> {
  const { jsPDF: JsPdf } = await import('jspdf');
  const doc = new JsPdf({ unit: 'mm', format: 'a4', compress: true });
  const perPage = COLS * ROWS;
  await items.reduce(async (previous, item, index) => {
    await previous;
    const slot = index % perPage;
    if (index > 0 && slot === 0) doc.addPage();
    const col = slot % COLS;
    const row = Math.floor(slot / COLS);
    const x = MARGIN_MM + col * (CELL_W_MM + GAP_MM);
    const y = MARGIN_MM + row * (CELL_H_MM + GAP_MM);
    const tile = await renderTile(item);
    doc.addImage(tile.toDataURL('image/png'), 'PNG', x, y, CELL_W_MM, CELL_H_MM, undefined, 'FAST');
  }, Promise.resolve());
  return doc.output('blob');
}

export async function downloadRoomQrPdf(items: RoomQrItem[], fileName = 'qr-phong.pdf') {
  const blob = await buildRoomQrPdf(items);
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
}
