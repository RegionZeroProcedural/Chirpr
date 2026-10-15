import { useSocial } from '../features/social/SocialStore.jsx';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePostDestruction } from '../components/usePostDestruction.js';
import { useFeedReflow } from '../components/useFeedReflow.js';
import { useTextChirpFlight } from '../components/useTextChirpFlight.js';
import { SHARDS, useScrollFragments } from '../components/useScrollFragments.js';
import { Link } from 'react-router-dom';
import { demoFeed } from '../data/demoFeed.js';
import PostOptionsModal from '../components/PostOptionsModal.jsx';
import { DEFAULT_APPEARANCE, normalizeAppearance, hexToHue, THEME_PRESETS } from '../data/accountAppearance.js';
import { applyPostPreferences } from '../data/postPreferences.js';
import ChirpAttachment from '../components/ChirpAttachment.jsx';
import MediaUploadModal from '../components/MediaUploadModal.jsx';
import MentionSuggestions from '../components/MentionSuggestions.jsx';
import MentionTextarea from '../components/MentionTextarea.jsx';
import LinkedPostText from '../components/LinkedPostText.jsx';
import { SocialPostActions, SocialNav } from '../features/social/SocialUI.jsx';

function Glyph({ icon }) {
  if (icon === 'heart') return <span aria-hidden="true">♡</span>;
  if (icon === 'reply') return <span aria-hidden="true">↶</span>;
  if (icon === 'share') return <span aria-hidden="true">↗</span>;
  return <span aria-hidden="true">✧</span>;
}

/** Render the identical surface in each clipped tile, but no duplicate focusable controls. */
function ChirpSurface({ post, author, liked, onLike, onOpenOptions, onSave, saved = false, visual = false, canPreviewMedia = false }) {
  const displayName = author?.displayName ?? 'Chirpr member';
  const username = author?.username ?? 'community';
  const themeLabel = THEME_PRESETS.find(theme => theme.id === post.authorTheme)?.label ?? 'Aurora';
  return (
    <article className={`feed-chirp feed-chirp--themed feed-chirp--theme-${post.authorTheme || 'aurora'}`}>
      <header className="feed-chirp__top">
        {visual ? <span className="feed-avatar feed-avatar--themed" aria-hidden="true">{author?.avatarImage ? <img className="feed-chirp__author-image" src={author.avatarImage} alt="" /> : displayName.slice(0, 1)}</span> : <Link to={`/users/${username}`} className="feed-avatar feed-avatar--themed feed-chirp__profile-link" aria-label={`View ${displayName}'s profile`}>{author?.avatarImage ? <img className="feed-chirp__author-image" src={author.avatarImage} alt="" /> : displayName.slice(0, 1)}</Link>}
        <div className="feed-chirp__author">
          {visual ? <strong>{displayName} <span className="feed-chirp__badge" aria-label="Chirpr community member">✦</span></strong> : <Link className="feed-chirp__name-link" to={`/users/${username}`}>{displayName} <span className="feed-chirp__badge" aria-label="Chirpr community member">✦</span></Link>}
          <span>@{username} <span className="feed-chirp__dot">·</span> {post.age} <span className="feed-chirp__dot">·</span> <span className="feed-chirp__theme-label">✧ {themeLabel}</span></span>
        </div>
        {visual ? <span className="feed-chirp__more feed-chirp__more--decorative" aria-hidden="true">•••</span> : (
          <button type="button" className="feed-chirp__more" aria-label={`Options for ${username}'s chirp`} title="Chirp options" onClick={event => onOpenOptions?.(post, event.currentTarget)}>•••</button>
        )}
      </header>
      <div className="feed-chirp__body">
        <span className="feed-chirp__topic"><span aria-hidden="true">✧</span> {post.topic}</span>
        <p><LinkedPostText text={post.text} visual={visual} /></p>
        {post.attachment && (visual ? (
          <div className="chirpr-attachment chirpr-attachment--shard-placeholder" aria-hidden="true">
            <span>{post.attachment.kind === 'video' ? '▣ VIDEO' : '▧ IMAGE'} · {post.attachment.moderation?.status === 'approved' ? 'MEDIA' : 'AWAITING REVIEW'}</span>
          </div>
        ) : <ChirpAttachment attachment={post.attachment} allowedPreview={canPreviewMedia} />)}
        {post.media && (
          <div className={`feed-chirp__media feed-chirp__media--${post.accent || 'blue'}`}>
            <span className="feed-chirp__media-ring" aria-hidden="true" />
            <strong>{post.media}</strong>
            <span className="feed-chirp__media-mark" aria-hidden="true">chirpr.</span>
          </div>
        )}
      </div>
      <SocialPostActions post={post} onSave={onSave} saved={saved} visual={visual} />
    </article>
  );
}

