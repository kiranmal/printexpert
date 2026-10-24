import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";

import { useAuth } from "./AuthContext";
import {
  fetchServerCart,
  addServerCartItem,
  updateServerCartItem,
  removeServerCartItem,
  clearServerCart,
  mergeServerCart,
} from "../services/cartApi";

const CartContext = createContext();

/* ── localStorage helpers (guest cart) ── */
const GUEST_CART_KEY = "printExpertCart";

function readGuestCart() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuestCart(items) {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch {
    /* quota exceeded — best effort */
  }
}

function clearGuestCartStorage() {
  localStorage.removeItem(GUEST_CART_KEY);
}

/* fire both legacy events so Navbar listeners still work
   during the transition period (Phases 5-6 will clean up) */
function dispatchCartEvents() {
  window.dispatchEvent(new Event("printExpertCartUpdated"));
  window.dispatchEvent(new Event("cartUpdated"));
}

/*
|--------------------------------------------------------------------------
| CartProvider
|--------------------------------------------------------------------------
*/

export const CartProvider = ({ children }) => {
  const { user, isLoggedIn } = useAuth();

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false); // prevents duplicate API calls

  /* track which user's cart is loaded to avoid cross-user leaks */
  const loadedUserRef = useRef(null);

  /* prevent duplicate merge calls during React strict-mode double-mount
     or when auth state fires more than once for the same login event */
  const mergingRef = useRef(false);

  /* ──────────────────────────────────────────────
     FETCH CART (server or guest)
  ────────────────────────────────────────────── */

  const fetchCart = useCallback(async () => {
    setError(null);

    if (isLoggedIn) {
      /* authenticated → server cart */
      setLoading(true);
      try {
        const items = await fetchServerCart();
        if (items !== null) {
          setCartItems(items);
          loadedUserRef.current = user?.id || null;
          dispatchCartEvents();
        } else {
          /* token expired or invalid → clear displayed cart */
          setCartItems([]);
          loadedUserRef.current = null;
        }
      } catch {
        setError("Failed to load cart.");
      } finally {
        setLoading(false);
      }
    } else {
      /* guest → localStorage */
      setCartItems(readGuestCart());
      loadedUserRef.current = null;
    }
  }, [isLoggedIn, user?.id]);

  /* ──────────────────────────────────────────────
     AUTO-LOAD + GUEST MERGE on auth change
  ────────────────────────────────────────────── */

  useEffect(() => {
    const currentUserId = user?.id || null;

    if (currentUserId === loadedUserRef.current) {
      if (!isLoggedIn) setCartItems(readGuestCart());
      return;
    }

    if (!isLoggedIn) {
      /* logged out → clear displayed cart immediately.
         Do NOT read stale printExpertCart (it may contain the previous
         user's server cart mirror). Start guest with empty cart;
         new guest items will be written fresh. */
      setCartItems([]);
      clearGuestCartStorage();
      loadedUserRef.current = null;
      dispatchCartEvents();
      return;
    }

    /* logged in → snapshot guest cart, merge to server, then load */
    const mergeAndLoad = async () => {
      if (mergingRef.current) return; // prevent duplicate merge
      mergingRef.current = true;

      try {
        /* 1. Snapshot guest items BEFORE they are overwritten */
        const guestItems = readGuestCart();

        /* 2. If there are guest items, merge them to server
              (idempotent — GREATEST semantics, safe on retry) */
        if (guestItems.length > 0) {
          const mergeResult = await mergeServerCart(guestItems);
          if (mergeResult?.success) {
            /* merge succeeded — clear guest cart */
            clearGuestCartStorage();
          } else if (mergeResult?.error) {
            /* merge failed — preserve guest cart, show error
               but still load the server cart below */
            console.error("Cart merge failed:", mergeResult.error);
            setError("Some guest cart items could not be merged.");
          }
          /* if mergeResult is null (no auth token), guest cart stays */
        }

        /* 3. Load the (now merged) server cart */
        await fetchCart();
      } finally {
        mergingRef.current = false;
      }
    };

    mergeAndLoad();
  }, [user?.id, isLoggedIn, fetchCart]);

  /* ── also listen for legacy localStorage changes (cross-tab, legacy writers) ── */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === GUEST_CART_KEY && !isLoggedIn) {
        setCartItems(readGuestCart());
      }
    };
    const onCartEvent = () => {
      /* legacy dispatchers: reload from localStorage for guests,
         refetch from server for logged-in users */
      if (!isLoggedIn) {
        setCartItems(readGuestCart());
      }
      /* for logged-in users we don't auto-refetch on legacy events
         because we are the source of truth now */
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("printExpertCartUpdated", onCartEvent);
    window.addEventListener("cartUpdated", onCartEvent);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("printExpertCartUpdated", onCartEvent);
      window.removeEventListener("cartUpdated", onCartEvent);
    };
  }, [isLoggedIn]);

  /* ──────────────────────────────────────────────
     ADD TO CART
  ────────────────────────────────────────────── */

  const addToCart = useCallback(
    async (item) => {
      if (busy) return { error: "Please wait..." };
      setBusy(true);
      setError(null);

      try {
        if (isLoggedIn) {
          /* server cart */
          const result = await addServerCartItem({
            product_id: item.productId || item.product_id || item.originalProductId || item.id,
            quantity: item.quantity || 1,
            paper_type: item.paperType || item.paper_type || null,
            size: item.size || null,
            attributes: item.attributes || null,
            item_type: item.itemType || item.item_type || "standard",
            customization: item.customization || null,
            /* uploaded design files — metadata + fileId refs only,
               never raw base64 */
            uploadedDesigns: Array.isArray(item.uploadedDesigns)
              ? item.uploadedDesigns.map((d) => ({
                  name: d?.name,
                  type: d?.type,
                  size: d?.size,
                  fileId: d?.fileId || null,
                }))
              : null,
            hasUploadedDesign:
              item.hasUploadedDesign ||
              (item.uploadedDesigns?.length ?? 0) > 0,
            isCustomized:
              item.isCustomized || item.customized || null,
            /* pass through design fields for business-card/customizer */
            frontDesign: item.frontDesign || null,
            backDesign: item.backDesign || null,
            designs: item.designs || null,
            text: item.text || null,
            color: item.color || null,
            personName: item.personName || null,
            designation: item.designation || null,
            companyName: item.companyName || null,
          });

          if (result?.error) {
            setError(result.error);
            return result;
          }

          /* refetch full cart to get live prices/names */
          await fetchCart();
          return { success: true, merged: result?.merged || false };
        } else {
          /* guest → localStorage (preserve existing behavior) */
          const cart = readGuestCart();
          const productId = String(item.productId || item.product_id || item.id || "");
          const itemType = item.itemType || item.item_type || "standard";

          if (itemType === "standard") {
            /* merge by productId + paperType + size */
            const idx = cart.findIndex(
              (c) =>
                String(c.productId || c.id) === productId &&
                (c.paperType || null) === (item.paperType || null) &&
                (c.size || null) === (item.size || null)
            );
            if (idx >= 0) {
              cart[idx].quantity = (cart[idx].quantity || 1) + (item.quantity || 1);
            } else {
              cart.push({ ...item, productId });
            }
          } else {
            /* customized → always new row */
            cart.push({
              ...item,
              id: `${itemType}-${productId}-${Date.now()}`,
              productId,
            });
          }

          writeGuestCart(cart);
          setCartItems(cart);
          dispatchCartEvents();
          return { success: true };
        }
      } catch {
        setError("Failed to add item to cart.");
        return { error: "Failed to add item to cart." };
      } finally {
        setBusy(false);
      }
    },
    [isLoggedIn, busy, fetchCart]
  );

  /* ──────────────────────────────────────────────
     UPDATE CART ITEM (quantity)
  ────────────────────────────────────────────── */

  const updateCartItem = useCallback(
    async (cartItemId, quantity) => {
      if (busy) return { error: "Please wait..." };
      setBusy(true);
      setError(null);

      try {
        if (isLoggedIn) {
          const result = await updateServerCartItem(cartItemId, quantity);
          if (result?.error) {
            setError(result.error);
            return result;
          }
          /* optimistic update */
          setCartItems((prev) =>
            prev.map((item) =>
              item.id === cartItemId ? { ...item, quantity } : item
            )
          );
          dispatchCartEvents();
          return { success: true };
        } else {
          /* guest: update by array index (cartItemId = index for guests) */
          const cart = [...cartItems];
          if (cart[cartItemId]) {
            cart[cartItemId] = { ...cart[cartItemId], quantity };
            writeGuestCart(cart);
            setCartItems(cart);
            dispatchCartEvents();
          }
          return { success: true };
        }
      } catch {
        setError("Failed to update item.");
        return { error: "Failed to update item." };
      } finally {
        setBusy(false);
      }
    },
    [isLoggedIn, busy, cartItems]
  );

  /* ──────────────────────────────────────────────
     REMOVE CART ITEM
  ────────────────────────────────────────────── */

  const removeCartItem = useCallback(
    async (cartItemId) => {
      if (busy) return { error: "Please wait..." };
      setBusy(true);
      setError(null);

      try {
        if (isLoggedIn) {
          const result = await removeServerCartItem(cartItemId);
          if (result?.error) {
            setError(result.error);
            return result;
          }
          /* optimistic remove */
          setCartItems((prev) => prev.filter((item) => item.id !== cartItemId));
          dispatchCartEvents();
          return { success: true };
        } else {
          /* guest: remove by index */
          const cart = cartItems.filter((_, idx) => idx !== cartItemId);
          writeGuestCart(cart);
          setCartItems(cart);
          dispatchCartEvents();
          return { success: true };
        }
      } catch {
        setError("Failed to remove item.");
        return { error: "Failed to remove item." };
      } finally {
        setBusy(false);
      }
    },
    [isLoggedIn, busy, cartItems]
  );

  /* ──────────────────────────────────────────────
     CLEAR CART
  ────────────────────────────────────────────── */

  const clearCartAction = useCallback(
    async () => {
      if (busy) return { error: "Please wait..." };
      setBusy(true);
      setError(null);

      try {
        if (isLoggedIn) {
          const result = await clearServerCart();
          if (result?.error) {
            setError(result.error);
            return result;
          }
        }
        setCartItems([]);
        clearGuestCartStorage();
        dispatchCartEvents();
        return { success: true };
      } catch {
        setError("Failed to clear cart.");
        return { error: "Failed to clear cart." };
      } finally {
        setBusy(false);
      }
    },
    [isLoggedIn, busy]
  );

  /* ──────────────────────────────────────────────
     DERIVED VALUES
  ────────────────────────────────────────────── */

  const cartCount = cartItems.length;

  const cartSubtotal = cartItems.reduce((sum, item) => {
    const price = Number(item.price || 0);
    const qty = Number(item.quantity || 1);
    return sum + price * qty;
  }, 0);

  /* ──────────────────────────────────────────────
     CONTEXT VALUE
  ────────────────────────────────────────────── */

  const contextValue = {
    cartItems,
    cartCount,
    cartSubtotal,
    loading,
    error,
    busy,

    fetchCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart: clearCartAction,
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

/*
|--------------------------------------------------------------------------
| useCart Hook
|--------------------------------------------------------------------------
*/

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
};

export default CartContext;
