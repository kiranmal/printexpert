/**
 * favoritesApi.js — favourites storage.
 * Guests  → localStorage `printExpertFavorites` (existing format)
 * Users   → server `user_favorites` table + localStorage mirror
 *           for instant UI
 */

import { API_URL } from "./apiConfig";
import { getFavorites } from "../data/productStorage";

const hasToken = () => !!localStorage.getItem("authToken");
const token = () => localStorage.getItem("authToken");

const notify = () =>
  window.dispatchEvent(new Event("printExpertFavoritesUpdated"));

/* keep favourites light — dataURL product images blow the
   5MB localStorage quota */
export const leanFavorite = (p) => {
  const ok = (i) => i && String(i).length < 5000;
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category,
    customizationType: p.customizationType,
    customizable: true,
    image: ok(p.image) ? p.image : "",
    images: Array.isArray(p.images)
      ? p.images.filter(ok).slice(0, 6)
      : [],
    badge: p.badge || undefined,
  };
};

const writeLocal = (list, dispatch = true) => {
  try {
    localStorage.setItem("printExpertFavorites", JSON.stringify(list));
  } catch {
    /* quota — non-fatal, server copy still exists */
  }
  /* notify only for user actions — firing the event during
     a LOAD causes an infinite load→write→event→load loop
     that makes the Favorites cards flicker nonstop */
  if (dispatch) notify();
};

/** Add a product to favourites. Returns true on success. */
export async function addFavorite(product) {
  if (!product?.id) return false;

  /* local mirror first — instant UI */
  const list = getFavorites();
  if (!list.some((f) => String(f?.id) === String(product.id))) {
    writeLocal([...list, leanFavorite(product)]);
  } else {
    notify();
  }

  if (!hasToken()) return true;

  try {
    const res = await fetch(`${API_URL}/favorites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
      },
      body: JSON.stringify({
        productId: product.id,
        /* server copy: lean product but keep ONE display
           image — full images[] arrays hold multi-MB
           dataURLs and make the list API slow */
        snapshot: {
          ...product,
          image:
            product.image ||
            product.images?.[0] ||
            "",
          images: [],
        },
      }),
    });
    return res.ok;
  } catch {
    return false; /* local copy still saved */
  }
}

/** Remove a favourite. */
export async function removeFavorite(productId) {
  const list = getFavorites().filter(
    (f) => String(f?.id) !== String(productId)
  );
  writeLocal(list);

  if (!hasToken()) return;
  try {
    await fetch(
      `${API_URL}/favorites/${encodeURIComponent(productId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      }
    );
  } catch { /* non-fatal */ }
}

/**
 * Unified toggle — adds or removes based on current state.
 * UI should update optimistically; on server failure the
 * local mirror rolls back so the heart returns to its
 * previous state. Returns { added, ok }.
 */
export async function toggleFavoriteServer(product) {
  if (!product?.id) return { added: false, ok: false };

  const list = getFavorites();
  const exists = list.some(
    (f) => String(f?.id) === String(product.id)
  );

  if (exists) {
    writeLocal(
      list.filter((f) => String(f?.id) !== String(product.id))
    );
    if (!hasToken()) return { added: false, ok: true };

    try {
      const res = await fetch(
        `${API_URL}/favorites/${encodeURIComponent(product.id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token()}` },
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { added: false, ok: true };
    } catch {
      writeLocal(list, false); /* roll back the heart */
      return { added: true, ok: false };
    }
  }

  writeLocal([...list, leanFavorite(product)]);
  if (!hasToken()) return { added: true, ok: true };

  try {
    const res = await fetch(`${API_URL}/favorites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
      },
      body: JSON.stringify({
        productId: product.id,
        snapshot: {
          ...product,
          image: product.image || product.images?.[0] || "",
          images: [],
        },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { added: true, ok: true };
  } catch {
    writeLocal(list, false);
    return { added: false, ok: false };
  }
}

/**
 * Load favourites: server list for logged-in (authoritative),
 * localStorage for guests. Also syncs the local mirror.
 */
export async function loadFavorites() {
  if (!hasToken()) return getFavorites();
  try {
    const res = await fetch(`${API_URL}/favorites`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && Array.isArray(data.favorites)) {
      /* merge with any local-only entries (e.g. saved while
         offline) then mirror locally */
      const local = getFavorites();
      const ids = new Set(
        data.favorites.map((f) => String(f.id))
      );
      const merged = [
        ...data.favorites,
        ...local.filter((f) => !ids.has(String(f.id))),
      ];
      writeLocal(merged, false);
      return merged;
    }
  } catch { /* offline — use local */ }
  return getFavorites();
}

/** After login: push local favourites to the account. */
export async function mergeLocalFavoritesToServer() {
  if (!hasToken()) return;
  const local = getFavorites();
  if (!local.length) return;
  try {
    const res = await fetch(`${API_URL}/favorites/merge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
      },
      body: JSON.stringify({
        favorites: local.map((f) => ({
          productId: f.id,
          snapshot: f,
        })),
      }),
    });
    /* keep local mirror — server is now authoritative for
       reads anyway */
    if (res.ok) notify();
  } catch { /* retry next login */ }
}
