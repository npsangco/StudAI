import { marked } from 'marked';
import DOMPurify from 'dompurify';

export function renderMarkdownToHtml(md) {
  if (!md) return '';
  try {
    const rawHtml = marked.parse(md);
    // DOMPurify expects a DOM window; in browser environments it's available globally
    return DOMPurify.sanitize(rawHtml);
  } catch (err) {
    console.error('Failed to render markdown:', err);
    return md;
  }
}
