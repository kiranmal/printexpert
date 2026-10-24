import BusinessCardCustomizer from "./BusinessCardCustomizer";
import Customizer from "./Customizer";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchProductById } from "../services/productApi";

/* ============================================================
   CUSTOMIZATION PAGE

   customizationType ke hisaab se sahi editor load hota hai.
   Sirf customizable === true products hi editor kholte hain.

   localStorage mein sirf LEAN selection hai (id + options) —
   full product API se hydrate hota hai, phir editors ke liye
   wapas store hota hai.
============================================================ */

const EDITOR_BY_TYPE = {
  "business-card": "card",
  "spiral-notebook": "notebook",
  notebook: "notebook",
  tshirt: "apparel",
  hoodie: "apparel",
};

const readStoredSelection = () => {
  try {
    return JSON.parse(
      localStorage.getItem("selectedCustomizeProduct") || "null"
    );
  } catch {
    return null;
  }
};

export default function CustomizationPage() {
  const navigate = useNavigate();
  const [product, setProduct] = useState(readStoredSelection);
  const [hydrating, setHydrating] = useState(true);

  /* lean selection -> full product from API (DB is source of truth) */
  useEffect(() => {
    const stored = readStoredSelection();

    if (!stored?.id) {
      setHydrating(false);
      return;
    }

    let cancelled = false;

    fetchProductById(stored.id)
      .then((full) => {
        if (cancelled || !full) return;

        const merged = {
          ...full,
          /* customer-selected options carry over */
          paperType: stored.paperType || full.paperType,
          size: stored.size || full.size,
          quantity: stored.quantity || full.quantity,
          customizationType:
            stored.customizationType || full.customizationType,
          customizable:
            full.customizable || stored.customizable,
        };

        /* editors read this key — best-effort refresh,
           quota failure is non-fatal */
        try {
          localStorage.setItem(
            "selectedCustomizeProduct",
            JSON.stringify(merged)
          );
        } catch {
          /* lean data already sufficient */
        }

        setProduct(merged);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ── hydrating ── */
  if (hydrating && product?.id) {
    return (
      <div className="customizer-loading">
        <div>
          <h2>Loading product…</h2>
        </div>
      </div>
    );
  }

  /* ── product not found ── */
  if (!product || (!product.id && !product.name)) {
    return (
      <div className="customizer-loading">
        <div>
          <h2>Product not found.</h2>
          <p>
            Pehle product listing se koi product
            select karein.
          </p>
          <button onClick={() => navigate("/")}>
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  /* ── customizable check ── */
  const custType = String(
    product.customizationType ||
      product.type ||
      ""
  ).toLowerCase();

  const isCustomizable = Boolean(
    product.customizable ||
      product.isCustomizable ||
      product.customizationType ||
      custType
  );

  if (!isCustomizable) {
    return (
      <div className="customizer-loading">
        <div>
          <h2>
            This product does not support
            customization.
          </h2>
          <p>
            {product.name} ke liye
            customization available nahi hai.
          </p>
          <button onClick={() => navigate(-1)}>
            Back to Product
          </button>
        </div>
      </div>
    );
  }

  /* ── editor pick: field first, then name fallback ── */
  const identity =
    `${product.name || ""} ${product.category || ""}`.toLowerCase();

  const editorKind =
    EDITOR_BY_TYPE[custType] ||
    (/(business card|visiting card)/.test(identity)
      ? "card"
      : /notebook/.test(identity)
      ? "notebook"
      : "apparel");

  return editorKind === "card" ? (
    <BusinessCardCustomizer />
  ) : (
    <Customizer />
  );
}
