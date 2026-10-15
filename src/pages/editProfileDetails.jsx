import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AccountAtmosphere from '../components/AccountAtmosphere.jsx';
import { DEFAULT_APPEARANCE, hexToHue, normalizeAppearance, THEME_PRESETS } from '../data/accountAppearance.js';
import { normalizeProfileDetails, prepareProfileImage } from '../data/profileDetails.js';
import { USERNAME_PATTERN, isUsernameTaken, useUsernameAvailability } from '../components/useUsernameAvailability.js';

function hexToHsl(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  return { h: hexToHue(hex), s: d ? d / (1 - Math.abs(max + min - 1)) : 0, l: (max + min) / 2 };
}
function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

const textFields = [
  { id: 'displayName', label: 'Display name', placeholder: 'What should people call you?', max: 40 },
  { id: 'username', label: 'Username', placeholder: 'yourusername', max: 20 },
  { id: 'location', label: 'Location', placeholder: 'Somewhere on Earth', max: 80 },
  { id: 'website', label: 'Website', placeholder: 'https://example.com', max: 180 },
  { id: 'interests', label: 'Interests', placeholder: 'Hiking, Video Games, Music etc...', max: 360 }

];

export default function EditProfileDetails({ currentUser, users = [], appearancesByUid = {}, onAppearanceChange, onProfileChange }) {
  const { uid } = useParams();
  const navigate = useNavigate();
  const isOwner = !!currentUser && String(currentUser.uid) === uid;
  const appearanceFromStore = normalizeAppearance(appearancesByUid[String(uid)] ?? DEFAULT_APPEARANCE);
  const [draft, setDraft] = useState(() => normalizeProfileDetails(currentUser ?? {}));
  const [appearance, setAppearance] = useState(appearanceFromStore);
  const [feedback, setFeedback] = useState('');
  const [workingImage, setWorkingImage] = useState('');
  const wheelRef = useRef(null);
  const hue = hexToHue(appearance.color);
  const themeName = THEME_PRESETS.find(theme => theme.id === appearance.theme)?.label ?? 'Aurora';
  const usernameStatus = useUsernameAvailability(draft.username ?? '', users, uid);

  // Refresh the editable values whenever someone opens a different account URL.
  useEffect(() => {
    setDraft(normalizeProfileDetails(currentUser ?? {}));
    setAppearance(normalizeAppearance(appearancesByUid[String(uid)] ?? DEFAULT_APPEARANCE));
    setFeedback('');
  }, [uid, currentUser, appearancesByUid]);

  if (!isOwner) {
    return (
      <main className="profile-edit-denied">
        <div className="profile-edit-denied__card"><span>✳</span><h1>This space belongs to someone else.</h1><p>Only the signed-in account owner can edit their profile in this frontend demo.</p><Link to={currentUser ? `/users/${currentUser.username}` : '/login'}>{currentUser ? 'Return to your profile' : 'Sign in to continue'} →</Link></div>
      </main>
    );
  }

  const update = (key, value) => { setDraft(previous => ({ ...previous, [key]: value })); setFeedback(''); };
  const changeHue = next => {
    const { s, l } = hexToHsl(appearance.color);
    setAppearance(previous => ({ ...previous, color: hslToHex((next + 360) % 360, Math.max(s, .55), Math.max(l, .47)) }));
  };
  const updateHueFromPointer = event => {
    const box = wheelRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = event.clientX - box.left - box.width / 2;
    const y = event.clientY - box.top - box.height / 2;
    changeHue(Math.round((Math.atan2(y, x) * 180 / Math.PI + 360) % 360));
  };
  const chooseImage = async (event, type) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFeedback('');
    setWorkingImage(type);
    try { update(type, await prepareProfileImage(file, type === 'avatarImage' ? 1 : 3, type === 'avatarImage' ? 360 : 1050)); }
    catch (error) { setFeedback(error.message); }
    finally { setWorkingImage(''); event.target.value = ''; }
  };

  function save(event) {
    event.preventDefault();
    const details = normalizeProfileDetails(draft);
    if (!details.displayName) return setFeedback('Please enter a display name.');
    if (!USERNAME_PATTERN.test(details.username)) return setFeedback('Username must be 3–20 letters, numbers, or underscores.');
    if (isUsernameTaken(details.username, users, uid)) return setFeedback('That username is already in use.');
    if (details.website) {
      try {
        const url = new URL(/^https?:\/\//i.test(details.website) ? details.website : `https://${details.website}`);
        if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) throw new Error('Bad website');
      } catch { return setFeedback('Please enter a valid website address.'); }
    }
    if (!onProfileChange?.(uid, details)) return setFeedback('Unable to save. Check browser storage permissions or try a smaller photo.');
    onAppearanceChange?.(uid, appearance);
    navigate(`/users/${details.username}`, { replace: true });
  }

  return (
    <main className={`account-page account-page--${appearance.theme} profile-edit`} style={{ '--profile-hue': hue, '--profile-accent': appearance.color }}>
      <AccountAtmosphere />
      <header className="account-topbar profile-edit__topbar">
        <div className="account-topbar__inner"><Link to="/feed" className="feed-wordmark"><span className="feed-wordmark__icon" aria-hidden="true" /> chirpr<span>.</span></Link><span className="profile-edit__top-label"><i /> PROFILE STUDIO</span><Link className="profile-edit__back" to={`/users/${currentUser.username}`}>← Back to profile</Link></div>
      </header>
      <div className="profile-edit__layout">
        <div className="profile-edit__intro"><span className="account-eyebrow">✦ YOUR SPACE, YOUR STORY</span><h1>Make it <em>yours.</em></h1><p>Update the details people see first, then shape the atmosphere of your corner of Chirpr.</p></div>
        <form onSubmit={save} className="profile-edit__form">
          <section className="profile-edit__glass" aria-labelledby="profile-details-title">
            <div className="profile-edit__section-head"><span className="profile-edit__index">01 / PROFILE DETAILS</span><h2 id="profile-details-title">The person behind the chirps<span>.</span></h2><p>These details appear on your public profile. Changes are previewed here before you save.</p></div>
            <div className="profile-edit__picture-row">
              <div className="profile-edit__avatar" style={{ '--image-glow': appearance.color }}>
                {draft.avatarImage ? <img src={draft.avatarImage} alt="Avatar preview" /> : <span>{draft.displayName?.[0] || '?'}</span>}
              </div>
              <div className="profile-edit__picture-copy"><h3>Profile picture</h3><p>Choose a photo or keep your color-tinted initial.</p><div className="profile-edit__picture-actions"><label className="profile-edit__upload">{workingImage === 'avatarImage' ? 'Preparing image…' : 'Upload photo'}<input type="file" accept="image/*" onChange={event => chooseImage(event, 'avatarImage')} disabled={!!workingImage} /></label>{draft.avatarImage && <button type="button" onClick={() => update('avatarImage', '')}>Remove</button>}</div></div>
            </div>
            <div className="profile-edit__fields">
              {textFields.map(field => (
                <label key={field.id} className={`profile-edit__field profile-edit__field--${field.id}`} htmlFor={`profile-${field.id}`}><span>{field.label}</span>{field.id === 'username' ? (
                  <div className="chirpr-username-input" data-availability={usernameStatus.status}>
                    <input id={`profile-${field.id}`} value={draft[field.id] ?? ''} maxLength={field.max} placeholder={field.placeholder} onChange={event => update(field.id, event.target.value)} autoComplete="off" aria-describedby="profile-username-status" />
                  </div>
                ) : (
                  <input id={`profile-${field.id}`} value={draft[field.id] ?? ''} maxLength={field.max} placeholder={field.placeholder} onChange={event => update(field.id, event.target.value)} autoComplete="off" />
                )}<small>{field.id === 'username' ? 'Your profile link will update when you change this.' : `${(draft[field.id] ?? '').length}/${field.max}`}</small>{field.id === 'username' && <span id="profile-username-status" role="status" aria-live="polite" className={`chirpr-username-status chirpr-username-status--${usernameStatus.status}`}>{usernameStatus.message}</span>}</label>
              ))}
              <label className="profile-edit__field profile-edit__field--bio" htmlFor="profile-bio"><span>Biography</span><textarea id="profile-bio" rows={4} maxLength={240} placeholder="Tell the world a little about yourself..." value={draft.bio ?? ''} onChange={event => update('bio', event.target.value)} /><small>{(draft.bio ?? '').length}/240</small></label>
            </div>
            <div className="profile-edit__note">◷ Joined {currentUser.joined} <span>·</span> Your join date and account ID stay unchanged.</div>
          </section>

          <section className="profile-edit__glass profile-edit__appearance" aria-labelledby="profile-appearance-title">
            <div className="profile-edit__section-head"><span className="profile-edit__index">02 / VISUAL PERSONALIZATION</span><h2 id="profile-appearance-title">Set the <em>mood.</em></h2><p>Your chosen theme and color follow your profile and tint the chirps you publish. Visitors will see the same look in this browser demo.</p></div>
            <div className="profile-edit__cover-preview" aria-label={`${themeName} theme preview`}>
              {draft.bannerImage && <img className="profile-edit__cover-photo" src={draft.bannerImage} alt="Banner preview" />}
              <span>✧</span><div><small>YOUR ATMOSPHERE</small><strong>{themeName}</strong><p>@{draft.username || currentUser.username}</p></div>
            </div>
            <div className="profile-edit__banner-row"><span><strong>Banner image</strong><small>Optional. A banner image overlays the atmospheric theme.</small></span><div className="profile-edit__picture-actions"><label className="profile-edit__upload">{workingImage === 'bannerImage' ? 'Preparing image…' : 'Upload banner'}<input type="file" accept="image/*" onChange={event => chooseImage(event, 'bannerImage')} disabled={!!workingImage} /></label>{draft.bannerImage && <button type="button" onClick={() => update('bannerImage', '')}>Remove</button>}</div></div>
            <div className="account-editor__label"><span>CHOOSE A BACKGROUND THEME</span><small>{themeName} selected</small></div>
            <div className="account-editor__themes" role="group" aria-label="Background theme">
              {THEME_PRESETS.map(item => <button type="button" key={item.id} className={`account-theme-option account-theme-option--${item.id}${appearance.theme === item.id ? ' account-theme-option--selected' : ''}`} aria-pressed={appearance.theme === item.id} onClick={() => setAppearance(previous => ({ ...previous, theme: item.id }))}><span className="account-theme-option__art"><i /><b>{item.glyph}</b><i /></span><strong>{item.label}</strong><small>{item.subtitle}</small><span className="account-theme-option__check">{appearance.theme === item.id ? '✓' : ''}</span></button>)}
            </div>
            <div className="profile-edit__color-controls"><div className="account-editor__label"><span>BACKGROUND HUE & ACCENT</span><small>Any color you want</small></div><div className="account-editor__color-content"><div className="account-color-wheel" role="slider" ref={wheelRef} tabIndex={0} aria-label="Choose background hue" aria-valuemin={0} aria-valuemax={359} aria-valuenow={hue} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); updateHueFromPointer(event); }} onPointerMove={event => { if (event.buttons & 1) updateHueFromPointer(event); }} onKeyDown={event => { if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) { event.preventDefault(); changeHue(hue + (['ArrowRight','ArrowUp'].includes(event.key) ? 1 : -1) * (event.shiftKey ? 10 : 1)); } }}><span className="account-color-wheel__inner" style={{ '--wheel-color': appearance.color }}><span>✳</span></span><span className="account-color-wheel__knob" style={{ transform: `rotate(${hue}deg) translateX(82px)` }} /></div><div className="account-color-settings"><p>Drag the color wheel to change the hue. You can also pick the exact color with the native picker.</p><div className="account-color-settings__value"><span className="account-color-settings__swatch" style={{ backgroundColor: appearance.color }} /><strong>{appearance.color}</strong></div><label className="account-color-settings__picker">Fine-tune your color <input type="color" value={appearance.color} onChange={event => setAppearance(previous => ({ ...previous, color: event.target.value.toUpperCase() }))} /></label><button type="button" className="profile-edit__reset" onClick={() => setAppearance({ ...DEFAULT_APPEARANCE })}>↺ Restore default theme</button></div></div></div>
          </section>
          <div className="profile-edit__save-row"><span role="status" aria-live="polite" className="profile-edit__feedback">{feedback || 'Your changes are only saved when you press Save changes.'}</span><div><Link to={`/users/${currentUser.username}`}>Cancel</Link><button type="submit" className="chirpr-hover-glow" disabled={!!workingImage}>Save changes <span>↗</span></button></div></div>
        </form>
      </div>
    </main>
  );
}
