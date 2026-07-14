import jsPDF from 'jspdf';

export const PAGE_MARGIN = 16;
export const PAGE_WIDTH = 210;
export const PAGE_HEIGHT = 297;
export const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
export const FOOTER_Y = 286;

export const C = {
  primary: [0, 105, 120] as const,
  accent: [0, 200, 220] as const,
  accentLight: [224, 247, 250] as const,
  purple: [126, 87, 194] as const,
  purpleLight: [237, 231, 246] as const,
  dark: [8, 24, 40] as const,
  text: [26, 38, 58] as const,
  muted: [100, 120, 140] as const,
  white: [255, 255, 255] as const,
  cardBg: [245, 252, 255] as const,
  cardBorder: [0, 200, 220] as const,
  red: [211, 47, 47] as const,
  redBg: [255, 235, 238] as const,
  redBorder: [239, 83, 80] as const,
  amber: [230, 126, 34] as const,
  amberBg: [255, 243, 224] as const,
  amberBorder: [255, 183, 77] as const,
  green: [46, 125, 50] as const,
  greenBg: [232, 245, 233] as const,
  greenBorder: [102, 187, 106] as const,
  cyanBg: [224, 247, 250] as const,
  cyanBorder: [0, 188, 212] as const,
};

export interface PdfCursor {
  doc: jsPDF;
  y: number;
  pageNum: number;
}

export interface TagStyle {
  bg: readonly [number, number, number];
  border: readonly [number, number, number];
  text: readonly [number, number, number];
}

