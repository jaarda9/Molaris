// Shared text helpers used by every feature. Always escape user/patient data
// before putting it into innerHTML.

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Minimal Markdown for AI replies: headings, bold, bullets, paragraphs. Input is escaped first.
function formatMarkdown(text) {
  return escapeHtml(text)
    .replace(/^### (.*$)/gim, '<h4 class="font-bold text-teal-700 dark:text-teal-300 text-sm mt-2">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 class="font-bold text-slate-900 dark:text-white text-base mt-3">$1</h3>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-slate-900 dark:text-slate-100">$1</strong>')
    .replace(/^\s*[-*]\s+(.*$)/gim, '<div class="flex items-start gap-1.5 ml-1"><span class="text-teal-600">&bull;</span><span>$1</span></div>')
    .replace(/\n\n/g, '<div class="h-2"></div>');
}
