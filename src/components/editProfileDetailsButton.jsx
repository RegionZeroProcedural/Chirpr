import { Link } from 'react-router-dom';

export default function EditProfileDetailsButton({ currentUser }) {

    return (
        <Link
            to={`/editProfileDetails/${currentUser.uid}`}
            className="editProfileDetailsButton"
        >
            Edit Profile
        </Link>
    );
}