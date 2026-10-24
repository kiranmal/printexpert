import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "./Navbar.css";
import printExpertLogo from "../assets/logo-mark.png";

import { fetchProducts, isActiveProduct } from "../services/productApi";
import { fetchCategories } from "../services/categoryApi";
import { fetchActiveCoupons } from "../services/couponApi";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

/* =====================================================
   CATEGORIES (fallback — API se load hoti hain)
===================================================== */

const defaultCategories = [
  {
    name: "Visiting Cards",
    items: [
      "Premium Business Cards",
      "Standard Cards",
      "Matte Cards",
      "Glossy Cards",
    ],
  },

  {
    name: "Stationery & Office",
    items: [
      "Letterheads",
      "Notebooks",
      "Envelopes",
      "Office Files",
      "Stamps",
    ],
  },

  {
    name: "Marketing Materials",
    items: [
      "Flyers",
      "Brochures",
      "Posters",
      "Leaflets",
      "Calendars",
    ],
  },

  {
    name: "Stickers & Labels",
    items: [
      "Product Labels",
      "Vinyl Stickers",
      "Round Stickers",
      "Packaging Labels",
    ],
  },

  {
    name: "Packaging",
    items: [
      "Paper Bags",
      "Boxes",
      "Food Packaging",
      "Product Packaging",
    ],
  },

  {
    name: "Clothing & Bags",
    items: [
      "T-Shirts",
      "Caps",
      "Tote Bags",
      "Corporate Bags",
    ],
  },

  {
    name: "Mugs & Gifts",
    items: [
      "Coffee Mugs",
      "Photo Mugs",
      "Keychains",
      "Corporate Gifts",
    ],
  },

  {
    name: "Pens & Drinkware",
    items: [
      "Ball Pens",
      "Premium Pens",
      "Water Bottles",
      "Travel Mugs",
    ],
  },

  {
    name: "Custom Polo T-Shirts",
    items: [
      "Corporate Polo",
      "Printed Polo",
      "Custom T-Shirts",
    ],
  },
];

/* =====================================================
   SEARCH ICON
===================================================== */

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="nav-svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

/* =====================================================
   USER ICON
===================================================== */

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="nav-svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21c.7-4.2 3.3-6.5 8-6.5s7.3 2.3 8 6.5" />
    </svg>
  );
}

/* =====================================================
   HEART ICON
===================================================== */

function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="nav-svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20.8 8.8c0 5.5-8.8 10.2-8.8 10.2S3.2 14.3 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z" />
    </svg>
  );
}

/* =====================================================
   CART ICON
===================================================== */

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="nav-svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 4h2l2.1 11h10.7L21 7H6" />

      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
    </svg>
  );
}

/* =====================================================
   MENU ICON
===================================================== */

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="nav-svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

/* =====================================================
   NAVBAR
===================================================== */