function setFill(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

function setDraw(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function setText(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function drawAccentStripe(doc: jsPDF) {
  setFill(doc, C.accent);
  doc.rect(0, 0, 4, PAGE_HEIGHT, 'F');
}

export function createReportDoc(subtitle: string): PdfCursor {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  drawAccentStripe(doc);

  setFill(doc, C.dark);
  doc.rect(4, 0, PAGE_WIDTH - 4, 38, 'F');
  setFill(doc, C.primary);
  doc.rect(4, 36, PAGE_WIDTH - 4, 2, 'F');

  setText(doc, C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('MEDAI', PAGE_MARGIN + 2, 16);

  setFill(doc, C.accent);
  doc.roundedRect(PAGE_MARGIN + 2, 19, 28, 5, 1.5, 1.5, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  setText(doc, C.dark);
  doc.text('CLINICAL AI', PAGE_MARGIN + 5, 22.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  setText(doc, C.accent);
  doc.text(subtitle, PAGE_MARGIN + 2, 30);

  doc.setFontSize(7.5);
  setText(doc, [140, 180, 200]);
  doc.text(`Generated ${new Date().toLocaleString()}`, PAGE_MARGIN + 2, 35);

  setText(doc, C.text);
  return { doc, y: 46, pageNum: 1 };
}

export function ensureSpace(cursor: PdfCursor, needed: number): void {
  if (cursor.y + needed > FOOTER_Y - 6) {
    addPageFooter(cursor);
    cursor.doc.addPage();
    cursor.pageNum += 1;
    drawAccentStripe(cursor.doc);
    cursor.y = PAGE_MARGIN;
  }
}

function addPageFooter(cursor: PdfCursor): void {
  const { doc } = cursor;
  setDraw(doc, C.accent);
  doc.setLineWidth(0.4);
  doc.line(PAGE_MARGIN, FOOTER_Y - 3, PAGE_WIDTH - PAGE_MARGIN, FOOTER_Y - 3);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  setText(doc, C.muted);
  doc.text('MEDAI — For educational and research purposes only. Not intended for clinical use.', PAGE_MARGIN, FOOTER_Y);

  doc.setFont('helvetica', 'normal');
  doc.text(`Page ${cursor.pageNum}`, PAGE_WIDTH - PAGE_MARGIN, FOOTER_Y, { align: 'right' });
}

export function finalizeDoc(cursor: PdfCursor): jsPDF {
  addPageFooter(cursor);
  return cursor.doc;
}

export function addSectionHeading(cursor: PdfCursor, title: string, number?: number): void {
  ensureSpace(cursor, 16);
  const { doc } = cursor;

  setFill(doc, C.cardBg);
  setDraw(doc, C.cardBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(PAGE_MARGIN, cursor.y, CONTENT_WIDTH, 11, 2, 2, 'FD');

  setFill(doc, C.primary);
  doc.roundedRect(PAGE_MARGIN, cursor.y, 3, 11, 1, 1, 'F');

  if (number != null) {
    setFill(doc, C.accent);
    doc.circle(PAGE_MARGIN + 10, cursor.y + 5.5, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setText(doc, C.dark);
    doc.text(String(number), PAGE_MARGIN + 10, cursor.y + 6.8, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setText(doc, C.primary);
    doc.text(title, PAGE_MARGIN + 16, cursor.y + 7);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setText(doc, C.primary);
    doc.text(title, PAGE_MARGIN + 8, cursor.y + 7);
  }

  cursor.y += 15;
  setText(doc, C.text);
}

export function addSubheading(cursor: PdfCursor, title: string, color: readonly [number, number, number] = C.primary): void {
  ensureSpace(cursor, 10);
  const { doc } = cursor;
  setFill(doc, color);
  doc.circle(PAGE_MARGIN + 1.5, cursor.y - 1.2, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  setText(doc, color);
  doc.text(title, PAGE_MARGIN + 5, cursor.y);
  cursor.y += 6;
  setText(doc, C.text);
}

export function addInfoCard(cursor: PdfCursor, text: string): void {
  if (!text?.trim()) return;
  const { doc } = cursor;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const lines = doc.splitTextToSize(text.trim(), CONTENT_WIDTH - 14);
  const boxH = lines.length * 4.2 + 10;
  ensureSpace(cursor, boxH + 4);

  setFill(doc, C.cyanBg);
  setDraw(doc, C.cyanBorder);
  doc.setLineWidth(0.4);
  doc.roundedRect(PAGE_MARGIN, cursor.y, CONTENT_WIDTH, boxH, 2.5, 2.5, 'FD');
  setFill(doc, C.accent);
  doc.roundedRect(PAGE_MARGIN, cursor.y, 3, boxH, 1, 1, 'F');

  setText(doc, C.text);
  doc.text(lines, PAGE_MARGIN + 7, cursor.y + 7);
  cursor.y += boxH + 5;
}

export function addHighlightBox(cursor: PdfCursor, label: string, text: string, style: TagStyle): void {
  if (!text?.trim()) return;
  const { doc } = cursor;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(text.trim(), CONTENT_WIDTH - 14);
  const boxH = lines.length * 4 + 12;
  ensureSpace(cursor, boxH + 4);

  setFill(doc, style.bg);
  setDraw(doc, style.border);
  doc.setLineWidth(0.35);
  doc.roundedRect(PAGE_MARGIN, cursor.y, CONTENT_WIDTH, boxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setText(doc, style.text);
  doc.text(label.toUpperCase(), PAGE_MARGIN + 5, cursor.y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setText(doc, C.text);
  doc.text(lines, PAGE_MARGIN + 5, cursor.y + 11);
  cursor.y += boxH + 5;
}

export function addParagraph(cursor: PdfCursor, text: string, fontSize = 9.5): void {
  if (!text?.trim()) return;
  cursor.doc.setFont('helvetica', 'normal');
  cursor.doc.setFontSize(fontSize);
  const lines = cursor.doc.splitTextToSize(text.trim(), CONTENT_WIDTH);
  ensureSpace(cursor, lines.length * 4.2 + 3);
  setText(cursor.doc, C.text);
  cursor.doc.text(lines, PAGE_MARGIN, cursor.y);
  cursor.y += lines.length * 4.2 + 3;
}

export function addMetaRow(cursor: PdfCursor, label: string, value: string, valueColor: readonly [number, number, number] = C.text): void {
  ensureSpace(cursor, 7);
  const { doc } = cursor;
  setFill(doc, [250, 252, 254]);
  doc.roundedRect(PAGE_MARGIN, cursor.y - 4, CONTENT_WIDTH, 6.5, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setText(doc, C.muted);
  doc.text(label, PAGE_MARGIN + 3, cursor.y);
  doc.setFont('helvetica', 'normal');
  setText(doc, valueColor);
  doc.text(value, PAGE_MARGIN + 48, cursor.y);
  cursor.y += 7;
  setText(doc, C.text);
}

export function addColoredTags(cursor: PdfCursor, tags: { label: string; style: TagStyle }[]): void {
  if (!tags.length) return;
  ensureSpace(cursor, 10);
  const { doc } = cursor;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  let x = PAGE_MARGIN;
  tags.forEach(({ label, style }) => {
    const w = doc.getTextWidth(label) + 8;
    if (x + w > PAGE_MARGIN + CONTENT_WIDTH) {
      cursor.y += 7;
      x = PAGE_MARGIN;
    }
    setFill(doc, style.bg);
    setDraw(doc, style.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, cursor.y - 3.8, w, 6, 1.5, 1.5, 'FD');
    setText(doc, style.text);
    doc.text(label, x + 4, cursor.y);
    x += w + 3;
  });
  cursor.y += 9;
  setText(doc, C.text);
}

export function urgencyStyle(urgency: string): TagStyle {
  if (urgency === 'high') {
    return { bg: C.redBg, border: C.redBorder, text: C.red };
  }
  if (urgency === 'medium') {
    return { bg: C.amberBg, border: C.amberBorder, text: C.amber };
  }
  return { bg: C.greenBg, border: C.greenBorder, text: C.green };
}

export function addRankBadge(cursor: PdfCursor, rank: number, title: string): void {
  ensureSpace(cursor, 14);
  const { doc } = cursor;

  setFill(doc, C.purpleLight);
  setDraw(doc, C.purple);
  doc.setLineWidth(0.35);
  doc.roundedRect(PAGE_MARGIN, cursor.y, CONTENT_WIDTH, 12, 2, 2, 'FD');

  setFill(doc, C.purple);
  doc.circle(PAGE_MARGIN + 8, cursor.y + 6, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setText(doc, C.white);
  doc.text(String(rank), PAGE_MARGIN + 8, cursor.y + 7.5, { align: 'center' });

  doc.setFontSize(12);
  setText(doc, C.dark);
  doc.text(title, PAGE_MARGIN + 16, cursor.y + 7.5);
  cursor.y += 16;
}

export function addStatCards(cursor: PdfCursor, cards: { label: string; value: string; color?: readonly [number, number, number] }[]): void {
  if (!cards.length) return;
  ensureSpace(cursor, 22);
  const gap = 4;
  const cardW = (CONTENT_WIDTH - gap * (cards.length - 1)) / cards.length;
  const cardH = 18;

  cards.forEach((card, i) => {
    const x = PAGE_MARGIN + i * (cardW + gap);
    const accent = card.color ?? C.primary;
    setFill(cursor.doc, C.cardBg);
    setDraw(cursor.doc, C.cardBorder);
    cursor.doc.setLineWidth(0.3);
    cursor.doc.roundedRect(x, cursor.y, cardW, cardH, 2, 2, 'FD');
    setFill(cursor.doc, accent);
    cursor.doc.roundedRect(x, cursor.y, cardW, 2.5, 1, 1, 'F');

    cursor.doc.setFont('helvetica', 'bold');
    cursor.doc.setFontSize(7);
    setText(cursor.doc, C.muted);
    cursor.doc.text(card.label.toUpperCase(), x + cardW / 2, cursor.y + 7, { align: 'center' });

    cursor.doc.setFont('helvetica', 'bold');
    cursor.doc.setFontSize(13);
    setText(cursor.doc, accent);
    cursor.doc.text(card.value, x + cardW / 2, cursor.y + 14, { align: 'center' });
  });

  cursor.y += cardH + 6;
  setText(cursor.doc, C.text);
}

export function addProgressBar(
  cursor: PdfCursor,
  label: string,
  score: number,
  isTop: boolean,
): void {
  ensureSpace(cursor, 10);
  const { doc } = cursor;
  const pct = Math.round(score * 100);
  const barColor = isTop ? C.accent : C.primary;
  const barBg = isTop ? C.cyanBg : [235, 242, 245] as const;

  doc.setFont('helvetica', isTop ? 'bold' : 'normal');
  doc.setFontSize(8.5);
  setText(doc, isTop ? C.dark : C.text);
  doc.text(label.replace(/_/g, ' '), PAGE_MARGIN, cursor.y);

  doc.setFont('helvetica', 'bold');
  setText(doc, isTop ? C.primary : C.muted);
  doc.text(`${pct}%`, PAGE_WIDTH - PAGE_MARGIN, cursor.y, { align: 'right' });

  cursor.y += 3;
  const barW = CONTENT_WIDTH;
  const fillW = Math.max(2, (pct / 100) * barW);
  setFill(doc, barBg);
  doc.roundedRect(PAGE_MARGIN, cursor.y, barW, 3.5, 1, 1, 'F');
  setFill(doc, barColor);
  doc.roundedRect(PAGE_MARGIN, cursor.y, fillW, 3.5, 1, 1, 'F');

  cursor.y += 7;
  setText(doc, C.text);
}

export function addBulletList(cursor: PdfCursor, items: string[], bulletColor: readonly [number, number, number] = C.accent): void {
  if (!items?.length) return;
  cursor.doc.setFont('helvetica', 'normal');
  cursor.doc.setFontSize(9);
  items.forEach(item => {
    const lines = cursor.doc.splitTextToSize(item, CONTENT_WIDTH - 8);
    ensureSpace(cursor, lines.length * 4 + 2);
    setText(cursor.doc, bulletColor);
    cursor.doc.text('▸', PAGE_MARGIN + 1, cursor.y);
    setText(cursor.doc, C.text);
    cursor.doc.text(lines, PAGE_MARGIN + 6, cursor.y);
    cursor.y += lines.length * 4 + 1.5;
  });
  cursor.y += 2;
}

export function addWarningBox(cursor: PdfCursor, title: string, items: string[]): void {
  if (!items?.length) return;
  const { doc } = cursor;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let totalLines = 0;
  const wrapped = items.map(item => {
    const lines = doc.splitTextToSize(item, CONTENT_WIDTH - 14);
    totalLines += lines.length;
    return lines;
  });
  const boxH = totalLines * 4 + 14;
  ensureSpace(cursor, boxH + 4);

  setFill(doc, C.redBg);
  setDraw(doc, C.redBorder);
  doc.setLineWidth(0.4);
  doc.roundedRect(PAGE_MARGIN, cursor.y, CONTENT_WIDTH, boxH, 2, 2, 'FD');
  setFill(doc, C.red);
  doc.roundedRect(PAGE_MARGIN, cursor.y, CONTENT_WIDTH, 7, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setText(doc, C.white);
  doc.text(title.toUpperCase(), PAGE_MARGIN + 4, cursor.y + 4.8);

  let innerY = cursor.y + 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setText(doc, C.text);
  wrapped.forEach(lines => {
    doc.text(lines, PAGE_MARGIN + 5, innerY);
    innerY += lines.length * 4 + 1;
  });
  cursor.y += boxH + 5;
}

export function addDisclaimerBox(cursor: PdfCursor, text: string): void {
  if (!text?.trim()) return;
  const { doc } = cursor;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const lines = doc.splitTextToSize(text.trim(), CONTENT_WIDTH - 10);
  const boxH = lines.length * 3.8 + 12;
  ensureSpace(cursor, boxH + 4);

  setFill(doc, C.amberBg);
  setDraw(doc, C.amberBorder);
  doc.setLineWidth(0.35);
  doc.roundedRect(PAGE_MARGIN, cursor.y, CONTENT_WIDTH, boxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setText(doc, C.amber);
  doc.text('⚠  DISCLAIMER', PAGE_MARGIN + 4, cursor.y + 5.5);

  doc.setFont('helvetica', 'normal');
  setText(doc, [90, 70, 30]);
  doc.text(lines, PAGE_MARGIN + 4, cursor.y + 10.5);
  cursor.y += boxH + 6;
  setText(doc, C.text);
}

export function slugifyFilename(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'report';
}

export function downloadPdf(doc: jsPDF, filename: string): void {
  doc.save(filename);
}

function loadImageDimensions(base64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = `data:image/png;base64,${base64}`;
  });
}

export async function addGradCamImage(
  cursor: PdfCursor,
  base64: string,
  caption: string,
): Promise<void> {
  const dims = await loadImageDimensions(base64);
  const maxW = CONTENT_WIDTH - 8;
  const maxH = 85;
  let w = maxW;
  let h = (dims.height / dims.width) * w;
  if (h > maxH) {
    h = maxH;
    w = (dims.width / dims.height) * h;
  }

  const framePad = 6;
  const headerH = 8;
  const totalH = h + framePad * 2 + headerH + 10;
  ensureSpace(cursor, totalH);

  const { doc } = cursor;
  const frameX = PAGE_MARGIN;
  const frameW = CONTENT_WIDTH;

  setFill(doc, C.dark);
  doc.roundedRect(frameX, cursor.y, frameW, headerH + framePad + h + framePad, 2.5, 2.5, 'F');
  setFill(doc, C.primary);
  doc.roundedRect(frameX, cursor.y, frameW, headerH, 2.5, 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setText(doc, C.white);
  doc.text('GRAD-CAM HEATMAP', frameX + 4, cursor.y + 5.5);

  setFill(doc, C.accent);
  doc.roundedRect(frameX + frameW - 28, cursor.y + 1.5, 24, 5, 1, 1, 'F');
  doc.setFontSize(6.5);
  setText(doc, C.dark);
  doc.text('EXPLAINABLE AI', frameX + frameW - 16, cursor.y + 4.8, { align: 'center' });

  const imgX = frameX + (frameW - w) / 2;
  const imgY = cursor.y + headerH + framePad;
  setDraw(doc, C.accent);
  doc.setLineWidth(0.6);
  doc.roundedRect(imgX - 1.5, imgY - 1.5, w + 3, h + 3, 1.5, 1.5, 'D');
  doc.addImage(`data:image/png;base64,${base64}`, 'PNG', imgX, imgY, w, h);

  cursor.y += headerH + framePad + h + framePad + 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  setText(doc, C.muted);
  const capLines = doc.splitTextToSize(caption, CONTENT_WIDTH - 10);
  doc.text(capLines, PAGE_WIDTH / 2, cursor.y, { align: 'center' });
  cursor.y += capLines.length * 3.5 + 6;
  setText(doc, C.text);
}
