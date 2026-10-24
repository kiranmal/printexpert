const FAVORITES_KEY = "printExpertFavorites";

/* =====================================================
   FAVORITES (client-side preference only —
   product catalog is NOT stored in localStorage,
   API/DB is the source of truth)
===================================================== */

export const getFavorites = () => {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(FAVORITES_KEY) || "[]"
    );

    return Array.isArray(parsed)
      ? parsed.filter((f) => f && typeof f === "object")
      : [];
  } catch {
    return [];
  }
};

export const isFavorite = (productId) =>
  getFavorites().some(
    (f) => String(f?.id) === String(productId)
  );

/* pass the product object — favorites store the
   full product snapshot they were created from */
export const toggleFavorite = (product) => {
  if (!product || product.id === undefined) return false;

  const favorites = getFavorites();

  const exists = favorites.some(
    (f) => String(f?.id) === String(product.id)
  );

  const updated = exists
    ? favorites.filter(
        (f) => String(f?.id) !== String(product.id)
      )
    : [...favorites, product];

  localStorage.setItem(
    FAVORITES_KEY,
    JSON.stringify(updated)
  );

  window.dispatchEvent(new Event("printExpertFavoritesUpdated"));

  return !exists;
};

export const clearFavorites = () => {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([]));
  window.dispatchEvent(new Event("printExpertFavoritesUpdated"));
};
