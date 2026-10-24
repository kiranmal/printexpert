import React from "react";

const PersonalInfo = ({ user, onEdit }) => {
  return (
    <div className="profile-card">

      <div className="card-title-row">

        <h2>Personal Information</h2>

        <button
          className="small-edit-btn"
          onClick={onEdit}
        >
          Edit
        </button>

      </div>

      <div className="personal-info-grid">

        <div className="info-box">
          <span>Full Name</span>
          <strong>
            {user?.name || "Not added"}
          </strong>
        </div>

        <div className="info-box">
          <span>Email</span>
          <strong>
            {user?.email || "Not added"}
          </strong>
        </div>

        <div className="info-box">
          <span>Phone Number</span>
          <strong>
            {user?.phone || "Not added"}
          </strong>
        </div>

        <div className="info-box">
          <span>Address</span>
          <strong>
            {user?.address || "Not added"}
          </strong>
        </div>

      </div>

    </div>
  );
};

export default PersonalInfo;