function Navbar() {
  const navigate = useNavigate();

  const { user, isLoggedIn, logout } =
    useAuth();

  const { cartCount: contextCartCount } =
    useCart();

  /* =====================================================
     CATEGORY STATES
  ===================================================== */

  const [openCategory, setOpenCategory] = useState(null);

  const [mobileMenu, setMobileMenu] = useState(false);

  const [categories, setCategories] =
    useState(defaultCategories);

  /* Admin ke live coupons — offer bar mein */
  const [liveCoupons, setLiveCoupons] =
    useState([]);

  const [couponIndex, setCouponIndex] =
    useState(0);

  /* Overflow — jo categories fit na hon wo More menu mein jaati hain */
  const listRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(
    defaultCategories.length
  );

  /* =====================================================
     SEARCH STATES
  ===================================================== */

  const [searchText, setSearchText] = useState("");

  const [products, setProducts] = useState([]);

  const [showSearchResults, setShowSearchResults] =
    useState(false);

  const [mobileSearchOpen, setMobileSearchOpen] =
    useState(false);

  const [searchLoading, setSearchLoading] =
    useState(false);

  const searchRequestIdRef = useRef(0);
  const lastSearchRef = useRef("");

  /* =====================================================
     CART COUNT
  ===================================================== */

  const [cartCount, setCartCount] = useState(contextCartCount);

  /* =====================================================
     FAVORITE COUNT
  ===================================================== */

  const [favoriteCount, setFavoriteCount] =
    useState(0);

  /* =====================================================
     MY ACCOUNT DROPDOWN
  ===================================================== */

  const [accountMenuOpen, setAccountMenuOpen] =
    useState(false);

  /* =====================================================
     LOAD PRODUCTS
  ===================================================== */

  const loadProducts = async (search = "") => {
    const requestId = ++searchRequestIdRef.current;

    setSearchLoading(true);
    setProducts([]);

    try {
      const list = await fetchProducts(search);

      /* stale response ignore */
      if (requestId !== searchRequestIdRef.current) {
        return;
      }

      setProducts(
        Array.isArray(list)
          ? list.filter(isActiveProduct).slice(0, 8)
          : []
      );
    } catch (error) {
      console.error(
        "Search products loading error:",
        error
      );

      if (requestId !== searchRequestIdRef.current) {
        return;
      }

      setProducts([]);
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setSearchLoading(false);
      }
    }
  };

  /* =====================================================
   INITIAL LOAD
===================================================== */

useEffect(() => {
  loadProducts();

  const loadCategories = async () => {
    const list = await fetchCategories();
    setCategories(list);
  };

  loadCategories();

  /* Live coupons — admin panel se */
  fetchActiveCoupons().then(setLiveCoupons);

  const handleProductsUpdate = () => {
    loadProducts();
  };

  window.addEventListener(
    "printExpertProductsUpdated",
    handleProductsUpdate
  );

  return () => {
    window.removeEventListener(
      "printExpertProductsUpdated",
      handleProductsUpdate
    );
  };
}, []);


/* =====================================================
   SEARCH PRODUCTS
===================================================== */

