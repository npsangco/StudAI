// utils/pdfExport.js - PDF Export functionality using jsPDF
import jsPDF from 'jspdf';

/**
 * Export a single note to PDF
 * @param {Object} note - The note object to export
 * @param {string} note.title - Note title
 * @param {string} note.content - Note content
 * @param {string} note.createdAt - Creation date
 * @param {number} note.words - Word count
 */
export const exportNoteToPDF = (note) => {
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

    const content = note.content || 'No content';
    const paragraphs = content.split('\n');

    paragraphs.forEach((paragraph) => {
      if (paragraph.trim() === '') {
        yPosition += 5;
        return;
      }

      // Split text properly to fit within margins
      const lines = pdf.splitTextToSize(paragraph.trim(), contentWidth);
      
      lines.forEach((line) => {
        checkPageBreak(7);
        pdf.text(line.trim(), margin, yPosition, { maxWidth: contentWidth, align: 'left' });
        yPosition += 7;
      });
      
      yPosition += 3; // Space between paragraphs
    });

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
export const exportMultipleNotesToPDF = (notes) => {
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

    // Export each note
    notes.forEach((note, index) => {
      pdf.addPage();
      yPosition = margin;

      // Note number
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(100);
      pdf.text(`Note ${index + 1} of ${notes.length}`, margin, yPosition);
      yPosition += 10;

      // Title
      pdf.setFontSize(18);
      pdf.setTextColor(0);
      const titleText = note.title || 'Untitled Note';
      const titleLines = pdf.splitTextToSize(titleText, contentWidth);
      titleLines.forEach((line) => {
        checkPageBreak(10);
        pdf.text(line, margin, yPosition, { maxWidth: contentWidth });
        yPosition += 10;
      });
      yPosition += 5;

      // Metadata
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(100);
      
      const createdDate = new Date(note.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      pdf.text(`${createdDate} • ${note.words || 0} words`, margin, yPosition);
      yPosition += 8;

      // Separator
      pdf.setDrawColor(200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      // Content
      pdf.setFontSize(10);
      pdf.setTextColor(0);
      pdf.setFont(undefined, 'normal');

      const content = note.content || 'No content';
      const paragraphs = content.split('\n');

      paragraphs.forEach((paragraph) => {
        if (paragraph.trim() === '') {
          yPosition += 4;
          return;
        }

        // Split text properly to fit within margins
        const lines = pdf.splitTextToSize(paragraph.trim(), contentWidth);
        
        lines.forEach((line) => {
          checkPageBreak(6);
          pdf.text(line.trim(), margin, yPosition, { maxWidth: contentWidth, align: 'left' });
          yPosition += 6;
        });
        
        yPosition += 2;
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