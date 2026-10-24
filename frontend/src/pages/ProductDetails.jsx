import React, { useEffect, useRef, useState } from "react";
import { API_URL } from "../services/apiConfig";

import {
  useParams,
  useNavigate,
  Link,
} from "react-router-dom";

import {
  Star,
  Heart,
  Truck,
  ShieldCheck,
  CreditCard,
  Plus,
  Minus,
  Upload,
  ShoppingCart,
  ChevronRight,
} from "lucide-react";

import { fetchProductById, isActiveProduct, saveCustomizeSelection } from "../services/productApi";
import { loadFavorites, toggleFavoriteServer } from "../services/favoritesApi";
import { saveInquiryContext } from "../services/inquiryApi";
import { useCart } from "../context/CartContext";
import { uploadDesignFile } from "../services/fileApi";

import "../styles/ProductDetails.css";


function ProductDetails() {

  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart: contextAddToCart } = useCart();
  const designInputRef = useRef(null);

  /* =====================================================
     GET PRODUCT
  ===================================================== */

  const [product, setProduct] = useState(null);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const apiProduct = await fetchProductById(id);

        if (!apiProduct || !isActiveProduct(apiProduct)) {
          navigate("/category");
          return;
        }

        setProduct(apiProduct);
      } catch (error) {
        console.error("Product loading error:", error);
        navigate("/category");
      }
    };

    loadProduct();
  }, [id]);


  /* =====================================================
     SAFE PRODUCT DATA
  ===================================================== */

  const images =
    product?.images?.length
      ? product.images
      : product?.image
        ? [product.image]
        : [
            "https://via.placeholder.com/600x600?text=Product",
          ];


  const paperTypes =
    product?.paperTypes?.length
      ? product.paperTypes
      : ["Standard"];


  const sizes =
    product?.sizes?.length
      ? product.sizes
      : ["Standard"];


  /* =====================================================
     DYNAMIC OPTION GROUPS — DB attributes (select/
     multi-select) > legacy paperTypes/sizes fallback
  ===================================================== */

  const productAttrs = Array.isArray(
    product?.attributes
  )
    ? product.attributes
    : [];


  const optionGroups = (() => {

    const groups = productAttrs
      .filter(
        (attr) =>
          Array.isArray(attr.values) &&
          attr.values.length > 0
      )
      .map((attr) => ({
        name: attr.name,
        options: attr.values.map((v) => v.value),
      }));

    /* koi attribute nahi -> legacy fields fallback */
    if (groups.length === 0) {
      if (product?.paperTypes?.length) {
        groups.push({
          name: "Paper Type",
          options: product.paperTypes,
        });
      }
      if (product?.sizes?.length) {
        groups.push({
          name: "Size",
          options: product.sizes,
        });
      }
    }

    return groups;

  })();


  /* text/number/boolean attribute values — info display */
  const attrInfo = productAttrs
    .filter(
      (attr) =>
        (!attr.values || attr.values.length === 0) &&
        attr.value !== null &&
        attr.value !== undefined &&
        attr.value !== ""
    )
    .map((attr) => ({
      name: attr.name,
      value: String(attr.value),
    }));


  const features =
    product?.features?.length
      ? product.features
      : [
          "Premium Quality",
          "High Quality Material",
          "Fast Delivery",
        ];


  /* =====================================================
     STATES
  ===================================================== */

  const [selectedImage, setSelectedImage] =
    useState(0);

  const [quantity, setQuantity] =
    useState(1);

  /* null = not editing; string = user typing */
  const [quantityRaw, setQuantityRaw] =
    useState(null);

  /* Admin-set quantity step / min order */
  const quantityStep = Math.max(
    1,
    Number(product?.quantityStep) || 1
  );

  /* product ka unit label (Cards / Pieces / Boxes ...) */
  const unitLabel =
    String(product?.unit || "Pieces").trim() ||
    "Pieces";

  /* max order qty — product pe set ho to enforce */
  const maxQuantity =
    product?.maxQuantity !== null &&
    product?.maxQuantity !== undefined &&
    Number(product?.maxQuantity) > 0
      ? Number(product.maxQuantity)
      : null;

  /* Product load hone pe start qty = step */
  useEffect(() => {
    setQuantity(quantityStep);
  }, [quantityStep, id]);

  /* dynamic attribute selections — { attrName: value } */
  const [attrSelections, setAttrSelections] =
    useState({});

  useEffect(() => {
    const init = {};
    productAttrs.forEach((attr) => {
      if (attr.values?.length) {
        init[attr.name] = attr.values[0].value;
      }
    });
    setAttrSelections(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);


  /* legacy cart keys compat — attribute names se derive */
  const paper =
    attrSelections["Paper Type"] || paperTypes[0];

  const size =
    attrSelections["Size"] ||
    attrSelections["Capacity"] ||
    sizes[0];

  const [isFavorite, setIsFavorite] =
    useState(false);

  const [uploadedDesigns, setUploadedDesigns] =
    useState([]);


  /* =====================================================
     CUSTOMER REVIEW STATES
  ===================================================== */

  const [customerReviews, setCustomerReviews] =
    useState([]);

  const [reviewName, setReviewName] =
    useState("");

  const [reviewRating, setReviewRating] =
    useState(5);

  const [reviewText, setReviewText] =
    useState("");

  /* =====================================================
     INFO TABS
  ===================================================== */

  const [activeTab, setActiveTab] =
    useState("details");


  /* =====================================================
     LOAD CUSTOMER REVIEWS
  ===================================================== */

  const loadCustomerReviews = () => {

    if (!product) return;

    try {

      const savedReviews =
        localStorage.getItem(
          "printExpertProductReviews"
        );

      const allReviews =
        savedReviews
          ? JSON.parse(savedReviews)
          : {};

      const productReviews =
        allReviews[String(product.id)] || [];

      setCustomerReviews(
        Array.isArray(productReviews)
          ? productReviews
          : []
      );

    } catch (error) {

      console.error(
        "Review loading error:",
        error
      );

      setCustomerReviews([]);

    }

  };


  /* =====================================================
     LOAD REVIEWS
  ===================================================== */

  useEffect(() => {

    loadCustomerReviews();

  }, [product?.id]);


  /* =====================================================
     CHECK FAVORITE
  ===================================================== */

  useEffect(() => {

    if (!product) return;

    let cancelled = false;

    /* server list for logged-in, localStorage for guests */
    loadFavorites()
      .then((list) => {
        if (cancelled) return;
        setIsFavorite(
          list.some(
            (item) =>
              String(item?.id) ===
              String(product.id)
          )
        );
      })
      .catch(() => {
        if (!cancelled) setIsFavorite(false);
      });

    return () => {
      cancelled = true;
    };

  }, [product?.id]);


  /* =====================================================
     PRODUCT NOT FOUND
  ===================================================== */

  if (!product) {

    return (

      <div className="not-found">

        <h1>
          Product Not Found
        </h1>

        <p>
          This product does not exist
          or has been removed.
        </p>

        <Link to="/category">
          Back to Products
        </Link>

      </div>

    );

  }


  /* =====================================================
     PRICE
  ===================================================== */

  const price =
    Number(product.price) || 0;


  const oldPrice =
    Number(product.oldPrice) || 0;


  /* =====================================================
     REVIEW COUNT
  ===================================================== */

  const originalReviewCount =
    Number(product.reviews) || 0;

  const totalReviewCount =
    originalReviewCount +
    customerReviews.length;


  /* =====================================================
     INCREASE QUANTITY
  ===================================================== */

  const increaseQuantity = () => {

    setQuantity(
      (previousQuantity) => {
        const next = previousQuantity + quantityStep;
        return maxQuantity
          ? Math.min(maxQuantity, next)
          : next;
      }
    );

  };


  /* =====================================================
     DECREASE QUANTITY
  ===================================================== */

  const decreaseQuantity = () => {

    setQuantity(
      (previousQuantity) =>
        Math.max(
          quantityStep,
          previousQuantity - quantityStep
        )
    );

  };


  /* =====================================================
     DIRECT QUANTITY INPUT — type/paste allowed
  ===================================================== */

  const handleQuantityInput = (event) => {

    const raw = event.target.value;

    /* digits only — alphabets/sign reject */
    if (raw !== "" && !/^\d+$/.test(raw)) {
      return;
    }

    if (raw === "") {
      setQuantityRaw("");
      return;
    }

    setQuantityRaw(raw);
  };


  const commitQuantityInput = () => {

    const parsed = Math.floor(
      Number(quantityRaw)
    );

    if (
      !Number.isFinite(parsed) ||
      parsed <= 0
    ) {
      setQuantityRaw(null);
      return;
    }

    let next = Math.max(quantityStep, parsed);
    if (maxQuantity) {
      next = Math.min(maxQuantity, next);
    }

    setQuantity(next);
    setQuantityRaw(null);

  };


  /* =====================================================
     TOGGLE FAVORITE
  ===================================================== */

  const toggleFavorite = async () => {

    /* optimistic heart — guest: localStorage; logged-in:
       server + mirror. Server failure rolls the heart
       back to its true state */
    const previous = isFavorite;

    setIsFavorite(!previous);

    const res = await toggleFavoriteServer(
      product
    );

    setIsFavorite(res.added);

    if (!res.ok) {

      setIsFavorite(previous);

      alert(
        "Favorites save nahi ho paya. Please try again."
      );

    }

  };


  /* =====================================================
     UPLOAD
  ===================================================== */

  const handleUpload = () => {
    designInputRef.current?.click();
  };

  const MAX_DESIGN_FILES = 5;

  const handleUploadedDesign = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    const allowed = ["image/png", "image/jpeg", "application/pdf"];

    const remaining = MAX_DESIGN_FILES - uploadedDesigns.length;
    if (remaining <= 0) {
      alert(`Maximum ${MAX_DESIGN_FILES} design files allowed.`);
      return;
    }

    const toProcess = files.slice(0, remaining);

    const invalid = toProcess.filter(
      (f) => !allowed.includes(f.type) || f.size > 10 * 1024 * 1024
    );
    if (invalid.length) {
      alert("Only PNG, JPG/JPEG, or PDF files up to 10 MB each are allowed.");
      return;
    }

    let loaded = 0;
    const results = [];
    toProcess.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = () => {
        results[idx] = {
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: reader.result,
        };
        loaded++;
        if (loaded === toProcess.length) {
          setUploadedDesigns((prev) =>
            [...prev, ...results].slice(0, MAX_DESIGN_FILES)
          );
        }
      };
      reader.readAsDataURL(file);
    });

    if (files.length > remaining) {
      alert(
        `Only ${remaining} more file(s) can be added (max ${MAX_DESIGN_FILES}).`
      );
    }
  };


  /* =====================================================
     CUSTOMIZE — sirf customizable products pe
  ===================================================== */

  const isCustomizableProduct = Boolean(
    product?.customizable ||
      product?.isCustomizable ||
      product?.customizationType ||
      product?.type
  );

  const handleCustomize = () => {
    saveCustomizeSelection(product, {
      paperType: paper,
      size,
      quantity,
    });

    navigate("/customize");
  };


  /* =====================================================
     ADD TO CART
  ===================================================== */

  const handleAddToCart = async () => {

    try {

      /* uploaded design files → durable fileId refs.
         Logged-in: upload bytes to /api/files now so the
         cart row survives refresh + other devices.
         Guest: metadata only, bytes stay in localStorage
         until checkout uploads them. */
      let designsForCart = uploadedDesigns.map((d) => ({
        name: d.name,
        type: d.type,
        size: d.size,
      }));

      const isAuthed = Boolean(
        localStorage.getItem("authToken")
      );

      if (uploadedDesigns.length > 0 && isAuthed) {
        designsForCart = await Promise.all(
          uploadedDesigns.map(async (d) => {
            const up = await uploadDesignFile({
              name: d.name,
              type: d.type,
              dataUrl: d.dataUrl,
            });
            return up.success
              ? {
                  name: d.name,
                  type: d.type,
                  size: d.size,
                  fileId: up.fileId,
                  url: up.url,
                }
              : {
                  name: d.name,
                  type: d.type,
                  size: d.size,
                  uploadFailed: true,
                };
          })
        );
      }

      if (uploadedDesigns.length > 0 && !isAuthed) {
        /* guest — store full bytes separately so checkout
           can recover + upload them after login */
        try {
          const designKey = `printExpertDesigns_${product.id}`;
          localStorage.setItem(
            designKey,
            JSON.stringify(uploadedDesigns)
          );
        } catch {
          /* quota issue — designs kept in memory only,
             will be available until page refresh */
        }
      }

      const result = await contextAddToCart({
        productId: product.id,
        product_id: product.id,
        name: product.name,
        price,
        quantity,
        quantityStep,
        paperType: paper,
        size,
        attributes: { ...attrSelections },
        unit: unitLabel,
        image: images[0],
        category: product.category || "General",
        description: product.description || "",
        uploadedDesigns: designsForCart,
        hasUploadedDesign: uploadedDesigns.length > 0,
        isCustomized: uploadedDesigns.length > 0,
        itemType: "standard",
      });

      if (result?.error) {
        alert(result.error);
      } else {
        alert(
          `${product.name} added to cart!`
        );
      }

    } catch (error) {

      console.error(
        "Cart error:",
        error
      );

      alert(
        "Unable to add product to cart."
      );

    }

  };


  /* =====================================================
     SUBMIT CUSTOMER REVIEW
  ===================================================== */

  const handleReviewSubmit = async (e) => {

    e.preventDefault();


    /* ================= VALIDATION ================= */

    const name =
      reviewName.trim();

    const message =
      reviewText.trim();


    if (!name) {

      alert(
        "Please enter your name."
      );

      return;

    }


    if (!message) {

      alert(
        "Please write your review."
      );

      return;

    }


    if (message.length < 5) {

      alert(
        "Review should contain at least 5 characters."
      );

      return;

    }


    /* =================================================
       CREATE REVIEW
    ================================================= */

    const newReview = {

      id:
        Date.now(),

      productId:
        product.id,

      name:
        name,

      rating:
        Number(reviewRating),

      comment:
        message,

      date:
        new Date().toLocaleDateString(
          "en-IN",
          {
            day: "numeric",
            month: "short",
            year: "numeric",
          }
        ),

    };


    try {

      const savedReviews =
        localStorage.getItem(
          "printExpertProductReviews"
        );


      const allReviews =
        savedReviews
          ? JSON.parse(savedReviews)
          : {};


      const currentProductReviews =
        Array.isArray(
          allReviews[String(product.id)]
        )
          ? allReviews[String(product.id)]
          : [];


      const updatedProductReviews = [

        newReview,

        ...currentProductReviews,

      ];


      allReviews[String(product.id)] =
        updatedProductReviews;


      /* =================================================
         SAVE
      ================================================= */

      localStorage.setItem(
        "printExpertProductReviews",
        JSON.stringify(
          allReviews
        )
      );


      /* =================================================
         SAVE TO BACKEND
      ================================================= */

      try {
        await fetch(
          `${API_URL}/feedback`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              name: name,
              message: message,
              type: "review",
              product_id: product.id,
              rating:
                Number(reviewRating),
              subject:
                product.name,
            }),
          }
        );
      } catch {
        // Backend save is optional
      }


      /* =================================================
         UPDATE SCREEN
      ================================================= */

      setCustomerReviews(
        updatedProductReviews
      );


      /* =================================================
         RESET FORM
      ================================================= */

      setReviewName("");

      setReviewRating(5);

      setReviewText("");


      alert(
        "Thank you! Your review has been posted."
      );


      /* =================================================
         SCROLL TO REVIEWS
      ================================================= */

      setTimeout(() => {

        document
          .getElementById(
            "customer-reviews"
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });

      }, 100);


    } catch (error) {

      console.error(
        "Review save error:",
        error
      );

      alert(
        "Unable to post your review."
      );

    }

  };


  /* =====================================================
     DELETE REVIEW
     Optional local review delete
  ===================================================== */

  const deleteReview = (reviewId) => {

    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this review?"
      );


    if (!confirmDelete) return;


    try {

      const savedReviews =
        localStorage.getItem(
          "printExpertProductReviews"
        );


      const allReviews =
        savedReviews
          ? JSON.parse(savedReviews)
          : {};


      const updatedReviews =
        customerReviews.filter(
          (review) =>
            review.id !== reviewId
        );


      allReviews[String(product.id)] =
        updatedReviews;


      localStorage.setItem(
        "printExpertProductReviews",
        JSON.stringify(
          allReviews
        )
      );


      setCustomerReviews(
        updatedReviews
      );


    } catch (error) {

      console.error(
        "Delete review error:",
        error
      );

    }

  };


  /* =====================================================
     RETURN
  ===================================================== */

  return (

    <div className="product-details-page">


      {/* =================================================
          BREADCRUMB
      ================================================= */}

      <div className="details-container breadcrumb-details">

        <Link to="/">
          Home
        </Link>

        <ChevronRight size={15} />

        <Link to="/category">
          {product.category || "Products"}
        </Link>

        <ChevronRight size={15} />

        <span>
          {product.name}
        </span>

      </div>


      {/* =================================================
          PRODUCT MAIN
      ================================================= */}

      <section
        className="details-container product-main"
      >


        {/* =================================================
            IMAGE AREA
        ================================================= */}

        <div className="product-gallery">


          {/* MAIN IMAGE */}

          <div className="main-product-image">

            <img
              src={
                images[selectedImage] ||
                images[0]
              }
              alt={
                product.name
              }
            />


            {/* FAVORITE BUTTON */}

            <button
              className={
                isFavorite
                  ? "image-heart active"
                  : "image-heart"
              }
              type="button"
              onClick={
                toggleFavorite
              }
              aria-label={
                isFavorite
                  ? "Remove from favorites"
                  : "Add to favorites"
              }
              title={
                isFavorite
                  ? "Remove from Favorites"
                  : "Add to Favorites"
              }
            >

              <Heart
                size={20}
                fill={
                  isFavorite
                    ? "currentColor"
                    : "none"
                }
              />

            </button>

          </div>


          {/* THUMBNAILS */}

          <div className="thumbnail-row">

            {images.map(
              (image, index) => (

                <button
                  key={`${image}-${index}`}
                  type="button"
                  className={
                    selectedImage === index
                      ? "thumbnail active"
                      : "thumbnail"
                  }
                  onClick={() =>
                    setSelectedImage(
                      index
                    )
                  }
                >

                  <img
                    src={image}
                    alt={
                      `${product.name} ${index + 1}`
                    }
                  />

                </button>

              )
            )}

          </div>

        </div>


        {/* =================================================
            PRODUCT INFORMATION
        ================================================= */}

        <div className="product-info">


          {/* BADGE */}

          <span className="details-badge">

            {product.badge || "NEW"}

          </span>


          {/* NAME */}

          <h1>
            {product.name}
          </h1>


          {/* RATING */}

          <div className="details-rating">

            <span className="stars">

              <Star
                size={17}
                fill="currentColor"
              />

              {product.rating || "4.8"}

            </span>


            <span>

              (
              {totalReviewCount}
              Reviews)

            </span>

          </div>


          {/* DESCRIPTION */}

          <p className="details-description">

            {product.description ||
              "Premium quality customized product designed for your brand and business."}

          </p>


          {/* PRICE */}

          <div className="details-price">

            <strong>

              ₹
              {price.toLocaleString(
                "en-IN"
              )}

            </strong>


            {oldPrice > price && (

              <del>

                ₹
                {oldPrice.toLocaleString(
                  "en-IN"
                )}

              </del>

            )}


            {product.discount && (

              <span>

                {product.discount}

              </span>

            )}

          </div>


          <small className="tax-text">

            Inclusive of all taxes

          </small>


          {/* =================================================
              TRUST
          ================================================= */}

          <div className="product-trust">


            <div>

              <Truck />

              <strong>
                Fast Delivery
              </strong>

              <span>
                3–5 business days
              </span>

            </div>


            <div>

              <ShieldCheck />

              <strong>
                Premium Quality
              </strong>

              <span>
                100% quality assured
              </span>

            </div>


            <div>

              <CreditCard />

              <strong>
                Secure Payment
              </strong>

              <span>
                Safe checkout
              </span>

            </div>


          </div>


          {/* =================================================
              PAPER TYPE
          ================================================= */}

          {/* =================================================
              DYNAMIC ATTRIBUTES — DB se (Paper Type sirf
              card/print products pe, Capacity sirf drinkware pe)
          ================================================= */}

          {optionGroups.map(
            (group) => (

              <div
                className="option-section"
                key={group.name}
              >

                <h3>
                  {group.name}
                </h3>


                <div className="options">

                  {group.options.map(
                    (item) => (

                      <button
                        key={item}
                        type="button"
                        className={
                          attrSelections[
                            group.name
                          ] === item
                            ? "option active"
                            : "option"
                        }
                        onClick={() =>
                          setAttrSelections(
                            (prev) => ({
                              ...prev,
                              [group.name]: item,
                            })
                          )
                        }
                      >

                        {item}

                      </button>

                    )
                  )}

                </div>

              </div>

            )
          )}


          {/* text/number/boolean attributes — info lines */}

          {attrInfo.length > 0 && (
            <div className="option-section">
              <div className="options">
                {attrInfo.map((info) => (
                  <span
                    key={info.name}
                    className="option"
                    style={{ cursor: "default" }}
                  >
                    {info.name}: {info.value}
                  </span>
                ))}
              </div>
            </div>
          )}


          {/* =================================================
              QUANTITY
          ================================================= */}

          <div className="option-section">

            <h3>
              Quantity
            </h3>


            <div className="quantity">

              <button
                type="button"
                onClick={
                  decreaseQuantity
                }
                disabled={
                  quantity <= quantityStep
                }
                aria-label="Decrease quantity"
              >

                <Minus size={16} />

              </button>


              <input
                type="number"
                className="quantity-input"
                min={quantityStep}
                {...(maxQuantity
                  ? { max: maxQuantity }
                  : {})}
                value={
                  quantityRaw === null
                    ? quantity
                    : quantityRaw
                }
                onChange={handleQuantityInput}
                onBlur={commitQuantityInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitQuantityInput();
                  }
                }}
                aria-label={`Quantity in ${unitLabel}`}
                style={{
                  width: "70px",
                  textAlign: "center",
                  fontSize: "15px",
                  fontWeight: 600,
                }}
              />

              <span
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  marginLeft: "4px",
                }}
              >
                {unitLabel}
              </span>


              <button
                type="button"
                onClick={
                  increaseQuantity
                }
                aria-label="Increase quantity"
              >

                <Plus size={16} />

              </button>

            </div>

          </div>


          {/* =================================================
              ACTION BUTTONS
          ================================================= */}

          <div className="product-actions">


            {isCustomizableProduct && (
              <button
                type="button"
                className="customize-btn"
                onClick={
                  handleCustomize
                }
              >

                Customize Now

              </button>
            )}


            <button
              type="button"
              className="upload-btn"
              onClick={
                handleUpload
              }
            >

              <Upload size={17} />

              Upload Design

            </button>

            <input
              ref={designInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
              multiple
              onChange={handleUploadedDesign}
              hidden
            />


            <button
              type="button"
              className="cart-btn"
              onClick={
                handleAddToCart
              }
            >

              <ShoppingCart size={17} />

              Add to Cart

            </button>

          </div>

          {uploadedDesigns.length > 0 && (
            <div className="uploaded-designs-list">
              {uploadedDesigns.map((d, i) => (
                <div className="uploaded-design-summary" key={i}>
                  <Upload size={17} />
                  <div>
                    <strong>{d.name}</strong>
                    <span>Ready-made design attached</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setUploadedDesigns((prev) =>
                        prev.filter((_, idx) => idx !== i)
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              {uploadedDesigns.length < MAX_DESIGN_FILES && (
                <button
                  type="button"
                  className="add-more-designs"
                  onClick={handleUpload}
                >
                  + Add More ({uploadedDesigns.length}/{MAX_DESIGN_FILES})
                </button>
              )}
            </div>
          )}


          {/* =================================================
              BULK MESSAGE
          ================================================= */}

          <div
            className="bulk-message"
            role="button"
            tabIndex={0}
            style={{ cursor: "pointer" }}
            onClick={() => {
              saveInquiryContext({
                productId: product.id,
                productName: product.name,
                size,
                quantity,
                source: "product-detail",
              });

              navigate("/#contact-inquiry");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                saveInquiryContext({
                  productId: product.id,
                  productName: product.name,
                  size,
                  quantity,
                  source: "product-detail",
                });

                navigate("/#contact-inquiry");
              }
            }}
          >

            💼 Bulk orders get additional discounts.
            Contact us for custom pricing →

          </div>

        </div>

      </section>


      {/* =================================================
          PRODUCT INFORMATION
      ================================================= */}

      <section
        className="details-container information-section"
      >


        {/* TABS */}

        <div className="information-tabs">

          <button
            type="button"
            className={
              activeTab === "details"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab("details")
            }
          >

            Product Details

          </button>


          <button
            type="button"
            className={
              activeTab === "specs"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab("specs")
            }
          >

            Specifications

          </button>


          <button
            type="button"
            className={
              activeTab === "guidelines"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab("guidelines")
            }
          >

            Design Guidelines

          </button>


          <button
            type="button"
            className={
              activeTab === "reviews"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab("reviews")
            }
          >

            Reviews (
            {totalReviewCount}
            )

          </button>

        </div>


        {/* CONTENT */}

        <div className="information-content">


          {activeTab === "details" && (
            <>

          <div>

            <h2>

              {product.name}

            </h2>


            <p>

              {product.description ||
                "Designed for businesses that want premium quality, professional finishing and unforgettable brand presentation."}

            </p>


            <h3>
              Features
            </h3>


            <ul>

              {features.map(
                (feature, index) => (

                  <li
                    key={`${feature}-${index}`}
                  >

                    <span>
                      ✓
                    </span>

                    {feature}

                  </li>

                )
              )}

            </ul>

          </div>


          <img
            src={
              images[1] ||
              images[0]
            }
            alt={
              product.name
            }
          />

            </>
          )}


          {/* SPECIFICATIONS */}

          {activeTab === "specs" && (
            <div className="spec-tab-content">

              <h2>
                Specifications
              </h2>

              <table className="spec-table">
                <tbody>

                  <tr>
                    <td>Product Name</td>
                    <td>{product.name}</td>
                  </tr>

                  <tr>
                    <td>Category</td>
                    <td>
                      {product.category}
                      {product.subcategory
                        ? ` — ${product.subcategory}`
                        : ""}
                    </td>
                  </tr>

                  {sizes.length > 0 && (
                    <tr>
                      <td>Available Sizes</td>
                      <td>{sizes.join(", ")}</td>
                    </tr>
                  )}

                  {paperTypes.length > 0 && (
                    <tr>
                      <td>Paper / Material</td>
                      <td>{paperTypes.join(", ")}</td>
                    </tr>
                  )}

                  {features.length > 0 && (
                    <tr>
                      <td>Features</td>
                      <td>{features.join(", ")}</td>
                    </tr>
                  )}

                  <tr>
                    <td>Minimum Order</td>
                    <td>
                      {Number(
                        product.quantityStep || 1
                      )}{" "}
                      unit(s)
                    </td>
                  </tr>

                  <tr>
                    <td>Stock</td>
                    <td>
                      {Number(product.stock) > 0
                        ? `${Number(product.stock)} available`
                        : "Available on order"}
                    </td>
                  </tr>

                  <tr>
                    <td>Customization</td>
                    <td>
                      {isCustomizableProduct
                        ? `Yes — ${
                            product.customizationType ||
                            "available"
                          }`
                        : "Not available"}
                    </td>
                  </tr>

                </tbody>
              </table>

            </div>
          )}


          {/* DESIGN GUIDELINES */}

          {activeTab === "guidelines" && (
            <div className="spec-tab-content">

              <h2>
                Design Guidelines
              </h2>

              <ul className="guideline-list">
                <li>
                  <span>✓</span>
                  High-resolution artwork use karein
                  (300 DPI recommended) — blurry
                  images print mein bhi blurry
                  aati hain.
                </li>
                <li>
                  <span>✓</span>
                  Transparent PNG logo best result
                  deta hai. JPG white background
                  ke saath bhi chalega.
                </li>
                <li>
                  <span>✓</span>
                  Text ko print area ke andar
                  rakhein — edges ke paas design
                  cut ho sakta hai.
                </li>
                <li>
                  <span>✓</span>
                  Dark product pe light colors,
                  light product pe dark colors
                  best contrast dete hain.
                </li>
                <li>
                  <span>✓</span>
                  Screen colors aur print colors
                  mein thoda difference ho sakta
                  hai (CMYK printing).
                </li>
                <li>
                  <span>✓</span>
                  Final design save karne se pehle
                  Preview mode mein front aur
                  back dono check karein.
                </li>
              </ul>

            </div>
          )}


          {/* REVIEWS */}

          {activeTab === "reviews" && (
            <div className="spec-tab-content">

              <h2>
                Customer Reviews
              </h2>

              <div className="tab-review-summary">
                <strong>
                  {product.rating || "4.8"}
                </strong>

                <div className="summary-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={18}
                      fill="currentColor"
                    />
                  ))}
                </div>

                <span>
                  {totalReviewCount} reviews
                </span>
              </div>

              {customerReviews.length === 0 ? (
                <p>
                  Is product ke liye abhi koi
                  customer review nahi hai.
                  Neeche review section se pehla
                  review likhein.
                </p>
              ) : (
                <ul className="tab-review-list">
                  {customerReviews
                    .slice(0, 5)
                    .map((r, i) => (
                      <li key={i}>
                        <strong>
                          {r.name || "Customer"}
                        </strong>
                        <span className="tab-review-stars">
                          {"★".repeat(
                            Number(r.rating) || 5
                          )}
                        </span>
                        <p>{r.text}</p>
                      </li>
                    ))}
                </ul>
              )}

              <button
                type="button"
                className="view-details"
                style={{
                  display: "inline-block",
                  width: "auto",
                  padding: "10px 22px",
                  marginTop: "12px",
                }}
                onClick={() =>
                  document
                    .getElementById(
                      "customer-reviews"
                    )
                    ?.scrollIntoView({
                      behavior: "smooth",
                    })
                }
              >
                See All Reviews / Write a Review
              </button>

            </div>
          )}

        </div>


        {/* =================================================
            SERVICE BOXES
        ================================================= */}

        <div className="service-boxes">


          <div>

            <ShieldCheck />

            <strong>
              Premium Quality
            </strong>

            <span>
              Long lasting print
            </span>

          </div>


          <div>

            <Truck />

            <strong>
              Fast Delivery
            </strong>

            <span>
              Pan India delivery
            </span>

          </div>


          <div>

            <CreditCard />

            <strong>
              Secure Payment
            </strong>

            <span>
              100% secure checkout
            </span>

          </div>


          <div>

            <Heart />

            <strong>
              Customer Support
            </strong>

            <span>
              We're here to help
            </span>

          </div>


        </div>

      </section>


      {/* =====================================================
          CUSTOMER REVIEWS
      ===================================================== */}

      <section
        className="details-container customer-reviews-section"
        id="customer-reviews"
      >

        {/* =================================================
            REVIEW HEADER
        ================================================= */}

        <div className="customer-review-header">

          <div>

            <span className="review-small-title">
              CUSTOMER FEEDBACK
            </span>

            <h2>
              Customer Reviews
            </h2>

            <p>
              See what customers are saying
              about this product.
            </p>

          </div>


          <div className="review-summary">

            <strong>
              {product.rating || "4.8"}
            </strong>

            <div className="summary-stars">

              {[1, 2, 3, 4, 5].map(
                (star) => (

                  <Star
                    key={star}
                    size={18}
                    fill="currentColor"
                  />

                )
              )}

            </div>

            <span>
              {totalReviewCount} reviews
            </span>

          </div>

        </div>


        {/* =================================================
            WRITE REVIEW
        ================================================= */}

        <div className="write-review-box">

          <div className="write-review-title">

            <h3>
              Write a Review
            </h3>

            <p>
              Share your experience with
              this product.
            </p>

          </div>


          <form
            onSubmit={
              handleReviewSubmit
            }
            className="review-form"
          >


            {/* NAME */}

            <div className="review-field">

              <label>
                Your Name
              </label>

              <input
                type="text"
                value={reviewName}
                onChange={(e) =>
                  setReviewName(
                    e.target.value
                  )
                }
                placeholder="Enter your name"
                maxLength={50}
              />

            </div>


            {/* RATING */}

            <div className="review-field">

              <label>
                Your Rating
              </label>

              <div className="review-star-selector">

                {[1, 2, 3, 4, 5].map(
                  (star) => (

                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        setReviewRating(
                          star
                        )
                      }
                      className={
                        star <= reviewRating
                          ? "selected"
                          : ""
                      }
                      aria-label={`Rate ${star} stars`}
                    >

                      <Star
                        size={25}
                        fill={
                          star <=
                          reviewRating
                            ? "currentColor"
                            : "none"
                        }
                      />

                    </button>

                  )
                )}

              </div>

            </div>


            {/* REVIEW */}

            <div className="review-field">

              <label>
                Your Review
              </label>

              <textarea
                value={reviewText}
                onChange={(e) =>
                  setReviewText(
                    e.target.value
                  )
                }
                placeholder="Write your experience about this product..."
                rows="5"
                maxLength={500}
              />

              <small>
                {reviewText.length}/500
              </small>

            </div>


            {/* SUBMIT */}

            <button
              type="submit"
              className="submit-review-btn"
            >

              Post Review

            </button>

          </form>

        </div>


        {/* =================================================
            CUSTOMER REVIEW LIST
        ================================================= */}

        <div className="reviews-list">

          {customerReviews.length === 0 ? (

            <div className="no-reviews">

              <div className="no-review-icon">
                ★
              </div>

              <h3>
                No Customer Reviews Yet
              </h3>

              <p>
                Be the first customer to
                review this product.
              </p>

            </div>

          ) : (

            customerReviews.map(
              (review) => (

                <article
                  className="customer-review-card"
                  key={review.id}
                >

                  {/* REVIEW TOP */}

                  <div className="review-card-top">

                    <div className="review-user">

                      <div className="review-avatar">

                        {review.name
                          .charAt(0)
                          .toUpperCase()}

                      </div>


                      <div>

                        <h4>
                          {review.name}
                        </h4>

                        <span>
                          {review.date}
                        </span>

                      </div>

                    </div>


                    {/* STARS */}

                    <div className="customer-stars">

                      {[1, 2, 3, 4, 5].map(
                        (star) => (

                          <Star
                            key={star}
                            size={16}
                            fill={
                              star <=
                              review.rating
                                ? "currentColor"
                                : "none"
                            }
                          />

                        )
                      )}

                    </div>

                  </div>


                  {/* COMMENT */}

                  <p className="review-comment">

                    {review.comment}

                  </p>


                  {/* VERIFIED */}

                  <div className="review-bottom">

                    <span className="verified-review">

                      ✓ Verified Customer

                    </span>


                    <button
                      type="button"
                      className="delete-review-btn"
                      onClick={() =>
                        deleteReview(
                          review.id
                        )
                      }
                    >

                      Delete

                    </button>

                  </div>

                </article>

              )
            )

          )}

        </div>

      </section>


    </div>

  );

}


export default ProductDetails;