useEffect(() => {
  const search = searchText.trim();

  if (!search) {
    return;
  }

  /* same query pe duplicate API call avoid */
  if (search === lastSearchRef.current) {
    return;
  }

  const timer = setTimeout(() => {
    lastSearchRef.current = search;
    loadProducts(search);
  }, 300);

  return () => clearTimeout(timer);
}, [searchText]);

  /* =====================================================
     OFFER BAR — live coupon rotate (multiple hone pe)
  ===================================================== */

  useEffect(() => {
    if (liveCoupons.length < 2) return;

    const timer = setInterval(() => {
      setCouponIndex(
        (i) => (i + 1) % liveCoupons.length
      );
    }, 5000);

    return () => clearInterval(timer);
  }, [liveCoupons.length]);

  const liveCoupon =
    liveCoupons[couponIndex] || null;

  /* =====================================================
     CATEGORY OVERFLOW — fit hone wale count ko measure karo
  ===================================================== */

  useEffect(() => {
    const computeVisible = () => {
      const list = listRef.current;
      if (!list) return;

      /* Tablet/mobile menu mein sab dikhte hain */
      if (window.innerWidth <= 1200) {
        setVisibleCount(categories.length);
        return;
      }

      const items =
        list.querySelectorAll("[data-cat]");
      const containerWidth = list.clientWidth;
      const MORE_WIDTH = 120;

      const fits = (limit) => {
        let used = 0;
        for (let i = 0; i < items.length; i++) {
          if (i >= limit) break;
          used += items[i].offsetWidth;
        }
        return used <= containerWidth;
      };

      if (fits(items.length)) {
        setVisibleCount(items.length);
        return;
      }

      let count = 0;
      let used = 0;
      for (let i = 0; i < items.length; i++) {
        used += items[i].offsetWidth;
        if (used > containerWidth - MORE_WIDTH) {
          break;
        }
        count = i + 1;
      }
      setVisibleCount(count);
    };

    computeVisible();

    const observer = new ResizeObserver(
      computeVisible
    );
    if (listRef.current) {
      observer.observe(listRef.current);
    }
    window.addEventListener("resize", computeVisible);

    return () => {
      observer.disconnect();
      window.removeEventListener(
        "resize",
        computeVisible
      );
    };
  }, [categories]);

  /* =====================================================
     SEARCH RESULTS
  ===================================================== */

  const searchResults =
  searchText.trim().length === 0
    ? []
    : products.slice(0, 8);

  /* =====================================================
     SEARCH INPUT
  ===================================================== */

  const handleSearchChange = (e) => {
    const value = e.target.value;

    setSearchText(value);

    setShowSearchResults(
      value.trim().length > 0
    );
  };

  /* =====================================================
     SEARCH SUBMIT
  ===================================================== */

  const handleSearchSubmit = (e) => {
    e.preventDefault();

    const query = searchText.trim();

    if (!query) return;

    setShowSearchResults(false);

    navigate(
      `/category?search=${encodeURIComponent(
        query
      )}`
    );
  };

  /* =====================================================
     OPEN PRODUCT
  ===================================================== */

  const handleProductClick = (product) => {
    setSearchText("");

    setShowSearchResults(false);

    navigate(
      `/product/${product.id}`
    );
  };

  /* =====================================================
     CART COUNT
  ===================================================== */

  const updateCartCount = () => {
    /* CartContext is the source of truth; keep legacy
       localStorage fallback for cross-tab / transition */
    setCartCount(contextCartCount);
  };

  /* sync from CartContext whenever it changes */
  useEffect(() => {
    setCartCount(contextCartCount);
  }, [contextCartCount]);

  /* =====================================================
     FAVORITE COUNT
  ===================================================== */

  const updateFavoriteCount = () => {
    try {
      const savedFavorites =
        localStorage.getItem(
          "printExpertFavorites"
        );

      const favorites =
        savedFavorites
          ? JSON.parse(savedFavorites)
          : [];

      setFavoriteCount(
        Array.isArray(favorites)
          ? favorites.length
          : 0
      );
    } catch (error) {
      console.error(
        "Favorite count error:",
        error
      );

      setFavoriteCount(0);
    }
  };

  /* =====================================================
     CART + FAVORITE LISTENERS
  ===================================================== */

  useEffect(() => {
    updateCartCount();

    updateFavoriteCount();

    const handleCartUpdate = () => {
      updateCartCount();
    };

    const handleFavoriteUpdate = () => {
      updateFavoriteCount();
    };

    window.addEventListener(
      "printExpertCartUpdated",
      handleCartUpdate
    );

    window.addEventListener(
      "cartUpdated",
      handleCartUpdate
    );

    window.addEventListener(
      "printExpertFavoritesUpdated",
      handleFavoriteUpdate
    );

    window.addEventListener(
      "storage",
      handleCartUpdate
    );

    window.addEventListener(
      "storage",
      handleFavoriteUpdate
    );

    return () => {
      window.removeEventListener(
        "printExpertCartUpdated",
        handleCartUpdate
      );

      window.removeEventListener(
        "cartUpdated",
        handleCartUpdate
      );

      window.removeEventListener(
        "printExpertFavoritesUpdated",
        handleFavoriteUpdate
      );

      window.removeEventListener(
        "storage",
        handleCartUpdate
      );

      window.removeEventListener(
        "storage",
        handleFavoriteUpdate
      );
    };
  }, []);

  /* =====================================================
     CLOSE SEARCH ON OUTSIDE CLICK
  ===================================================== */

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        !e.target.closest(
          ".search-wrapper"
        )
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  /* =====================================================
     MY ACCOUNT - CLOSE ON OUTSIDE CLICK
  ===================================================== */

  useEffect(() => {
    const handleAccountOutsideClick = (e) => {
      if (
        !e.target.closest(
          ".account-wrapper"
        )
      ) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleAccountOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleAccountOutsideClick
      );
    };
  }, []);

  /* =====================================================
     DESKTOP CATEGORY
  ===================================================== */

  const handleCategoryMouseEnter = (
    index
  ) => {
    if (window.innerWidth > 768) {
      setOpenCategory(index);
    }
  };

  const handleCategoryMouseLeave = () => {
    if (window.innerWidth > 768) {
      setOpenCategory(null);
    }
  };

  /* =====================================================
     MOBILE CATEGORY
  ===================================================== */

  const handleCategoryClick = (
    index
  ) => {
    if (window.innerWidth <= 768) {
      setOpenCategory(
        openCategory === index
          ? null
          : index
      );
    } else {
      navigate(
        `/category?category=${encodeURIComponent(
          categories[index].name
        )}`
      );
      setOpenCategory(null);
    }
  };

  /* =====================================================
     CART
  ===================================================== */

  const handleCartClick = () => {
    navigate("/cart");
  };

  /* =====================================================
     FAVORITES
  ===================================================== */

  const handleFavoritesClick = () => {
    navigate("/favorites");
  };

  /* =====================================================
     PROFILE
  ===================================================== */

  const handleProfileClick = () => {
    navigate("/profile");
  };

  /* =====================================================
     LOGOUT
  ===================================================== */

  const handleLogout = () => {
    logout();

    setAccountMenuOpen(false);

    navigate("/");
  };

  /* =====================================================
     PRODUCT LINK
  ===================================================== */

  const getProductLink = (item) => {
    return `/category?type=${encodeURIComponent(
      item
    )}`;
  };

  /* =====================================================
     RETURN
  ===================================================== */

  return (
    <>
      {/* =================================================
          TOP BAR
      ================================================= */}

      <div className="top-bar">
        <div className="top-left">
          <span>☎ +91 9123456789</span>

          <span className="top-divider"></span>

          <span>
            ✉ support@printexpert.com
          </span>
        </div>

        <div className="top-right">
          <span>♧ Help & Support</span>

          <span>🚚 Track Order</span>

          <span>♧ Bulk Order</span>
        </div>
      </div>

      {/* =================================================
          MAIN NAVBAR
      ================================================= */}

      <header className="main-navbar">
        <div className="nav-main">

          {/* LOGO */}

          <Link
            to="/"
            className="brand"
          >
            <img
              src={printExpertLogo}
              alt="Print Expert Logo"
              className="brand-logo"
            />

            <div className="brand-content">
              <h1>
                PRINT <b>EXPERT</b>
              </h1>

              <span>
                Printing Solutions, Perfect Results
              </span>
            </div>
          </Link>

          {/* =================================================
              SEARCH
          ================================================= */}

          <div className="search-wrapper">

            <form
              className="search-box"
              onSubmit={
                handleSearchSubmit
              }
            >
              <input
                type="text"
                value={searchText}
                onChange={
                  handleSearchChange
                }
                onFocus={() => {
                  if (
                    searchText.trim()
                  ) {
                    setShowSearchResults(
                      true
                    );
                  }
                }}
                placeholder="Search for products, categories and more..."
                autoComplete="off"
              />

              <button
                type="submit"
                aria-label="Search"
              >
                <SearchIcon />
              </button>
            </form>

            {/* =================================================
                SEARCH RESULTS
            ================================================= */}

            {showSearchResults &&
              searchText.trim() && (
                <div className="search-results-dropdown">

                  {searchLoading ? (

                    <div className="search-loading">
                      Searching...
                    </div>

                  ) : searchResults.length >
                  0 ? (
                    <>
                      <div className="search-results-header">
                        <span>
                          Related Products
                        </span>

                        <small>
                          {
                            searchResults.length
                          } found
                        </small>
                      </div>

                      {searchResults.map(
                        (product) => (
                          <button
                            type="button"
                            className="search-product-item"
                            key={
                              product.id
                            }
                            onClick={() =>
                              handleProductClick(
                                product
                              )
                            }
                          >

                            <div className="search-product-image">
                              <img
                                src={
                                  product
                                    .images
                                    ?.length
                                    ? product
                                        .images[0]
                                    : product.image ||
                                      "https://via.placeholder.com/80x80?text=Product"
                                }
                                alt={
                                  product.name
                                }
                              />
                            </div>

                            <div className="search-product-info">

                              <strong>
                                {
                                  product.name
                                }
                              </strong>

                              <span>
                                {
                                  product.category ||
                                  "General"
                                }
                              </span>

                              <b>
                                ₹
                                {Number(
                                  product.price ||
                                    0
                                ).toLocaleString(
                                  "en-IN"
                                )}
                              </b>

                            </div>

                          </button>
                        )
                      )}

                      <button
                        type="button"
                        className="search-view-all"
                        onClick={() => {
                          setShowSearchResults(
                            false
                          );

                          navigate(
                            `/category?search=${encodeURIComponent(
                              searchText.trim()
                            )}`
                          );
                        }}
                      >
                        View all search results →
                      </button>
                    </>
                  ) : (
                    <div className="search-no-results">

                      <div className="search-no-results-icon">
                        🔍
                      </div>

                      <strong>
                        No products found
                      </strong>

                      <span>
                        Try another product
                        name or category.
                      </span>

                    </div>
                  )}

                </div>
              )}
          </div>

          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="nav-actions">

            {/* MOBILE SEARCH TOGGLE */}

            <button
              type="button"
              className="nav-action navbar-search-btn"
              onClick={() =>
                setMobileSearchOpen(!mobileSearchOpen)
              }
              aria-label="Search"
            >
              <SearchIcon />
            </button>

            {/* FAVORITES */}

            <button
              type="button"
              className="nav-action navbar-favorite-btn"
              onClick={
                handleFavoritesClick
              }
              aria-label={`Favorites with ${favoriteCount} items`}
            >
              <HeartIcon />

              <span>
                Favorites
              </span>

              {favoriteCount > 0 && (
                <b className="navbar-favorite-badge">
                  {favoriteCount}
                </b>
              )}
            </button>

            {/* CART */}

            <button
              type="button"
              className="nav-action navbar-cart-btn"
              onClick={
                handleCartClick
              }
              aria-label={`Cart with ${cartCount} items`}
            >
              <CartIcon />

              <span>
                Cart
              </span>

              {cartCount > 0 && (
                <b className="navbar-cart-badge">
                  {cartCount}
                </b>
              )}
            </button>

            {/* MY ACCOUNT */}

            <div
              className={`account-wrapper ${
                accountMenuOpen
                  ? "account-open"
                  : ""
              }`}
            >
              <button
                type="button"
                className="my-account-btn"
                onClick={() => {
                  setAccountMenuOpen(
                    !accountMenuOpen
                  );
                  setShowSearchResults(false);
                }}
                aria-expanded={
                  accountMenuOpen
                }
                aria-haspopup="menu"
              >
                <span className="account-icon">
                  <UserIcon />
                </span>

                <span className="account-label">
                  {isLoggedIn && user?.name
                    ? `Hi, ${user.name
                        .split(" ")[0]}`
                    : "My Account"}
                </span>

                <span
                  className={`account-chevron ${
                    accountMenuOpen
                      ? "account-chevron-up"
                      : ""
                  }`}
                >
                  ⌃
                </span>
              </button>

              {accountMenuOpen && (
                <div
                  className="account-dropdown"
                  role="menu"
                >
                  {isLoggedIn ? (
                    <>
                      {/* LOGGED-IN USER INFO */}

                      <div className="account-user-info">
                        <div className="account-avatar">
                          {(
                            user?.name ||
                            "U"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="account-user-text">
                          <strong>
                            {user?.name ||
                              "User"}
                          </strong>

                          <small>
                            {user?.email ||
                              ""}
                          </small>
                        </div>
                      </div>

                      <div className="account-menu-divider"></div>

                      <Link
                        to="/profile"
                        className="account-menu-item"
                        role="menuitem"
                        onClick={() =>
                          setAccountMenuOpen(
                            false
                          )
                        }
                      >
                        <span className="account-menu-icon">
                          <UserIcon />
                        </span>

                        <span>
                          My Profile
                        </span>
                      </Link>

                      <div className="account-menu-divider"></div>

                      <button
                        type="button"
                        className="account-menu-item account-logout"
                        role="menuitem"
                        onClick={handleLogout}
                      >
                        <span className="account-menu-icon">
                          ⎋
                        </span>

                        <span>
                          Logout
                        </span>
                      </button>
                    </>
                  ) : (
                    <>
                      {/* LOGGED-OUT OPTIONS */}

                      <Link
                        to="/login"
                        className="account-menu-item"
                        role="menuitem"
                        onClick={() =>
                          setAccountMenuOpen(
                            false
                          )
                        }
                      >
                        <span className="account-menu-icon">
                          <UserIcon />
                        </span>

                        <span>
                          Sign In
                        </span>
                      </Link>

                      <Link
                        to="/signup"
                        className="account-menu-item"
                        role="menuitem"
                        onClick={() =>
                          setAccountMenuOpen(
                            false
                          )
                        }
                      >
                        <span className="account-menu-icon account-add-icon">
                          <UserIcon />
                          <small>+</small>
                        </span>

                        <span>
                          Sign Up
                        </span>
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* MOBILE MENU */}

          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => {
              setMobileMenu(
                !mobileMenu
              );

              setShowSearchResults(
                false
              );
            }}
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>

        </div>

        {/* =================================================
            MOBILE SEARCH BAR
        ================================================= */}

        {mobileSearchOpen && (
          <div className="mobile-search-bar">
            <form
              className="mobile-search-form"
              onSubmit={(e) => {
                e.preventDefault();
                const query = searchText.trim();
                if (!query) return;
                setMobileSearchOpen(false);
                setShowSearchResults(false);
                navigate(
                  `/category?search=${encodeURIComponent(query)}`
                );
              }}
            >
              <input
                type="text"
                value={searchText}
                onChange={handleSearchChange}
                placeholder="Search products..."
                autoFocus
                autoComplete="off"
              />
              <button type="submit" aria-label="Search">
                <SearchIcon />
              </button>
            </form>
          </div>
        )}

        {/* =================================================
            CATEGORY NAVBAR
        ================================================= */}

        <div
          className={`category-navbar ${
            mobileMenu
              ? "mobile-open"
              : ""
          }`}
        >

          <div
            className="category-list"
            ref={listRef}
          >

            {categories.map(
              (
                category,
                index
              ) => (
                <div
                  key={
                    category.name
                  }
                  data-cat
                  className={`category-item ${
                    index >= visibleCount
                      ? "cat-hidden"
                      : ""
                  } ${
                    openCategory ===
                    index
                      ? "category-active"
                      : ""
                  }`}
                  onMouseEnter={() =>
                    handleCategoryMouseEnter(
                      index
                    )
                  }
                  onMouseLeave={
                    handleCategoryMouseLeave
                  }
                >

                  <button
                    type="button"
                    className="category-button"
                    onClick={() =>
                      handleCategoryClick(
                        index
                      )
                    }
                  >
                    <span>
                      {
                        category.name
                      }
                    </span>

                    <span className="category-arrow">
                      ⌄
                    </span>
                  </button>

                  {openCategory ===
                    index && (
                    <div
                      className="category-dropdown"
                      onMouseEnter={() =>
                        setOpenCategory(
                          index
                        )
                      }
                      onMouseLeave={
                        handleCategoryMouseLeave
                      }
                    >

                      <div className="dropdown-title">
                        {
                          category.name
                        }
                      </div>

                      {category.items.map(
                        (item) => (
                          <Link
                            key={item}
                            to={getProductLink(
                              item
                            )}
                            onClick={() => {
                              setOpenCategory(
                                null
                              );

                              setMobileMenu(
                                false
                              );
                            }}
                          >
                            {item}
                          </Link>
                        )
                      )}

                      <Link
                        to={`/category?category=${encodeURIComponent(
                          category.name
                        )}`}
                        className="view-all"
                        onClick={() => {
                          setOpenCategory(
                            null
                          );

                          setMobileMenu(
                            false
                          );
                        }}
                      >
                        View All →
                      </Link>

                    </div>
                  )}

                </div>
              )
            )}

            {/* MORE — jo categories fit na hon */}
            {visibleCount <
              categories.length && (
              <div
                className={`category-item more-item ${
                  openCategory === "more"
                    ? "category-active"
                    : ""
                }`}
                onMouseEnter={() =>
                  handleCategoryMouseEnter(
                    "more"
                  )
                }
                onMouseLeave={
                  handleCategoryMouseLeave
                }
              >

                <button
                  type="button"
                  className="category-button"
                  onClick={() =>
                    setOpenCategory(
                      openCategory === "more"
                        ? null
                        : "more"
                    )
                  }
                >
                  <span>More</span>
                  <span className="category-arrow">
                    ⌄
                  </span>
                </button>

                {openCategory === "more" && (
                  <div
                    className="category-dropdown more-dropdown"
                    onMouseEnter={() =>
                      setOpenCategory("more")
                    }
                    onMouseLeave={
                      handleCategoryMouseLeave
                    }
                  >

                    <div className="dropdown-title">
                      More Categories
                    </div>

                    {categories
                      .slice(visibleCount)
                      .map((category) => (
                        <Link
                          key={category.name}
                          to={`/category?category=${encodeURIComponent(
                            category.name
                          )}`}
                          onClick={() => {
                            setOpenCategory(
                              null
                            );
                            setMobileMenu(
                              false
                            );
                          }}
                        >
                          {category.name}
                        </Link>
                      ))}

                  </div>
                )}

              </div>
            )}

          </div>

        </div>
      </header>

      {/* =================================================
          OFFER BAR — admin ke live coupons dikhte hain
      ================================================= */}

      <div className="offer-bar">

        <span className="offer-tag">
          SPECIAL OFFER
        </span>

        {liveCoupon ? (
          <>
            <strong>
              {liveCoupon.type === "percent"
                ? `Flat ${liveCoupon.value}% OFF`
                : `Flat ₹${liveCoupon.value} OFF`}
            </strong>

            <span>
              {liveCoupon.minOrder > 0
                ? `on Orders ₹${Number(liveCoupon.minOrder).toLocaleString("en-IN")}+`
                : "on all orders"}
            </span>

            <span>
              Use Code:
              <b>{liveCoupon.code}</b>
            </span>

            <button
              type="button"
              onClick={() =>
                navigator.clipboard?.writeText(
                  liveCoupon.code
                )
              }
            >
              Copy
            </button>
          </>
        ) : (
          <>
            <strong>
              Buy More, Save More!
            </strong>

            <span>
              Flat 5% OFF on Orders ₹10,000+
            </span>

            <span>
              Use Code:
              <b>SAVE5</b>
            </span>

            <button
              type="button"
              onClick={() =>
                navigator.clipboard?.writeText(
                  "SAVE5"
                )
              }
            >
              Copy
            </button>
          </>
        )}

      </div>
    </>
  );
}

export default Navbar;