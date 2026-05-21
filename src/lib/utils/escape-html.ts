/**
 * Escape HTML special characters to prevent XSS in email templates.
 *
 * OWASP recommended escaping for untrusted data in HTML body context.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
