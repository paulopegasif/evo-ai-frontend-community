import React from 'react';

// WhatsApp inline formatting for plain-text messages: *bold*, _italic_,
// ~strike~. Same boundary rules as WhatsApp — the opening marker follows the
// start or a space/punctuation and is followed by a non-space; the closing one
// follows a non-space and precedes the end or a space/punctuation — so
// snake_case words, "2*3*4" and URLs (handled before this) stay literal.
const WA_FORMAT_SOURCE = /(^|[\s([{"'])([*_~])(?=\S)([^\n]*?\S)\2(?=$|[\s)\]}"'.,!?;:])/g;

export function formatWhatsAppText(text: string, keyPrefix = 'wa'): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  // A fresh RegExp per call: the recursion for nested markers must not share
  // (and reset) the outer loop's lastIndex.
  const regex = new RegExp(WA_FORMAT_SOURCE.source, 'g');
  while ((match = regex.exec(text)) !== null) {
    const [whole, lead, marker, inner] = match;
    if (inner.includes(marker)) continue;
    const start = match.index + lead.length;
    if (start > last) nodes.push(text.slice(last, start));
    const key = `${keyPrefix}-${start}`;
    const children = formatWhatsAppText(inner, key);
    nodes.push(
      marker === '*' ? <strong key={key}>{children}</strong>
        : marker === '_' ? <em key={key}>{children}</em>
        : <s key={key}>{children}</s>,
    );
    last = match.index + whole.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
