import { activeMention } from '../data/postText.js';

export function findMentionSuggestions(text, caret, users = []) {
  const mention = activeMention(text, caret);
  if (!mention) return { mention: null, suggestions: [] };
  const query = mention.query;
  return { mention, suggestions: users.filter(user =>
    user.username.toLowerCase().startsWith(query) || user.displayName?.toLowerCase().includes(query)
  ).slice(0, 5) };
}
export default function MentionSuggestions({ text, caret, users, onSelect }) {
  const { mention, suggestions } = findMentionSuggestions(text, caret, users);
  if (!mention || !suggestions.length) return null;
  return <div className="chirpr-mentions" role="listbox" aria-label="People to mention">
    <small>MENTION SOMEONE</small>
    {suggestions.map(user => <button role="option" aria-selected={false} type="button" key={user.uid} onMouseDown={e => e.preventDefault()} onClick={() => onSelect(user.username, mention)}>
      <b>{user.displayName?.[0] ?? '✳'}</b><span><strong>{user.displayName}</strong><small>@{user.username}</small></span><i>↗</i>
    </button>)}
  </div>;
}
