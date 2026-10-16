import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { validateMedia } from '../data/mediaVault.js';
import { enqueueMediaUpload } from '../data/mediaUploadQueue.js';

const CONTENT_NOTICES = [
  { value: '', text: 'None — review still required' },
  { value: 'Flashing lights / photosensitivity', text: 'Flashing lights / photosensitivity' },
  { value: 'Graphic or violent imagery', text: 'Graphic or violent imagery' },
  { value: 'Nudity or sexual content', text: 'Nudity or sexual content' },
  { value: 'Disturbing imagery', text: 'Disturbing imagery' }
];
const SHARD_CELLS = [
  [0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]
];
function buildShards() {
  return SHARD_CELLS.map(([x,y], i) => {
    const left = x * 100 / 3, top = y * 100 / 3;
    const right = (x + 1) * 100 / 3, bottom = (y + 1) * 100 / 3;
    const jitter = () => (Math.random() - .5) * 10;
    const points = [[left+jitter(), top+jitter()], [right+jitter(), top+jitter()],
      [right+jitter(), bottom+jitter()], [left+jitter(), bottom+jitter()]];
    return { id: i, clip: `polygon(${points.map(([a,b]) => `${a}% ${b}%`).join(',')})`,
      dx: `${Math.round((x - 1) * 75 + (Math.random() -.5) * 120)}px`,
      dy: `${Math.round((y - 1) * 90 + (Math.random() -.5) * 100)}px`,
      rotate: `${Math.round((Math.random() - .5) * 120)}deg`,
      delay: `${Math.round(Math.random() * 105)}ms` };
  });
}

/** Portal grows out of the trigger, compresses into a paper airplane on submit.
 * Upload means saving into IndexedDB. This is NOT a publicly moderated upload. */
