import './App.css';
import './features/social/social.css';
import './features/social/socialInteractions.css';
import './components/destinationTransitions.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'

import Home from './pages/home.jsx'
import Register from './pages/register.jsx'
import Login from './pages/login.jsx'
import Account from './pages/account.jsx'
import EditProfileSettings from './pages/editProfileSettings.jsx';
import EditProfileDetails from './pages/editProfileDetails.jsx'
import { users } from './users/users.js';
import { GUEST_MODE_KEY, GUEST_UID, GUEST_USER, isGuestMode } from './data/guestSession.js';
import { demoFeed } from './data/demoFeed.js';
import About from './pages/about.jsx'
import { PageTransitionProvider } from './components/PageTransitions.jsx'
import ReelsRouteTransition from './components/ReelsRouteTransition.jsx'
import DestinationTransitions from './components/DestinationTransitions.jsx'
import SignOutTransition from './components/SignOutTransition.jsx'
import UploadActivityLayer from './components/UploadActivityLayer.jsx'
import Feed from './pages/feed.jsx';
import Reels from './pages/reels.jsx';
import Groups from './pages/groups.jsx';
import HashtagPage from './pages/hashtag.jsx';
import { SocialDock } from './features/social/SocialUI.jsx';
import { SocialProvider } from './features/social/SocialStore.jsx';
import { DiscoverPage, NotificationsPage, MessagesPage, BookmarksPage, ChirpDetailPage, SettingsPage, SafetyPage } from './features/social/SocialPages.jsx';
import { GROUPS_KEY, loadGroups, makeGroup, saveGroups } from './data/localGroups.js';
import { removeMedia } from './data/mediaVault.js';
import { APPEARANCE_STORAGE_KEY, loadAppearances, normalizeAppearance, saveAppearances } from './data/accountAppearance.js';
import { LOCAL_CHIRPS_KEY, loadLocalChirps, makeLocalChirp, saveLocalChirps } from './data/localChirps.js';
import { POST_PREFERENCES_KEY, loadPostPreferences, savePostPreferences } from './data/postPreferences.js';
import { PROFILE_DETAILS_KEY, loadProfileDetails, saveProfileDetails, mergeProfileDetails, normalizeProfileDetails } from './data/profileDetails.js';

