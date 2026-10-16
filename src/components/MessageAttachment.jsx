import { useEffect, useState } from 'react';
import { readMedia } from '../data/mediaVault.js';

/** Only available for files stored in this local browser. Never renders failed scans. */
export default function MessageAttachment({ attachment }) {
  const [url, setUrl] = useState('');
  const [revealed, setRevealed] = useState(false);
  const status = attachment?.moderation?.status || 'pending_scan';
  useEffect(() => {
    if (!attachment?.id || !['approved', 'sensitive'].includes(status)) return undefined;
    let alive = true;
    let objectUrl;
    readMedia(attachment.id).then(blob => {
      if (!alive || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => {});
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [attachment?.id, status]);
  useEffect(() => { setRevealed(false); }, [attachment?.id]);
  if (!attachment) return null;
  if (status === 'rejected') return <div className="social-message-media-restricted">Media blocked by automated safety checks.</div>;
  if (!['approved', 'sensitive'].includes(status)) return <div className="social-message-media-restricted">Safety scan incomplete · Media cannot be shown.</div>;
  const blurred = status === 'sensitive' && !revealed;
  const notice = attachment.moderation?.reasons?.join(', ') || 'Sensitive imagery';
  return <div className="social-message-media">
    {url ? <div className={blurred ? 'social-message-media__blur' : ''}>{attachment.kind === 'video' ? <video src={url} controls={!blurred} playsInline preload="metadata" /> : <img src={url} loading="lazy" alt={attachment.alt || 'Shared media'} />}</div> : <span>Media is available only in the browser where it was uploaded.</span>}
    {blurred && <div className="social-message-media__notice"><b>Content notice</b><p>{notice}</p><button type="button" onClick={() => setRevealed(true)}>Reveal media</button></div>}
  </div>;
}
