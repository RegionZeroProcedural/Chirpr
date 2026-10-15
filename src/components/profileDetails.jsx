export function ProfilePicture() {
    return <div>Profile Picture</div>;
}

export function Name({user}) {
    return <h2>{user.displayName}</h2>;
}

export function BioDetails({ user }) {
    return (
        <div>
            <span>@{user.username}</span>
            <span>Joined: {user.joined}</span>
        </div>
    );
}

export function BioText({ user }) {
    return <p>{user.bio || "No biography yet."}</p>;
}

export function UserChirps({user}) {
    return <div>{user.chirps}</div>;
}