export function FragmentChirp({ post, author, liked, onLike, appearance, onOpenOptions, onSave, saved, destruction, viewerUid = null, entrance = "", minimal = false }) {
  const canPreviewMedia = String(viewerUid) === String(post.uid);
  const blast = useMemo(() => !destruction ? [] : SHARDS.map(() => ({ x: `${(Math.random()-.5)*480}px`, y: `${(Math.random()-.55)*480}px`, rotate: `${(Math.random()-.5)*155}deg`, delay: `${Math.random()*140}ms` })), [destruction]);
  const normalized = normalizeAppearance(appearance ?? DEFAULT_APPEARANCE);
  const cardRef = useRef(null);
  const [burstRect, setBurstRect] = useState(null);
  // All cards fragment. For uploads the shards show a lightweight, safe media
  // silhouette instead of cloning decoded images/video players.
  const canFragment = !minimal;
  const [showFragments, setShowFragments] = useState(() => typeof IntersectionObserver === 'undefined');
  const [compactFragments, setCompactFragments] = useState(() => window.matchMedia?.('(max-width: 700px), (pointer: coarse)')?.matches ?? false);
  useEffect(() => {
    if (!canFragment) return undefined;
    const query = window.matchMedia?.('(max-width: 700px), (pointer: coarse)');
    if (!query) return undefined;
    const sync = () => setCompactFragments(query.matches);
    query.addEventListener?.('change', sync);
    // Older Safari supports addListener but not addEventListener on MediaQueryList.
    if (!query.addEventListener) query.addListener?.(sync);
    return () => {
      query.removeEventListener?.('change', sync);
      if (!query.removeEventListener) query.removeListener?.(sync);
    };
  }, [canFragment]);

  // Don't create 8 complete DOM copies of every offscreen chirp. This is
  // especially important when a feed contains long posts and multiple cards.
  useEffect(() => {
    if (!canFragment || !cardRef.current) return undefined;
    if (typeof IntersectionObserver === 'undefined') { setShowFragments(true); return undefined; }
    const observer = new IntersectionObserver(entries => {
      const visible = entries[0]?.isIntersecting ?? false;
      setShowFragments(current => current === visible ? current : visible);
    }, { rootMargin: '440px 0px', threshold: 0 });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [canFragment]);

  // Capture the actual on-screen card coordinates before removing it.
  // Rendering the burst into document.body keeps it clear of the feed's
  // scroll fragment opacity, clipped glass panels, and modal stacking contexts.
  useLayoutEffect(() => {
    if (!destruction) { setBurstRect(null); return; }
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect && rect.width && rect.height) {
      setBurstRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    }
  }, [destruction]);

  const surface = { ...post, authorTheme: normalized.theme };
  const burstParticles = useMemo(() => !destruction ? [] : Array.from({ length: 20 }, () => ({
    x: `${(Math.random() - .5) * 550}px`,
    y: `${(Math.random() - .5) * 430}px`,
    delay: `${Math.random() * 170}ms`,
    size: `${Math.random() * 5 + 3}px`,
    left: `${Math.random() * 90 + 5}%`,
    top: `${Math.random() * 80 + 10}%`
  })), [destruction]);

  return (
    <>
    <div ref={cardRef} className={`feed-card${destruction ? " feed-card--destroying" : ""}${entrance === "awaiting" ? " feed-card--awaiting-entry" : ""}${entrance === "landed" ? " feed-card--landed" : ""}`} data-chirp-entry-target={String(post.id)} data-has-media={post.attachment || post.media ? "yes" : undefined} data-feed-card data-post-id={String(post.id)} data-author-theme={normalized.theme} style={{ '--chirp-hue': hexToHue(normalized.color), '--chirp-accent': normalized.color }}>
      <div className="feed-card__base">
        <ChirpSurface post={{ ...post, authorTheme: normalized.theme }} author={author} liked={liked} onLike={onLike} onOpenOptions={onOpenOptions} onSave={onSave} saved={saved} canPreviewMedia={canPreviewMedia} />
      </div>
      {canFragment && showFragments && <div className="feed-card__shards" aria-hidden="true">
        {SHARDS.slice(0, compactFragments ? 4 : 8).map((shard, index) => (
          <div
            key={index}
            className="feed-card__shard"
            style={{
              clipPath: shard.path,
              '--shard-x': `${shard.dx}px`,
              '--shard-y': `${shard.dy}px`,
              '--shard-angle': `${shard.turn}deg`
            }}
          >
            {/* A tiny painted silhouette instead of eight full React posts.
                The real post stays in the base, including its one media player. */}
            <div className="feed-card__shard-paint" />
          </div>
        ))}
      </div>}
    </div>
    {destruction && burstRect && createPortal(
      <div
        className="chirpr-destruction"
        aria-hidden="true"
        data-destructing-post={String(post.id)}
        style={{ ...burstRect, '--chirp-hue': hexToHue(normalized.color), '--chirp-accent': normalized.color }}
      >
        <div className="chirpr-destruction__flash" />
        <div className="chirpr-destruction__intact"><ChirpSurface post={surface} author={author} liked={liked} visual canPreviewMedia={canPreviewMedia} /></div>
        {SHARDS.map((shard, index) => (
          <div
            key={index}
            className="chirpr-destruction__shard"
            style={{
              clipPath: shard.path,
              '--blast-x': blast[index].x,
              '--blast-y': blast[index].y,
              '--blast-rotate': blast[index].rotate,
              '--blast-delay': blast[index].delay
            }}
          ><ChirpSurface post={surface} author={author} liked={liked} visual canPreviewMedia={canPreviewMedia} /></div>
        ))}
        {burstParticles.map((particle, index) => (
          <i key={index} className="chirpr-destruction__particle" style={{
            left: particle.left, top: particle.top, width: particle.size, height: particle.size,
            '--blast-x': particle.x, '--blast-y': particle.y, '--blast-delay': particle.delay
          }} />
        ))}
      </div>, document.body
    )}
    </>
  );
}

