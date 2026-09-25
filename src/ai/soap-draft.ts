/**
 * Cleans an AI SOAP draft before the dentist sees it. The draft may be signed into the
 * medical record as is, so chat-style wrapping must not survive: an introduction
 * (« Voici une proposition… »), separator lines, a closing remark, or a date placeholder.
 */
export function cleanSoapDraft(text: string, todayDisplay: string): string {
  let out = (text || '').replace(/\r\n/g, '\n');

  // Everything before the « Date » line is chat, not the note.
  const dateLine = out.search(/^[ \t>*_#-]*\**\s*Date\b/im);
  if (dateLine > 0) out = out.slice(dateLine);

  out = out
    .split('\n')
    .filter(line => !/^\s*([-*_=])\1{2,}\s*$/.test(line))   // ***, ---, ___ separators
    .join('\n')
    // Date placeholders the model could not fill: the server knows today's date.
    .replace(/\[\s*(date du jour|date de la séance|date|today'?s date|date of (the )?visit)\s*\]/gi, todayDisplay);

  return out.replace(/\n{3,}/g, '\n\n').trim();
}
