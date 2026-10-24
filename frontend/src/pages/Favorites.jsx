import { useEffect, useState } from "react";
import { Heart, ShoppingCart, ArrowRight, Trash2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  loadFavorites as loadStoredFavorites,
  removeFavorite as removeStoredFavorite,
} from "../services/favoritesApi";
import {
  fetchProductById,
  saveCustomizeSelection,
} from "../services/productApi";
import { useCart } from "../context/CartContext";
import "./Favorites.css";

function Favorites() {
  const navigate = useNavigate();
  const { addToCart: contextAddToCart } = useCart();

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartToast, setCartToast] = useState("");
  const [addingId, setAddingId] = useState(null);

  /* =====================================================
     LOAD FAVORITES — server for logged-in, localStorage
     for guests; images re-hydrated from the product API
     when the stored snapshot has none (dataURL images are
     kept out of localStorage to stay under quota)
  ===================================================== */

  const loadFavorites = async () => {
    const list = await loadStoredFavorites();
    setFavorites(Array.isArray(list) ? list : []);
    setLoading(false);

    /* hydrate missing images from the API */
    const missing = (Array.isArray(list) ? list : []).filter(
      (f) => f && !f.image && !f.images?.length
    );
    if (!missing.length) return;

    const hydrated = await Promise.all(
      missing.map(async (f) => {
        try {
          const p = await fetchProductById(f.id);
          return p?.image || p?.images?.[0]
            ? {
                ...f,
                image: p.image || p.images[0],
              }
            : f;
        } catch {
          return f;
        }
      })
    );

    setFavorites((prev) =>
      prev.map((f) => {
        const h = hydrated.find(
          (x) => String(x.id) === String(f.id)
        );
        return h || f;
      })
    );
  };

  /* =====================================================
     INITIAL LOAD + LISTENER
  ===================================================== */

  useEffect(() => {
    loadFavorites();

    const handleFavoritesUpdate = () => {
      loadFavorites();
    };

    window.addEventListener(
      "printExpertFavoritesUpdated",
      handleFavoritesUpdate
    );

    window.addEventListener(
      "storage",
      handleFavoritesUpdate
    );

    return () => {
      window.removeEventListener(
        "printExpertFavoritesUpdated",
        handleFavoritesUpdate
      );

      window.removeEventListener(
        "storage",
        handleFavoritesUpdate
      );
    };
  }, []);

  /* =====================================================
     ADD TO CART — stays on the page; success shows a
     toast. Stock checked before dispatch; server rules
     still apply for edge cases.
  ===================================================== */

  const addFavoriteToCart = async (product) => {
    if (addingId === product.id) return; /* no double-add */

    if (
      product.stock !== undefined &&
      Number(product.stock) <= 0
    ) {
      alert(`"${product.name}" is out of stock.`);
      return;
    }

    setAddingId(product.id);

    try {
      const res = await contextAddToCart({
        productId: product.id,
        product_id: product.id,
        originalProductId: product.id,
        name: product.name,
        image: product.image || product.images?.[0] || "",
        price: Number(product.price || 0),
        quantity: 1,
        isCustomized: false,
      });

      if (res?.success) {
        setCartToast(`"${product.name}" added to cart`);
        setTimeout(() => setCartToast(""), 2500);
      } else {
        alert(
          res?.error ||
            "Cart me add nahi ho paya. Please try again."
        );
      }
    } catch {
      alert("Cart service unreachable. Please try again.");
    } finally {
      setAddingId(null);
    }
  };

  /* =====================================================
     REMOVE FAVORITE
  ===================================================== */

  const removeFavorite = (id) => {
    setFavorites(
      favorites.filter(
        (product) =>
          String(product.id) !== String(id)
      )
    );

    removeStoredFavorite(id);
  };

  /* =====================================================
     PRODUCT CLICK
  ===================================================== */

  /* customizable products saved via Save Design reopen in
     the EDITOR — the draft prompt restores their design;
     plain products open the details page */
  const openProduct = (product) => {
    const customizable =
      product.customizable ||
      product.customizationType ||
      product.isCustomizable;

    if (customizable) {
      saveCustomizeSelection(product);
      navigate("/customize");
      return;
    }

    navigate(`/product/${product.id}`, {
      state: {
        product,
      },
    });
  };

  /* =====================================================
     RETURN
  ===================================================== */

  return (
    <main className="favorites-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <section className="favorites-header">

        <div>

          <span className="favorites-label">
            YOUR COLLECTION
          </span>

          <h1>
            My Favorites
          </h1>

          <p>
            Products you love and want to
            keep for later.
          </p>

        </div>

        <div className="favorites-count">

          <Heart size={20} />

          <strong>
            {favorites.length}
          </strong>

          <span>
            Saved Items
          </span>

        </div>

      </section>


      {/* =================================================
          EMPTY FAVORITES
      ================================================= */}

      {loading ? (
        /* skeleton while the server/local list loads */
        <section className="favorites-products">
          <div className="favorites-grid">
            {[1, 2, 3].map((i) => (
              <article
                className="favorite-card fav-skeleton"
                key={i}
              >
                <div className="skeleton-img" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </article>
            ))}
          </div>
        </section>
      ) : favorites.length === 0 ? (

        <section className="empty-favorites">

          <div className="empty-heart">
            <Heart size={42} />
          </div>

          <h2>
            No Favorites Yet
          </h2>

          <p>
            You haven't added any products
            to your favorites.
          </p>

          <button
            onClick={() =>
              navigate("/")
            }
          >
            Explore Products

            <ArrowRight size={18} />

          </button>

        </section>

      ) : (

        /* =================================================
           FAVORITES GRID
        ================================================= */

        <section className="favorites-products">

          <div className="favorites-grid">

            {favorites.map((product) => (

              <article
                className="favorite-card"
                key={product.id}
              >

                {/* IMAGE */}

                <div
                  className="favorite-image"
                  onClick={() =>
                    openProduct(product)
                  }
                >

                  <img
                    src={
                      product.images?.[0] ||
                      product.image ||
                      "https://via.placeholder.com/600x500?text=Product"
                    }
                    alt={
                      product.name ||
                      "Product"
                    }
                  />

                  {product.badge && (
                    <span className="favorite-badge">
                      {product.badge}
                    </span>
                  )}

                </div>


                {/* REMOVE */}

                <button
                  type="button"
                  className="remove-favorite"
                  onClick={() =>
                    removeFavorite(product.id)
                  }
                  title="Remove from favorites"
                >
                  <Trash2 size={17} />
                </button>


                {/* CONTENT */}

                <div className="favorite-content">

                  <span className="favorite-category">
                    {product.category ||
                      "General"}
                  </span>

                  <h3
                    onClick={() =>
                      openProduct(product)
                    }
                  >
                    {product.name ||
                      "Untitled Product"}
                  </h3>

                  <div className="favorite-rating">

                    <span>
                      ★★★★★
                    </span>

                    <small>
                      ({product.reviews || 0})
                    </small>

                  </div>

                  <p>
                    {product.description ||
                      "Premium quality customized product made for your brand and business."}
                  </p>


                  {/* PRICE */}

                  <div className="favorite-bottom">

                    <div className="favorite-price">

                      <strong>
                        ₹
                        {Number(
                          product.price || 0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                      {Number(
                        product.oldPrice || 0
                      ) >
                        Number(
                          product.price || 0
                        ) && (

                        <del>
                          ₹
                          {Number(
                            product.oldPrice
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </del>

                      )}

                    </div>


                    <div className="favorite-actions">

                      <button
                        type="button"
                        className="view-product-btn"
                        onClick={() =>
                          openProduct(product)
                        }
                      >
                        <Eye
                          size={17}
                        />

                        View

                      </button>

                      {Number(product.stock ?? 1) > 0 ? (
                        <button
                          type="button"
                          className="fav-cart-btn"
                          disabled={
                            addingId === product.id
                          }
                          onClick={() =>
                            addFavoriteToCart(product)
                          }
                        >
                          <ShoppingCart size={15} />

                          {addingId === product.id
                            ? "Adding…"
                            : "Add to Cart"}
                        </button>
                      ) : (
                        <span className="fav-oos">
                          Out of stock
                        </span>
                      )}

                    </div>

                  </div>

                </div>

              </article>

            ))}

          </div>

        </section>

      )}

      {/* cart success toast */}
      {cartToast && (
        <div className="fav-toast">
          <ShoppingCart size={15} />
          <span>{cartToast}</span>
        </div>
      )}

    </main>
  );
}

export default Favorites;