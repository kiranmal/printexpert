import React, { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Save,
  X,
  Truck,
  MapPinned,
  IndianRupee,
} from "lucide-react";

import "./AdminDelivery.css";

const STORAGE_KEY = "printExpertDeliveryLocations";

const DEFAULT_LOCATIONS = [
  {
    id: 1,
    pincode: "110001",
    city: "New Delhi",
    state: "Delhi",
    delivery: true,
    charge: 0,
  },
  {
    id: 2,
    pincode: "400001",
    city: "Mumbai",
    state: "Maharashtra",
    delivery: true,
    charge: 0,
  },
  {
    id: 3,
    pincode: "560001",
    city: "Bangalore",
    state: "Karnataka",
    delivery: true,
    charge: 0,
  },
];

function getLocations() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return DEFAULT_LOCATIONS;
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed)
      ? parsed
      : DEFAULT_LOCATIONS;
  } catch (error) {
    console.error("Delivery locations loading error:", error);
    return DEFAULT_LOCATIONS;
  }
}

export default function AdminDelivery() {
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    pincode: "",
    city: "",
    state: "",
    delivery: true,
    charge: "0",
  });

  const [message, setMessage] = useState("");

  /* =====================================================
     LOAD
  ===================================================== */

  useEffect(() => {
    const saved = getLocations();

    setLocations(saved);

    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(saved)
      );
    }
  }, []);

  /* =====================================================
     SAVE STORAGE
  ===================================================== */

  const saveLocations = (data) => {
    setLocations(data);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );

    window.dispatchEvent(
      new Event("printExpertDeliveryUpdated")
    );
  };

  /* =====================================================
     FORM
  ===================================================== */

  const resetForm = () => {
    setForm({
      pincode: "",
      city: "",
      state: "",
      delivery: true,
      charge: "0",
    });

    setEditingId(null);
    setShowForm(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  /* =====================================================
     ADD / UPDATE
  ===================================================== */

  const handleSubmit = (e) => {
    e.preventDefault();

    const pincode = form.pincode
      .replace(/\D/g, "")
      .trim();

    const city = form.city.trim();
    const state = form.state.trim();

    if (!/^\d{6}$/.test(pincode)) {
      alert("Please enter a valid 6 digit pincode.");
      return;
    }

    if (!city) {
      alert("Please enter city.");
      return;
    }

    if (!state) {
      alert("Please enter state.");
      return;
    }

    const charge = Number(form.charge || 0);

    if (charge < 0) {
      alert("Delivery charge cannot be negative.");
      return;
    }

    /* =================================================
       UPDATE
    ================================================= */

    if (editingId !== null) {
      const updated = locations.map((item) =>
        item.id === editingId
          ? {
              ...item,
              pincode,
              city,
              state,
              delivery: form.delivery,
              charge,
            }
          : item
      );

      saveLocations(updated);

      setMessage("Delivery location updated successfully.");

      setTimeout(() => {
        setMessage("");
      }, 2500);

      resetForm();

      return;
    }

    /* =================================================
       DUPLICATE CHECK
    ================================================= */

    const alreadyExists = locations.some(
      (item) => item.pincode === pincode
    );

    if (alreadyExists) {
      alert(
        "This pincode already exists. Please edit the existing location."
      );
      return;
    }

    /* =================================================
       ADD
    ================================================= */

    const newLocation = {
      id: Date.now(),
      pincode,
      city,
      state,
      delivery: form.delivery,
      charge,
    };

    saveLocations([
      ...locations,
      newLocation,
    ]);

    setMessage("Delivery location added successfully.");

    setTimeout(() => {
      setMessage("");
    }, 2500);

    resetForm();
  };

  /* =====================================================
     EDIT
  ===================================================== */

  const handleEdit = (location) => {
    setEditingId(location.id);

    setForm({
      pincode: location.pincode || "",
      city: location.city || "",
      state: location.state || "",
      delivery: Boolean(location.delivery),
      charge: String(location.charge || 0),
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =====================================================
     DELETE
  ===================================================== */

  const handleDelete = (id) => {
    const location = locations.find(
      (item) => item.id === id
    );

    if (!location) return;

    const confirmed = window.confirm(
      `Delete delivery location ${location.pincode} (${location.city})?`
    );

    if (!confirmed) return;

    const updated = locations.filter(
      (item) => item.id !== id
    );

    saveLocations(updated);

    setMessage("Delivery location deleted.");

    setTimeout(() => {
      setMessage("");
    }, 2500);
  };

  /* =====================================================
     TOGGLE DELIVERY
  ===================================================== */

  const toggleDelivery = (id) => {
    const updated = locations.map((item) =>
      item.id === id
        ? {
            ...item,
            delivery: !item.delivery,
          }
        : item
    );

    saveLocations(updated);
  };

  /* =====================================================
     SEARCH
  ===================================================== */

  const filteredLocations = useMemo(() => {
    const query = search
      .toLowerCase()
      .trim();

    if (!query) {
      return locations;
    }

    return locations.filter((item) => {
      return (
        item.pincode
          ?.toLowerCase()
          .includes(query) ||
        item.city
          ?.toLowerCase()
          .includes(query) ||
        item.state
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [locations, search]);

  /* =====================================================
     STATS
  ===================================================== */

  const availableCount = locations.filter(
    (item) => item.delivery
  ).length;

  const unavailableCount = locations.filter(
    (item) => !item.delivery
  ).length;

  return (
    <div className="admin-delivery-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="delivery-page-header">

        <div className="delivery-header-left">

          <div className="delivery-header-icon">
            <Truck size={25} />
          </div>

          <div>
            <div className="delivery-header-label">
              <MapPinned size={14} />
              DELIVERY MANAGEMENT
            </div>

            <h1>Delivery Locations</h1>

            <p>
              Manage where customers can order and where
              delivery is available.
            </p>
          </div>

        </div>

        <button
          className="add-location-btn"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus size={18} />
          Add Location
        </button>

      </div>

      {/* =================================================
          SUCCESS MESSAGE
      ================================================= */}

      {message && (
        <div className="delivery-success-message">
          <CheckCircle2 size={19} />
          {message}
        </div>
      )}

      {/* =================================================
          STATS
      ================================================= */}

      <div className="delivery-stats">

        <div className="delivery-stat-card">
          <div className="stat-icon">
            <MapPin size={21} />
          </div>

          <div>
            <span>Total Locations</span>
            <strong>{locations.length}</strong>
          </div>
        </div>

        <div className="delivery-stat-card available">
          <div className="stat-icon">
            <CheckCircle2 size={21} />
          </div>

          <div>
            <span>Delivery Available</span>
            <strong>{availableCount}</strong>
          </div>
        </div>

        <div className="delivery-stat-card unavailable">
          <div className="stat-icon">
            <XCircle size={21} />
          </div>

          <div>
            <span>Delivery Disabled</span>
            <strong>{unavailableCount}</strong>
          </div>
        </div>

      </div>

      {/* =================================================
          ADD / EDIT FORM
      ================================================= */}

      {showForm && (
        <div className="delivery-form-card">

          <div className="delivery-form-header">

            <div>
              <h2>
                {editingId !== null
                  ? "Edit Delivery Location"
                  : "Add Delivery Location"}
              </h2>

              <p>
                Set the pincode and delivery availability.
              </p>
            </div>

            <button
              className="close-form-btn"
              type="button"
              onClick={resetForm}
            >
              <X size={19} />
            </button>

          </div>

          <form onSubmit={handleSubmit}>

            <div className="delivery-form-grid">

              {/* PINCODE */}

              <div className="delivery-field">

                <label>
                  Pincode <span>*</span>
                </label>

                <div className="delivery-input">

                  <MapPin size={17} />

                  <input
                    name="pincode"
                    type="text"
                    value={form.pincode}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pincode: e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6),
                      }))
                    }
                    placeholder="110001"
                    maxLength={6}
                    inputMode="numeric"
                  />

                </div>

              </div>

              {/* CITY */}

              <div className="delivery-field">

                <label>
                  City <span>*</span>
                </label>

                <div className="delivery-input">

                  <MapPinned size={17} />

                  <input
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="New Delhi"
                  />

                </div>

              </div>

              {/* STATE */}

              <div className="delivery-field">

                <label>
                  State <span>*</span>
                </label>

                <div className="delivery-input">

                  <MapPinned size={17} />

                  <input
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="Delhi"
                  />

                </div>

              </div>

              {/* DELIVERY CHARGE */}

              <div className="delivery-field">

                <label>
                  Delivery Charge
                </label>

                <div className="delivery-input">

                  <IndianRupee size={17} />

                  <input
                    name="charge"
                    type="number"
                    min="0"
                    value={form.charge}
                    onChange={handleChange}
                    placeholder="0"
                  />

                </div>

              </div>

            </div>

            {/* DELIVERY STATUS */}

            <label className="delivery-toggle">

              <input
                type="checkbox"
                name="delivery"
                checked={form.delivery}
                onChange={handleChange}
              />

              <span className="toggle-ui"></span>

              <div>
                <strong>
                  Delivery Available
                </strong>

                <small>
                  Customers can place orders at this pincode.
                </small>
              </div>

            </label>

            {/* ACTIONS */}

            <div className="delivery-form-actions">

              <button
                type="button"
                className="delivery-cancel-btn"
                onClick={resetForm}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="delivery-save-btn"
              >
                <Save size={18} />

                {editingId !== null
                  ? "Update Location"
                  : "Save Location"}
              </button>

            </div>

          </form>

        </div>
      )}

      {/* =================================================
          LOCATIONS
      ================================================= */}

      <div className="delivery-list-card">

        <div className="delivery-list-header">

          <div>
            <h2>Delivery Areas</h2>

            <p>
              Customers can order only from active delivery locations.
            </p>
          </div>

          <div className="delivery-search">

            <Search size={17} />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search pincode, city or state..."
            />

          </div>

        </div>

        {/* TABLE */}

        <div className="delivery-table-wrapper">

          <table className="delivery-table">

            <thead>

              <tr>
                <th>Pincode</th>
                <th>City</th>
                <th>State</th>
                <th>Delivery Charge</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>

            </thead>

            <tbody>

              {filteredLocations.length === 0 ? (

                <tr>

                  <td
                    colSpan="6"
                    className="empty-delivery"
                  >

                    <MapPin size={35} />

                    <strong>
                      No delivery locations found
                    </strong>

                    <span>
                      Add a pincode to start accepting orders.
                    </span>

                  </td>

                </tr>

              ) : (

                filteredLocations.map((item) => (

                  <tr key={item.id}>

                    <td>
                      <strong className="pincode-text">
                        {item.pincode}
                      </strong>
                    </td>

                    <td>
                      {item.city}
                    </td>

                    <td>
                      {item.state}
                    </td>

                    <td>
                      ₹{Number(item.charge || 0).toLocaleString("en-IN")}
                    </td>

                    <td>

                      <button
                        type="button"
                        className={
                          item.delivery
                            ? "status-badge active"
                            : "status-badge inactive"
                        }
                        onClick={() =>
                          toggleDelivery(item.id)
                        }
                      >

                        {item.delivery ? (
                          <>
                            <CheckCircle2 size={15} />
                            Available
                          </>
                        ) : (
                          <>
                            <XCircle size={15} />
                            Unavailable
                          </>
                        )}

                      </button>

                    </td>

                    <td>

                      <div className="delivery-actions">

                        <button
                          type="button"
                          className="edit-location-btn"
                          onClick={() =>
                            handleEdit(item)
                          }
                          title="Edit"
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          type="button"
                          className="delete-location-btn"
                          onClick={() =>
                            handleDelete(item.id)
                          }
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>

                      </div>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}