export default function MediaUploadModal({ origin, draft = '', groupId = null, isProfile = false, profileUsername = '', onClose, onPublish }) {
  const id = useId();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState(draft);
  const [warning, setWarning] = useState('');
  const [alt, setAlt] = useState('');
  const [shareToReels, setShareToReels] = useState(false);
  const [stage, setStage] = useState('open');
  const [error, setError] = useState('');
  const modalRef = useRef(null);
  const exitTimer = useRef(null);
  const [shatter, setShatter] = useState(null);
  const dismiss = () => {
    if (stage !== 'open') return;
    const rect = modalRef.current?.getBoundingClientRect();
    setShatter(rect ? { rect, pieces: buildShards() } : null);
    setStage('destruct');
    exitTimer.current = setTimeout(() => onClose(),
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 740);
  };
  useEffect(() => {
    const esc = event => { if (event.key === 'Escape' && stage === 'open') dismiss(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  });
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      clearTimeout(exitTimer.current);
    };
  }, []);
  useEffect(() => { if (!file) { setPreview(''); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);

  function choose(event) {
    const selected = event.target.files?.[0]; if (!selected) return;
    try { const kind = validateMedia(selected); setFile(selected); setError(''); if (kind !== 'video') setShareToReels(false); }
    catch (failure) { setFile(null); setError(failure.message); }
  }
  function submit(event) {
    event.preventDefault();
    if (!file || stage !== 'open') return;
    setError('');
    try {
      // Transfer the File and callback to an app-wide queue BEFORE closing.
      // The modal can now unmount; moderation and IndexedDB keep running.
      enqueueMediaUpload({ file, caption, warning, alt, shareToReels, groupId,
        isProfile, profileUsername, onPublish });
      setStage('sending');
      exitTimer.current = setTimeout(() => onClose({ queued: true }), 140);
    } catch (failure) {
      setError(failure.message || 'Unable to queue this media.');
    }
  }
  const cx = (origin?.left ?? window.innerWidth / 2) + (origin?.width ?? 0) / 2;
  const cy = (origin?.top ?? window.innerHeight / 2) + (origin?.height ?? 0) / 2;
  const kind = file?.type.startsWith('video/') ? 'video' : 'image';
  return createPortal(<div className={`chirpr-upload-overlay chirpr-upload-overlay--${stage}`} style={{ '--origin-x': `${cx}px`, '--origin-y': `${cy}px` }}>
    <div className="chirpr-upload-scrim" onClick={dismiss} />
    <section ref={modalRef} className="chirpr-upload-modal" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
      <div className="chirpr-upload-modal__top"><span>✳ MEDIA STUDIO / 01</span><button aria-label="Close upload" type="button" disabled={stage !== 'open'} onClick={dismiss}>✕</button></div>
      <div className="chirpr-upload-modal__intro">
        <h2 id={`${id}-title`}>Give your thought <em>dimension.</em></h2>
        <p>Upload an image or video. Media is checked automatically for sensitive or graphic content. Incomplete scans remain private.</p>
      </div>
      <form onSubmit={submit} className="chirpr-upload-modal__form">
        <div className="chirpr-upload-modal__content">
        <label className="chirpr-upload-drop"><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={choose} />
          {preview ? <div className="chirpr-upload-drop__preview">{kind === 'video' ? <video muted playsInline preload="metadata" src={preview} /> : <img src={preview} alt="Selected media preview" />}<span>Change file ↗</span></div> : <div><b>＋</b><strong>Choose a photo or video</strong><small>JPEG, PNG, WebP, GIF · MP4, WebM<br />Images 12MB max · Videos 40MB max</small></div>}
        </label>
        <label className="chirpr-upload-modal__field">CAPTION <textarea rows={2} maxLength={500} value={caption} onChange={e => setCaption(e.target.value)} placeholder="Your thoughts… #stories @friends" /></label>
        {kind === 'image' && file && <label className="chirpr-upload-modal__field">IMAGE DESCRIPTION (ACCESSIBILITY) <input type="text" maxLength={180} value={alt} onChange={e => setAlt(e.target.value)} placeholder="Describe what appears in the image" /></label>}
        <label className="chirpr-upload-modal__field">CONTENT NOTICE <select value={warning} onChange={e => setWarning(e.target.value)}>{CONTENT_NOTICES.map(item => <option key={item.value} value={item.value}>{item.text}</option>)}</select></label>
        {kind === 'video' && file && <label className="chirpr-upload-reels"><div><strong>Also submit to Chirpr Reels</strong><small>Off by default. Videos cannot enter public Reels until full video and audio safety analysis is available.</small></div><input type="checkbox" role="switch" checked={shareToReels} onChange={e => setShareToReels(e.target.checked)} /><span aria-hidden="true" /></label>}
        <div className="chirpr-upload-modal__review">◈ Local demo: Images are scanned automatically for sexual or violent imagery. Videos receive a partial frame scan and remain unavailable publicly until comprehensive automated video/audio analysis is implemented. Reports and appeals are the only planned human review routes.</div>
        {error && <div className="chirpr-upload-modal__error" role="alert">{error}</div>}
        </div>
        <div className="chirpr-upload-modal__footer"><button type="button" onClick={dismiss} disabled={stage !== 'open'}>Cancel</button><button type="submit" className="chirpr-hover-glow" disabled={!file || stage !== 'open'}>Post with media <span>➤</span></button></div>
      </form>
    </section>
    {shatter && <div className="chirpr-upload-shatter" aria-hidden="true" style={{
      top: shatter.rect.top, left: shatter.rect.left,
      width: shatter.rect.width, height: shatter.rect.height
    }}>
      {shatter.pieces.map(piece => <i key={piece.id} className="chirpr-upload-shatter__piece" style={{
        clipPath: piece.clip, '--shatter-x': piece.dx, '--shatter-y': piece.dy,
        '--shatter-rotate': piece.rotate, '--shatter-delay': piece.delay
      }} />)}
    </div>}
  </div>, document.body);
}
