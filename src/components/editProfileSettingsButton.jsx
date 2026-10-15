import { Link } from 'react-router-dom';

export default function EditProfileSettingsButton({ currentUser }) {

    return (
        <Link
            to={`/profileSettings/${currentUser.uid}`}
            className="editProfileSettingsButton"
        >
            Settings
        </Link>
    );
}