import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  Heart,
  Star,
  SlidersHorizontal,
  ChevronDown,
  Truck,
  ShieldCheck,
  CreditCard,
} from "lucide-react";

import {
  getFavorites,
} from "../data/productStorage";
import { toggleFavoriteServer } from "../services/favoritesApi";

import "../styles/Category.css";
import { fetchProducts, isActiveProduct, saveCustomizeSelection } from "../services/productApi";

function Category() {

  /* =====================================================
     URL PARAMS
  ===================================================== */

  const [searchParams] = useSearchParams();
  const urlCategory = searchParams.get("category") || "";
  const urlType = searchParams.get("type") || "";
  const urlSearch = searchParams.get("search") || "";


  /* =====================================================
     STATES
  ===================================================== */

  const [sort, setSort] = useState("popular");

  const [allProducts, setAllProducts] = useState([]);

  const [favorites, setFavorites] = useState([]);

  const [maxPrice, setMaxPrice] = useState(2000);

  const [selectedCategories, setSelectedCategories] =
    useState([]);

  const [selectedSubcategories, setSelectedSubcategories] =
    useState([]);

  const [selectedTags, setSelectedTags] =
    useState([]);

  const [selectedAttrValues, setSelectedAttrValues] =
    useState([]);

  const [showMobileFilter, setShowMobileFilter] =
    useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const searchRequestIdRef = useRef(0);


  /* =====================================================
     LOAD PRODUCTS
  ===================================================== */

  const loadProducts = async () => {
    const requestId = ++searchRequestIdRef.current;

    setIsLoading(true);

    try {

      /*
       * IMPORTANT
       *
       * Products come from the API/database only —
       * no localStorage catalog.
       */

      const databaseProducts =
        await fetchProducts(urlSearch);

      /* stale response ignore */
      if (requestId !== searchRequestIdRef.current) {
        return;
      }

      const activeProducts =
        databaseProducts.filter(isActiveProduct);


      /*
       * Duplicate IDs remove
       */

      const uniqueProducts = [];

      const usedIds = new Set();


      activeProducts.forEach(
        (product, index) => {

          const id =
            product.id ??
            `product-${index}`;


          if (!usedIds.has(String(id))) {

            usedIds.add(String(id));

            uniqueProducts.push({

              ...product,

              id: id,

              name:
                product.name ||
                "Premium Visiting Card",

              category:
                product.category ||
                "Visiting Cards",

              price:
                Number(
                  String(
                    product.price || 0
                  ).replace(/[₹,]/g, "")
                ),

              oldPrice:
                Number(
                  String(
                    product.oldPrice ||
                    product.price ||
                    0
                  ).replace(/[₹,]/g, "")
                ),

              rating:
                Number(
                  product.rating || 5
                ),

              reviews:
                Number(
                  product.reviews || 0
                ),

              badge:
                product.badge || "New",

              discount:
                product.discount || "",

              images:
                Array.isArray(
                  product.images
                ) &&
                product.images.length > 0

                  ? product.images

                  : product.image
                    ? [product.image]

                    : [
                        "https://via.placeholder.com/600x600?text=Product"
                      ],

              paperTypes:
                Array.isArray(
                  product.paperTypes
                )
                  ? product.paperTypes
                  : [],

              sizes:
                Array.isArray(
                  product.sizes
                )
                  ? product.sizes
                  : [],

            });

          }

        }
      );


      setAllProducts(
        uniqueProducts
      );

    } catch (error) {

      console.error(
        "Error loading products:",
        error
      );

      if (requestId === searchRequestIdRef.current) {
        /* API is the source of truth — no static
           or localStorage catalog fallback */
        setAllProducts([]);
      }

    } finally {

      if (requestId === searchRequestIdRef.current) {
        setIsLoading(false);
      }

    }

  };


  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {

    loadProducts();

    setFavorites(
      getFavorites()
    );


    const handleProductsUpdate = () => {

      loadProducts();

    };


    const handleFavoritesUpdate = () => {

      setFavorites(
        getFavorites()
      );

    };


    window.addEventListener(
      "printExpertProductsUpdated",
      handleProductsUpdate
    );

    window.addEventListener(
      "storage",
      handleProductsUpdate
    );

    window.addEventListener(
      "printExpertFavoritesUpdated",
      handleFavoritesUpdate
    );


    return () => {

      window.removeEventListener(
        "printExpertProductsUpdated",
        handleProductsUpdate
      );

      window.removeEventListener(
        "storage",
        handleProductsUpdate
      );

      window.removeEventListener(
        "printExpertFavoritesUpdated",
        handleFavoritesUpdate
      );

    };

  }, [urlSearch]);


  /* =====================================================
     CATEGORY LIST
  ===================================================== */

  const categories = useMemo(() => {

    const categoryList =
      allProducts
        .map(
          (product) =>
            product.category
        )
        .filter(Boolean);


    return [
      ...new Set(
        categoryList
      ),
    ];

  }, [allProducts]);


  /* =====================================================
     SUBCATEGORY LIST — sirf current category context ke
     products se derive (DB-loaded products)
  ===================================================== */

  const subcategories = useMemo(() => {

    const contextProducts = allProducts.filter(
      (product) => {

        if (
          urlCategory &&
          product.category !== urlCategory
        ) {
          return false;
        }

        if (
          selectedCategories.length > 0 &&
          !selectedCategories.includes(
            product.category
          )
        ) {
          return false;
        }

        return true;
      }
    );


    return [
      ...new Set(
        contextProducts
          .map((p) => p.subcategory)
          .filter(Boolean)
      ),
    ];

  }, [
    allProducts,
    urlCategory,
    selectedCategories,
  ]);


  /* =====================================================
     TAG LIST — products ke DB tags se
  ===================================================== */

  const productTags = useMemo(() => {

    const tagList = [];

    allProducts.forEach((product) => {
      if (Array.isArray(product.tags)) {
        product.tags.forEach((tag) => {
          if (tag?.name) tagList.push(tag.name);
        });
      }
    });

    return [...new Set(tagList)];

  }, [allProducts]);


  /* =====================================================
     ATTRIBUTE FILTER GROUPS — products ke DB attributes se
     (Paper Type sirf tab dikhta hai jab context mein hai)
  ===================================================== */

  const attributeGroups = useMemo(() => {

    const contextProducts = allProducts.filter(
      (product) => {

        if (
          urlCategory &&
          product.category !== urlCategory
        ) {
          return false;
        }

        if (
          selectedCategories.length > 0 &&
          !selectedCategories.includes(
            product.category
          )
        ) {
          return false;
        }

        return true;
      }
    );


    const groups = new Map();

    contextProducts.forEach((product) => {
      (Array.isArray(product.attributes)
        ? product.attributes
        : []
      ).forEach((attr) => {
        if (
          !["select", "multi-select"].includes(attr.type)
        ) {
          return;
        }

        (attr.values || []).forEach((v) => {
          if (!groups.has(attr.name)) {
            groups.set(attr.name, new Map());
          }
          groups.get(attr.name).set(v.id, v.value);
        });
      });
    });


    return [...groups.entries()].map(
      ([name, values]) => ({
        name,
        options: [...values.entries()].map(
          ([id, value]) => ({ id, value })
        ),
      })
    );

  }, [
    allProducts,
    urlCategory,
    selectedCategories,
  ]);


  /* =====================================================
     CATEGORY FILTER
  ===================================================== */

  const handleCategoryChange = (
    category
  ) => {

    setSelectedCategories(
      (previous) => {

        if (
          previous.includes(
            category
          )
        ) {

          return previous.filter(
            (item) =>
              item !== category
          );

        }


        return [
          ...previous,
          category,
        ];

      }
    );

  };


  /* =====================================================
     ATTRIBUTE VALUE FILTER
  ===================================================== */

  const handleAttrValueChange = (
    valueId
  ) => {

    setSelectedAttrValues(
      (previous) => {

        if (
          previous.includes(
            valueId
          )
        ) {

          return previous.filter(
            (item) =>
              item !== valueId
          );

        }


        return [
          ...previous,
          valueId,
        ];

      }
    );

  };


  /* =====================================================
     FILTER + SORT
  ===================================================== */

  const sortedProducts = useMemo(() => {

    let filtered =
      [...allProducts];


    /* ================= URL TYPE (sub-item) ================= */

    if (urlType) {

      const typeLower = urlType.toLowerCase();

      filtered =
        filtered.filter(
          (product) => {
            const name = (product.name || "").toLowerCase();
            const cat = (product.category || "").toLowerCase();
            const sub = (product.subcategory || "").toLowerCase();
            return name.includes(typeLower) ||
              sub.includes(typeLower) ||
              cat.includes(typeLower) ||
              typeLower.includes(name) ||
              typeLower.includes(cat);
          }
        );

    }


    /* ================= URL CATEGORY ================= */

    if (urlCategory) {

      filtered =
        filtered.filter(
          (product) =>
            product.category === urlCategory
        );

    }


    /* ================= SIDEBAR CATEGORY ================= */

    if (
      selectedCategories.length > 0
    ) {

      filtered =
        filtered.filter(
          (product) =>
            selectedCategories.includes(
              product.category
            )
        );

    }


    /* ================= SUBCATEGORY ================= */

    if (
      selectedSubcategories.length > 0
    ) {

      filtered =
        filtered.filter(
          (product) =>
            selectedSubcategories.includes(
              product.subcategory
            )
        );

    }


    /* ================= TAGS ================= */

    if (
      selectedTags.length > 0
    ) {

      filtered =
        filtered.filter(
          (product) =>
            (Array.isArray(product.tags)
              ? product.tags
              : []
            ).some((tag) =>
              selectedTags.includes(tag.name)
            )
        );

    }


    /* ================= ATTRIBUTE VALUES =================
       har attribute group mein >=1 selected value match
       (groups ke andar OR, groups ke beech AND) */

    if (
      selectedAttrValues.length > 0
    ) {

      filtered =
        filtered.filter(
          (product) => {

            const productAttrs =
              Array.isArray(product.attributes)
                ? product.attributes
                : [];

            /* har attribute ke liye check */
            const requiredByAttr =
              new Map();

            attributeGroups.forEach(
              (group) => {

                const wanted =
                  group.options
                    .filter((o) =>
                      selectedAttrValues.includes(
                        o.id
                      )
                    )
                    .map((o) => o.id);

                if (wanted.length > 0) {
                  requiredByAttr.set(
                    group.name,
                    new Set(wanted)
                  );
                }

              }
            );


            for (const [
              ,
              wantedSet,
            ] of requiredByAttr) {

              const has = productAttrs.some(
                (attr) =>
                  (attr.values || []).some(
                    (v) =>
                      wantedSet.has(v.id)
                  )
              );

              if (!has) return false;

            }

            return true;

          }
        );

    }


    /* ================= PRICE ================= */

    filtered =
      filtered.filter(
        (product) =>
          Number(
            product.price || 0
          ) <= maxPrice
      );


    /* ================= SORT ================= */

    filtered.sort(
      (a, b) => {

        if (
          sort === "low"
        ) {

          return (
            Number(a.price || 0) -
            Number(b.price || 0)
          );

        }


        if (
          sort === "high"
        ) {

          return (
            Number(b.price || 0) -
            Number(a.price || 0)
          );

        }


        if (
          sort === "rating"
        ) {

          return (
            Number(b.rating || 0) -
            Number(a.rating || 0)
          );

        }


        /* POPULAR */

        return (
          Number(b.reviews || 0) -
          Number(a.reviews || 0)
        );

      }
    );


    return filtered;

  }, [

    allProducts,

    selectedCategories,

    selectedSubcategories,

    selectedTags,

    selectedAttrValues,

    attributeGroups,

    maxPrice,

    sort,

    urlType,

    urlCategory,

  ]);


  /* =====================================================
     CLEAR FILTERS
  ===================================================== */

  const handleClearFilters = () => {

    setSelectedCategories([]);

    setSelectedSubcategories([]);

    setSelectedTags([]);

    setSelectedAttrValues([]);

    setMaxPrice(2000);

  };


  const handleSubcategoryChange = (sub) => {
    setSelectedSubcategories((previous) =>
      previous.includes(sub)
        ? previous.filter((item) => item !== sub)
        : [...previous, sub]
    );
  };

  const handleTagChange = (tag) => {
    setSelectedTags((previous) =>
      previous.includes(tag)
        ? previous.filter((item) => item !== tag)
        : [...previous, tag]
    );
  };


  /* =====================================================
     FAVORITE
  ===================================================== */

  const handleFavorite = async (
    event,
    product
  ) => {

    event.preventDefault();

    event.stopPropagation();


    /* guest → localStorage; logged-in → server + mirror.
       toggleFavoriteServer rolls back on API failure —
       getFavorites() then reflects the true state */
    const res = await toggleFavoriteServer(
      product
    );


    setFavorites(
      getFavorites()
    );


    console.log(
      res.added
        ? "Added to favorites"
        : "Removed from favorites"
    );

  };


  /* =====================================================
     CHECK FAVORITE
  ===================================================== */

  const isProductFavorite = (
    productId
  ) => {

    return favorites.some(
      (favorite) =>
        String(favorite?.id) ===
        String(productId)
    );

  };


  /* =====================================================
     RETURN
  ===================================================== */

  return (

    <div className="category-page">


      {/* =================================================
          BREADCRUMB
      ================================================= */}

      <div className="breadcrumb">

        <Link to="/">
          Home
        </Link>

        <span>
          ›
        </span>

        {urlCategory ? (
          <>
            <Link to="/category">
              Products
            </Link>
            <span>›</span>
            <span>{urlCategory}</span>
          </>
        ) : urlType ? (
          <>
            <Link to="/category">
              Products
            </Link>
            <span>›</span>
            <span>{urlType}</span>
          </>
        ) : (
          <span>
            Products
          </span>
        )}

      </div>


      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <section className="category-header">

        <div>

          <span className="category-small-title">

            PRINT EXPERT

          </span>


          <h1>

            {urlType || urlCategory || "Our Products"}

          </h1>


          <p>

            {urlType || urlCategory
              ? `Browse our collection of ${urlType || urlCategory}.`
              : "Premium quality products designed to make your brand unforgettable."}

          </p>

        </div>


        {/* SORT */}

        <div className="sort-box">

          <span>
            Sort by
          </span>


          <div className="sort-select">

            <select
              value={sort}
              onChange={(event) =>
                setSort(
                  event.target.value
                )
              }
            >

              <option value="popular">
                Popular
              </option>

              <option value="low">
                Price: Low to High
              </option>

              <option value="high">
                Price: High to Low
              </option>

              <option value="rating">
                Highest Rated
              </option>

            </select>


            <ChevronDown
              size={16}
            />

          </div>

        </div>

      </section>


      {/* =================================================
          BENEFITS
      ================================================= */}

      <div className="benefits-row">


        <div className="benefit">

          <Truck />

          <div>

            <strong>
              Fast Delivery
            </strong>

            <span>
              Shipping calculated at checkout
            </span>

          </div>

        </div>


        <div className="benefit">

          <ShieldCheck />

          <div>

            <strong>
              Premium Quality
            </strong>

            <span>
              100% Quality Assured
            </span>

          </div>

        </div>


        <div className="benefit">

          <CreditCard />

          <div>

            <strong>
              Secure Payment
            </strong>

            <span>
              100% Secure Checkout
            </span>

          </div>

        </div>

      </div>


      {/* =================================================
          MAIN LAYOUT
      ================================================= */}

      <div className="category-layout">


        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside
          className={
            showMobileFilter
              ? "filter-sidebar mobile-show"
              : "filter-sidebar"
          }
        >


          <div className="filter-title">

            <h3>
              Filters
            </h3>


            <button
              type="button"
              onClick={
                handleClearFilters
              }
            >

              Clear All

            </button>

          </div>


          {/* =================================================
              CATEGORY
          ================================================= */}

          <div className="filter-group">

            <h4>
              Category
            </h4>


            {categories.length === 0 ? (

              <p>
                No categories
              </p>

            ) : (

              categories.map(
                (category) => (

                  <label
                    key={category}
                  >

                    <input
                      type="checkbox"
                      checked={
                        selectedCategories.includes(
                          category
                        )
                      }
                      onChange={() =>
                        handleCategoryChange(
                          category
                        )
                      }
                    />

                    {category}

                  </label>

                )
              )

            )}

          </div>


          {/* =================================================
              SUBCATEGORY — sirf current category context ke
          ================================================= */}

          {subcategories.length > 0 && (
            <div className="filter-group">

              <h4>
                Subcategory
              </h4>

              {subcategories.map(
                (sub) => (

                  <label
                    key={sub}
                  >

                    <input
                      type="checkbox"
                      checked={
                        selectedSubcategories.includes(
                          sub
                        )
                      }
                      onChange={() =>
                        handleSubcategoryChange(
                          sub
                        )
                      }
                    />

                    {sub}

                  </label>

                )
              )}

            </div>
          )}


          {/* =================================================
              TAGS — DB product tags se
          ================================================= */}

          {productTags.length > 0 && (
            <div className="filter-group">

              <h4>
                Tags
              </h4>

              {productTags.map(
                (tag) => (

                  <label
                    key={tag}
                  >

                    <input
                      type="checkbox"
                      checked={
                        selectedTags.includes(
                          tag
                        )
                      }
                      onChange={() =>
                        handleTagChange(tag)
                      }
                    />

                    {tag}

                  </label>

                )
              )}

            </div>
          )}


          {/* =================================================
              PRICE
          ================================================= */}

          <div className="filter-group">

            <h4>
              Price Range
            </h4>


            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={maxPrice}
              onChange={(event) =>
                setMaxPrice(
                  Number(
                    event.target.value
                  )
                )
              }
            />


            <div className="price-range">

              <span>
                ₹100
              </span>

              <span>
                ₹{maxPrice}+
              </span>

            </div>

          </div>


          {/* =================================================
              ATTRIBUTES — dynamic, DB-driven (Paper Type,
              Size, Material, Capacity — sirf relevant)
          ================================================= */}

          {attributeGroups.map(
            (group) => (

              <div
                className="filter-group"
                key={group.name}
              >

                <h4>
                  {group.name}
                </h4>

                {group.options.map(
                  (opt) => (

                    <label
                      key={opt.id}
                    >

                      <input
                        type="checkbox"
                        checked={
                          selectedAttrValues.includes(
                            opt.id
                          )
                        }
                        onChange={() =>
                          handleAttrValueChange(
                            opt.id
                          )
                        }
                      />

                      {opt.value}

                    </label>

                  )
                )}

              </div>

            )
          )}


          {/* =================================================
              HELP
          ================================================= */}

          <div className="filter-help">

            <SlidersHorizontal />

            <h4>
              Need Custom Design?
            </h4>

            <p>

              Our design experts can create
              your perfect business card.

            </p>

            <button
              type="button"
              onClick={() =>
                alert(
                  "Design help feature coming soon."
                )
              }
            >

              Get Design Help

            </button>

          </div>


        </aside>


        {/* =================================================
            PRODUCTS
        ================================================= */}

        <main className="products-section">


          <div className="products-top">

            <span>

              {isLoading
                ? "Searching..."
                : (
                  <>
                    Showing{" "}
                    {sortedProducts.length}{" "}
                    of{" "}
                    {allProducts.length}{" "}
                    products

                    {urlSearch && (
                      <>{" "}for "{urlSearch}"</>
                    )}
                  </>
                )}

            </span>


            <button
              className="mobile-filter"
              type="button"
              onClick={() =>
                setShowMobileFilter(
                  !showMobileFilter
                )
              }
            >

              <SlidersHorizontal
                size={16}
              />

              Filters

            </button>

          </div>


          {/* =================================================
              NO PRODUCTS
          ================================================= */}

          {isLoading ? (

            <div className="category-loading">
              Searching...
            </div>

          ) : sortedProducts.length === 0 ? (

            <div className="no-products">

              <h2>
                No Products Found
              </h2>

              <p>
                Try changing your filters.
              </p>


              <button
                type="button"
                onClick={
                  handleClearFilters
                }
              >

                Clear Filters

              </button>

            </div>

          ) : (

            <div className="product-grid">


              {sortedProducts.map(
                (product, index) => {


                  /*
                   * IMPORTANT
                   *
                   * Admin product ka original ID
                   * preserve rahega.
                   */

                  const productId =
                    product.id ??
                    `product-${index}`;


                  const image =
                    product.images?.[0] ||
                    product.image ||
                    "https://via.placeholder.com/600x600?text=Product";


                  const favorite =
                    isProductFavorite(
                      productId
                    );


                  return (

                    <article
                      className="product-card"
                      key={String(
                        productId
                      )}
                    >


                      {/* =================================================
                          IMAGE
                      ================================================= */}

                      <div className="product-image">


                        <Link
                          to={`/product/${productId}`}
                        >

                          <img
                            src={image}
                            alt={
                              product.name ||
                              "Product"
                            }
                            loading="lazy"
                          />

                        </Link>


                        {/* BADGE */}

                        <span className="product-badge">

                          {product.badge ||
                            "New"}

                        </span>


                        {/* FAVORITE */}

                        <button
                          type="button"
                          className={
                            favorite
                              ? "wishlist active"
                              : "wishlist"
                          }
                          onClick={(
                            event
                          ) =>
                            handleFavorite(
                              event,
                              product
                            )
                          }
                          aria-label={
                            favorite
                              ? "Remove from favorites"
                              : "Add to favorites"
                          }
                        >

                          <Heart
                            size={19}
                            fill={
                              favorite
                                ? "currentColor"
                                : "none"
                            }
                          />

                        </button>

                      </div>


                      {/* =================================================
                          CONTENT
                      ================================================= */}

                      <div className="product-content">


                        <div className="product-category">

                          {product.category ||
                            "General"}

                        </div>


                        {/* PRODUCT NAME */}

                        <Link
                          to={`/product/${productId}`}
                          className="product-name"
                        >

                          {product.name ||
                            "Premium Product"}

                        </Link>


                        {/* RATING */}

                        <div className="rating">

                          <Star
                            size={14}
                            fill="currentColor"
                          />

                          <strong>

                            {product.rating ||
                              "5.0"}

                          </strong>

                          <span>

                            (
                            {product.reviews ||
                              0}
                            )

                          </span>

                        </div>


                        {/* PRICE */}

                        <div className="price">

                          <strong>

                            ₹
                            {Number(
                              product.price ||
                                0
                            ).toLocaleString(
                              "en-IN"
                            )}

                          </strong>


                          {Number(
                            product.oldPrice ||
                              0
                          ) >
                            Number(
                              product.price ||
                                0
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


                          {product.discount && (

                            <span>

                              {
                                product.discount
                              }

                            </span>

                          )}

                        </div>


                        {/* CUSTOMIZABLE badge */}

                        {(product.customizable ||
                          product.isCustomizable ||
                          product.customizationType ||
                          product.type) && (

                          <div className="customizable-badge">

                            ✦ Customizable

                          </div>

                        )}


                        {/* VIEW DETAILS */}

                        <Link
                          to={`/product/${productId}`}
                          className="view-details"
                        >

                          View Details

                        </Link>

                        {/* CUSTOMIZE — direct editor */}

                        {(product.customizable ||
                          product.isCustomizable ||
                          product.customizationType ||
                          product.type) && (

                          <Link
                            to="/customize"
                            className="card-customize-link"
                            onClick={() =>
                              saveCustomizeSelection(product)
                            }
                          >

                            ✦ Customize Now

                          </Link>

                        )}


                      </div>


                    </article>

                  );

                }
              )}

            </div>

          )}

        </main>

      </div>

    </div>

  );

}


export default Category;