/** One visual, non-interactive travelling copy for text-only submissions. */
export function TextChirpFlightOverlay({ flight, author, appearance, viewerUid }) {
  if (!flight) return null;
  const normalized = normalizeAppearance(appearance ?? DEFAULT_APPEARANCE);
  return createPortal(
    <div className="account-chirp-flight" data-phase={flight.phase} data-text-chirp-flight={String(flight.post.id)} aria-hidden="true" style={{
      top: flight.from.top, left: flight.from.left, width: flight.from.width,
      '--fly-x': `${flight.x}px`, '--fly-y': `${flight.y}px`, '--fly-scale': flight.scale,
      '--profile-accent': normalized.color, '--profile-hue': hexToHue(normalized.color)
    }}>
      <div className="account-chirp-flight__sparkles" aria-hidden="true">{Array.from({ length: 14 }, (_, i) =>
        <i key={i} style={{ '--spark-index': i, '--spark-x': `${(i * 43) % 140 - 70}px`, '--spark-y': `${(i * 71) % 140 - 70}px` }} />)}</div>
      <div className="feed-card"><ChirpSurface post={{ ...flight.post, authorTheme: normalized.theme }} author={author} visual liked={false} canPreviewMedia={String(viewerUid) === String(flight.post.uid)} /></div>
    </div>, document.body
  );
}

