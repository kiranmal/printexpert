import React from "react";

const ProfileHeader = ({ user, onEdit }) => {
  const profileImage =
    user?.photo ||
    "https://ui-avatars.com/api/?name=" +
      encodeURIComponent(user?.name || "User") +
      "&background=111827&color=ffffff&size=200";

  return (
    <div className="profile-header">

      <div className="profile-avatar-container">

        <img
          src={profileImage}
          alt="Profile"
          className="profile-avatar"
        />

      </div>

      <div className="profile-header-info">

        <p className="profile-welcome">
          Welcome back
        </p>

        <h1>
          {user?.name || "User"}
        </h1>

        <p>
          {user?.email || "No email added"}
        </p>

        <button
          className="profile-edit-btn"
          onClick={onEdit}
        >
          Edit Profile
        </button>

      </div>

    </div>
  );
};

export default ProfileHeader;