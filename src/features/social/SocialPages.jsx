import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FragmentChirp } from '../../pages/feed.jsx';
import { REACTIONS, useSocial } from './SocialStore.jsx';
import MessageAttachment from '../../components/MessageAttachment.jsx';
import { getRechirps } from '../../data/rechirps.js';
import { SocialNav } from './SocialUI.jsx';
import { parsePostTokens } from '../../data/postText.js';
import { applyPostPreferences } from '../../data/postPreferences.js';

function Shell({ label, heading, intro, children }) {
  return <main className="social-page"><div className="social-page__ambient" aria-hidden="true" /><header className="social-page__top"><Link className="feed-wordmark" to="/feed">✳ chirpr<span>.</span></Link><Link to="/account">Your space ↗</Link></header><div className="social-page__grid"><aside className="social-page__rail"><SocialNav /></aside><div className="social-page__main"><div className="social-page__hero"><span>✦ {label}</span><h1>{heading}</h1><p>{intro}</p></div>{children}</div></div></main>;
}
function Empty({ children }) { return <div className="social-empty"><span>✧</span><p>{children}</p></div>; }
function UserRow({ user, extra }) { return <div className="social-user-row"><Link to={`/users/${user.username}`} className="social-user-row__profile"><span className="social-user-row__avatar">{user.avatarImage ? <img src={user.avatarImage} alt="" /> : user.displayName?.[0]}</span><span><strong>{user.displayName}</strong><small>@{user.username}</small></span></Link>{extra}</div>; }

