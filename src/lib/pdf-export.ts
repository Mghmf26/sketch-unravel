import jsPDF from 'jspdf';

interface ReportSection {
  title: string;
  badge: string;
  items: string[];
}

interface PDFReportData {
  title: string;
  subtitle: string;
  generatedAt: Date;
  clientName?: string;
  scopeSummary: string;
  sections: ReportSection[];
}

const COLORS = {
  primary: [30, 64, 175] as [number, number, number],       // blue-800
  dark: [15, 23, 42] as [number, number, number],            // slate-900
  muted: [100, 116, 139] as [number, number, number],        // slate-500
  light: [241, 245, 249] as [number, number, number],        // slate-100
  white: [255, 255, 255] as [number, number, number],
  accent: [59, 130, 246] as [number, number, number],        // blue-500
  destructive: [220, 38, 38] as [number, number, number],    // red-600
  success: [22, 163, 74] as [number, number, number],        // green-600
  warning: [234, 179, 8] as [number, number, number],        // yellow-500
};

function getBadgeColor(badge: string): [number, number, number] {
  const lower = badge.toLowerCase();
  if (lower.includes('critical') || lower.includes('high') || lower.includes('risk')) return COLORS.destructive;
  if (lower.includes('action') || lower.includes('next')) return COLORS.accent;
  if (lower.includes('opportunity') || lower.includes('value')) return COLORS.success;
  return COLORS.primary;
}

export function exportReportToPDF(data: PDFReportData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // ── Cover Page ──
  // Top accent bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Logo area
  y = 30;
  doc.setFillColor(...COLORS.dark);
  doc.roundedRect(margin, y, 12, 12, 2, 2, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('MF', margin + 3.5, y + 5.5);
  doc.text('AI', margin + 4.5, y + 9.5);

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('MF AI Navigator', margin + 16, y + 5);
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('PROCESS INTELLIGENCE', margin + 16, y + 10);

  // Main title
  y = 80;
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(data.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 12;

  // Subtitle
  y += 4;
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const subtitleLines = doc.splitTextToSize(data.subtitle, contentWidth);
  doc.text(subtitleLines, margin, y);
  y += subtitleLines.length * 6 + 10;

  // Divider
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + 40, y);
  y += 12;

  // Meta info
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  if (data.clientName) {
    doc.text(`Client: ${data.clientName}`, margin, y);
    y += 6;
  }
  doc.text(`Generated: ${data.generatedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, y);
  y += 6;
  doc.text(`Time: ${data.generatedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`, margin, y);
  y += 12;

  // Scope summary box
  doc.setFillColor(...COLORS.light);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ANALYSIS SCOPE', margin + 5, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(7.5);
  const scopeLines = doc.splitTextToSize(data.scopeSummary, contentWidth - 10);
  doc.text(scopeLines, margin + 5, y + 10);

  // Footer on cover
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(7);
  doc.text('Confidential — For Internal Use Only', margin, pageHeight - 15);
  doc.text('© 2026 MF AI Navigator', pageWidth - margin - 35, pageHeight - 15);

  // Bottom accent bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, pageHeight - 4, pageWidth, 4, 'F');

  // ── Content Pages ──
  data.sections.forEach((section, sIdx) => {
    doc.addPage();
    y = 15;

    // Top accent
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 3, 'F');

    // Section number badge
    const badgeColor = getBadgeColor(section.badge);
    doc.setFillColor(...badgeColor);
    doc.roundedRect(margin, y, 8, 8, 1.5, 1.5, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(String(sIdx + 1), margin + 2.8, y + 5.8);

    // Section title
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, margin + 12, y + 6);

    // Badge
    const badgeWidth = doc.getTextWidth(section.badge) + 8;
    doc.setFillColor(...badgeColor);
    doc.roundedRect(pageWidth - margin - badgeWidth, y, badgeWidth, 7, 1.5, 1.5, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(section.badge, pageWidth - margin - badgeWidth + 4, y + 4.8);

    y += 16;

    // Items
    section.items.forEach((item, i) => {
      // Check page break
      const itemLines = doc.splitTextToSize(item, contentWidth - 16);
      const itemHeight = itemLines.length * 4.5 + 8;
      if (y + itemHeight > pageHeight - 20) {
        doc.addPage();
        doc.setFillColor(...COLORS.primary);
        doc.rect(0, 0, pageWidth, 3, 'F');
        y = 15;
      }

      // Item number circle
      doc.setFillColor(...COLORS.light);
      doc.circle(margin + 4, y + 3, 3.5, 'F');
      doc.setTextColor(...COLORS.primary);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(String(i + 1), margin + 2.5, y + 4.5);

      // Item text
      doc.setTextColor(...COLORS.dark);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(itemLines, margin + 12, y + 4.5);

      y += itemHeight;

      // Separator
      if (i < section.items.length - 1) {
        doc.setDrawColor(...COLORS.light);
        doc.setLineWidth(0.3);
        doc.line(margin + 12, y - 2, pageWidth - margin, y - 2);
      }
    });

    // Page footer
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(7);
    doc.text('MF AI Navigator — AI Analysis Report', margin, pageHeight - 10);
    doc.text(`Page ${sIdx + 2}`, pageWidth - margin - 10, pageHeight - 10);
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, pageHeight - 3, pageWidth, 3, 'F');
  });

  // Save
  const timestamp = data.generatedAt.toISOString().slice(0, 10);
  const filename = `MF_AI_Report_${data.clientName?.replace(/\s+/g, '_') || 'All'}_${timestamp}.pdf`;
  doc.save(filename);
}
