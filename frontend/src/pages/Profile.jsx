import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { getOrders } from "../services/orderService";
import {
  fetchMyOrders,
  mergeOrders,
} from "../services/orderApi";

import ProfileSidebar from "../components/profile/ProfileSidebar";
import ProfileHeader from "../components/profile/ProfileHeader";
import PersonalInfo from "../components/profile/PersonalInfo";
import EditProfile from "../components/profile/EditProfile";
import MyOrders from "../components/profile/MyOrders";
import OrderTracking from "../components/profile/OrderTracking";
import AddressBook from "../components/profile/AddressBook";

import "../styles/Profile.css";

const Profile = () => {

  const navigate = useNavigate();

  const {
    user,
    logout,
    updateUser,
    loading: authLoading,
  } = useAuth();

  const [activeTab, setActiveTab] =
    useState("profile");

  const [selectedOrder, setSelectedOrder] =
    useState(null);

  const [orders] = useState(() =>
    getOrders()
  );

  /* Track Order ke liye — real checkout orders */
  const [trackingOrders, setTrackingOrders] =
    useState(() => getOrders());

  /* Server se orders merge — doosre device ke bhi */
  useEffect(() => {
    let mounted = true;

    const loadRemote = async () => {
      const remote = await fetchMyOrders();
      if (!mounted || remote.length === 0) {
        return;
      }

      setTrackingOrders((prev) =>
        mergeOrders(remote, prev)
      );
    };

    loadRemote();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = () => {

    logout();

    navigate("/login");
  };

  const handleSaveProfile = async (data) => {

    const result = await updateUser(data);

    if (result?.success) {
      setActiveTab("profile");
      alert("Profile updated successfully!");
    } else {
      alert(result?.message || "Unable to update profile.");
    }
  };

  const handleTrackOrder = (order) => {

    setSelectedOrder(order);

    setActiveTab("tracking");
  };

  /* session restore in progress — don't flash the
     login-required screen while we check the token */
  if (authLoading) {
    return (
      <div className="profile-login-required">
        <div className="profile-login-box">
          <h2>Checking your session...</h2>
        </div>
      </div>
    );
  }

  if (!user) {

    return (
      <div className="profile-login-required">

        <div className="profile-login-box">

          <div className="profile-login-icon">
            🔐
          </div>

          <h2>Login Required</h2>

          <p>
            Please login to view your profile
            and orders.
          </p>

          <button
            onClick={() => navigate("/login")}
          >
            Login Now
          </button>

        </div>

      </div>
    );
  }

  return (
    <div className="profile-page">

      <div className="profile-container">

        <ProfileSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
        />

        <main className="profile-main">

          {activeTab === "profile" && (
            <>
              <ProfileHeader
                user={user}
                onEdit={() =>
                  setActiveTab("edit")
                }
              />

              <PersonalInfo
                user={user}
                onEdit={() =>
                  setActiveTab("edit")
                }
              />

              <AddressBook
                user={user}
                onEdit={() =>
                  setActiveTab("edit")
                }
              />
            </>
          )}

          {activeTab === "edit" && (
            <EditProfile
              user={user}
              onSave={handleSaveProfile}
            />
          )}

          {activeTab === "orders" && (
            <MyOrders
              orders={orders}
              onTrack={handleTrackOrder}
            />
          )}

          {activeTab === "tracking" && (
            <OrderTracking
              order={selectedOrder}
              orders={trackingOrders}
            />
          )}

          {activeTab === "address" && (
            <AddressBook
              user={user}
              onEdit={() =>
                setActiveTab("edit")
              }
            />
          )}

        </main>

      </div>

    </div>
  );
};

export default Profile;