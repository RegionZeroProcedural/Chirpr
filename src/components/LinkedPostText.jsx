import { Link } from 'react-router-dom';
// Text is kept as React text nodes, never injected as HTML.
export default function LinkedPostText({ text = '', visual = false }) {
  return <>{text.split(/(#[a-z0-9_]{1,40}\b|@[a-z0-9_]{1,20}\b)/gi).map((part, i) => {
    if (part.startsWith('#')) return visual ? <span key={i}>{part}</span> : <Link key={i} className="chirpr-inline-tag" to={`/tags/${encodeURIComponent(part.slice(1).toLowerCase())}`}>{part}</Link>;
    if (part.startsWith('@')) return visual ? <span key={i} className="chirpr-editor-mention">{part}</span> : <Link key={i} className="chirpr-inline-tag chirpr-inline-tag--mention" to={`/users/${encodeURIComponent(part.slice(1).toLowerCase())}`}>{part}</Link>;
    return part;
  })}</>;
}
