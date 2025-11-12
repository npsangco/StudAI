  import { useState, useEffect } from 'react';
  import { API_URL } from '../config/api.config';

  const TextExtractor = ({ file, onTextExtracted }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState('');

    useEffect(() => {
      if (file) {
        extractText(file);
      }
    }, [file]);

    const extractText = async (file) => {
      setIsProcessing(true);
      setError('');
      setProgress('Starting extraction...');

      try {
        const fileType = file.type;
        const fileName = file.name.toLowerCase();

        if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
          await extractFromPDF(file);
        } else if (
          fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
          fileName.endsWith('.pptx')
        ) {
          await extractFromPPTX(file);
        } else if (fileName.endsWith('.ppt')) {
          setError('Legacy PPT format requires conversion to PPTX');
        } else {
          setError('Unsupported file type');
        }
      } catch (err) {
        console.error('Extraction error:', err);
        setError('Failed to extract text from file');
      } finally {
        setIsProcessing(false);
        setProgress('');
      }
    };

    const extractFromPDF = async (file) => {
      try {
        setProgress('Sending PDF to server for extraction...');
        
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/api/extract-pdf`, {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || errorData.error || 'Server extraction failed');
        }

        const data = await response.json();
        
        if (data.text && data.text.trim()) {
          setProgress('Text extracted from PDF');
          
          if (onTextExtracted) {
            onTextExtracted({
              title: file.name.replace(/\.[^/.]+$/, ''),
              content: data.text.trim(),
              source: 'PDF',
              wordCount: data.wordCount || data.text.trim().split(/\s+/).length
            });
          }
        } else {
          setError('Could not extract text from this PDF. The file may be image-based or encrypted. Please try uploading a text-based PDF.');
        }
      } catch (err) {
        console.error('PDF extraction error:', err.message);
        setError('PDF extraction failed: ' + err.message);
      }
    };

    const extractFromPPTX = async (file) => {
      try {
        setProgress('Sending PPTX to server for extraction...');
        
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/api/extract-pptx`, {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || errorData.error || 'Server extraction failed');
        }

        const data = await response.json();
        
        if (data.text && data.text.trim()) {
          setProgress('Text extracted from PowerPoint');
          
          if (onTextExtracted) {
            onTextExtracted({
              title: file.name.replace(/\.[^/.]+$/, ''),
              content: data.text.trim(),
              source: 'PPTX',
              wordCount: data.wordCount || data.text.trim().split(/\s+/).length
            });
          }
        } else {
          setError('No text found in PowerPoint file');
        }
      } catch (err) {
        console.error('PPTX extraction error:', err.message);
        setError(`Failed to extract from PowerPoint: ${err.message}`);
      }
    };

    const extractWithOCR = async (file) => {
      try {
        setProgress('Running OCR on images (Filipino language support)...');
        
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('fil', 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        });
        
        const { data: { text } } = await worker.recognize(file);
        await worker.terminate();

        if (text && text.trim()) {
          setProgress('OCR completed successfully');
          
          if (onTextExtracted) {
            onTextExtracted({
              title: file.name.replace(/\.[^/.]+$/, ''),
              content: text.trim(),
              source: 'OCR',
              wordCount: text.trim().split(/\s+/).length
            });
          }
        } else {
          setError('No text detected in file via OCR');
        }
      } catch (err) {
        console.error('OCR error:', err);
        setError('OCR extraction failed');
      }
    };

    if (!file) return null;

    return (
      <div className="text-xs text-gray-600 mt-2">
        {isProcessing && (
          <div className="flex items-center gap-2 bg-blue-50 p-2 rounded">
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span>{progress || 'Processing...'}</span>
          </div>
        )}
        {error && (
          <div className="text-red-600 bg-red-50 p-2 rounded border border-red-200">
            {error}
          </div>
        )}
      </div>
    );
  };

  export default TextExtractor;