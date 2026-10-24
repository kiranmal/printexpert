import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useSearchParams,
} from "react-router-dom";
import {
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  Search,
  Layers,
  PackageSearch,
  ListFilter,
} from "lucide-react";

import AdminTable from "../components/AdminTable";
import categoriesData from "../../data/categories";
import { fetchCategories } from "../../services/categoryApi";
import {
  deleteProduct as deleteProductFromApi,
  fetchProducts,
} from "../../services/productApi";

import "./AdminProducts.css";

/* categories may come as an API object or a static
   {items:[..]} — normalize the subcategory list */
const catSubs = (cat) => {
  if (Array.isArray(cat.subcategories) && cat.subcategories.length) {
    return cat.subcategories
      .filter((s) => (s.status || "Active") === "Active")
      .map((s) => s.name);
  }
  return Array.isArray(cat.items) ? cat.items : [];
};

export default function AdminProducts() {

  const [searchParams, setSearchParams] = useSearchParams();

  const [allProducts, setAllProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [categoryList, setCategoryList] =
    useState(categoriesData);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] =
    useState("");

  /* selection: null => All Products */
  const [selCat, setSelCat] = useState(null);
  const [selSub, setSelSub] = useState(null);

  const [expanded, setExpanded] = useState(
    () => new Set()
  );
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadRef = React.useRef(0);

  /* ---------- initial load: categories + all products ---------- */

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [cats, prods] = await Promise.all([
          fetchCategories(),
          fetchProducts("", { includeAll: true }),
        ]);

        if (cancelled) return;

        setCategoryList(cats);
        setAllProducts(prods);

        /* ?category=<slug|name> param resolve */
        const param = searchParams.get("category");
        if (param) {
          const match = cats.find(
            (c) =>
              c.slug === param ||
              c.name.toLowerCase() ===
                param.toLowerCase()
          );
          if (match) {
            setSelCat(match);
            const subParam =
              searchParams.get("sub");
            if (subParam) setSelSub(subParam);
            setExpanded(
              (prev) => new Set(prev).add(match.name)
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line
  }, []);

  /* ---------- search debounce ---------- */

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedSearch(search.trim()),
      300
    );
    return () => clearTimeout(t);
  }, [search]);

  /* ---------- filtered list (server-side) ---------- */

  useEffect(() => {
    let cancelled = false;
    const reqId = ++loadRef.current;

    const run = async () => {
      /* All + no search -> reuse allProducts, no extra call */
      if (!selCat && !debouncedSearch) {
        setProducts(allProducts);
        return;
      }

      setLoading(true);
      try {
        const list = await fetchProducts(
          debouncedSearch,
          {
            category: selCat?.name || "",
            subcategory: selSub || "",
            includeAll: true,
          }
        );
        if (!cancelled && reqId === loadRef.current) {
          setProducts(list);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line
  }, [allProducts, selCat, selSub, debouncedSearch]);

  /* ---------- helpers ---------- */

  const countsByCat = useMemo(() => {
    const map = new Map();
    allProducts.forEach((p) => {
      const c = p.category || "Uncategorized";
      map.set(c, (map.get(c) || 0) + 1);
    });
    return map;
  }, [allProducts]);

  const countsBySub = useMemo(() => {
    const map = new Map();
    allProducts.forEach((p) => {
      if (p.category && p.subcategory) {
        const k = `${p.category}||${p.subcategory}`;
        map.set(k, (map.get(k) || 0) + 1);
      }
    });
    return map;
  }, [allProducts]);

  const selectCategory = (cat) => {
    setSelCat(cat);
    setSelSub(null);
    setSearchParams(
      cat
        ? { category: cat.slug || cat.name }
        : {},
      { replace: true }
    );
    setSidebarOpen(false);
  };

  const selectSub = (cat, sub) => {
    setSelCat(cat);
    setSelSub(sub);
    setSearchParams(
      {
        category: cat.slug || cat.name,
        sub,
      },
      { replace: true }
    );
    setSidebarOpen(false);
  };

  const toggleExpand = (catName) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(catName)
        ? next.delete(catName)
        : next.add(catName);
      return next;
    });
  };

  const deleteProduct = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this product?"
      )
    ) {
      return;
    }

    /* optimistic remove — full catalog refetch ka wait
       nahi karna */
    setAllProducts((prev) =>
      prev.filter((p) => p.id !== id)
    );
    setProducts((prev) =>
      prev.filter((p) => p.id !== id)
    );

    try {
      await deleteProductFromApi(id);
    } catch (err) {
      console.error("Product delete error:", err);
      alert(err.message);
      /* fail hua to list wapas sync */
      fetchProducts("", { includeAll: true })
        .then((list) => {
          setAllProducts(list);
          setProducts(list);
        })
        .catch(() => {});
    }
  };

  /* sidebar categories — active + jo products rakhti hain */
  const sidebarCats = categoryList.filter(
    (c) =>
      (c.status || "Active") === "Active" ||
      (countsByCat.get(c.name) || 0) > 0
  );

  const headerSubtitle = selCat
    ? `${selCat.name}${
        selSub ? ` / ${selSub}` : ""
      } · ${products.length} product${
        products.length === 1 ? "" : "s"
      }`
    : `${allProducts.length} products in your store`;

  const addProductLink = selCat
    ? `/admin/products/add?category=${encodeURIComponent(
        selCat.name
      )}`
    : "/admin/products/add";

  /* group headers only in the All Products view */
  const groupedByCategory = {};
  products.forEach((product) => {
    const cat = product.category || "Uncategorized";
    if (!groupedByCategory[cat]) {
      groupedByCategory[cat] = [];
    }
    groupedByCategory[cat].push(product);
  });

  const categoryOrder = sidebarCats.map(
    (c) => c.name
  );
  const sortedCategoryKeys = Object.keys(
    groupedByCategory
  ).sort((a, b) => {
    const ia = categoryOrder.indexOf(a);
    const ib = categoryOrder.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  const showGroups = !selCat;

  const productRow = (product) => (
    <tr key={product.id}>

      {/* PRODUCT */}
      <td>
        <div className="product-cell">
          <div className="product-thumb">
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
              />
            ) : (
              "🛍️"
            )}
          </div>

          <div className="product-name">
            <strong>{product.name}</strong>
            <small>
              {product.badge || "Standard"}
            </small>
          </div>
        </div>
      </td>

      {/* CATEGORY */}
      <td>
        <span className="category-pill">
          {product.subcategory
            ? `${product.category} / ${product.subcategory}`
            : product.category}
        </span>
      </td>

      {/* PRICE */}
      <td className="price-cell">
        ₹
        {Number(product.price).toLocaleString(
          "en-IN"
        )}
      </td>

      {/* STOCK */}
      <td>
        <span
          className={`stock-pill ${
            product.stock <= 10 ? "low" : "ok"
          }`}
        >
          {product.stock} units
        </span>
      </td>

      {/* STATUS */}
      <td>
        <span
          className={`status ${
            product.status === "Active" ||
            product.status === "In Stock"
              ? "delivered"
              : product.status === "Low Stock"
              ? "pending"
              : "cancelled"
          }`}
        >
          {product.status}
        </span>
      </td>

      {/* ACTION */}
      <td>
        <div className="actions">
          <Link
            className="action-btn edit-btn"
            to={`/admin/products/edit/${product.id}`}
            title="Edit product"
          >
            ✏️
          </Link>

          <button
            type="button"
            className="action-btn delete-btn"
            title="Delete product"
            onClick={() => deleteProduct(product.id)}
          >
            🗑️
          </button>
        </div>
      </td>

    </tr>
  );

  const productCard = (product) => (
    <div
      className="product-card"
      key={product.id}
    >
      <div className="product-card-top">
        <div className="product-thumb">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
            />
          ) : (
            "🛍️"
          )}
        </div>

        <div className="product-card-info">
          <strong>{product.name}</strong>
          <span className="category-pill">
            {product.subcategory
              ? `${product.category} / ${product.subcategory}`
              : product.category}
          </span>
        </div>
      </div>

      <div className="product-card-meta">
        <span className="price-cell">
          ₹
          {Number(product.price).toLocaleString(
            "en-IN"
          )}
        </span>
        <span
          className={`stock-pill ${
            product.stock <= 10 ? "low" : "ok"
          }`}
        >
          {product.stock} units
        </span>
        <span
          className={`status ${
            product.status === "Active" ||
            product.status === "In Stock"
              ? "delivered"
              : product.status === "Low Stock"
              ? "pending"
              : "cancelled"
          }`}
        >
          {product.status}
        </span>
      </div>

      <div className="product-card-actions">
        <Link
          className="action-btn edit-btn"
          to={`/admin/products/edit/${product.id}`}
          title="Edit product"
        >
          ✏️ Edit
        </Link>
        <button
          type="button"
          className="action-btn delete-btn"
          title="Delete product"
          onClick={() => deleteProduct(product.id)}
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );

  const sidebarContent = (
    <>
      <div className="cat-sidebar-head">
        <Layers size={15} />
        Categories
      </div>

      <button
        type="button"
        className={`cat-item-btn ${
          !selCat ? "active" : ""
        }`}
        onClick={() => selectCategory(null)}
      >
        <LayoutGrid size={15} />
        <span className="cat-name">
          All Products
        </span>
        <span className="cat-count">
          {allProducts.length}
        </span>
      </button>

      {sidebarCats.map((cat) => {
        const subs = catSubs(cat);
        const isOpen = expanded.has(cat.name);
        const isActive =
          selCat?.name === cat.name && !selSub;

        return (
          <div
            className="cat-group"
            key={cat.id || cat.name}
          >
            <div
              className={`cat-item-btn ${
                isActive ? "active" : ""
              } ${
                selCat?.name === cat.name
                  ? "in-path"
                  : ""
              }`}
            >
              {subs.length > 0 && (
                <button
                  type="button"
                  className={`cat-chevron ${
                    isOpen ? "open" : ""
                  }`}
                  onClick={() =>
                    toggleExpand(cat.name)
                  }
                  aria-label="Toggle subcategories"
                >
                  <ChevronRight size={14} />
                </button>
              )}

              <button
                type="button"
                className="cat-main"
                onClick={() => {
                  selectCategory(cat);
                  if (subs.length && !isOpen) {
                    toggleExpand(cat.name);
                  }
                }}
              >
                <span className="cat-name">
                  {cat.name}
                </span>
                <span className="cat-count">
                  {countsByCat.get(cat.name) || 0}
                </span>
              </button>
            </div>

            {isOpen && subs.length > 0 && (
              <div className="sub-list">
                {subs.map((sub) => (
                  <button
                    type="button"
                    key={sub}
                    className={`sub-item-btn ${
                      selCat?.name === cat.name &&
                      selSub === sub
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      selectSub(cat, sub)
                    }
                  >
                    <span className="cat-name">
                      {sub}
                    </span>
                    <span className="cat-count">
                      {countsBySub.get(
                        `${cat.name}||${sub}`
                      ) || 0}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );

  return (
    <div className="admin-products">

      {/* PAGE HEADER */}

      <div className="page-heading">
        <div>
          <h2>Products</h2>
          <p>{headerSubtitle}</p>
        </div>

        <Link
          className="primary-btn"
          to={addProductLink}
        >
          ＋ Add Product
        </Link>
      </div>

      {/* MOBILE CATEGORY TOGGLE */}

      <button
        type="button"
        className="cat-toggle-btn"
        onClick={() =>
          setSidebarOpen((v) => !v)
        }
      >
        <ListFilter size={15} />
        {selCat
          ? selSub
            ? `${selCat.name} / ${selSub}`
            : selCat.name
          : "All Products"}
        <ChevronDown
          size={14}
          style={{
            marginLeft: "auto",
            transform: sidebarOpen
              ? "rotate(180deg)"
              : "none",
          }}
        />
      </button>

      {/* TWO-COLUMN LAYOUT */}

      <div className="products-layout">

        <aside
          className={`cat-sidebar ${
            sidebarOpen ? "open" : ""
          }`}
        >
          {sidebarContent}
        </aside>

        {/* PRODUCT CONTENT */}

        <section className="panel products-panel">

          {/* TOOLBAR */}

          <div className="toolbar">
            <div className="search-wrap">
              <Search
                size={15}
                className="search-icon"
              />
              <input
                className="search-input"
                type="search"
                placeholder="Search products..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />
            </div>

            {(selCat || debouncedSearch) && (
              <button
                type="button"
                className="clear-btn"
                onClick={() => {
                  setSearch("");
                  selectCategory(null);
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          {error && (
            <div className="error-state">
              {error}
            </div>
          )}

          {/* LOADING */}

          {loading && (
            <div className="skel-list">
              {[1, 2, 3, 4].map((i) => (
                <div
                  className="skel-row"
                  key={i}
                />
              ))}
            </div>
          )}

          {/* DESKTOP TABLE */}

          {!loading && (
            <>
              <div className="products-table">
                <AdminTable
                  headers={[
                    "Product",
                    "Category",
                    "Price",
                    "Stock",
                    "Status",
                    "Action",
                  ]}
                >
                  {showGroups &&
                    sortedCategoryKeys.map((cat) => (
                      <React.Fragment key={cat}>
                        <tr>
                          <td
                            colSpan="6"
                            className="cat-header-row"
                          >
                            {cat}
                            <span className="cat-header-count">
                              {
                                groupedByCategory[
                                  cat
                                ].length
                              }{" "}
                              products
                            </span>
                          </td>
                        </tr>

                        {groupedByCategory[
                          cat
                        ].map(productRow)}
                      </React.Fragment>
                    ))}

                  {!showGroups &&
                    products.map(productRow)}

                  {products.length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
                        className="empty-state"
                      >
                        <PackageSearch
                          size={26}
                        />
                        <div>
                          {selCat
                            ? `No products found in ${selCat.name}.`
                            : "No products found."}
                        </div>
                        {selCat && (
                          <button
                            type="button"
                            className="clear-btn"
                            onClick={() =>
                              selectCategory(null)
                            }
                          >
                            View All Products
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </AdminTable>
              </div>

              {/* MOBILE CARDS */}

              <div className="products-cards">
                {products.map(productCard)}

                {products.length === 0 && (
                  <div className="empty-state">
                    <PackageSearch size={26} />
                    <div>
                      {selCat
                        ? `No products found in ${selCat.name}.`
                        : "No products found."}
                    </div>
                    {selCat && (
                      <button
                        type="button"
                        className="clear-btn"
                        onClick={() =>
                          selectCategory(null)
                        }
                      >
                        View All Products
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

        </section>
      </div>
    </div>
  );
}
