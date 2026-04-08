"use server";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildBodyHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return '<p></p>';
  }

  const paragraphs = normalized.split(/\n{2,}/);
  const htmlParagraphs = paragraphs.map((paragraph) => {
    const escaped = escapeHtml(paragraph);
    const withBreaks = escaped.replace(/\n/g, '<br />');
    return `<p>${withBreaks}</p>`;
  });

  return htmlParagraphs.join('');
}

export function buildPlainText(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}
