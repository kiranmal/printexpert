import React, { useState, useRef } from "react";

const EditProfile = ({ user, onSave }) => {

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    city: user?.city || "",
    state: user?.state || "",
    pincode: user?.pincode || "",
    photo: user?.photo || "",
  });

  const [pinLoading, setPinLoading] = useState(false);
  const pinAbort = useRef(null);

  const lookupPincode = async (pin) => {
    if (!/^\d{6}$/.test(pin)) return;

    if (pinAbort.current) pinAbort.current.abort();
    const controller = new AbortController();
    pinAbort.current = controller;

    setPinLoading(true);
    try {
      const res = await fetch(
        `https://api.postalpincode.in/pincode/${pin}`,
        { signal: controller.signal }
      );
      const data = await res.json();

      if (
        data?.[0]?.Status === "Success" &&
        data[0].PostOffice?.length > 0
      ) {
        const po = data[0].PostOffice[0];
        setFormData((prev) => ({
          ...prev,
          city: po.District || prev.city,
          state: po.State || prev.state,
        }));
      }
    } catch {
      /* network error or aborted — ignore */
    } finally {
      setPinLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "pincode" && value.length === 6) {
      lookupPincode(value);
    }
  };

  const handleImage = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        photo: reader.result,
      }));
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.address.trim()) {
      alert("Please enter your complete address.");
      return;
    }
    if (!formData.city.trim()) {
      alert("Please enter your city.");
      return;
    }
    if (!formData.state.trim()) {
      alert("Please enter your state.");
      return;
    }
    if (!/^\d{6}$/.test(formData.pincode.trim())) {
      alert("Please enter a valid 6 digit pincode.");
      return;
    }

    onSave(formData);
  };

  return (
    <div className="profile-card edit-profile-card">

      <h2>Edit Profile</h2>

      <form onSubmit={handleSubmit}>

        <div className="profile-photo-edit">

          <img
            src={
              formData.photo ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                formData.name || "User"
              )}&background=111827&color=ffffff&size=200`
            }
            alt="Profile"
          />

          <label className="upload-photo-btn">

            Change Photo

            <input
              type="file"
              accept="image/*"
              onChange={handleImage}
            />

          </label>

        </div>

        <div className="form-grid">

          <div className="form-group">

            <label>Full Name</label>

            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name"
            />

          </div>

          <div className="form-group">

            <label>Email</label>

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
            />

          </div>

          <div className="form-group">

            <label>Phone</label>

            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
            />

          </div>

          <div className="form-group full-width">

            <label>Complete Address <span className="required">*</span></label>

            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="House no., street, area, landmark..."
              rows="3"
              required
            />

          </div>

          <div className="form-group">

            <label>City <span className="required">*</span></label>

            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="City"
              required
            />

          </div>

          <div className="form-group">

            <label>State <span className="required">*</span></label>

            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="State"
              required
            />

          </div>

          <div className="form-group">

            <label>
              Pincode <span className="required">*</span>
              {pinLoading && <span className="pin-loading"> Fetching...</span>}
            </label>

            <input
              type="text"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              placeholder="6 digit pincode"
              maxLength="6"
              required
              pattern="\d{6}"
              title="6 digit pincode"
            />

          </div>

        </div>

        <button
          type="submit"
          className="save-profile-btn"
        >
          Save Changes
        </button>

      </form>

    </div>
  );
};

export default EditProfile;