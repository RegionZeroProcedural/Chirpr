import { useRef } from 'react';
import { useScrollFragments } from '../components/useScrollFragments.js';
import { Link, useParams } from 'react-router-dom';
import { demoFeed } from '../data/demoFeed.js';
import { FragmentChirp } from './feed.jsx';
import { parsePostTokens } from '../data/postText.js';
import { applyPostPreferences } from '../data/postPreferences.js';
export default function HashtagPage({ users, currentUser, localChirps, appearancesByUid, postPreferences, onSavePost }) {
  const { tag } = useParams();
  const postsRef = useRef(null);
  const posts = applyPostPreferences([...localChirps, ...demoFeed].filter(post => parsePostTokens(post.text).hashtags.includes(tag.toLowerCase())), postPreferences);
  useScrollFragments(postsRef, `${tag}:${posts.map(post => `${post.id}:${post.text}`).join('|')}`);
  return <main className="groups-page"><header className="groups-top"><Link className="feed-wordmark" to="/feed"><span className="feed-wordmark__icon" aria-hidden="true" /> chirpr<span>.</span></Link><nav><Link to="/feed">Feed</Link><Link to="/groups">Groups</Link></nav></header><div className="groups-shell"><div className="groups-hero"><span>✧ DISCOVER / HASHTAGS</span><h1>#{tag}</h1><p>Conversations using this hashtag.</p></div><div className="groups-posts" ref={postsRef}>{posts.length ? posts.map(post => <FragmentChirp key={post.id} post={post} author={users.find(user => user.uid === post.uid)} appearance={appearancesByUid[String(post.uid)]} liked={false} onLike={() => {}} saved={postPreferences.saved.includes(String(post.id))} onSave={onSavePost} viewerUid={currentUser?.uid} />) : <div className="groups-empty">No chirps with this hashtag yet.</div>}</div></div></main>;
}