export default function Feed({ currentUser, users, onSignOut, localChirps = [], onCreateChirp, appearancesByUid = {}, postPreferences, onEditPost, onDeletePost, onHidePost, onSavePost }) {
  const social = useSocial();
  const posts = useMemo(() => {
    const originals = [...localChirps.filter(post => !post.groupId), ...demoFeed];
    // Rechirps are distinct feed cards attributed to the account that shared them.
    const broadcasts = Object.entries(social?.state.reposts || {}).flatMap(([id, uids]) => {
      const original = originals.find(post => String(post.id) === id);
      if (!original) return [];
      return uids.map(uid => ({ ...original, id: `rechirp-${uid}-${id}`, uid, text: `⇄ Rechirped: @${users.find(user => String(user.uid) === String(original.uid))?.username || 'community'}\n${original.text}`, topic: 'RECHIRPED', age: 'now', attachment: original.attachment, likes: 0, replies: 0, shares: 0 }));
    });
    return applyPostPreferences([...broadcasts, ...originals], postPreferences).filter(post => !social?.isBlocked(post.uid) && !social?.isMuted(post.uid));
  }, [localChirps, postPreferences, social?.state.reposts, social?.state.blocked, social?.state.muted, currentUser?.uid, users]);
  const listRef = useRef(null);
  const composerRef = useRef(null);
  const { begin: beginTextFlight, pendingFlight, flight, arrivingId, justPostedId } = useTextChirpFlight(listRef, posts.map(post => post.id).join('|'));
  const { captureBeforeRemoval } = useFeedReflow(listRef, posts.map(post => post.id).join('|'));
  // The fragment explosion plays first. Immediately before its delayed
  // deletion is committed, record the survivors' starting positions.
  const { destroying, animateDelete, animateHide } = usePostDestruction(
    id => { captureBeforeRemoval(); onDeletePost?.(id); },
    id => { captureBeforeRemoval(); onHidePost?.(id); }
  );
  const [optionPost, setOptionPost] = useState(null);
  const optionTrigger = useRef(null);
  const openOptions = (post, trigger) => { optionTrigger.current = trigger; setOptionPost(post); };
  const closeOptions = () => { setOptionPost(null); window.requestAnimationFrame(() => optionTrigger.current?.isConnected && optionTrigger.current.focus()); };
  const [draft, setDraft] = useState('');
  const [caret, setCaret] = useState(0);
  const draftRef = useRef(null);
  const [uploadOrigin, setUploadOrigin] = useState(null);
  const [likedIds, setLikedIds] = useState(() => new Set());
  useScrollFragments(listRef, posts.map(post => `${post.id}:${post.text}`).join("|"));
  const authorById = uid => users.find(user => user.uid === uid);

  function submitChirp(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    if (pendingFlight || flight) return;
    const rect = composerRef.current?.getBoundingClientRect();
    const post = onCreateChirp?.(text);
    if (!post) return;
    setDraft('');
    setCaret(0);
    beginTextFlight(post, rect);
  }

  function chooseMention(username, position) {
    const next = draft.slice(0, position.start) + `@${username} ` + draft.slice(position.end);
    const nextCaret = position.start + username.length + 2;
    setDraft(next); setCaret(nextCaret);
    requestAnimationFrame(() => { draftRef.current?.focus(); draftRef.current?.setSelectionRange(nextCaret, nextCaret); });
  }
  function uploaded(queued) { if (queued) { setDraft(''); setCaret(0); } }

  function toggleLike(id) {
    setLikedIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);

  return (
    <main className="feed-page">
      <div className="feed-page__aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="feed-intro-dust" aria-hidden="true">
        {Array.from({ length: 24 }, (_, i) => <i key={i} style={{ '--dust-index': i, '--dust-x': `${(i * 43) % 96}%`, '--dust-y': `${(i * 31) % 100}%`, '--dust-dx': `${(i % 2 ? 1 : -1) * (35 + (i * 17) % 90)}px` }} />)}
      </div>
      <header className="feed-topbar">
        <div className="feed-topbar__inner">
          <Link to="/feed" className="feed-wordmark" aria-label="Chirpr feed"><span className="feed-wordmark__icon" aria-hidden="true" /> chirpr<span>.</span></Link>
          <div className="feed-topbar__section"><span className="feed-topbar__live" /> YOUR SPACE, UNFOLDING</div>
          <div className="feed-topbar__end"><Link to="/reels" className="feed-topbar__reels-link">▣ Reels</Link><span className="feed-topbar__welcome">Hi, {currentUser.displayName}</span><button type="button" onClick={onSignOut}>Sign out <span aria-hidden="true">↗</span></button></div>
        </div>
      </header>

      <div className="feed-layout">
        <aside className="feed-rail feed-rail--left">
          <div className="feed-rail__sticky">
            <div className="feed-rail__heading">EXPLORE</div>
            <nav className="feed-nav" aria-label="Feed navigation">
              <Link to="/feed" className="feed-nav__item feed-nav__item--active"><span>⌂</span> For you <i /></Link>
              <Link to="/account" className="feed-nav__item"><span>◉</span> Your profile</Link>
              <Link to="/reels" className="feed-nav__item"><span>▣</span> Watch reels <i /></Link><Link to="/groups" className="feed-nav__item"><span>✳</span> Groups</Link>
            </nav>
            <SocialNav compact />
            <div className="feed-side-note"><span>✦</span><p>Small thoughts.<br /><strong>Big connections.</strong></p></div>
            <div className="feed-rail__footer">CHIRPR / FRONTEND PREVIEW<br />© {new Date().getFullYear()}</div>
          </div>
        </aside>

        <section className="feed-main" aria-label="Your Chirpr feed">
          <div className="feed-welcome">
            <span className="feed-welcome__eyebrow"><i /> YOUR WORLD, IN MOTION</span>
            <h1>It starts with <em>a thought.</em></h1>
            <p>Welcome to your corner of the internet. See what's taking shape.</p>
            <div className="feed-welcome__trail"><i /><i /><i /><span>SCROLL TO WATCH THE FEED ASSEMBLE</span><b aria-hidden="true">↓</b></div>
          </div>
          <form className="feed-compose" ref={composerRef} onSubmit={submitChirp}>
            <div className="feed-compose__top"><span className="feed-avatar feed-avatar--blue">{currentUser.displayName.slice(0, 1)}</span><label className="feed-compose__label" htmlFor="feed-draft">Have something on your mind?</label></div>
            <MentionTextarea ref={draftRef} id="feed-draft" value={draft} onChange={event => { setDraft(event.target.value); setCaret(event.target.selectionStart); }} onKeyUp={event => setCaret(event.target.selectionStart)} placeholder="A little thought can go a long way... #ideas @friends" rows={2} maxLength={500} /><MentionSuggestions text={draft} caret={caret} users={users} onSelect={chooseMention} />
            <div className="feed-compose__bottom"><button type="button" className="chirpr-upload-trigger" onClick={event => setUploadOrigin(event.currentTarget.getBoundingClientRect())}>▧ Photo / video</button><span>✧ SHARE A MOMENT</span><button className="chirpr-hover-glow" type="submit" disabled={!draft.trim() || !!pendingFlight || !!flight}>Post chirp <span aria-hidden="true">↗</span></button></div>
          </form>
          <div className="feed-main__stream-heading"><span><i /> THE CONVERSATION</span><span>FOR YOU <b>✦</b></span></div>
          <div className="feed-stream" ref={listRef}>
            {posts.map(post => <FragmentChirp key={post.id} post={post} author={authorById(post.uid)} liked={likedIds.has(post.id)} onLike={toggleLike} saved={postPreferences.saved.includes(String(post.id))} onSave={onSavePost} appearance={appearancesByUid[String(post.uid)]} onOpenOptions={openOptions} destruction={destroying[String(post.id)]} viewerUid={currentUser?.uid} entrance={arrivingId === post.id ? "awaiting" : justPostedId === post.id ? "landed" : ""} />)}
          </div>
          <div className="feed-end"><span>✳</span><p>You're all caught up.</p><small>There's always another thought on the horizon.</small></div>
        </section>

        <aside className="feed-rail feed-rail--right">
          <div className="feed-rail__sticky">
            <div className="feed-info-card"><span className="feed-info-card__tag">✧ LIVE DEMO</span><h2>A feed that<br /><em>comes alive.</em></h2><p>Watch each chirp materialize out of eight fragments as you scroll down.</p><div className="feed-info-card__divider" /><p>Scroll back up and the fragments reverse — at both ends of the screen.</p><div className="feed-info-card__orbit" aria-hidden="true" /></div>
            <div className="feed-people"><h3>YOUR PEOPLE <span>✧</span></h3>{users.filter(user => user.uid !== currentUser.uid).map((user, i) => <Link to={`/users/${user.username}`} key={user.uid}><span className={`feed-avatar feed-avatar--${i ? 'cyan' : 'violet'}`}>{user.displayName.slice(0, 1)}</span><span><strong>{user.displayName}</strong><small>@{user.username}</small></span><b aria-hidden="true">↗</b></Link>)}</div>
            <p className="feed-info-disclaimer">Demo mode: any credentials sign in. New chirps are saved locally in this browser.</p>
          </div>
        </aside>
      </div>
      {uploadOrigin && <MediaUploadModal origin={uploadOrigin} draft={draft} onClose={({ queued } = {}) => { setUploadOrigin(null); uploaded(queued); }} onPublish={onCreateChirp} />}
      {flight && <TextChirpFlightOverlay flight={flight} author={currentUser} appearance={appearancesByUid[String(currentUser.uid)]} viewerUid={currentUser?.uid} />}
      {optionPost && <PostOptionsModal key={optionPost.id} post={optionPost} author={authorById(optionPost.uid)} currentUser={currentUser} appearance={appearancesByUid[String(optionPost.uid)]} saved={postPreferences.saved.includes(String(optionPost.id))} onClose={closeOptions} onEdit={onEditPost} onDelete={animateDelete} onHide={animateHide} onSave={onSavePost} />}
    </main>
  );
}
