export function parsePostTokens(text = '') {
  const hashtags = [...new Set(Array.from(text.matchAll(/(^|[^\w])#([a-z0-9_]{1,40})\b/gi), match => match[2].toLowerCase()))];
  const mentions = [...new Set(Array.from(text.matchAll(/(^|[^\w])@([a-z0-9_]{1,20})\b/gi), match => match[2].toLowerCase()))];
  return { hashtags, mentions };
}
export function activeMention(text, index = text.length) {
  const before = text.slice(0, index);
  const match = before.match(/(?:^|\s)@([\w]{0,20})$/);
  return match ? { query: match[1].toLowerCase(), start: index - match[1].length - 1, end: index } : null;
}
