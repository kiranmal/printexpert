
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  PackagePlus,
  Tag,
  IndianRupee,
  Image as ImageIcon,
  FileText,
  X,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Upload,
  Trash2,
  Save,
} from "lucide-react";

import "./AddProduct.css";
import {
  fetchProductById,
  updateProduct,
} from "../../services/productApi";
import {
  fetchCategories,
  fetchTags,
  fetchAttributes,
} from "../../services/categoryApi";
import { inferCustomizationType } from "../../services/customizationType";
import AttributeManager from "../components/AttributeManager";

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

export default function EditProduct() {
  const navigate = useNavigate();
  const { id } = useParams();

  const fileInputRef = useRef(null);

  const [productLoaded, setProductLoaded] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);

  const [categories, setCategories] = useState(
    defaultCategories
  );
  const [allTags, setAllTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] =
    useState([]);

  /* last selected tag > existing badge > NEW */
  const selectedBadge =
    (
      allTags.find(
        (t) =>
          t.id ===
          selectedTagIds[selectedTagIds.length - 1]
      )?.name ||
      currentProduct?.badge ||
      "NEW"
    ).toUpperCase();

  /* dynamic attributes */
  const [attrOptions, setAttrOptions] = useState([]);
  const [attrValueSel, setAttrValueSel] = useState({});
  const [attrTexts, setAttrTexts] = useState({});

  const toggleAttrValue = (attrId, valueId) => {
    setAttrValueSel((prev) => {
      const cur = prev[attrId] || [];
      return {
        ...prev,
        [attrId]: cur.includes(valueId)
          ? cur.filter((v) => v !== valueId)
          : [...cur, valueId],
      };
    });
  };

  const handleTagToggle = (tagId) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((t) => t !== tagId)
        : [...prev, tagId]
    );
  };

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Visiting Cards");
  const [subcategory, setSubcategory] = useState(
    "Premium Business Cards"
  );

  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [quantityStep, setQuantityStep] =
    useState("1");
  const [weightGrams, setWeightGrams] = useState("");
  const [weightError, setWeightError] = useState("");

  const [unit, setUnit] = useState("Pieces");

  /* available stock — loaded from the saved product */
  const [stock, setStock] = useState("1");
  const [stockError, setStockError] = useState("");
  const [maxQuantity, setMaxQuantity] =
    useState("");

  const [customizable, setCustomizable] =
    useState(false);

  const [customizationType, setCustomizationType] =
    useState("tshirt");

  /* templates managed in Admin → Templates */

  const [images, setImages] = useState([]);

  const [description, setDescription] = useState("");

  const [success, setSuccess] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  /* =====================================================
     LOAD PRODUCT
  ===================================================== */

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const [catList, product] = await Promise.all([
          fetchCategories(),
          fetchProductById(id),
        ]);

        setCategories(catList);

        try {
          setAllTags(await fetchTags());
        } catch {
          // tags optional
        }

        setCurrentProduct(product);
        setName(product.name || "");
        setCategory(product.category || "Visiting Cards");

        const productCategory = catList.find(
          (item) => item.name === product.category
        );
        const availableSubcategories = productCategory?.items || [];

        setSubcategory(
          availableSubcategories.includes(product.subcategory)
            ? product.subcategory
            : availableSubcategories[0] || ""
        );
        setPrice(String(product.price ?? ""));
        setOldPrice(String(product.oldPrice ?? ""));
        setStock(String(product.stock ?? 0));
        setQuantityStep(
          String(product.quantityStep ?? 1)
        );
        setWeightGrams(
          product.weightGrams !== null &&
            product.weightGrams !== undefined
            ? String(product.weightGrams)
            : ""
        );

        setUnit(product.unit || "Pieces");
        setMaxQuantity(
          product.maxQuantity !== null &&
            product.maxQuantity !== undefined
            ? String(product.maxQuantity)
            : ""
        );

        setCustomizable(
          Boolean(
            product.customizable ||
              product.isCustomizable
          )
        );

        setCustomizationType(
          product.customizationType ||
            inferCustomizationType(
              product.subcategory,
              product.category
            )
        );

        const existingImages = (product.images || []).filter(Boolean);
        if (existingImages.length > 0) {
          setImages(existingImages.map((url, i) => ({
            dataUrl: url,
            name: `Image ${i + 1}`,
          })));
        }

        setDescription(product.description || "");

        setSelectedTagIds(
          Array.isArray(product.tagIds)
            ? product.tagIds
            : []
        );

        /* dynamic attribute selections prefill —
           the category-change effect consumes this */
        const vs = {};
        const tx = {};
        (Array.isArray(product.attributes)
          ? product.attributes
          : []
        ).forEach((a) => {
          if (Array.isArray(a.values) && a.values.length) {
            vs[a.attributeId] = a.values.map((v) => v.id);
          }
          if (a.value !== null && a.value !== undefined) {
            tx[a.attributeId] = String(a.value);
          }
        });
        /* saved selections directly apply — attrOptions
           load hone ka wait nahi karna (values sirf
           attribute_value ids hain) */
        setAttrValueSel(vs);
        setAttrTexts(tx);
        productLoadedRef.current = true;
        appliedCatRef.current =
          `${product.category || ""}|${product.subcategory || ""}`;

        setProductLoaded(true);
      } catch (error) {
        console.error("Edit product loading error:", error);
        setErrorMessage(error.message || "Unable to load product.");
      }
    };

    loadProduct();
  }, [id]);

  /* =====================================================
     CURRENT CATEGORY
  ===================================================== */

  const selectedCategory = categories.find(
    (item) => item.name === category
  );

  const subcategories =
    selectedCategory?.items || [];

  const selectedSubcategoryId =
    (selectedCategory?.subcategories || []).find(
      (s) => s.name === subcategory
    )?.id || null;

  /* product load ke baad user ka MANUAL category/subcategory
     change hi selections reset kare — resolved-id changes
     (categories list late aana) ko ignore karo */
  const productLoadedRef = useRef(false);
  const appliedCatRef = useRef(null);

  /* category/subcategory change -> relevant attributes load;
     manual scope change pe selections reset */
  useEffect(() => {
    const loadAttrs = async () => {
      try {
        const list = await fetchAttributes(
          selectedCategory?.id || null,
          selectedSubcategoryId
        );
        setAttrOptions(
          list.filter((a) => a.status === "Active")
        );
      } catch {
        setAttrOptions([]);
      }

      const key = `${category}|${subcategory}`;
      if (
        productLoadedRef.current &&
        appliedCatRef.current !== null &&
        appliedCatRef.current !== key
      ) {
        setAttrValueSel({});
        setAttrTexts({});
      }
      if (productLoadedRef.current) {
        appliedCatRef.current = key;
      }
    };
    loadAttrs();
  }, [selectedCategory?.id, selectedSubcategoryId]);

  /* refresh attributes after CRUD — selections preserve
     hote hain, sirf ab-invalid value ids prune hote hain */
  const reloadAttributes = async () => {
    try {
      const list = await fetchAttributes(
        selectedCategory?.id || null,
        selectedSubcategoryId
      );
      const active = list.filter(
        (a) => a.status === "Active"
      );
      setAttrOptions(active);
      const valid = new Set(
        active.flatMap((a) =>
          (a.values || []).map((v) => v.id)
        )
      );
      setAttrValueSel((prev) =>
        Object.fromEntries(
          Object.entries(prev)
            .map(([k, v]) => [
              k,
              v.filter((id) => valid.has(id)),
            ])
            .filter(([, v]) => v.length > 0)
        )
      );
    } catch {
      /* keep current state on fetch failure */
    }
  };

  /* =====================================================
     CATEGORY CHANGE
  ===================================================== */

  const handleCategoryChange = (e) => {
    const value = e.target.value;

    setCategory(value);

    const newCategory = categories.find(
      (item) => item.name === value
    );

    const firstSub = newCategory?.items?.[0] || "";

    setSubcategory(firstSub);

    /* auto-pick customization type for this category */
    setCustomizationType(
      inferCustomizationType(firstSub, value)
    );
  };

  const handleSubcategoryChange = (e) => {
    const value = e.target.value;

    setSubcategory(value);

    setCustomizationType(
      inferCustomizationType(value, category)
    );
  };

  /* =====================================================
     IMAGE UPLOAD
  ===================================================== */

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const maxImages = 6;
    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      alert(`Maximum ${maxImages} images allowed.`);
      return;
    }

    const filesToProcess = files.slice(0, remaining);

    filesToProcess.forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name}: Image size should be less than 5MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => [
          ...prev,
          { dataUrl: reader.result, name: file.name },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* =====================================================
     REMOVE IMAGE
  ===================================================== */

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  /* =====================================================
     DISCOUNT
  ===================================================== */

  const calculateDiscount = () => {
    if (
      !price ||
      !oldPrice ||
      Number(oldPrice) <= Number(price)
    ) {
      return null;
    }

    return Math.round(
      ((Number(oldPrice) - Number(price)) /
        Number(oldPrice)) *
        100
    );
  };

  const discount = calculateDiscount();

  /* =====================================================
     UPDATE PRODUCT
  ===================================================== */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Please enter product name.");
      return;
    }

    if (!price || Number(price) <= 0) {
      alert(
        "Please enter a valid product price."
      );
      return;
    }

    if (images.length === 0) {
      alert("Please upload at least one product image.");
      return;
    }

    if (!currentProduct) {
      alert("Product data is not available.");
      return;
    }

    /* stock validation */
    const stockNumber = Number(stock);
    if (
      stock === "" ||
      !Number.isInteger(stockNumber) ||
      stockNumber < 0
    ) {
      setStockError(
        "Stock must be a whole number of 0 or more."
      );
      alert("Please enter a valid stock quantity.");
      return;
    }

    /* optional — when filled must be a positive number */
    const weightNumber = Number(weightGrams);
    if (
      weightGrams !== "" &&
      (!Number.isFinite(weightNumber) || weightNumber <= 0)
    ) {
      setWeightError(
        "Weight must be a positive number (grams)."
      );
      alert("Please enter a valid weight in grams.");
      return;
    }

    /* zero stock → warn + confirm before saving */
    if (stockNumber === 0) {
      const ok = window.confirm(
        "Stock is 0. This product will be HIDDEN from the " +
          "customer-facing listings and cannot be purchased " +
          "until stock is increased.\n\nSave anyway?"
      );
      if (!ok) return;
    }

    const priceNumber = Number(price);

    const oldPriceNumber = Number(
      oldPrice || price
    );

    const productDiscount =
      oldPriceNumber > priceNumber
        ? `${Math.round(
            ((oldPriceNumber -
              priceNumber) /
              oldPriceNumber) *
              100
          )}% OFF`
        : "";

    /*
      IMPORTANT:
      Existing product ke extra fields
      preserve kar rahe hain.

      Example:
      rating
      reviews
      badge
      paperTypes
      sizes
      features
      custom fields
      etc.
    */

    const imageUrls = images.map((img) => img.dataUrl);

    const updatedProduct = {
      ...currentProduct,

      id: currentProduct.id,

      name: name.trim(),

      category,

      categoryId: selectedCategory?.id || null,

      subcategory,

      subcategoryId:
        (
          selectedCategory?.subcategories || []
        ).find((s) => s.name === subcategory)?.id || null,

      tagIds: selectedTagIds,

      attributeValues: Object.values(attrValueSel).flat(),

      attributeTexts: Object.entries(attrTexts)
        .filter(([, v]) => String(v).trim() !== "")
        .map(([attributeId, value]) => ({
          attributeId: Number(attributeId),
          value: String(value).trim(),
        })),

      price: priceNumber,

      oldPrice: oldPriceNumber,

      stock: stockNumber,

      quantityStep: Math.max(
        1,
        Math.floor(Number(quantityStep)) || 1
      ),

      weightGrams:
        weightGrams === "" ? null : Math.round(weightNumber),

      unit,

      maxQuantity:
        maxQuantity === ""
          ? null
          : Math.max(
              1,
              Math.floor(Number(maxQuantity)) || 0
            ) || null,

      customizable,

      customizationType: customizable
        ? customizationType
        : null,

      discount: productDiscount,

      image: imageUrls[0],

      images: imageUrls,

      description:
        description.trim() ||
        "Premium quality product from Print Expert.",

      /*
        Existing values preserve.
        Agar old product me nahi hain,
        to default values use honge.
      */

      rating:
        currentProduct.rating ?? 5,

      reviews:
        currentProduct.reviews ?? 0,

      badge: selectedBadge,

      paperTypes:
        Array.isArray(
          currentProduct.paperTypes
        )
          ? currentProduct.paperTypes
          : [],

      sizes:
        Array.isArray(
          currentProduct.sizes
        )
          ? currentProduct.sizes
          : [],

      features:
        Array.isArray(
          currentProduct.features
        )
          ? currentProduct.features
          : [
              "Premium Quality",
              "High Quality Printing",
              "Fast Delivery",
              "100% Quality Assured",
            ],

      updatedAt:
        new Date().toISOString(),
    };

    try {
      await updateProduct(id, updatedProduct);
    } catch (error) {
      console.error("Unable to update product:", error);
      alert(error.message);
      return;
    }

    /* =====================================================
       SUCCESS
    ===================================================== */

    setSuccess(true);

    setTimeout(() => {
      navigate("/admin/products");
    }, 1000);
  };

  /* =====================================================
     PRODUCT NOT FOUND
  ===================================================== */

  if (errorMessage) {
    return (
      <div className="add-product-page">
        <div
          className="product-form-card"
          style={{
            maxWidth: "650px",
            margin: "80px auto",
            textAlign: "center",
            padding: "50px",
          }}
        >
          <div
            style={{
              width: "70px",
              height: "70px",
              borderRadius: "50%",
              margin: "0 auto 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fef2f2",
              color: "#dc2626",
            }}
          >
            <X size={35} />
          </div>

          <h2>
            {errorMessage}
          </h2>

          <p>
            The product you are trying to
            edit could not be found.
          </p>

          <button
            type="button"
            className="submit-btn"
            onClick={() =>
              navigate(
                "/admin/products"
              )
            }
            style={{
              marginTop: "20px",
            }}
          >
            <ArrowLeft size={18} />
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  /*
    Product load hone tak blank/loading screen.
  */

  if (!productLoaded) {
    return (
      <div className="add-product-page">
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            fontWeight: 600,
          }}
        >
          Loading product...
        </div>
      </div>
    );
  }

  return (
    <div className="add-product-page">

      {/* =====================================================
          SUCCESS
      ===================================================== */}

      {success && (
        <div className="success-toast">
          <CheckCircle2 size={20} />

          <div>
            <strong>
              Product Updated Successfully
            </strong>

            <span>
              Redirecting to products...
            </span>
          </div>
        </div>
      )}

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="add-product-header">
        <div className="header-left">

          <button
            type="button"
            className="back-btn"
            onClick={() =>
              navigate(
                "/admin/products"
              )
            }
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div className="header-label">
              <Sparkles size={15} />
              PRODUCT MANAGEMENT
            </div>

            <h1>
              Edit Product
            </h1>

            <p>
              Update product details,
              pricing and image.
            </p>
          </div>

        </div>
      </div>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <form
        className="add-product-layout"
        onSubmit={handleSubmit}
      >

        {/* ===================================================
            LEFT FORM
        =================================================== */}

        <div className="product-form-card">

          <div className="form-card-header">
            <div className="form-card-icon">
              <Save size={21} />
            </div>

            <div>
              <h2>
                Edit Product Information
              </h2>

              <p>
                Make changes to your product
                and save them.
              </p>
            </div>
          </div>

          {/* PRODUCT NAME */}

          <div className="form-group">
            <label>
              Product Name
              <span>*</span>
            </label>

            <div className="input-wrapper">
              <Tag size={18} />

              <input
                type="text"
                placeholder="Premium Visiting Card"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
              />
            </div>
          </div>

          {/* CATEGORY */}

          <div className="form-row">

            <div className="form-group">
              <label>
                Category
                <span>*</span>
              </label>

              <div className="input-wrapper">
                <PackagePlus size={18} />

                <select
                  value={category}
                  onChange={
                    handleCategoryChange
                  }
                >
                  {categories.map(
                    (item) => (
                      <option
                        key={item.name}
                        value={item.name}
                      >
                        {item.name}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {/* SUBCATEGORY */}

            <div className="form-group">
              <label>
                Product Type
                <span>*</span>
              </label>

              <div className="input-wrapper">
                <Tag size={18} />

                <select
                  value={subcategory}
                  onChange={
                    handleSubcategoryChange
                  }
                >
                  {subcategories.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

          </div>

          {/* TAGS (multi-select) */}

          {allTags.length > 0 && (
            <div className="form-group">
              <label>Tags</label>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  padding: "6px 0",
                }}
              >
                {allTags
                  .filter((t) => t.status !== "Inactive")
                  .map((tag) => (
                    <label
                      key={tag.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        borderRadius: "999px",
                        fontSize: "13px",
                        cursor: "pointer",
                        border: "1px solid #d1d5db",
                        background: selectedTagIds.includes(
                          tag.id
                        )
                          ? "#fef0f7"
                          : "#fff",
                        color: selectedTagIds.includes(tag.id)
                          ? "#d81d77"
                          : "#374151",
                        fontWeight: selectedTagIds.includes(
                          tag.id
                        )
                          ? 600
                          : 400,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTagIds.includes(
                          tag.id
                        )}
                        onChange={() => handleTagToggle(tag.id)}
                      />
                      {tag.name}
                    </label>
                  ))}
              </div>
            </div>
          )}

          {/* DYNAMIC ATTRIBUTES — category/subcategory scoped,
             CRUD via AttributeManager */}

          <div className="form-group">
            <label>Product Attributes</label>
            <AttributeManager
              attributes={attrOptions}
              selected={attrValueSel}
              texts={attrTexts}
              onToggleValue={toggleAttrValue}
              onSelectValue={(attrId, valueId) =>
                setAttrValueSel((prev) => ({
                  ...prev,
                  [attrId]: valueId ? [valueId] : [],
                }))
              }
              onTextChange={(attrId, v) =>
                setAttrTexts((prev) => ({ ...prev, [attrId]: v }))
              }
              onRefresh={reloadAttributes}
            />
          </div>

          {/* PRICE */}

          <div className="form-row">

            <div className="form-group">
              <label>
                Selling Price
                <span>*</span>
              </label>

              <div className="input-wrapper">
                <IndianRupee size={18} />

                <input
                  type="number"
                  min="0"
                  placeholder="499"
                  value={price}
                  onChange={(e) =>
                    setPrice(
                      e.target.value
                    )
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                Original Price
              </label>

              <div className="input-wrapper">
                <IndianRupee size={18} />

                <input
                  type="number"
                  min="0"
                  placeholder="699"
                  value={oldPrice}
                  onChange={(e) =>
                    setOldPrice(
                      e.target.value
                    )
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                Quantity Step
                <span>*</span>
              </label>

              <div className="input-wrapper">
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  value={quantityStep}
                  onChange={(e) =>
                    setQuantityStep(
                      e.target.value
                    )
                  }
                />
              </div>

              <small
                style={{
                  color: "#6b7280",
                  fontSize: "12px",
                }}
              >
                Min order + step. e.g. 100 for
                business cards, 1 for normal
                products.
              </small>
            </div>

            {/* WEIGHT — used for shipping rates (Delhivery) */}

            <div className="form-group">
              <label>
                Weight (g)
              </label>

              <div className="input-wrapper">
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 250"
                  value={weightGrams}
                  onChange={(e) => {
                    const v = e.target.value;
                    setWeightGrams(v);
                    if (
                      v !== "" &&
                      (!Number.isFinite(Number(v)) ||
                        Number(v) <= 0)
                    ) {
                      setWeightError(
                        "Weight must be a positive number (grams)."
                      );
                    } else {
                      setWeightError("");
                    }
                  }}
                />
              </div>

              {weightError && (
                <small style={{ color: "#dc2626", fontSize: "12px" }}>
                  {weightError}
                </small>
              )}

              <small
                style={{
                  color: "#6b7280",
                  fontSize: "12px",
                }}
              >
                Optional. Single-unit weight in grams —
                used to calculate the shipping charge.
              </small>
            </div>

            {/* STOCK */}

            <div className="form-group">
              <label>
                Available Stock
                <span>*</span>
              </label>

              <div className="input-wrapper">
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="1"
                  value={stock}
                  onChange={(e) => {
                    const v = e.target.value;
                    setStock(v);
                    if (v === "" || v === "-") {
                      setStockError(
                        "Stock is required."
                      );
                    } else if (
                      !Number.isInteger(Number(v)) ||
                      Number(v) < 0
                    ) {
                      setStockError(
                        "Stock must be a whole number of 0 or more."
                      );
                    } else {
                      setStockError("");
                    }
                  }}
                />
              </div>

              {stockError && (
                <small className="field-error">
                  {stockError}
                </small>
              )}

              {!stockError &&
                stock !== "" &&
                Number(stock) === 0 && (
                  <small className="stock-zero-warning">
                    ⚠️ Stock is 0. This product will not be
                    visible to customers on the frontend and
                    cannot be added to the cart or purchased
                    until stock is increased.
                  </small>
                )}

              <small
                style={{
                  color: "#6b7280",
                  fontSize: "12px",
                }}
              >
                Units available for sale. Orders reduce this
                automatically.
              </small>
            </div>

            {/* UNIT */}

            <div className="form-group">
              <label>Selling Unit</label>

              <div className="input-wrapper">
                <select
                  value={unit}
                  onChange={(e) =>
                    setUnit(e.target.value)
                  }
                >
                  {[
                    "Pieces",
                    "Cards",
                    "Boxes",
                    "Sets",
                    "Packs",
                    "Units",
                  ].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* MAX QUANTITY */}

            <div className="form-group">
              <label>Max Quantity</label>

              <div className="input-wrapper">
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="No limit"
                  value={maxQuantity}
                  onChange={(e) =>
                    setMaxQuantity(e.target.value)
                  }
                />
              </div>
            </div>

            {/* CUSTOMIZATION */}

            <div className="form-group">
              <label>Customization</label>

              <div
                className="input-wrapper"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  border: "1px solid #d7dce3",
                  borderRadius: "7px",
                  padding: "11px 13px",
                  cursor: "pointer",
                }}
                onClick={() =>
                  setCustomizable(!customizable)
                }
              >
                <input
                  type="checkbox"
                  checked={customizable}
                  onChange={(e) =>
                    setCustomizable(e.target.checked)
                  }
                  style={{
                    width: "17px",
                    height: "17px",
                    accentColor: "#393c46",
                    cursor: "pointer",
                  }}
                />
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#24252c",
                  }}
                >
                  Enable Customization (customer
                  editor)
                </span>
              </div>

              {customizable && (
                <div
                  className="input-wrapper"
                  style={{ marginTop: "10px" }}
                >
                  <select
                    value={customizationType}
                    onChange={(e) =>
                      setCustomizationType(
                        e.target.value
                      )
                    }
                    style={{
                      width: "100%",
                      height: "42px",
                      border: "1px solid #d7dce3",
                      borderRadius: "7px",
                      padding: "0 12px",
                      fontSize: "13px",
                      background: "white",
                    }}
                  >
                    <option value="tshirt">
                      T-Shirt / Apparel
                    </option>
                    <option value="hoodie">
                      Hoodie
                    </option>
                    <option value="spiral-notebook">
                      Spiral Notebook
                    </option>
                    <option value="business-card">
                      Business Card
                    </option>
                    <option value="mug">
                      Mug
                    </option>
                    <option value="pen">
                      Pen
                    </option>
                    <option value="bottle">
                      Water Bottle
                    </option>
                    <option value="letterhead">
                      Letterhead
                    </option>
                    <option value="envelope">
                      Envelope
                    </option>
                    <option value="flyer">
                      Flyer
                    </option>
                    <option value="brochure">
                      Brochure
                    </option>
                    <option value="poster">
                      Poster
                    </option>
                    <option value="sticker">
                      Sticker / Label
                    </option>
                    <option value="paper-bag">
                      Paper Bag
                    </option>
                    <option value="tote-bag">
                      Tote Bag
                    </option>
                    <option value="box">
                      Box / Packaging
                    </option>
                    <option value="cap">
                      Cap
                    </option>
                    <option value="giftset">
                      Gift Set
                    </option>
                    <option value="other">
                      Other
                    </option>
                  </select>
                </div>
              )}

            </div>

          </div>

          {/* DISCOUNT */}

          {discount && (
            <div className="discount-preview">

              <div className="discount-icon">
                <Sparkles size={17} />
              </div>

              <div>
                <strong>
                  {discount}% OFF
                </strong>

                <span>
                  Customers will see this
                  discount on your product.
                </span>
              </div>

            </div>
          )}

          {/* IMAGES */}

          <div className="form-group">

            <label>
              Product Images
              <span>*</span>
              <small style={{ fontWeight: 400, color: "#6b7280", marginLeft: "8px" }}>
                ({images.length}/6)
              </small>
            </label>

            {images.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: "10px",
                  marginBottom: "12px",
                }}
              >
                {images.map((img, index) => (
                  <div
                    key={index}
                    style={{
                      position: "relative",
                      borderRadius: "10px",
                      overflow: "hidden",
                      border: index === 0 ? "2px solid #f14096" : "1px solid #e5e7eb",
                      aspectRatio: "1",
                    }}
                  >
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    {index === 0 && (
                      <span
                        style={{
                          position: "absolute",
                          top: "4px",
                          left: "4px",
                          background: "#f14096",
                          color: "#fff",
                          fontSize: "9px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        MAIN
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        background: "rgba(0,0,0,0.6)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "50%",
                        width: "22px",
                        height: "22px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      <X size={12} />
                    </button>
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: "rgba(0,0,0,0.5)",
                        color: "#fff",
                        fontSize: "9px",
                        padding: "3px 6px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {img.name}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {images.length < 6 && (
              <div className="image-upload-box">
                <button
                  type="button"
                  className="image-upload-trigger"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >
                  <div className="upload-icon">
                    <Upload size={28} />
                  </div>

                  <strong>
                    {images.length === 0
                      ? "Upload Product Images"
                      : "Add More Images"}
                  </strong>

                  <span>
                    Click to browse — up to {6 - images.length} more
                  </span>

                  <small>
                    JPG, JPEG, PNG, WEBP • Max 5MB each
                  </small>
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              multiple
              onChange={handleImageUpload}
              hidden
            />

            <small className="field-help">
              Upload up to 6 product images. First image is the main image.
            </small>

          </div>

          {/* DESCRIPTION */}

          <div className="form-group">

            <div className="label-row">
              <label>
                Product Description
              </label>

              <span className="character-count">
                {description.length}/500
              </span>
            </div>

            <div className="textarea-wrapper">
              <FileText size={18} />

              <textarea
                rows="6"
                maxLength="500"
                placeholder="Enter product description..."
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
              />
            </div>

          </div>

          {/* ACTIONS */}

          <div className="form-actions">

            <button
              type="button"
              className="cancel-btn"
              onClick={() =>
                navigate(
                  "/admin/products"
                )
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="submit-btn"
              disabled={success}
            >
              <Save size={18} />

              {success
                ? "Product Updated"
                : "Update Product"}
            </button>

          </div>

        </div>

        {/* ===================================================
            RIGHT PREVIEW
        =================================================== */}

        <aside className="product-preview-card">

          <div className="preview-header">

            <div>
              <span>
                LIVE PREVIEW
              </span>

              <h2>
                Product Card
              </h2>
            </div>

            <div className="preview-status">
              <i />
              Editing
            </div>

          </div>

          {/* IMAGE */}

          <div className="preview-image">

            {images.length > 0 ? (
              <div className="preview-image-inner">

                <img
                  src={images[0].dataUrl}
                  alt={
                    name ||
                    "Product Preview"
                  }
                />

                <div className="preview-image-shine" />

              </div>
            ) : (
              <div className="image-placeholder">

                <div className="placeholder-icon">
                  <ImageIcon size={42} />
                </div>

                <strong>
                  Product Image
                </strong>

                <span>
                  Upload an image to see
                  your product here
                </span>

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >
                  <Upload size={15} />
                  Upload Image
                </button>

              </div>
            )}

            {discount && (
              <span className="preview-discount">
                {discount}% OFF
              </span>
            )}

            <span className="preview-new">
              {productLoaded
                ? "EDIT"
                : "NEW"}
            </span>

          </div>

          {/* DETAILS */}

          <div className="preview-details">

            <span className="preview-category">
              {subcategory ||
                category}
            </span>

            <h3>
              {name ||
                "Your Product Name"}
            </h3>

            {description && (
              <p>{description}</p>
            )}

            <div className="preview-rating">
              <span>
                ★★★★★
              </span>

              <small>
                5.0
              </small>
            </div>

            <div className="preview-price">

              <strong>
                ₹
                {Number(
                  price || 0
                ).toLocaleString(
                  "en-IN"
                )}
              </strong>

              {oldPrice &&
                Number(oldPrice) >
                  Number(price || 0) && (
                  <del>
                    ₹
                    {Number(
                      oldPrice
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </del>
                )}

            </div>

          </div>

          {/* INFO */}

          <div className="preview-info">

            <div>
              <CheckCircle2 size={17} />
              Premium Quality
            </div>

            <div>
              <CheckCircle2 size={17} />
              Fast Delivery
            </div>

            <div>
              <CheckCircle2 size={17} />
              Quality Assured
            </div>

          </div>

        </aside>

      </form>
    </div>
  );
}
