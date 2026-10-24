
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  ArrowRight,
  ShoppingCart,
  Palette,
} from "lucide-react";

import "./Home.css";
import CustomizeProducts from "../components/CustomizeProducts";
import ContactSection from "../components/ContactSection";
import { fetchProducts, isActiveProduct, saveCustomizeSelection } from "../services/productApi";
import { useCart } from "../context/CartContext";

function Home() {
  const navigate = useNavigate();
  const { addToCart: contextAddToCart } = useCart();

  const [products, setProducts] = useState([]);
  const [favorites, setFavorites] = useState([]);

  /* =====================================================
     PRODUCT IMAGE HELPER           
  ===================================================== */

  const getProductImages = (product) => {
    if (
      Array.isArray(product?.images) &&
      product.images.length > 0
    ) {
      return product.images;
    }

    if (product?.image) {
      return [product.image];
    }

    return [
      "https://via.placeholder.com/600x500?text=Product",
    ];
  };

  /* =====================================================
     NORMALIZE PRODUCT
     
     Har product ka same structure banayega.
  ===================================================== */

  const normalizeProduct = (product, index = 0) => {
    const images =
      getProductImages(product);

    const productId =
      product?.id ||
      product?.productId ||
      `product-${index}`;

    return {
      ...product,

      id: productId,

      productId: productId,

      name:
        product?.name ||
        "Untitled Product",

      category:
        product?.category ||
        "General",

      image:
        product?.image ||
        images[0],

      images: images,

      price: Number(
        String(
          product?.price || "0"
        ).replace(/[₹,]/g, "")
      ),

      oldPrice: Number(
        String(
          product?.oldPrice ||
            product?.price ||
            "0"
        ).replace(/[₹,]/g, "")
      ),

      rating: Number(
        product?.rating || 4.8
      ),

      reviews: Number(
        product?.reviews || 0
      ),

      badge:
        product?.badge ||
        "NEW",

      description:
        product?.description ||
        "Premium quality customized product made for your brand and business.",

      paperTypes:
        Array.isArray(
          product?.paperTypes
        )
          ? product.paperTypes
          : [],

      sizes:
        Array.isArray(
          product?.sizes
        )
          ? product.sizes
          : [],

      features:
        Array.isArray(
          product?.features
        )
          ? product.features
          : [
              "Premium Quality",
              "High Quality Printing",
              "Fast Delivery",
              "100% Quality Assured",
            ],
    };
  };

  /* =====================================================
     LOAD PRODUCTS
  ===================================================== */

  const loadProducts = async () => {
    try {
      const databaseProducts = await fetchProducts();

      setProducts(
        databaseProducts
          .filter(isActiveProduct)
          .map(
            (product, index) =>
              normalizeProduct(product, index)
          )
      );
    } catch (error) {
      console.error(
        "Error loading products:",
        error
      );

      /* API is the source of truth — no static
         or localStorage catalog fallback */
      setProducts([]);
    }
  };

  /* =====================================================
     INITIAL PRODUCT LOAD
  ===================================================== */

  useEffect(() => {
    loadProducts();

    const handleProductsUpdate =
      () => {
        loadProducts();
      };

    window.addEventListener(
      "storage",
      handleProductsUpdate
    );

    window.addEventListener(
      "printExpertProductsUpdated",
      handleProductsUpdate
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleProductsUpdate
      );

      window.removeEventListener(
        "printExpertProductsUpdated",
        handleProductsUpdate
      );
    };
  }, []);

  /* =====================================================
     LOAD FAVORITES
  ===================================================== */

  const loadFavorites = () => {
    try {
      const savedFavorites =
        localStorage.getItem(
          "printExpertFavorites"
        );

      const parsedFavorites =
        savedFavorites
          ? JSON.parse(
              savedFavorites
            )
          : [];

      setFavorites(
        Array.isArray(
          parsedFavorites
        )
          ? parsedFavorites
          : []
      );
    } catch (error) {
      console.error(
        "Favorites loading error:",
        error
      );

      setFavorites([]);
    }
  };

  /* =====================================================
     FAVORITES INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    loadFavorites();

    const handleFavoritesUpdate =
      () => {
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
     CHECK FAVORITE
  ===================================================== */

  const isFavorite = (
    productId
  ) => {
    return favorites.some(
      (item) =>
        String(item.id) ===
        String(productId)
    );
  };

  /* =====================================================
     TOGGLE FAVORITE
  ===================================================== */

  const toggleFavorite = (
    product
  ) => {
    try {
      const savedFavorites =
        localStorage.getItem(
          "printExpertFavorites"
        );

      const currentFavorites =
        savedFavorites
          ? JSON.parse(
              savedFavorites
            )
          : [];

      const alreadyFavorite =
        currentFavorites.some(
          (item) =>
            String(item.id) ===
            String(product.id)
        );

      let updatedFavorites;

      if (alreadyFavorite) {
        updatedFavorites =
          currentFavorites.filter(
            (item) =>
              String(item.id) !==
              String(product.id)
          );
      } else {
        updatedFavorites = [
          ...currentFavorites,
          product,
        ];
      }

      localStorage.setItem(
        "printExpertFavorites",
        JSON.stringify(
          updatedFavorites
        )
      );

      setFavorites(
        updatedFavorites
      );

      window.dispatchEvent(
        new Event(
          "printExpertFavoritesUpdated"
        )
      );
    } catch (error) {
      console.error(
        "Favorite update error:",
        error
      );
    }
  };

  /* =====================================================
     VIEW PRODUCT DETAIL
  ===================================================== */

  const handleProductClick = (
    product
  ) => {
    if (!product) {
      return;
    }

    const productId =
      product.id ||
      product.productId;

    if (!productId) {
      console.error(
        "Product ID missing:",
        product
      );

      return;
    }

    const normalizedProduct =
      normalizeProduct(
        product
      );

    navigate(
      `/product/${productId}`,
      {
        state: {
          product:
            normalizedProduct,
        },
      }
    );
  };

  /* =====================================================
     CUSTOMIZE PRODUCT

     IMPORTANT:
     Selected product ki image/data customize page
     ko bheja ja raha hai.

     Example:

     T-Shirt click
       ↓
     T-Shirt image
       ↓
     selectedCustomizeProduct
       ↓
     /customize
  ===================================================== */

  const handleCustomizeProduct = (
    product
  ) => {
    if (!product) {
      return;
    }

    const normalizedProduct =
      normalizeProduct(
        product
      );

    const productId =
      normalizedProduct.id;

    const productImages =
      getProductImages(
        normalizedProduct
      );

    const customizeProduct = {
      ...normalizedProduct,

      id:
        productId ||
        `custom-${Date.now()}`,

      productId:
        productId ||
        `custom-${Date.now()}`,

      name:
        normalizedProduct.name ||
        "Custom Product",

      category:
        normalizedProduct.category ||
        "GENERAL",

      image:
        productImages[0],

      images:
        productImages,

      price:
        Number(
          normalizedProduct.price
        ) || 0,

      oldPrice:
        Number(
          normalizedProduct.oldPrice
        ) || 0,

      rating:
        Number(
          normalizedProduct.rating
        ) || 4.9,

      reviews:
        Number(
          normalizedProduct.reviews
        ) || 0,

      description:
        normalizedProduct.description ||
        "Create your own customized product with your logo, text and design.",

      /* Customizer ko ye information bhi milegi */
      type:
        normalizedProduct.type ||
        "product",

      color:
        normalizedProduct.color ||
        "#ffffff",

      customizationPrice:
        Number(
          normalizedProduct.customizationPrice
        ) || 199,
    };

    /* lean payload only — quota-safe; editor hydrates
       the full product from the API */
    saveCustomizeSelection(customizeProduct, {
      type: customizeProduct.type,
      color: customizeProduct.color,
      customizationPrice:
        customizeProduct.customizationPrice,
    });

    /* ===================================================
       OPEN CUSTOMIZE PAGE
    =================================================== */

    navigate("/customize", {
      state: {
        product:
          customizeProduct,
      },
    });
  };

  /* =====================================================
     ADD TO CART
  ===================================================== */

  const addToCart = async (product) => {
    try {
      const normalizedProduct = normalizeProduct(product);
      const productId = normalizedProduct.id;

      if (!productId) {
        console.error("Product ID missing:", product);
        return;
      }

      const productImages = getProductImages(normalizedProduct);
      const step = Math.max(1, Number(normalizedProduct.quantityStep) || 1);

      await contextAddToCart({
        productId,
        product_id: productId,
        name: normalizedProduct.name,
        image: productImages[0],
        images: productImages,
        price: Number(normalizedProduct.price) || 0,
        quantity: step,
        quantityStep: step,
        itemType: "standard",
      });

      console.log("Product added to cart:", normalizedProduct.name);
    } catch (error) {
      console.error("Add to cart error:", error);
    }
  };

  /* =====================================================
     SCROLL TO PRODUCTS
  ===================================================== */

  const scrollToProducts = () => {
    document
      .getElementById("products")
      ?.scrollIntoView({
        behavior: "smooth",
      });
  };

  /* =====================================================
     RETURN
  ===================================================== */

  return (
    <main className="home-page">

      {/* =================================================
          HERO
      ================================================= */}

      <section className="home-hero">

        <div className="hero-content">

          <span className="hero-tag">
            PRINT EXPERT
          </span>

          <h1>
            Everything Your
            <br />

            <span>
              Brand Needs.
            </span>
          </h1>

          <p>
            Premium printing,
            branding and
            promotional products
            designed to make your
            business stand out.
          </p>

          <div className="hero-actions">

            <button
              type="button"
              onClick={
                scrollToProducts
              }
            >
              Explore Products

              <ArrowRight
                size={18}
              />
            </button>

            <button
              type="button"
              className="hero-secondary"
              onClick={() =>
                navigate(
                  "/category"
                )
              }
            >
              View Categories
            </button>

          </div>

          <div className="hero-trust">

            <div>
              <strong>
                10K+
              </strong>

              <span>
                Products Delivered
              </span>
            </div>

            <div>
              <strong>
                4.9/5
              </strong>

              <span>
                Customer Rating
              </span>
            </div>

            <div>
              <strong>
                100%
              </strong>

              <span>
                Quality Assured
              </span>
            </div>

          </div>

        </div>

      </section>


      {/* =================================================
          CUSTOMIZE PRODUCTS

          Is component ke andar bhi selected product
          /customize page par jayega.
      ================================================= */}

      <CustomizeProducts />


      {/* =================================================
          PRODUCTS
      ================================================= */}

      <section
        className="products-section"
        id="products"
      >

        <div className="section-heading">

          <div>

            <span>
              OUR COLLECTION
            </span>

            <h2>
              Premium Products
              <br />
              For Your Business
            </h2>

          </div>

          <p>
            Explore our carefully
            selected collection of
            premium printing,
            branding and promotional
            products.
          </p>

        </div>


        {/* =================================================
            PRODUCT GRID
        ================================================= */}

        <div className="product-grid">

          {products.length ===
          0 ? (

            <div className="no-products">

              <h3>
                No Products Available
              </h3>

              <p>
                Products added by
                admin will appear
                here.
              </p>

            </div>

          ) : (

            products.map(
              (product) => {

                const productPrice =
                  Number(
                    product.price
                  ) || 0;

                const oldPrice =
                  Number(
                    product.oldPrice
                  ) || 0;

                const favorite =
                  isFavorite(
                    product.id
                  );

                const productImage =
                  product.image ||
                  product.images?.[0] ||
                  "https://via.placeholder.com/600x500?text=Product";

                return (

                  <article
                    className="product-card"
                    key={
                      product.id
                    }
                  >

                    {/* =========================================
                        PRODUCT IMAGE
                    ========================================= */}

                    <div
                      className="product-image"
                      onClick={() =>
                        handleProductClick(
                          product
                        )
                      }
                    >

                      <img
                        src={
                          productImage
                        }
                        alt={
                          product.name ||
                          "Product"
                        }
                        loading="lazy"
                      />


                      {/* BADGE */}

                      <span className="product-badge">

                        {
                          product.badge ||
                          "NEW"
                        }

                      </span>


                      {/* HEART */}

                      <button
                        type="button"
                        className={`heart-button ${
                          favorite
                            ? "favorite-active"
                            : ""
                        }`}
                        onClick={(e) => {

                          e.stopPropagation();

                          toggleFavorite(
                            product
                          );

                        }}
                        aria-label={
                          favorite
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                      >

                        <Heart
                          size={18}
                          fill={
                            favorite
                              ? "currentColor"
                              : "none"
                          }
                        />

                      </button>

                    </div>


                    {/* =========================================
                        PRODUCT CONTENT
                    ========================================= */}

                    <div className="product-content">

                      {/* CATEGORY */}

                      <span className="product-category">

                        {
                          product.category ||
                          "General"
                        }

                      </span>


                      {/* RATING */}

                      <div className="product-rating">

                        <span>
                          ★★★★★
                        </span>

                        <small>

                          (
                          {
                            product.reviews ||
                            0
                          }
                          )

                        </small>

                      </div>


                      {/* NAME */}

                      <h3
                        onClick={() =>
                          handleProductClick(
                            product
                          )
                        }
                      >

                        {
                          product.name ||
                          "Untitled Product"
                        }

                      </h3>


                      {/* DESCRIPTION */}

                      <p>

                        {
                          product.description ||
                          "Premium quality customized product made for your brand and business."
                        }

                      </p>


                      {/* PRICE */}

                      <div className="product-price-row">

                        <div className="price">

                          <strong>

                            ₹
                            {productPrice.toLocaleString(
                              "en-IN"
                            )}

                          </strong>


                          {oldPrice >
                            productPrice && (

                            <del>

                              ₹
                              {oldPrice.toLocaleString(
                                "en-IN"
                              )}

                            </del>

                          )}

                        </div>

                      </div>


                      {/* =========================================
                          BUTTONS
                      ========================================= */}

                      <div className="product-actions">

                        {/* VIEW DETAIL */}

                        <button
                          type="button"
                          className="view-detail-btn"
                          onClick={() =>
                            handleProductClick(
                              product
                            )
                          }
                        >

                          View Detail

                        </button>


                        {/* CUSTOMIZE PRODUCT */}

                        <button
                          type="button"
                          className="add-cart-btn"
                          onClick={() =>
                            handleCustomizeProduct(
                              product
                            )
                          }
                        >

                          <Palette
                            size={16}
                          />

                          Customize Product

                        </button>

                      </div>

                    </div>

                  </article>

                );
              }
            )

          )}

        </div>

      </section>


      {/* =================================================
          CONTACT / GET A QUOTE
      ================================================= */}

      <ContactSection source="homepage" />


      {/* =================================================
          CTA
      ================================================= */}

      <section className="home-cta">

        <div className="home-cta-content">

          <span className="home-cta-tag">
            BUILD YOUR BRAND
          </span>

          <h2>
            Ready to make your
            <br />
            brand unforgettable?
          </h2>

          <p>
            Choose from premium products and create
            something unique for your business.
            From visiting cards to custom apparel
            — we bring your vision to life.
          </p>

          <div className="home-cta-actions">
            <button
              type="button"
              className="home-cta-btn-primary"
              onClick={
                scrollToProducts
              }
            >
              Start Exploring
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className="home-cta-btn-secondary"
              onClick={() =>
                window.location.href = "/category"
              }
            >
              View All Categories
            </button>
          </div>

        </div>

        <div className="home-cta-visual">
          <div className="home-cta-circle home-cta-circle-1" />
          <div className="home-cta-circle home-cta-circle-2" />
          <div className="home-cta-circle home-cta-circle-3" />
        </div>

      </section>

    </main>
  );
}

export default Home;