function ChirprRoutes() {
  const navigate = useNavigate();
  const [profileDetailsByUid, setProfileDetailsByUid] = useState(loadProfileDetails);
  const [registeredUsers, setRegisteredUsers] = useState(() => { try { return JSON.parse(window.localStorage.getItem('chirpr-demo-registered-users') || '[]'); } catch { return []; } });
  const [viewerUid, setViewerUid] = useState(() => window.sessionStorage.getItem('chirpr-demo-viewer') || '1');
  const [demoSignedIn, setDemoSignedIn] = useState(() => window.sessionStorage.getItem('chirpr-demo-signed-in') === '1');
  const [guestMode, setGuestMode] = useState(() => isGuestMode(window.sessionStorage));
  const [guestProfile, setGuestProfile] = useState({});
  const [guestPosts, setGuestPosts] = useState([]);
  const allUsers = useMemo(() => {
    const savedUsers = mergeProfileDetails([...users, ...registeredUsers], profileDetailsByUid);
    return guestMode ? [...savedUsers, { ...GUEST_USER, ...guestProfile }] : savedUsers;
  }, [profileDetailsByUid, registeredUsers, guestMode, guestProfile]);
  const currentUser = allUsers.find(user => String(user.uid) === String(viewerUid)) || (guestMode ? allUsers[allUsers.length - 1] : allUsers[0]);
  const [appearancesByUid, setAppearancesByUid] = useState(loadAppearances);
  const [localChirps, setLocalChirps] = useState(loadLocalChirps);
  // Guest posts are memory-only; signed-in demo accounts retain their normal saved posts.
  const visibleChirps = useMemo(() => guestMode ? [...guestPosts, ...localChirps] : localChirps, [guestMode, guestPosts, localChirps]);
  const sharedPosts = useMemo(() => [...visibleChirps, ...demoFeed], [visibleChirps]);
  const [postPreferences, setPostPreferences] = useState(loadPostPreferences);
  const [groups, setGroups] = useState(loadGroups);
  const persistGroups = next => { if (!guestMode) saveGroups(next); return next; };
  const createGroup = (name, description, options = {}) => {
    const group = makeGroup(name, description, currentUser.uid, options);
    setGroups(old => { const next = [group,...old]; persistGroups(next); return next; });
  };
  const joinGroup = id => { setGroups(old => { const next = old.map(group => group.id !== id ? group : group.private && String(group.ownerUid) !== String(currentUser.uid) ? { ...group, pendingMemberUids: [...new Set([...(group.pendingMemberUids || []), currentUser.uid])] } : { ...group, memberUids: [...new Set([...group.memberUids, currentUser.uid])] }); persistGroups(next); return next; }); };
  const updateGroup = (id, changes) => setGroups(old => {
    const next = old.map(group => group.id === id && String(group.ownerUid) === String(currentUser.uid) ? { ...group, ...changes, ownerUid: group.ownerUid, id: group.id } : group);
    persistGroups(next); return next;
  });
  const leaveGroup = id => { setGroups(old => { const next = old.map(group => group.id === id && group.ownerUid !== currentUser.uid ? {...group, memberUids: group.memberUids.filter(uid => uid !== currentUser.uid)} : group); persistGroups(next); return next; }); };
  useEffect(() => { const sync = e => { if (e.key === GROUPS_KEY) setGroups(loadGroups()); }; window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync); }, []);

  const changePostPreferences = useCallback(update => {
    setPostPreferences(previous => {
      const next = update(previous);
      if (!guestMode) savePostPreferences(next);
      return next;
    });
  }, [guestMode]);
  const editPost = useCallback((id, text) => {
    if (!currentUser || !text.trim()) return;
    const original = [...visibleChirps, ...demoFeed].find(post => String(post.id) === String(id));
    if (!original || String(original.uid) !== String(currentUser.uid)) return;
    changePostPreferences(previous => ({ ...previous, edits: { ...previous.edits, [String(id)]: text.trim().slice(0, 500) } }));
  }, [currentUser, visibleChirps, changePostPreferences]);
  const deletePost = useCallback(id => {
    const original = [...visibleChirps, ...demoFeed].find(post => String(post.id) === String(id));
    if (!original || String(original.uid) !== String(currentUser?.uid)) return;
    changePostPreferences(previous => ({ ...previous, deleted: [...new Set([...previous.deleted, String(id)])] }));
    if (guestMode && guestPosts.some(post => String(post.id) === String(id))) {
      setGuestPosts(previous => previous.filter(post => String(post.id) !== String(id)));
      if (original.attachment?.id) removeMedia(original.attachment.id).catch(() => {});
      return;
    }
    if (localChirps.some(post => String(post.id) === String(id))) {
      setLocalChirps(previous => {
        const next = previous.filter(post => String(post.id) !== String(id));
        saveLocalChirps(next);
        return next;
      });
      if (original.attachment?.id) removeMedia(original.attachment.id).catch(() => {});
    }
  }, [currentUser, visibleChirps, localChirps, guestPosts, guestMode, changePostPreferences]);
  const hidePost = useCallback(id => changePostPreferences(previous => ({ ...previous, hidden: [...new Set([...previous.hidden, String(id)])] })), [changePostPreferences]);
  const savePost = useCallback(id => changePostPreferences(previous => {
    const value = String(id);
    return { ...previous, saved: previous.saved.includes(value) ? previous.saved.filter(item => item !== value) : [...previous.saved, value] };
  }), [changePostPreferences]);

  // Both the main feed and the owner's profile share the same draft posts.
  const publishChirp = useCallback((text, options = {}) => {
    if (!demoSignedIn || !currentUser || (!text.trim() && !options.attachment)) return null;
    const post = makeLocalChirp(currentUser.uid, text, options);
    if (guestMode) {
      setGuestPosts(previous => [post, ...previous]);
      return post;
    }
    setLocalChirps(previous => {
      const next = [post, ...previous];
      saveLocalChirps(next);
      return next;
    });
    return post;
  }, [demoSignedIn, currentUser, guestMode]);

  const updateProfileDetails = useCallback((uid, values) => {
    if (!demoSignedIn || String(uid) !== String(currentUser?.uid)) return false;
    if (guestMode) { setGuestProfile(normalizeProfileDetails(values)); return true; }
    const next = { ...profileDetailsByUid, [String(uid)]: normalizeProfileDetails(values) };
    // Persist before changing React state, so a quota error is not silently lost.
    if (!saveProfileDetails(next)) return false;
    setProfileDetailsByUid(next);
    return true;
  }, [demoSignedIn, currentUser?.uid, profileDetailsByUid, guestMode]);

  const updateAppearance = useCallback((uid, nextAppearance) => {
    // A frontend-only control: only the demo signed-in user may edit their theme.
    if (!demoSignedIn || String(uid) !== String(currentUser?.uid)) return;
    setAppearancesByUid(previous => {
      const updated = { ...previous, [uid]: normalizeAppearance(nextAppearance) };
      if (!guestMode) saveAppearances(updated);
      return updated;
    });
  }, [demoSignedIn, currentUser, guestMode]);

  useEffect(() => {
    const sync = event => {
      if (event.key === APPEARANCE_STORAGE_KEY) setAppearancesByUid(loadAppearances());
    };
    const syncProfiles = event => { if (event.key === PROFILE_DETAILS_KEY) setProfileDetailsByUid(loadProfileDetails()); };
    window.addEventListener('storage', syncProfiles);
    const syncChirps = event => { if (event.key === LOCAL_CHIRPS_KEY) setLocalChirps(loadLocalChirps()); };
    window.addEventListener('storage', sync);
    window.addEventListener('storage', syncChirps);
    const syncPostPreferences = event => { if (event.key === POST_PREFERENCES_KEY) setPostPreferences(loadPostPreferences()); };
    window.addEventListener('storage', syncPostPreferences);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('storage', syncProfiles);
      window.removeEventListener('storage', syncChirps);
      window.removeEventListener('storage', syncPostPreferences);
    };
  }, []);
  const changeAccount = useCallback(uid => {
    if (!allUsers.some(user => String(user.uid) === String(uid))) return;
    if (String(uid) !== GUEST_UID && guestMode) {
      window.sessionStorage.removeItem(GUEST_MODE_KEY);
      setGuestMode(false);
      setGuestPosts([]);
      setGuestProfile({});
      setPostPreferences(loadPostPreferences());
      setGroups(loadGroups());
      setAppearancesByUid(loadAppearances());
    }
    window.sessionStorage.setItem('chirpr-demo-viewer', String(uid));
    setViewerUid(String(uid));
    navigate('/feed');
  }, [allUsers, navigate, guestMode]);
  const registerDemo = useCallback(values => {
    const username = String(values.username || '').trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username) || username === GUEST_USER.username || allUsers.some(user => user.username.toLowerCase() === username)) return false;
    const user = { uid: `demo-${Date.now()}`, username, displayName: values.displayName || username, bio: '', joined: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), chirps: [] };
    const next = [...registeredUsers, user];
    try { window.localStorage.setItem('chirpr-demo-registered-users', JSON.stringify(next)); } catch { return false; }
    window.sessionStorage.removeItem(GUEST_MODE_KEY);
    setGuestMode(false); setGuestPosts([]); setGuestProfile({});
    setPostPreferences(loadPostPreferences()); setGroups(loadGroups()); setAppearancesByUid(loadAppearances());
    setRegisteredUsers(next); setViewerUid(String(user.uid));
    window.sessionStorage.setItem('chirpr-demo-viewer', String(user.uid));
    window.sessionStorage.setItem('chirpr-demo-signed-in', '1'); setDemoSignedIn(true); navigate('/feed');
    return true;
  }, [allUsers, registeredUsers, navigate]);
  const signIn = useCallback(() => {
    window.sessionStorage.removeItem(GUEST_MODE_KEY);
    setGuestMode(false); setGuestPosts([]); setGuestProfile({});
    if (String(viewerUid) === GUEST_UID) {
      window.sessionStorage.setItem('chirpr-demo-viewer', '1');
      setViewerUid('1');
    }
    window.sessionStorage.setItem('chirpr-demo-signed-in', '1');
    setDemoSignedIn(true);
    navigate('/feed');
  }, [navigate, viewerUid]);

  const signInAsGuest = useCallback(() => {
    window.sessionStorage.setItem('chirpr-demo-viewer', GUEST_UID);
    window.sessionStorage.setItem('chirpr-demo-signed-in', '1');
    window.sessionStorage.setItem(GUEST_MODE_KEY, '1');
    setGuestPosts([]); setGuestProfile({});
    setPostPreferences(loadPostPreferences()); setGroups(loadGroups()); setAppearancesByUid(loadAppearances());
    setViewerUid(GUEST_UID);
    setGuestMode(true);
    setDemoSignedIn(true);
    navigate('/feed');
  }, [navigate]);

  const [signingOut, setSigningOut] = useState(false);
  const signOutTimer = useRef(null);
  useEffect(() => () => window.clearTimeout(signOutTimer.current), []);
  const signOut = useCallback(() => {
    if (signOutTimer.current) return;
    const finish = () => {
      window.sessionStorage.removeItem('chirpr-demo-signed-in');
      window.sessionStorage.removeItem(GUEST_MODE_KEY);
      if (guestMode) {
        guestPosts.forEach(post => { if (post.attachment?.id) removeMedia(post.attachment.id).catch(() => {}); });
        window.sessionStorage.removeItem('chirpr-demo-viewer');
        setViewerUid('1');
        setGuestPosts([]); setGuestProfile({});
        setPostPreferences(loadPostPreferences()); setGroups(loadGroups()); setAppearancesByUid(loadAppearances());
      }
      setGuestMode(false);
      setDemoSignedIn(false);
      navigate('/', { replace: true });
      setSigningOut(false);
      signOutTimer.current = null;
    };
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }
    setSigningOut(true);
    signOutTimer.current = window.setTimeout(finish, 690);
  }, [navigate, guestMode, guestPosts]);

  return (
    <PageTransitionProvider>
      <SocialProvider key={guestMode ? 'guest-preview' : 'normal-demo'} guestMode={guestMode} currentUser={demoSignedIn ? currentUser : null} users={allUsers} posts={sharedPosts}>
      <UploadActivityLayer />
      <DestinationTransitions />
      <SignOutTransition active={signingOut} />
      {demoSignedIn && <SocialDock />}
      <ReelsRouteTransition signedIn={demoSignedIn}>
        {renderedLocation => <Routes location={renderedLocation}>
        <Route path='/' element={ <Home onDemoSignIn={signIn} onGuestSignIn={signInAsGuest} /> } />
        <Route path='/home' element={ <Home onDemoSignIn={signIn} onGuestSignIn={signInAsGuest} /> } />
        <Route path='/register' element={ <Register users={allUsers} onRegister={registerDemo} onGuestSignIn={signInAsGuest} /> } />
        <Route path='/login' element={ <Login onDemoSignIn={signIn} onGuestSignIn={signInAsGuest} /> } />
        <Route path='/feed' element={ demoSignedIn ? <Feed currentUser={currentUser} users={allUsers} onSignOut={signOut} appearancesByUid={appearancesByUid} localChirps={visibleChirps} onCreateChirp={publishChirp} postPreferences={postPreferences} onEditPost={editPost} onDeletePost={deletePost} onHidePost={hidePost} onSavePost={savePost} /> : <Navigate to='/login' replace /> } />
        <Route path='/reels' element={ demoSignedIn ? <Reels currentUser={currentUser} users={allUsers} localChirps={visibleChirps} appearancesByUid={appearancesByUid} postPreferences={postPreferences} onSavePost={savePost} /> : <Navigate to='/login' replace /> } />
        <Route path='/groups' element={demoSignedIn ? <Groups currentUser={currentUser} users={allUsers} groups={groups} onCreateGroup={createGroup} onUpdateGroup={updateGroup} onJoinGroup={joinGroup} onLeaveGroup={leaveGroup} localChirps={visibleChirps} onCreateChirp={publishChirp} postPreferences={postPreferences} appearancesByUid={appearancesByUid} onSavePost={savePost} /> : <Navigate to='/login' replace />} />
        <Route path='/groups/:groupId' element={demoSignedIn ? <Groups currentUser={currentUser} users={allUsers} groups={groups} onCreateGroup={createGroup} onUpdateGroup={updateGroup} onJoinGroup={joinGroup} onLeaveGroup={leaveGroup} localChirps={visibleChirps} onCreateChirp={publishChirp} postPreferences={postPreferences} appearancesByUid={appearancesByUid} onSavePost={savePost} /> : <Navigate to='/login' replace />} />
        <Route path='/tags/:tag' element={demoSignedIn ? <HashtagPage currentUser={currentUser} users={allUsers} localChirps={visibleChirps} appearancesByUid={appearancesByUid} postPreferences={postPreferences} onSavePost={savePost} /> : <Navigate to='/login' replace />} />
        <Route path='/about' element={ <About />} />
        <Route path='/discover' element={demoSignedIn ? <DiscoverPage appearancesByUid={appearancesByUid} postPreferences={postPreferences} /> : <Navigate to='/login' replace />} />
        <Route path='/notifications' element={demoSignedIn ? <NotificationsPage /> : <Navigate to='/login' replace />} />
        <Route path='/messages' element={demoSignedIn ? <MessagesPage /> : <Navigate to='/login' replace />} />
        <Route path='/messages/:userId' element={demoSignedIn ? <MessagesPage /> : <Navigate to='/login' replace />} />
        <Route path='/bookmarks' element={demoSignedIn ? <BookmarksPage postPreferences={postPreferences} appearancesByUid={appearancesByUid} onSavePost={savePost} /> : <Navigate to='/login' replace />} />
        <Route path='/chirp/:postId' element={demoSignedIn ? <ChirpDetailPage postPreferences={postPreferences} appearancesByUid={appearancesByUid} onSavePost={savePost} /> : <Navigate to='/login' replace />} />
        <Route path='/settings' element={demoSignedIn ? <SettingsPage onSignOut={signOut} onChangeAccount={changeAccount} currentUser={currentUser} users={allUsers} /> : <Navigate to='/login' replace />} />
        <Route path='/safety' element={demoSignedIn ? <SafetyPage /> : <Navigate to='/login' replace />} />
        <Route path='/users/:uname' element={ <Account currentUser={demoSignedIn ? currentUser : null} users={allUsers} appearancesByUid={appearancesByUid} onAppearanceChange={updateAppearance} localChirps={visibleChirps} onCreateChirp={publishChirp} postPreferences={postPreferences} onEditPost={editPost} onDeletePost={deletePost} onHidePost={hidePost} onSavePost={savePost} /> } />
        <Route path='/account' element={ <Account currentUser={demoSignedIn ? currentUser : null} users={allUsers} appearancesByUid={appearancesByUid} onAppearanceChange={updateAppearance} localChirps={visibleChirps} onCreateChirp={publishChirp} postPreferences={postPreferences} onEditPost={editPost} onDeletePost={deletePost} onHidePost={hidePost} onSavePost={savePost} /> } />
        <Route path="/profileSettings/:uid" element={<EditProfileSettings currentUser={demoSignedIn ? currentUser : null} onChangeAccount={changeAccount} onSignOut={signOut} />} />
        <Route path='/editProfileDetails/:uid' element={<EditProfileDetails currentUser={demoSignedIn ? currentUser : null} users={allUsers} appearancesByUid={appearancesByUid} onAppearanceChange={updateAppearance} onProfileChange={updateProfileDetails} />} />
        </Routes>}
      </ReelsRouteTransition>
      </SocialProvider>
    </PageTransitionProvider>
  );
}

export default function App() {
  return <Router><ChirprRoutes /></Router>;
}
