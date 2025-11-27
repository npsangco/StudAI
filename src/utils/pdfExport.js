// utils/pdfExport.js - PDF Export functionality using jsPDF
import jsPDF from 'jspdf';
import { renderMarkdownToHtml } from './markdown';

/**
 * Export a single note to PDF
 * @param {Object} note - The note object to export
 * @param {string} note.title - Note title
 * @param {string} note.content - Note content
 * @param {string} note.createdAt - Creation date
 * @param {number} note.words - Word count
 */
export const exportNoteToPDF = async (note) => {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    // Helper function to add new page if needed
    const checkPageBreak = (requiredSpace) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };

    // Title
    pdf.setFontSize(20);
    pdf.setFont(undefined, 'bold');
    const titleText = note.title || 'Untitled Note';
    const titleLines = pdf.splitTextToSize(titleText, contentWidth);
    titleLines.forEach((line) => {
      checkPageBreak(10);
      pdf.text(line, margin, yPosition, { maxWidth: contentWidth });
      yPosition += 10;
    });

    yPosition += 5;

    // Metadata
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(100);
    
    const createdDate = new Date(note.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    checkPageBreak(5);
    pdf.text(`Created: ${createdDate}`, margin, yPosition);
    yPosition += 5;
    
    checkPageBreak(5);
    pdf.text(`Words: ${note.words || 0}`, margin, yPosition);
    yPosition += 10;

    // Separator line
    checkPageBreak(5);
    pdf.setDrawColor(200);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Content
    pdf.setFontSize(11);
    pdf.setTextColor(0);
    pdf.setFont(undefined, 'normal');

    // Prefer rendering Markdown to styled HTML and use jsPDF.html when available
    const rawContent = note.content || 'No content';
    try {
      if (typeof pdf.html === 'function') {
        // Create a temporary container with sanitized HTML
        const container = document.createElement('div');
        container.className = 'export-prose prose';
        container.style.width = `${contentWidth}px`;
        container.style.padding = '8px';
        container.innerHTML = `<h1>${(note.title || 'Untitled Note')}</h1>` +
                  `<p style="color:#666;font-size:12px;">Created: ${createdDate} • Words: ${note.words || 0}</p>` +
                  renderMarkdownToHtml(rawContent);
        // Append off-screen to ensure styles are computed
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        document.body.appendChild(container);

        await new Promise((resolve) => {
          pdf.html(container, {
            x: margin,
            y: yPosition,
            html2canvas: { scale: 1 },
            callback: function () {
              // remove container and resolve
              if (container.parentNode) container.parentNode.removeChild(container);
              resolve();
            }
          });
        });
      } else {
        // Fallback to plain-text rendering
        const paragraphs = rawContent.split('\n');
        paragraphs.forEach((paragraph) => {
          if (paragraph.trim() === '') {
            yPosition += 5;
            return;
          }

          const lines = pdf.splitTextToSize(paragraph.trim(), contentWidth);
          lines.forEach((line) => {
            checkPageBreak(7);
            pdf.text(line.trim(), margin, yPosition, { maxWidth: contentWidth, align: 'left' });
            yPosition += 7;
          });
          yPosition += 3;
        });
      }
    } catch (err) {
      console.error('Markdown PDF render failed, falling back to plain text:', err);
      const paragraphs = rawContent.split('\n');
      paragraphs.forEach((paragraph) => {
        if (paragraph.trim() === '') {
          yPosition += 5;
          return;
        }

        const lines = pdf.splitTextToSize(paragraph.trim(), contentWidth);
        lines.forEach((line) => {
          checkPageBreak(7);
          pdf.text(line.trim(), margin, yPosition, { maxWidth: contentWidth, align: 'left' });
          yPosition += 7;
        });
        yPosition += 3;
      });
    }

    // Footer on last page
    const totalPages = pdf.internal.getNumberOfPages();
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(
      `Page ${totalPages} • Generated on ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    // Save the PDF
    const fileName = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`;
    pdf.save(fileName);

    return { success: true, fileName };
  } catch (error) {
    console.error('PDF export failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Export multiple notes to a single PDF
 * @param {Array} notes - Array of note objects
 */
export const exportMultipleNotesToPDF = async (notes) => {
  try {
    if (!notes || notes.length === 0) {
      throw new Error('No notes to export');
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    const checkPageBreak = (requiredSpace) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };

    // Cover page
    pdf.setFontSize(24);
    pdf.setFont(undefined, 'bold');
    pdf.text('Notes Export', pageWidth / 2, pageHeight / 3, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'normal');
    pdf.text(`${notes.length} note${notes.length > 1 ? 's' : ''}`, pageWidth / 2, pageHeight / 3 + 15, { align: 'center' });
    pdf.text(new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }), pageWidth / 2, pageHeight / 3 + 25, { align: 'center' });

    // Render all notes as HTML into a single off-screen container, then let jsPDF paginate
    const container = document.createElement('div');
    container.className = 'export-prose prose';
    container.style.width = `${contentWidth}px`;
    container.style.padding = '8px';
    container.style.boxSizing = 'border-box';

    // Build HTML for all notes
    let html = `<div style="font-family: Arial, sans-serif;">`;
    notes.forEach((note, index) => {
      const title = note.title || 'Untitled Note';
      const createdDate = new Date(note.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      html += `<section style="page-break-after: always; margin-bottom: 20px;">`;
      html += `<h1 style="font-size:20px;margin:0 0 8px 0;">${title}</h1>`;
      html += `<p style="color:#666;font-size:12px;margin:0 0 12px 0;">${createdDate} • ${note.words || 0} words</p>`;
      html += renderMarkdownToHtml(note.content || 'No content');
      html += `</section>`;
    });
    html += `</div>`;

    container.innerHTML = html;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    await new Promise((resolve) => {
      pdf.html(container, {
        x: margin,
        y: margin,
        html2canvas: { scale: 1 },
        callback: function () {
          if (container.parentNode) container.parentNode.removeChild(container);
          resolve();
        }
      });
    });

    // Add page numbers to all pages
    const totalPages = pdf.internal.getNumberOfPages();
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Save
    const fileName = `notes_export_${Date.now()}.pdf`;
    pdf.save(fileName);

    return { success: true, fileName, count: notes.length };
  } catch (error) {
    console.error('Multiple notes PDF export failed:', error);
    return { success: false, error: error.message };
  }
};