import { useSocial } from '../features/social/SocialStore.jsx';
import { useEffect, useState } from 'react';
import { readMedia } from '../data/mediaVault.js';

export default function ChirpAttachment({ attachment, owner = false, visual = false, allowedPreview = false }) {
  const social = useSocial();
  const [url, setUrl] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let alive = true;
    let objectUrl;
    setUrl(''); setRevealed(false); setMissing(false);
    if (!attachment?.id || visual || (!['approved', 'sensitive'].includes(attachment?.moderation?.status) && !allowedPreview)) return undefined;
    readMedia(attachment.id).then(blob => {
      if (!alive) return;
      if (!blob) { setMissing(true); return; }
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
    }).catch(() => { if (alive) setMissing(true); });
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [attachment?.id, attachment?.moderation?.status, allowedPreview, visual]);
  if (!attachment) return null;
  const status = attachment.moderation?.status || 'pending_scan';
  if (status === 'rejected' || (!['approved', 'sensitive'].includes(status) && !allowedPreview && !visual)) {
    return <div className="chirpr-attachment chirpr-attachment--restricted" role="status"><span>◈ MEDIA IN QUARANTINE</span><strong>{status === 'rejected' ? 'Blocked by automatic safety classification.' : 'Automatic safety scan incomplete.'}</strong><p>Unverified media is not available to other viewers.</p>{owner && status === 'rejected' && <button type="button" className="chirpr-attachment__appeal" onClick={() => social?.report(attachment.id, 'appeal', 'Appeal automated media decision', (attachment.moderation?.reasons || []).join(', '))}>Appeal decision ↗</button>}</div>;
  }
  const reason = status === 'sensitive' ? (attachment.moderation?.reasons?.join(', ') || 'Sensitive imagery') : (attachment.warning || attachment.moderation?.reasons?.join(', ') || 'Automated scan incomplete');
  const obscured = !revealed && (status === 'sensitive' || status !== 'approved' || (!!attachment.warning && social?.prefs.sensitiveBlur !== false));
  return <div className="chirpr-attachment" data-media-kind={attachment.kind}>
    <div className={`chirpr-attachment__viewport${obscured ? ' chirpr-attachment__viewport--blurred' : ''}`}>
      {visual ? <div className="chirpr-attachment__placeholder">◈ Media attachment</div> : missing ? <div className="chirpr-attachment__placeholder">Media not available on this device</div> : !url ? <div className="chirpr-attachment__placeholder">Preparing preview…</div> :
        attachment.kind === 'video' ? <video src={url} controls={revealed || !obscured} playsInline preload="metadata" /> : <img src={url} alt={attachment.alt || attachment.name || 'Uploaded image'} loading="lazy" />}
    </div>
    {obscured && !visual && <div className="chirpr-attachment__warning" role="group" aria-label="Content warning">
      <span>◈ CONTENT NOTICE</span><strong>{reason}</strong>
      <button type="button" onClick={() => setRevealed(true)}>Show media anyway ↗</button>
    </div>}
    <div className="chirpr-attachment__meta"><span>{attachment.kind === 'video' ? '▣ VIDEO' : '▧ IMAGE'}</span><span>{status === 'approved' ? 'Automatically checked' : status === 'sensitive' ? 'Sensitive · automatic content warning' : status === 'rejected' ? 'Blocked' : 'Automatic scan incomplete'}</span>{owner && <span>Private demo media</span>}</div>
  </div>;
}
