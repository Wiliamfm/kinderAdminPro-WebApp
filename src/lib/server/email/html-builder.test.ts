import { describe, expect, it } from 'vitest';
import { buildBodyHtml, buildPlainText } from './html-builder';

describe('buildBodyHtml', () => {
  it('returns empty paragraph for empty input', () => {
    expect(buildBodyHtml('')).toBe('<p></p>');
    expect(buildBodyHtml('   ')).toBe('<p></p>');
  });

  it('escapes HTML special characters', () => {
    const result = buildBodyHtml('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('converts single newlines to <br>', () => {
    const result = buildBodyHtml('Line 1\nLine 2\nLine 3');
    expect(result).toContain('<br />');
  });

  it('wraps paragraphs in <p> tags', () => {
    const result = buildBodyHtml('Paragraph 1\n\nParagraph 2');
    expect(result).toContain('<p>');
    expect(result).toContain('</p>');
  });

  it('handles multiple blank lines as paragraph separators', () => {
    const result = buildBodyHtml('Para 1\n\n\n\nPara 2');
    expect(result.split('<p>').length - 1).toBe(2);
  });

  it('handles CRLF line endings', () => {
    const result = buildBodyHtml('Line 1\r\nLine 2');
    expect(result).toContain('<br />');
  });

  it('preserves bold and italic markers', () => {
    const result = buildBodyHtml('**bold** and *italic*');
    expect(result).toContain('**bold**');
    expect(result).toContain('*italic*');
  });
});

describe('buildPlainText', () => {
  it('trims whitespace', () => {
    expect(buildPlainText('  hello  ')).toBe('hello');
  });

  it('normalizes CRLF to LF', () => {
    expect(buildPlainText('line1\r\nline2')).toBe('line1\nline2');
  });

  it('returns empty string for whitespace only', () => {
    expect(buildPlainText('')).toBe('');
    expect(buildPlainText('   ')).toBe('');
    expect(buildPlainText('\n\n')).toBe('');
  });
});