export function DiscoverPage({ appearancesByUid = {}, postPreferences = {} }) {
  const s = useSocial(); const [query, setQuery] = useState(''); const [filter, setFilter] = useState('all');
  const q = query.trim().toLowerCase();
  const people = (s?.users || []).filter(user => !q || `${user.displayName} ${user.username} ${user.bio || ''}`.toLowerCase().includes(q));
  const allPosts = applyPostPreferences((s?.posts || []).filter(post => !post.groupId && !s?.isBlocked(post.uid) && !s?.isMuted(post.uid)), postPreferences);
  const posts = allPosts.filter(post => !q || post.text.toLowerCase().includes(q));
  const tags = useMemo(() => { const counts = {}; allPosts.forEach(post => { parsePostTokens(post.text).hashtags.forEach(tag => { counts[tag] = (counts[tag] || 0) + 1; }); }); return Object.entries(counts).sort((a,b) => b[1]-a[1]); }, [allPosts]);
  return <Shell label="DISCOVERY ENGINE" heading={<>Find your <em>people.</em></>} intro="Discover the voices, conversations and communities that make Chirpr yours."><label className="social-search"><span>⌕</span><input autoFocus value={query} onChange={e => setQuery(e.target.value)} aria-label="Search Chirpr" placeholder="Search people, chirps, hashtags…" /></label><div className="social-filters">{['all','people','chirps','hashtags'].map(item => <button key={item} className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
    {(filter === 'all' || filter === 'people') && <section className="social-panel"><h2>✧ People <small>{people.length}</small></h2>{people.length ? people.map(user => <UserRow key={user.uid} user={user} extra={user.uid !== s.currentUser?.uid && <button className="social-pill" onClick={() => s.toggleFollow(user.uid)}>{s.following(user.uid) ? '✓ Following' : '＋ Follow'}</button>} />) : <Empty>No matching people.</Empty>}</section>}
    {(filter === 'all' || filter === 'hashtags') && <section className="social-panel"><h2>⌗ Trending conversations</h2><div className="social-tags">{tags.filter(([tag]) => !q || tag.includes(q.replace(/^#/,''))).slice(0,16).map(([tag,n]) => <Link key={tag} to={`/tags/${encodeURIComponent(tag)}`}>#{tag} <span>{n} chirps</span></Link>)}</div></section>}
    {(filter === 'all' || filter === 'chirps') && <section className="social-panel"><h2>↶ Chirps <small>{posts.length}</small></h2><div className="social-post-results">{posts.slice(0,35).map(post => <FragmentChirp key={post.id} post={post} author={s.users.find(u => String(u.uid) === String(post.uid))} appearance={appearancesByUid[String(post.uid)]} liked={s.liked(post.id)} onLike={() => s.toggleLike(post)} minimal saved={postPreferences.saved?.includes(String(post.id))} viewerUid={s.currentUser?.uid} />)}{!posts.length && <Empty>Nothing matched this search yet.</Empty>}</div></section>}
  </Shell>;
}

export function NotificationsPage() {
  const s = useSocial();
  const notes = (s?.state.notifications || []).filter(n => String(n.toUid) === String(s.currentUser?.uid)).sort((a,b) => b.date-a.date);
  useEffect(() => { if (notes.some(n => !s.state.readNotifications.includes(n.id))) s.markRead(); /* read when opened */ }, []); // eslint rule is intentionally absent from this project's tooling
  return <Shell label="YOUR ACTIVITY" heading={<>Every connection <em>counts.</em></>} intro="The little moments that bring people together."><section className="social-panel"><h2>✦ Notifications <small>{notes.length}</small></h2>{notes.length ? notes.map(note => { const user = s.users.find(u => String(u.uid) === String(note.fromUid)); return <Link className="social-activity" to={note.href || '/feed'} key={note.id}><span className="social-activity__icon">{['like','reaction'].includes(note.type) ? '♥' : note.type === 'follow' ? '✧' : note.type === 'message' ? '✉' : '↶'}</span><span><strong>{user?.displayName || 'Someone'}</strong> {note.description}<small>{new Date(note.date).toLocaleString()}</small></span><b>↗</b></Link>; }) : <Empty>You're all caught up. Your notifications will appear here as people interact with your chirps.</Empty>}</section></Shell>;
}
export function MessagesPage() {
  const s = useSocial();
  const { userId } = useParams();
  const [selected, setSelected] = useState(userId || '');
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [forwardId, setForwardId] = useState('');
  const [forwardTo, setForwardTo] = useState('');
  const [reactionTray, setReactionTray] = useState('');
  const endRef = useRef(null);
  const fileInput = useRef(null);
  useEffect(() => { if (userId) setSelected(userId); }, [userId]);
  const people = s.users.filter(user => String(user.uid) !== String(s.currentUser?.uid));
  const chosen = people.find(user => String(user.uid) === String(selected));
  const messages = s.state.messages.filter(m => [String(m.fromUid),String(m.toUid)].includes(String(s.currentUser?.uid)) && [String(m.fromUid),String(m.toUid)].includes(String(selected)));
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }, [messages.length, selected]);
  const send = event => { event.preventDefault(); if (s.sendMessage(chosen?.uid, text)) { setText(''); setError(''); } };
  const sendFile = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !chosen) return;
    setUploading(true); setError('');
    try { await s.sendMediaMessage(chosen.uid, file, text); setText(''); }
    catch (error) { setError(error.message || 'Could not attach this file.'); }
    finally { setUploading(false); }
  };
  const confirmForward = () => {
    if (forwardId && forwardTo && s.forwardMessage(forwardId, forwardTo)) { setForwardId(''); setForwardTo(''); setError(''); }
    else setError('Choose someone to forward this message to.');
  };
  return <Shell label="DIRECT MESSAGES" heading={<>Closer <em>connections.</em></>} intro="Reactions, media and message controls for your conversations. Demo messages are stored in this browser; end-to-end encryption requires the future secure messaging service.">
    <div className="social-message-layout">
      <aside className="social-panel social-message-contacts"><h2>✧ Conversations</h2>{people.map(user => <button key={user.uid} className={String(selected) === String(user.uid) ? 'is-active' : ''} onClick={() => { setSelected(String(user.uid)); setForwardId(''); }}><span>{user.displayName}</span><small>@{user.username}</small></button>)}</aside>
      <section className="social-panel social-message-thread">{chosen ? <>
        <header><strong>{chosen.displayName}</strong><Link to={`/users/${chosen.username}`}>View profile ↗</Link></header>
        <div className="social-message-scroll">{messages.length ? messages.map(message => {
          const mine = String(message.fromUid) === String(s.currentUser?.uid);
          return <div className={`social-bubble${mine ? ' social-bubble--mine' : ''}${message.unsent ? ' social-bubble--unsent' : ''}`} key={message.id}>
            {message.unsent ? <em className="social-message-removed">Message unsent</em> : <>
              {message.forwardedFrom && <span className="social-message-forwarded">↗ Forwarded</span>}
              {message.text && <p className="social-bubble__text">{message.text}</p>}
              {message.attachment && <MessageAttachment attachment={message.attachment} />}
              <div className="social-message-toolbar"><button type="button" aria-label="React to message" aria-expanded={reactionTray === message.id} onClick={() => setReactionTray(old => old === message.id ? '' : message.id)}>♡ React</button>
                {reactionTray === message.id && <div className="social-message-react" role="group" aria-label="Choose message reaction">{REACTIONS.map(reaction => <button type="button" key={reaction.id} aria-label={reaction.label} title={reaction.label} aria-pressed={message.reactions?.[String(s.currentUser?.uid)] === reaction.id} onClick={() => { s.reactToMessage(message.id, reaction.id); setReactionTray(''); }}>{reaction.icon}</button>)}</div>}
                <button type="button" onClick={() => { setForwardId(message.id); setForwardTo(''); }}>↗ Forward</button>
                {mine && <button className="social-message-unsend" type="button" onClick={() => s.unsendMessage(message.id)}>Unsend</button>}
              </div>
              {Object.keys(message.reactions || {}).length > 0 && <div className="social-message-reaction-count" aria-label="Message reactions">{REACTIONS.filter(reaction => Object.values(message.reactions).includes(reaction.id)).map(reaction => <span key={reaction.id} title={reaction.label}>{reaction.icon}<small>{Object.values(message.reactions).filter(kind => kind === reaction.id).length}</small></span>)}</div>}
            </>}
            <small>{new Date(message.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small>
          </div>;
        }) : <Empty>Say hello to {chosen.displayName}.</Empty>}<span ref={endRef} /></div>
        {forwardId && <div className="social-message-forward-panel" role="group" aria-label="Forward message"><strong>Forward this message</strong><select value={forwardTo} onChange={e => setForwardTo(e.target.value)} aria-label="Forward recipient"><option value="">Choose a recipient</option>{people.map(person => <option key={person.uid} value={person.uid}>{person.displayName}</option>)}</select><button type="button" onClick={confirmForward} disabled={!forwardTo}>Forward ↗</button><button type="button" onClick={() => setForwardId('')}>Cancel</button></div>}
        {error && <p className="social-message-error" role="alert">{error}</p>}
        <form className="social-message-compose" onSubmit={send}>
          <input type="file" ref={fileInput} className="social-message-file-input" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={sendFile} disabled={uploading} aria-label="Attach image or video" />
          <button type="button" className="social-message-add-media" disabled={uploading} onClick={() => fileInput.current?.click()} aria-label="Attach image or video">{uploading ? '…' : '＋'}</button>
          <input maxLength={1200} value={text} onChange={e => setText(e.target.value)} placeholder="Write a message…" aria-label="Message text" />
          <button className="chirpr-hover-glow" type="submit" disabled={!text.trim() || uploading}>Send ↗</button>
        </form>
        <small className="social-message-privacy">Demo only · Not end-to-end encrypted · Media remains on this browser.</small>
      </> : <Empty>Select someone to start a conversation.</Empty>}</section>
    </div>
  </Shell>;
}
export function BookmarksPage({ postPreferences, appearancesByUid, onSavePost }) {
  const s = useSocial(); const saved = applyPostPreferences(s.posts || [], postPreferences).filter(post => postPreferences.saved?.includes(String(post.id)));
  return <Shell label="YOUR COLLECTION" heading={<>Worth <em>keeping.</em></>} intro="All the conversations you've saved, in one quiet corner."><section className="social-panel"><h2>✧ Saved chirps <small>{saved.length}</small></h2>{saved.length ? <div className="social-post-results">{saved.map(post => <FragmentChirp key={post.id} minimal post={post} author={s.users.find(u => String(u.uid) === String(post.uid))} appearance={appearancesByUid[String(post.uid)]} liked={s.liked(post.id)} saved onSave={onSavePost} viewerUid={s.currentUser?.uid} />)}</div> : <Empty>Tap Save on a chirp to keep it here.</Empty>}</section></Shell>;
}
export function ChirpDetailPage({ appearancesByUid, postPreferences, onSavePost }) {
  const s = useSocial(); const { postId } = useParams(); const [draft,setDraft] = useState('');
  const basePosts = s.posts || [];
  const sharedPosts = getRechirps(basePosts, s.state.reposts, s.state.repostNotes, s.users);
  const post = applyPostPreferences([...sharedPosts, ...basePosts], postPreferences).find(p => String(p.id) === postId);
  const author = post && s.users.find(u => String(u.uid) === String(post.uid));
  const replies = s.repliesFor(postId);
  return <Shell label="THE CONVERSATION" heading={<>Every thought has <em>a story.</em></>} intro="Explore the replies and add your voice to the conversation.">{!post ? <Empty>That chirp isn't available anymore. <Link to="/feed">Back to feed</Link></Empty> : <><FragmentChirp minimal post={post} author={author} appearance={appearancesByUid[String(post.uid)]} liked={s.liked(post.id)} saved={postPreferences.saved?.includes(String(post.id))} onSave={onSavePost} viewerUid={s.currentUser?.uid} /><section className="social-panel"><h2>↶ Replies <small>{replies.length}</small></h2>{replies.map(reply => { const replier = s.users.find(u => String(u.uid) === String(reply.uid)); return <div className="social-reply" key={reply.id}><Link to={`/users/${replier?.username}`}><strong>{replier?.displayName || 'Chirpr member'}</strong> <small>@{replier?.username}</small></Link><p>{reply.text}</p><small>{new Date(reply.at).toLocaleString()}</small></div>; })}{!replies.length && <p className="social-hint">Be the first to reply.</p>}<form className="social-reply-form" onSubmit={e => { e.preventDefault(); if (s.addReply(post, draft)) setDraft(''); }}><textarea value={draft} onChange={e => setDraft(e.target.value)} required maxLength={500} placeholder="Add to the conversation…" aria-label="Write reply"/><button type="submit" className="chirpr-hover-glow">Reply ↗</button></form></section></>}</Shell>;
}

export function SettingsPage({ onSignOut, onChangeAccount, currentUser, users }) {
  const s = useSocial(); const prefs = s.prefs;
  const setting = (key, label, description, initial=false) => <label className="social-setting" key={key}><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={prefs[key] ?? initial} onChange={e => s.setPrivacy(key, e.target.checked)} /></label>;
  const [accountId,setAccountId] = useState(String(currentUser?.uid || ''));
  return <Shell label="ACCOUNT CONTROL" heading={<>Your space. <em>Your rules.</em></>} intro="Account preferences, privacy, and safety controls in one place.">
    <section className="social-panel"><h2>◈ Privacy & content</h2>{setting('privateAccount','Private profile','Prepare private-account behavior for backend enforcement.')}{setting('sensitiveBlur','Blur sensitive media','Keep explicit content behind a content notice.',true)}{setting('muteAutoplay','Disable video autoplay','Reduce data use and distractions.')}{setting('reduceAnimations','Simplify animations','Switch to lightweight motion where supported.')}{setting('emailNotifications','Email updates','Preference only — no email service is connected.')}</section>
    <section className="social-panel"><h2>⚙ Profile & account</h2><div className="social-settings-links"><Link to={`/editProfileDetails/${currentUser.uid}`}>✎ Edit profile & theme <span>↗</span></Link><Link to={`/profileSettings/${currentUser.uid}`}>◈ Profile settings <span>↗</span></Link><Link to="/bookmarks">✧ Saved chirps <span>↗</span></Link></div></section>
    <section className="social-panel"><h2>✦ Demo account switching</h2><p className="social-hint">Switch between mock accounts to test following, notifications, messages, and profile privacy. This is not real authentication.</p><div className="social-account-switch"><select value={accountId} onChange={e => setAccountId(e.target.value)} aria-label="Choose demo user">{users.map(user => <option key={user.uid} value={user.uid}>@{user.username}</option>)}</select><button className="chirpr-hover-glow" type="button" onClick={() => onChangeAccount(accountId)}>Switch account ↗</button></div></section>
    <section className="social-panel"><h2>◉ Safety & moderation</h2><p className="social-hint">Reports are recorded locally for prototyping. Real enforcement needs a secure, auditable backend.</p><div className="social-safety-tags">{['muted','blocked'].map(type => <div key={type}><h3>{type === 'muted' ? 'Muted' : 'Blocked'} people</h3>{(s.state[type][String(currentUser.uid)] || []).map(uid => { const user = users.find(u=>String(u.uid)===String(uid)); return <button key={uid} onClick={() => s.toggleSafety(type, uid)}>@{user?.username || uid} ×</button>; })}</div>)}</div><Link className="social-link" to="/safety">View reports & safety center →</Link></section>
    <section className="social-panel"><h2>✧ Session</h2><button className="social-danger" type="button" onClick={onSignOut}>Sign out of demo ↗</button><p className="social-hint">Passwords, account deletion, exports, and real sessions require server-side support; this demo does not pretend otherwise.</p></section>
  </Shell>;
}
export function SafetyPage() {
  const s = useSocial(); const myReports = s.state.reports.filter(r => String(r.reporterUid) === String(s.currentUser.uid));
  return <Shell label="TRUST & SAFETY" heading={<>Built for <em>everyone.</em></>} intro="Review your submitted reports and learn how moderation will work."><section className="social-panel"><h2>◈ Reports you submitted</h2>{myReports.length ? myReports.map(r => <div key={r.id} className="social-activity"><span className="social-activity__icon">⚑</span><span><strong>{r.reason}</strong><small>{r.type} · {r.status} · {new Date(r.date).toLocaleString()}</small></span></div>) : <Empty>You haven't submitted any reports.</Empty>}</section><section className="social-panel"><h2>✦ Moderation policy</h2><p className="social-hint">Harassment, exploitation, threats, and illegal content are not welcome. Automated screening handles sexual and graphic imagery, with human review reserved for user reports and appeals. Comprehensive video/audio detection, appeals, emergency escalations, and audit logs require a secure backend. Incomplete scans never grant public access.</p><p className="social-hint">This frontend provides reporting and review-state previews; it is not itself a content safety barrier.</p></section></Shell>;
}
