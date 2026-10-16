import { Link, useParams } from 'react-router-dom';
import { useSocial } from '../features/social/SocialStore.jsx';
import { SettingsPage } from '../features/social/SocialPages.jsx';
export default function EditProfileSettings({ currentUser, onChangeAccount, onSignOut }) {
  const { uid } = useParams();
  const social = useSocial();
  if (!currentUser || String(currentUser.uid) !== String(uid)) return <main className="profile-edit-denied"><div className="profile-edit-denied__card"><h1>Not your account.</h1><p>This demo only allows settings for the currently selected account.</p><Link to="/settings">Back to settings ↗</Link></div></main>;
  return <SettingsPage currentUser={currentUser} users={social?.users || []} onChangeAccount={onChangeAccount} onSignOut={onSignOut} />;
}
