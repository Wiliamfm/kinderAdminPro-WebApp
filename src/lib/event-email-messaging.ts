export type EmailRecipientType = 'employee' | 'father';
export type EmailRecipientSourceKind = 'employee' | 'student' | 'grade';
export type EmailDeliveryStatus = 'pending' | 'sent' | 'failed' | 'missing_email' | 'skipped';

export type EmailRecipientSource = {
  kind: EmailRecipientSourceKind;
  id: string;
  label: string;
};

export type ResolvedEmailRecipient = {
  key: string;
  recipientType: EmailRecipientType;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  hasEmail: boolean;
  sources: EmailRecipientSource[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildEmailRecipientKey(
  recipientType: EmailRecipientType,
  recipientId: string,
): string {
  return `${recipientType}:${recipientId.trim()}`;
}

export function buildEmailPreviewHtml(bodyText: string): string {
  const normalized = bodyText.trim().replace(/\r\n/g, '\n');
  if (!normalized) return '<p></p>';

  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function mergeUniqueSources(sources: EmailRecipientSource[]): EmailRecipientSource[] {
  const merged: EmailRecipientSource[] = [];
  const seen = new Set<string>();

  for (const source of sources) {
    const key = `${source.kind}:${source.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(source);
  }

  return merged;
}

export function mergeResolvedEmailRecipients(
  recipients: ResolvedEmailRecipient[],
): ResolvedEmailRecipient[] {
  const merged = new Map<string, ResolvedEmailRecipient>();

  for (const recipient of recipients) {
    const existing = merged.get(recipient.key);
    if (!existing) {
      merged.set(recipient.key, {
        ...recipient,
        sources: mergeUniqueSources(recipient.sources),
      });
      continue;
    }

    merged.set(recipient.key, {
      ...existing,
      recipientName: existing.recipientName || recipient.recipientName,
      recipientEmail: existing.recipientEmail || recipient.recipientEmail,
      hasEmail: existing.hasEmail || recipient.hasEmail,
      sources: mergeUniqueSources([...existing.sources, ...recipient.sources]),
    });
  }

  return Array.from(merged.values()).sort((left, right) => (
    left.recipientName.localeCompare(right.recipientName, 'es', { sensitivity: 'base' })
  ));
}
