
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { mergeLocalDraftsToServer } from "../services/draftApi";
import { mergeLocalFavoritesToServer } from "../services/favoritesApi";

const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/* every key that belongs to an auth session — cleared
   together on logout / revoked / expired sessions */
const AUTH_STORAGE_KEYS = [
  "currentUser",
  "authToken",
  "printExpertUser",
  "rememberMe",
  "adminLoggedIn",
  "printExpertOrderSuccess",
];

const clearAuthStorage = () => {
  AUTH_STORAGE_KEYS.forEach((k) =>
    localStorage.removeItem(k)
  );
  sessionStorage.removeItem("printExpertSessionAlive");
};

/*
|--------------------------------------------------------------------------
| AuthProvider
|--------------------------------------------------------------------------
*/

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /*
  |--------------------------------------------------------------------------
  | Load logged-in user when application starts
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadUser = async () => {
      const savedUser = localStorage.getItem("currentUser");
      const token = localStorage.getItem("authToken");

      // Agar login data hi nahi hai
      if (!savedUser || !token) {
        setLoading(false);
        return;
      }

      /* "Remember me" UNCHECKED → session ends with the
         browser. sessionStorage dies when the browser/tab
         closes; if a fresh session has no alive-marker, the
         stored token belongs to a previous session → drop it.
         Refreshes keep the marker, so tab reloads stay in. */
      const remembered =
        localStorage.getItem("rememberMe") === "true";
      if (
        !remembered &&
        !sessionStorage.getItem("printExpertSessionAlive")
      ) {
        clearAuthStorage();
        setLoading(false);
        return;
      }

      /* mark this browser session as alive */
      sessionStorage.setItem("printExpertSessionAlive", "1");

      /* corrupt localStorage data — clear and stop */
      let parsedUser = null;
      try {
        parsedUser = JSON.parse(savedUser);
      } catch {
        parsedUser = null;
      }

      if (!parsedUser) {
        clearAuthStorage();
        setLoading(false);
        return;
      }

      try {

        /*
        |--------------------------------------------------------------------------
        | Temporary state set
        |--------------------------------------------------------------------------
        */

        setUser(parsedUser);

        /*
        |--------------------------------------------------------------------------
        | Backend se latest user verify karo
        |--------------------------------------------------------------------------
        */

        const response = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (response.ok && data.user) {
          setUser(data.user);

          localStorage.setItem(
            "currentUser",
            JSON.stringify(data.user)
          );

          // Existing project ke liye bhi save karo
          localStorage.setItem(
            "printExpertUser",
            JSON.stringify(data.user)
          );
        } else if (
          response.status === 401 ||
          response.status === 403
        ) {
          /*
          |--------------------------------------------------------------------------
          | Token genuinely invalid / expired — logout
          |--------------------------------------------------------------------------
          */

          clearAuthStorage();

          setUser(null);
        }
        /*
        |--------------------------------------------------------------------------
        | Any other response (server down, 5xx) — keep the
        | cached user logged in. Session clears only when
        | the token itself is rejected.
        |--------------------------------------------------------------------------
        */
      } catch (error) {
        /*
        |--------------------------------------------------------------------------
        | Network error — backend unreachable. Keep the
        | cached session so users stay logged in during
        | server restarts / temporary outages.
        |--------------------------------------------------------------------------
        */
        console.error(
          "Auth restore error (session kept):",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LOGIN
  |--------------------------------------------------------------------------
  |
  | Login.jsx se:
  |
  | login(userData, token, rememberMe)
  |
  */

  const login = (
    userData,
    token = null,
    rememberMe = true
  ) => {
    try {
      /*
      |--------------------------------------------------------------------------
      | User state
      |--------------------------------------------------------------------------
      */

      setUser(userData);

      /*
      |--------------------------------------------------------------------------
      | Current user
      |--------------------------------------------------------------------------
      */

      localStorage.setItem(
        "currentUser",
        JSON.stringify(userData)
      );

      /*
      |--------------------------------------------------------------------------
      | Existing Checkout/Profile code ke liye
      |--------------------------------------------------------------------------
      */

      localStorage.setItem(
        "printExpertUser",
        JSON.stringify(userData)
      );

      /*
      |--------------------------------------------------------------------------
      | JWT Token
      |--------------------------------------------------------------------------
      */

      if (token) {
        localStorage.setItem("authToken", token);
      }

      /*
      |--------------------------------------------------------------------------
      | Remember Me — always record the choice, and set the
      | per-browser-session marker. With rememberMe=false the
      | marker alone keeps the session alive; a new browser
      | session (no marker) is rejected on load.
      |--------------------------------------------------------------------------
      */

      localStorage.setItem(
        "rememberMe",
        rememberMe ? "true" : "false"
      );
      sessionStorage.setItem("printExpertSessionAlive", "1");

      /* guest customization drafts + favourites → merge
         into the account (newer revision wins) */
      if (token) {
        mergeLocalDraftsToServer().catch(() => {});
        mergeLocalFavoritesToServer().catch(() => {});
      }
    } catch (error) {
      console.error("Login save error:", error);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOGOUT
  |--------------------------------------------------------------------------
  */

  const logout = () => {
    try {
      /*
      |--------------------------------------------------------------------------
      | Revoke the token on the server so it cannot be
      | replayed. Fire-and-forget — the client clears its
      | session regardless of the server response.
      |--------------------------------------------------------------------------
      */

      const token = localStorage.getItem("authToken");
      if (token) {
        fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }

      clearAuthStorage();

      /*
      |--------------------------------------------------------------------------
      | React state
      |--------------------------------------------------------------------------
      */

      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | UPDATE USER
  |--------------------------------------------------------------------------
  |
  | Profile se user information update karne ke liye.
  |
  | Example:
  |
  | updateUser({
  |   name: "Amit",
  |   phone: "9876543210",
  |   address: "Delhi"
  | })
  |
  */

  const updateUser = async (updatedData) => {
    try {
      if (!user) {
        return {
          success: false,
          message: "User is not logged in",
        };
      }

      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          success: false,
          message: "Authentication token not found",
        };
      }

      /*
      |--------------------------------------------------------------------------
      | Backend ko update request
      |--------------------------------------------------------------------------
      */

      const response = await fetch(`${API_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      const data = await response.json();

      /*
      |--------------------------------------------------------------------------
      | Backend response
      |--------------------------------------------------------------------------
      */

      if (!response.ok) {
        return {
          success: false,
          message:
            data.message || "Unable to update profile",
        };
      }

      /*
      |--------------------------------------------------------------------------
      | Latest user
      |--------------------------------------------------------------------------
      */

      const updatedUser = data.user || {
        ...user,
        ...updatedData,
      };

      /*
      |--------------------------------------------------------------------------
      | React state update
      |--------------------------------------------------------------------------
      */

      setUser(updatedUser);

      /*
      |--------------------------------------------------------------------------
      | currentUser update
      |--------------------------------------------------------------------------
      */

      localStorage.setItem(
        "currentUser",
        JSON.stringify(updatedUser)
      );

      /*
      |--------------------------------------------------------------------------
      | printExpertUser update
      |--------------------------------------------------------------------------
      */

      localStorage.setItem(
        "printExpertUser",
        JSON.stringify(updatedUser)
      );

      /*
      |--------------------------------------------------------------------------
      | Return result
      |--------------------------------------------------------------------------
      */

      return {
        success: true,
        message:
          data.message || "Profile updated successfully",
        user: updatedUser,
      };
    } catch (error) {
      console.error("Update user error:", error);

      return {
        success: false,
        message: "Server error. Please try again.",
      };
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Refresh user from backend
  |--------------------------------------------------------------------------
  */

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return null;
      }

      const response = await fetch(`${API_URL}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.user) {
        setUser(data.user);

        localStorage.setItem(
          "currentUser",
          JSON.stringify(data.user)
        );

        localStorage.setItem(
          "printExpertUser",
          JSON.stringify(data.user)
        );

        return data.user;
      }

      return null;
    } catch (error) {
      console.error("Refresh user error:", error);
      return null;
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Context Value
  |--------------------------------------------------------------------------
  */

  const contextValue = {
    user,

    login,

    logout,

    updateUser,

    refreshUser,

    isLoggedIn: !!user,

    loading,
  };

  /*
  |--------------------------------------------------------------------------
  | Provider
  |--------------------------------------------------------------------------
  */

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/*
|--------------------------------------------------------------------------
| useAuth Hook
|--------------------------------------------------------------------------
*/

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
};

export default AuthContext;
