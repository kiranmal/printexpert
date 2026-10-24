
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_URL } from "../services/apiConfig";
import { saveOrderToServer } from "../services/orderApi";
import { uploadDesignFile } from "../services/fileApi";
import { validateCoupon } from "../services/couponApi";
import { useCart } from "../context/CartContext";
import BrochureArtwork from "../components/BrochureArtwork";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  loadRazorpayScript,
} from "../services/paymentApi";

import {
  MapPin,
  User,
  Phone,
  Mail,
  CreditCard,
  Wallet,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShoppingBag,
  ShieldCheck,
} from "lucide-react";

import "./Checkout.css";

/* =====================================================
   RAZORPAY CHECKOUT
   server razorpay order create karta hai (amount server
   se), popup response sirf signature verify karke paid
===================================================== */
const openRazorpayCheckout = async (order) => {
  const rzpOrder = await createRazorpayOrder(
    order.orderNumber
  );

  if (!rzpOrder?.success || !rzpOrder.razorpayOrderId) {
    alert(
      rzpOrder?.message ||
        "Unable to start online payment. Order saved as pending."
    );
    return false;
  }

  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    alert(
      "Payment library failed to load. Check your internet connection."
    );
    return false;
  }

  return await new Promise((resolve) => {
    const razorpay = new window.Razorpay({
      key: rzpOrder.keyId,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency || "INR",
      name: "Print Expert",
      description: `Order ${order.orderNumber}`,
      order_id: rzpOrder.razorpayOrderId,
      prefill: {
        name: order.customerName || "",
        email: order.email || "",
        contact: order.phone || "",
      },
      theme: { color: "#b91162" },
      modal: {
        ondismiss: () => resolve(false),
      },
      handler: async (response) => {
        const verified = await verifyRazorpayPayment(
          order.orderNumber,
          response.razorpay_order_id,
          response.razorpay_payment_id,
          response.razorpay_signature
        );

        if (verified?.success) {
          resolve(true);
        } else {
          alert(
            verified?.message ||
              "Payment verification failed. Order saved as pending."
          );
          resolve(false);
        }
      },
    });

    razorpay.open();
  });
};

function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    clearCart: contextClearCart,
    cartItems: contextCart,
    loading: cartLoading,
  } = useCart();

  /*
  =====================================================
  CART — CartContext is authoritative for normal checkout;
  route state is used only for single-item "direct orders"
  =====================================================
  */

  const isDirectOrder = Boolean(
    location.state?.directOrder
  );

  const [cart, setCart] = useState(
    isDirectOrder &&
      Array.isArray(location.state?.cart)
      ? location.state.cart
      : []
  );

  /* sync from CartContext — server cart is source of truth */
  useEffect(() => {
    if (!isDirectOrder) {
      setCart(contextCart);
    }
  }, [isDirectOrder, contextCart]);

  const [totalPrice, setTotalPrice] = useState(
    Number(location.state?.totalPrice || 0)
  );

  const [totalQuantity, setTotalQuantity] = useState(
    Number(location.state?.totalQuantity || 0)
  );

  /*
  =====================================================
  COUPON
  =====================================================
  */

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const couponDiscount = Math.min(
    Number(appliedCoupon?.discount) || 0,
    totalPrice
  );

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();

    if (!code) {
      return;
    }

    setApplyingCoupon(true);
    setCouponMessage("");

    const result = await validateCoupon(
      code,
      totalPrice
    );

    setApplyingCoupon(false);

    if (!result?.success) {
      setAppliedCoupon(null);
      setCouponMessage(
        result?.message || "Invalid coupon."
      );
      return;
    }

    setAppliedCoupon({
      code: result.coupon?.code || code,
      discount: Number(result.discount) || 0,
      label:
        result.coupon?.type === "percent"
          ? `${result.coupon.value}% OFF`
          : `₹${result.coupon.value} OFF`,
    });
    setCouponMessage("");
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponMessage("");
  };

  /*
  =====================================================
  FORM
  =====================================================
  */

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  /*
  =====================================================
  PAYMENT
  =====================================================
  */

  const [paymentMethod, setPaymentMethod] = useState("cod");

  /*
  =====================================================
  SUCCESS
  =====================================================
  */

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [placing, setPlacing] = useState(false);

  /* persisted order confirmation — survives refresh.
     Restored only when the cart is empty (the natural
     post-order state); a stale key is cleared when the
     customer starts shopping again. */
  const [restoredSuccess] = useState(() => {
    try {
      const s = JSON.parse(
        localStorage.getItem("printExpertOrderSuccess") ||
          "null"
      );
      /* consume-once + freshness gate: the success screen
         only survives a refresh when it is bound to a real
         order number AND was written <30 min ago — stale
         confirmations never resurface on a later visit */
      const fresh =
        s &&
        s.orderNumber &&
        s.at &&
        Date.now() - new Date(s.at).getTime() <
          30 * 60 * 1000;
      if (!fresh) {
        if (s) {
          try {
            localStorage.removeItem("printExpertOrderSuccess");
          } catch {}
        }
        return null;
      }
      return s;
    } catch {
      return null;
    }
  });
  /* null = not checked | true = verified | "error" = failed */
  const [successVerified, setSuccessVerified] =
    useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const freshPlaced = useRef(false);

  /*
  =====================================================
  RESTORE ORDER CONFIRMATION AFTER REFRESH
  Show the persisted success screen only when the cart
  is empty (post-order state). Once restored, verify
  against the server and display the authoritative total.
  =====================================================
  */

  useEffect(() => {
    if (orderPlaced || !restoredSuccess) return;

    /* cart not loaded yet — wait */
    if (!isDirectOrder && cartLoading) return;

    /* customer already started shopping again — drop the
       stale confirmation and show normal checkout */
    if (cart.length > 0) {
      localStorage.removeItem("printExpertOrderSuccess");
      return;
    }

    setOrderId(restoredSuccess.orderNumber);
    setTotalPrice(Number(restoredSuccess.total) || 0);
    setOrderItems(
      Array.isArray(restoredSuccess.items)
        ? restoredSuccess.items
        : []
    );
    setOrderPlaced(true);
    /* consume once — a second refresh shows the normal
       checkout (empty-cart) state, not a stale receipt */
    try {
      localStorage.removeItem("printExpertOrderSuccess");
    } catch {}
  }, [
    orderPlaced,
    restoredSuccess,
    isDirectOrder,
    cartLoading,
    cart.length,
  ]);

  /* ALWAYS verify the displayed order against the saved
     server record — fresh placement or restore alike. The
     authoritative total overrides whatever was computed
     client-side. Wrong user / missing order → error state,
     never a fake ₹0. */
  useEffect(() => {
    if (
      !orderPlaced ||
      !orderId ||
      successVerified !== null
    )
      return;

    const token = localStorage.getItem("authToken");
    if (!token) {
      setSuccessVerified("error");
      return;
    }

    fetch(
      `${API_URL}/orders/track/${encodeURIComponent(orderId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.order) {
          /* authoritative saved total */
          const t = Number(
            data.order.total ??
              data.order.grandTotal ??
              data.order.totalAmount ??
              data.order.totalPrice
          );
          if (Number.isFinite(t)) setTotalPrice(t);
          setSuccessVerified(true);
        } else if (
          res.status === 401 ||
          res.status === 403 ||
          res.status === 404
        ) {
          localStorage.removeItem("printExpertOrderSuccess");
          setSuccessVerified("error");
        } else {
          /* server hiccup — keep cached confirmation */
          setSuccessVerified(true);
        }
      })
      .catch(() => {
        /* offline — keep cached confirmation */
        setSuccessVerified(true);
      });
  }, [orderPlaced, orderId, successVerified]);

  /*
  =====================================================
  DELIVERY VERIFICATION
  =====================================================
  */

  const [deliveryStatus, setDeliveryStatus] = useState("idle");
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [checkingDelivery, setCheckingDelivery] = useState(false);

  /* shipping quote — server-calculated charge.
     status: idle | loading | ok | error */
  const [shippingQuote, setShippingQuote] = useState({
    status: "idle",
    charge: null,
    code: null,
    message: "",
    missing: [],
  });

  /* derived totals — must sit BELOW the shippingQuote
     declaration (const TDZ) */
  const quotedCharge =
    shippingQuote.status === "ok"
      ? Number(shippingQuote.charge) || 0
      : 0;

  const payableTotal = Math.max(
    0,
    totalPrice - couponDiscount + quotedCharge
  );

  /*
  =====================================================
  AUTH GUARD — bina login ke order nahi
  =====================================================
  */

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    const adminLoggedIn =
      localStorage.getItem("adminLoggedIn") === "true";

    if (!savedUser && !adminLoggedIn) {
      navigate("/login", {
        replace: true,
        state: {
          redirectTo: "/checkout",
          checkoutData: {
            cart,
            totalPrice,
            totalQuantity,
          },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
  =====================================================
  AUTO-FILL FROM PROFILE
  =====================================================
  */

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const loadProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.user) return;

        const u = data.user;
        setForm((prev) => ({
          ...prev,
          name: prev.name || u.name || "",
          phone: prev.phone || u.phone || "",
          email: prev.email || u.email || "",
          address: prev.address || u.address || "",
          city: prev.city || u.city || "",
          state: prev.state || u.state || "",
          pincode: prev.pincode || u.pincode || "",
        }));
      } catch {
        /* profile fetch failed — user can fill manually */
      }
    };

    loadProfile();
  }, []);

  /*
  =====================================================
  CHECK DELIVERY
  =====================================================
  */

  const checkDeliveryAvailability = async () => {
    const name = String(form.name || "").trim();
    const address = String(form.address || "").trim();
    const city = String(form.city || "").trim();
    const state = String(form.state || "").trim();
    const pincode = String(form.pincode || "").trim();

    /*
    -----------------------------------------------
    BASIC VALIDATION
    -----------------------------------------------
    */

    if (name.length < 2) {
      setDeliveryStatus("invalid");
      setDeliveryMessage("Please enter your full name.");
      return false;
    }

    if (address.length < 10) {
      setDeliveryStatus("invalid");
      setDeliveryMessage(
        "Please enter your complete delivery address."
      );
      return false;
    }

    if (city.length < 2) {
      setDeliveryStatus("invalid");
      setDeliveryMessage("Please enter your city.");
      return false;
    }

    if (state.length < 2) {
      setDeliveryStatus("invalid");
      setDeliveryMessage("Please enter your state.");
      return false;
    }

    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      setDeliveryStatus("invalid");
      setDeliveryMessage(
        "Please enter a valid 6 digit Indian pincode."
      );
      return false;
    }

    /*
    -----------------------------------------------
    START CHECK
    -----------------------------------------------
    */

    setCheckingDelivery(true);
    setDeliveryStatus("checking");
    setDeliveryMessage(
      "Checking your address and delivery availability..."
    );

    try {
      const response = await fetch(
        `${API_URL}/check-delivery`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name,
            address,
            city,
            state,
            pincode,
          }),
        }
      );

      let result = {};

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      /*
      -----------------------------------------------
      SERVER ERROR
      -----------------------------------------------
      */

      if (!response.ok) {
        setDeliveryStatus("error");

        setDeliveryMessage(
          result.message ||
            "Address verification failed. Please try again."
        );

        return false;
      }

      /*
      -----------------------------------------------
      DELIVERY NOT AVAILABLE
      -----------------------------------------------
      */

      if (
        result.serviceable !== true ||
        result.validAddress !== true
      ) {
        setDeliveryStatus("unavailable");

        setDeliveryMessage(
          result.message ||
            "Sorry, delivery is not available at this address."
        );

        return false;
      }

      /*
      -----------------------------------------------
      DELIVERY AVAILABLE
      -----------------------------------------------
      */

      setDeliveryStatus("available");

      setDeliveryMessage(
        result.message ||
          "Delivery is available at this address."
      );

      /* address verified — price the shipment now */
      fetchShippingQuote();

      return true;
    } catch (error) {
      console.error(
        "Delivery availability error:",
        error
      );

      setDeliveryStatus("error");

      setDeliveryMessage(
        "Unable to check delivery. Please make sure the backend server is running on port 5000."
      );

      return false;
    } finally {
      setCheckingDelivery(false);
    }
  };

  /*
  =====================================================
  SHIPPING QUOTE

  Server-calculated charge from /api/shipping/quote —
  cart productIds + quantities, pincode + payment mode.
  Refreshed whenever any of those inputs change. The
  displayed amount is informational only; the server
  re-derives the charge when the order is placed.
  =====================================================
  */

  const fetchShippingQuote = async () => {
    const pincode = form.pincode.trim();

    if (
      !/^[1-9][0-9]{5}$/.test(pincode) ||
      !cart.length
    ) {
      setShippingQuote({
        status: "idle",
        charge: null,
        code: null,
        message: "",
        missing: [],
      });
      return;
    }

    setShippingQuote((prev) => ({
      ...prev,
      status: "loading",
      message: "Calculating delivery charge...",
    }));

    try {
      const response = await fetch(
        `${API_URL}/shipping/quote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pincode,
            paymentMode: paymentMethod,
            items: cart.map((item) => ({
              productId:
                item.originalProductId ||
                item.productId ||
                item.id,
              quantity: Number(item.quantity) || 1,
            })),
          }),
        }
      );

      let result = {};
      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        setShippingQuote({
          status: "error",
          charge: null,
          code: result.code || null,
          message:
            result.message ||
            "Unable to calculate the delivery charge.",
          missing: result.missing || [],
        });
        return;
      }

      if (result.serviceable !== true) {
        setShippingQuote({
          status: "error",
          charge: null,
          code: result.code || "UNSERVICEABLE_PINCODE",
          message:
            result.message ||
            "Delivery is not available for this pincode.",
          missing: [],
        });
        return;
      }

      setShippingQuote({
        status: "ok",
        charge: Number(result.shippingCharge) || 0,
        code: null,
        message: "",
        missing: [],
      });
    } catch (error) {
      console.error("Shipping quote error:", error);
      setShippingQuote({
        status: "error",
        charge: null,
        code: "SHIPPING_QUOTE_FAILED",
        message:
          "Unable to calculate the delivery charge. Please check your connection and try again.",
        missing: [],
      });
    }
  };

  /* re-quote when payment mode or cart quantities change
     on an already-verified address */
  useEffect(() => {
    if (deliveryStatus === "available") {
      fetchShippingQuote();
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [paymentMethod, cart]);

  /*
  =====================================================
  LOAD USER DETAILS
  =====================================================
  */

  useEffect(() => {
    try {
      const savedUser =
        localStorage.getItem("printExpertUser") ||
        localStorage.getItem("currentUser");

      if (!savedUser) {
        return;
      }

      const user = JSON.parse(savedUser);

      setForm((prev) => ({
        ...prev,

        name:
          user.name ||
          user.fullName ||
          prev.name ||
          "",

        phone:
          user.phone ||
          user.mobile ||
          prev.phone ||
          "",

        email:
          user.email ||
          prev.email ||
          "",
      }));
    } catch (error) {
      console.error(
        "User details loading error:",
        error
      );
    }
  }, []);

  /*
  =====================================================
  RECALCULATE TOTALS
  =====================================================
  */

  useEffect(() => {
    if (!Array.isArray(cart)) {
      return;
    }

    const quantity = cart.reduce(
      (sum, item) =>
        sum + (Number(item.quantity) || 1),
      0
    );

    const price = cart.reduce(
      (sum, item) => {
        const itemPrice = Number(item.price) || 0;
        const itemQuantity =
          Number(item.quantity) || 1;

        return sum + itemPrice * itemQuantity;
      },
      0
    );

    setTotalQuantity(quantity);
    setTotalPrice(price);
  }, [cart]);

  /*
  =====================================================
  PINCODE LOOKUP
  =====================================================
  */

  const [pinLoading, setPinLoading] = useState(false);
  const pinAbort = useRef(null);

  const lookupPincode = async (pin) => {
    if (!/^\d{6}$/.test(pin)) return;

    if (pinAbort.current) pinAbort.current.abort();
    const controller = new AbortController();
    pinAbort.current = controller;

    setPinLoading(true);
    try {
      const res = await fetch(
        `https://api.postalpincode.in/pincode/${pin}`,
        { signal: controller.signal }
      );
      const data = await res.json();

      if (
        data?.[0]?.Status === "Success" &&
        data[0].PostOffice?.length > 0
      ) {
        const po = data[0].PostOffice[0];
        setForm((prev) => ({
          ...prev,
          city: po.District || prev.city,
          state: po.State || prev.state,
        }));
      }
    } catch {
      /* network error or aborted */
    } finally {
      setPinLoading(false);
    }
  };

  /*
  =====================================================
  FORM CHANGE
  =====================================================
  */

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    /* pincode auto-fill */
    if (name === "pincode" && value.replace(/\D/g, "").length === 6) {
      lookupPincode(value.replace(/\D/g, ""));
    }

    /*
    Address change hone par
    old verification invalid hogi.
    */

    if (
      [
        "name",
        "address",
        "city",
        "state",
        "pincode",
      ].includes(name)
    ) {
      setDeliveryStatus("idle");
      setDeliveryMessage("");
      /* address changed — old quote no longer applies */
      setShippingQuote({
        status: "idle",
        charge: null,
        code: null,
        message: "",
        missing: [],
      });
    }
  };

  /*
  =====================================================
  VALIDATE FORM
  =====================================================
  */

  const validateForm = () => {
    if (!form.name.trim()) {
      alert("Please enter your full name.");
      return false;
    }

    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      alert(
        "Please enter a valid 10 digit phone number."
      );
      return false;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim()
      )
    ) {
      alert(
        "Please enter a valid email address."
      );
      return false;
    }

    if (form.address.trim().length < 10) {
      alert(
        "Please enter your complete delivery address."
      );
      return false;
    }

    if (form.city.trim().length < 2) {
      alert("Please enter your city.");
      return false;
    }

    if (form.state.trim().length < 2) {
      alert("Please enter your state.");
      return false;
    }

    if (
      !/^[1-9][0-9]{5}$/.test(
        form.pincode.trim()
      )
    ) {
      alert(
        "Please enter a valid 6 digit Indian pincode."
      );
      return false;
    }

    if (!cart.length) {
      alert("Your cart is empty.");
      return false;
    }

    return true;
  };

  /*
  =====================================================
  PLACE ORDER
  =====================================================
  */

  const handlePlaceOrder = async (event) => {
    event.preventDefault();

    /* duplicate submission guard */
    if (placing) return;

    /*
    -----------------------------------------------
    1. NORMAL FORM VALIDATION
    -----------------------------------------------
    */

    if (!validateForm()) {
      return;
    }

    setPlacing(true);

    /*
    -----------------------------------------------
    2. ALWAYS VERIFY DELIVERY AGAIN
    -----------------------------------------------
    */

    /* shipping quote must be serviceable — the button is
       disabled until it is, but guard anyway. Server still
       re-derives the charge; this prevents submitting with
       a known-bad quote. (checked before the re-verify,
       which sets the quote back to loading) */
    if (shippingQuote.status !== "ok") {
      setPlacing(false);
      alert(
        shippingQuote.message ||
          "The delivery charge could not be calculated. Please check your address and try again."
      );
      return;
    }

    const deliveryAvailable =
      await checkDeliveryAvailability();

    if (!deliveryAvailable) {
      setPlacing(false);
      alert(
        "This address is not verified for delivery. Order cannot be placed."
      );
      return;
    }

    /*
    -----------------------------------------------
    GENERATE ORDER ID
    -----------------------------------------------
    */

    /* "Order Now" from the cart already created the order
       and passes its id via location.state — reuse it so the
       server upserts the same row instead of saving a second
       order. */
    const generatedOrderId =
      (isDirectOrder && location.state?.orderId) ||
      "ATC-" + Date.now();

    /*
    -----------------------------------------------
    PREPARE PRODUCTS — slim payload.

    Customized items carry base64 dataURL artwork that can
    reach many MB; send file:<id> refs instead of the blob
    (uploading first if needed) and drop image fields the
    server discards anyway (>200KB light-image rule). This
    keeps POST /api/orders far under the 30mb body limit.
    -----------------------------------------------
    */

    const slimArtworkElement = async (e) => {
      if (!e || typeof e !== "object") return e;
      const src = String(e.src || "");
      if (src.startsWith("file:") || src.length < 300)
        return e;
      if (e.fileId)
        return { ...e, src: `file:${e.fileId}` };
      if (src.startsWith("data:")) {
        try {
          const up = await uploadDesignFile({
            name: e.name || "design.png",
            type: e.mime || "image/png",
            dataUrl: src,
          });
          if (up?.success && up.fileId) {
            return {
              ...e,
              fileId: up.fileId,
              src: `file:${up.fileId}`,
            };
          }
        } catch {
          /* upload failed — keep the dataURL, the server
             still stores it if under its own limits */
          return e;
        }
      }
      return e;
    };

    const slimElementList = (list) =>
      Promise.all(
        (Array.isArray(list) ? list : []).map(
          slimArtworkElement
        )
      );

    const slimSides = async (d) => {
      if (Array.isArray(d)) return slimElementList(d);
      if (!d || typeof d !== "object") return d;
      const out = { ...d };
      for (const key of ["front", "back", "elements"]) {
        if (Array.isArray(d[key]))
          out[key] = await slimElementList(d[key]);
      }
      return out;
    };

    const slimImage = (v) =>
      typeof v === "string" && v.length > 200000 ? "" : v;

    const products = await Promise.all(
      cart.map(async (item, index) => {
        const price =
          Number(item.price) || 0;

        const quantity =
          Number(item.quantity) || 1;

        const itemTotal =
          price * quantity;

        const customized =
          Boolean(
            item.isCustomized ||
            item.logo ||
            item.text
          );

        return {
          ...item,

          id:
            item.id ||
            item.productId ||
            `PRODUCT-${index}`,

          productId:
            item.originalProductId ||
            item.productId ||
            item.id ||
            "",

          name:
            item.name ||
            "Untitled Product",

          image: slimImage(
            item.image ||
            item.images?.[0] ||
            ""
          ),

          images: Array.isArray(item.images)
            ? item.images
                .map(slimImage)
                .filter(Boolean)
                .slice(0, 3)
            : [],

          designs: await slimSides(
            item.designs || item.customization?.designs
          ),
          frontDesign: await slimSides(
            item.frontDesign || item.customization?.frontDesign
          ),
          backDesign: await slimSides(
            item.backDesign || item.customization?.backDesign
          ),
          customization: item.customization
            ? {
                ...item.customization,
                designs: await slimSides(
                  item.customization.designs
                ),
                frontDesign: await slimSides(
                  item.customization.frontDesign
                ),
                backDesign: await slimSides(
                  item.customization.backDesign
                ),
              }
            : item.customization,

          logo:
            typeof item.logo === "string" &&
            item.logo.length > 200000
              ? null
              : item.logo,

          price,

          quantity,

          total: itemTotal,

          size:
            item.size ||
            "Standard",

          unit:
            item.unit ||
            "Pieces",

          attributes:
            item.attributes &&
            typeof item.attributes === "object"
              ? item.attributes
              : {},

          category:
            item.category ||
            "General",

          customized,

          isCustomized: customized,

          logo: item.logo || null,

          text: item.text || "",

          textColor:
            item.textColor || "",

          fontFamily:
            item.fontFamily || "",

          fontSize:
            item.fontSize || "",

          bold: Boolean(item.bold),

          italic: Boolean(item.italic),

          underline: Boolean(
            item.underline
          ),

          logoPosition:
            item.logoPosition || null,

          textPosition:
            item.textPosition || null,

          logoSize:
            item.logoSize || null,

          customization:
            item.customization || null,

          customizationType:
            item.customizationType || "",

          frontDesign:
            item.frontDesign || null,

          backDesign:
            item.backDesign || null,

          template:
            item.template || null,

          uploadedDesign:
            item.uploadedDesign || null,
          uploadedDesigns:
            item.uploadedDesigns || [],

          color:
            item.color || "",
        };
      })
    );

    /*
    -----------------------------------------------
    UPLOAD CUSTOMER DESIGN FILES TO SERVER
    ProductDetails keeps real file bytes in
    localStorage["printExpertDesigns_<pid>"]; only metadata
    reaches the cart/order. Upload each file now so the
    order item carries a durable fileId the admin can
    open from any device.
    -----------------------------------------------
    */

    const uploadable = products.filter(
      (p) =>
        Array.isArray(p.uploadedDesigns) &&
        p.uploadedDesigns.some(
          (d) => d && !d.fileId && d.name
        )
    );

    if (uploadable.length) {
      await Promise.all(
        products.map(async (item) => {
          const list = Array.isArray(item.uploadedDesigns)
            ? item.uploadedDesigns
            : [];
          if (!list.length) return;

          /* find the full bytes for this product's uploads */
          let stored = [];
          try {
            stored = JSON.parse(
              localStorage.getItem(
                `printExpertDesigns_${
                  item.productId || item.id
                }`
              ) || "[]"
            );
          } catch {
            stored = [];
          }

          item.uploadedDesigns = await Promise.all(
            list.map(async (d) => {
              if (!d || d.fileId) return d;
              const full = stored.find(
                (s) =>
                  s &&
                  s.name === d.name &&
                  s.dataUrl
              );
              if (!full) return d; /* metadata-only — cannot recover */

              const up = await uploadDesignFile({
                name: full.name,
                type: full.type,
                dataUrl: full.dataUrl,
              });

              return up.success
                ? {
                    name: d.name,
                    type: d.type,
                    size: d.size,
                    fileId: up.fileId,
                    url: up.url,
                  }
                : { ...d, uploadFailed: true };
            })
          );
        })
      );
    }

    /*
    -----------------------------------------------
    CALCULATE TOTALS
    -----------------------------------------------
    */

    const calculatedSubtotal =
      products.reduce(
        (sum, item) =>
          sum +
          (Number(item.price) || 0) *
            (Number(item.quantity) || 1),
        0
      );

    const calculatedQuantity =
      products.reduce(
        (sum, item) =>
          sum +
          (Number(item.quantity) || 1),
        0
      );

    /* quote is display-only — the server re-derives the
       authoritative charge from DB weights at order time */
    const shippingCharge =
      shippingQuote.status === "ok"
        ? Number(shippingQuote.charge) || 0
        : 0;
    const discount = Math.min(
      Number(appliedCoupon?.discount) || 0,
      calculatedSubtotal
    );

    const finalTotal =
      calculatedSubtotal +
      shippingCharge -
      discount;

    /*
    -----------------------------------------------
    SHIPPING ADDRESS
    -----------------------------------------------
    */

    const shippingAddress = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
    };

    /*
    -----------------------------------------------
    CUSTOMER
    -----------------------------------------------
    */

    const customer = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    };

    /*
    -----------------------------------------------
    CREATE ORDER
    -----------------------------------------------
    */

    const now = new Date().toISOString();

    const newOrder = {
      id: generatedOrderId,

      orderId: generatedOrderId,

      orderNumber: generatedOrderId,

      /* the server reads order.items first — sending the
         same array as products/cart tripled the payload */
      items: products,

      customer,

      user: customer,

      customerName: customer.name,

      email: customer.email,

      phone: customer.phone,

      shippingAddress,

      address: shippingAddress,

      paymentMethod,

      payment: paymentMethod,

      paymentStatus: "Pending",

      subtotal: calculatedSubtotal,

      totalPrice: calculatedSubtotal,

      shipping: shippingCharge,

      shippingCharge,

      discount,

      couponCode: appliedCoupon?.code || null,

      total: finalTotal,

      grandTotal: finalTotal,

      totalAmount: finalTotal,

      totalQuantity: calculatedQuantity,

      totalItems: products.length,

      /* order status is ALWAYS "New" — payment state lives
         in paymentStatus; mixing them made admin rows show
         "Payment Pending" as an order status */
      status: "New",

      notification: true,

      /*
      -----------------------------------------------
      DELIVERY VERIFICATION RECORD
      -----------------------------------------------
      */

      deliveryVerified: true,

      deliveryVerification: {
        verified: true,

        validAddress: true,

        serviceable: true,

        pincode:
          form.pincode.trim(),

        city:
          form.city.trim(),

        state:
          form.state.trim(),

        verifiedAt: now,
      },

      createdAt: now,

      updatedAt: now,
    };

    /*
    -----------------------------------------------
    SAVE ORDER
    -----------------------------------------------
    */

    /*
    -----------------------------------------------
    SAVE ORDER — SERVER FIRST
    Server is the source of truth: if the order cannot
    be persisted to the DB we abort — no local order,
    no cart clear, no payment.
    -----------------------------------------------
    */

    let apiResult;
    try {
      apiResult = await saveOrderToServer(newOrder);
    } catch (apiError) {
      apiResult = null;
      console.error("Order API save error:", apiError);
    }

    if (!apiResult?.success) {
      setPlacing(false);
      alert(
        apiResult?.message ||
          "Order could not be saved to the server. Please check your connection and try again — your cart is unchanged."
      );
      return;
    }

    /*
    -----------------------------------------------
    ADOPT SERVER TOTALS — the server recomputes price,
    discount and shipping authoritatively; the client's
    math can differ. Order history + success screen must
    show what was actually saved.
    -----------------------------------------------
    */

    if (apiResult.total != null) {
      const st = Number(apiResult.total);
      newOrder.total = st;
      newOrder.grandTotal = st;
      newOrder.totalAmount = st;
    }
    if (apiResult.subtotal != null) {
      const sb = Number(apiResult.subtotal);
      newOrder.subtotal = sb;
      newOrder.totalPrice = sb;
    }
    if (apiResult.discount != null) {
      newOrder.discount = Number(apiResult.discount);
    }
    if (apiResult.shippingCharge != null) {
      const sh = Number(apiResult.shippingCharge);
      newOrder.shippingCharge = sh;
      newOrder.shipping = sh;
    }
    if (apiResult.orderNumber) {
      newOrder.orderNumber = apiResult.orderNumber;
    }

    /*
    -----------------------------------------------
    LOCAL MIRROR — order history ke liye
    (server order already saved above)
    -----------------------------------------------
    */

    try {
      const savedOrders =
        localStorage.getItem("printExpertOrders");
      let orders = savedOrders
        ? JSON.parse(savedOrders)
        : [];
      if (!Array.isArray(orders)) orders = [];

      localStorage.setItem(
        "printExpertOrders",
        JSON.stringify([newOrder, ...orders])
      );

      window.dispatchEvent(new Event("printExpertOrdersUpdated"));
      window.dispatchEvent(new Event("printExpertOrderCreated"));
      window.dispatchEvent(new Event("orderUpdated"));
    } catch (error) {
      /* localStorage mirror failure is non-fatal —
         order already exists on the server */
      console.error("Local order mirror error:", error);
    }

    /*
    -----------------------------------------------
    CLEAR CART — via CartContext (clears server + localStorage)
    -----------------------------------------------
    */

    contextClearCart();

    /*
    -----------------------------------------------
    ONLINE PAYMENT — Razorpay (signature verify
    karne ke baad hi paid; popup close/fail = pending)
    -----------------------------------------------
    */

    if (paymentMethod === "online") {
      /* order is guaranteed saved on server at this point */
      const paid =
        await openRazorpayCheckout(newOrder);

      if (!paid) {
        /* order stays pending on the server; cart is already
           cleared because the order was created successfully */
        alert(
          "Payment was not completed. Your order is saved with payment pending."
        );
      }
    }

    /*
    -----------------------------------------------
    SUCCESS
    -----------------------------------------------
    */

    /* success screen shows the AUTHORITATIVE saved total,
       not the client's own calculation */
    const serverTotal =
      apiResult.total != null
        ? Number(apiResult.total)
        : finalTotal;

    setTotalPrice(serverTotal);

    setOrderId(
      apiResult.orderNumber || generatedOrderId
    );

    /* persist for refresh — re-verified against the
       server on restore */
    freshPlaced.current = true;
    const summaryItems = products.map((p) => ({
      name: p.name,
      quantity: p.quantity || 1,
      price: Number(p.price) || 0,
      size: p.size || "",
      customizationType: p.customizationType || "",
      designs: p.designs || p.customization?.designs || null,
    }));
    try {
      localStorage.setItem(
        "printExpertOrderSuccess",
        JSON.stringify({
          orderNumber:
            apiResult.orderNumber || generatedOrderId,
          total: serverTotal,
          paymentMethod,
          items: summaryItems.slice(0, 10),
          at: new Date().toISOString(),
        })
      );
    } catch {
      /* non-fatal */
    }

    setOrderItems(summaryItems);
    setOrderPlaced(true);
    setPlacing(false);

    /*
    -----------------------------------------------
    SAVE ADDRESS BACK TO PROFILE (fire-and-forget)
    Next checkout autofills from /api/auth/me.
    Identity fields (name/phone/photo) are preserved
    from the existing profile — only delivery address
    fields are updated.
    -----------------------------------------------
    */

    try {
      const token = localStorage.getItem("authToken");
      if (token) {
        fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((d) => {
            const u = d?.user;
            if (!u) return null;
            return fetch(`${API_URL}/auth/profile`, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: u.name,
                phone: u.phone || form.phone.trim(),
                address: form.address.trim(),
                city: form.city.trim(),
                state: form.state.trim(),
                pincode: form.pincode.trim(),
                photo: u.photo || "",
              }),
            });
          })
          .catch(() => {});
      }
    } catch {
      /* profile save-back is best-effort */
    }
  };

  /*
  =====================================================
  EMPTY CART
  =====================================================
  */

  if (
    cart.length === 0 &&
    !orderPlaced
  ) {
    /* while the server cart is still loading, don't flash
       the empty-cart screen */
    if (!isDirectOrder && cartLoading) {
      return (
        <main className="checkout-page">
          <div className="checkout-empty">
            <ShoppingBag size={55} />
            <h2>Loading your cart...</h2>
          </div>
        </main>
      );
    }

    return (
      <main className="checkout-page">
        <div className="checkout-empty">
          <ShoppingBag size={55} />

          <h2>Your cart is empty</h2>

          <p>
            Please add products before
            proceeding to checkout.
          </p>

          <button
            type="button"
            onClick={() => navigate("/")}
          >
            Explore Products
          </button>
        </div>
      </main>
    );
  }

  /*
  =====================================================
  SUCCESS
  =====================================================
  */

  if (orderPlaced) {
    return (
      <main className="checkout-page">
        <div className="order-success">
          <div className="success-icon">
            <CheckCircle2 size={60} />
          </div>

          <span>
            ORDER CONFIRMED
          </span>

          <h1>Thank You!</h1>

          <p>
            Your order has been placed
            successfully.
          </p>

          {successVerified === "error" ? (
            <p className="success-error-note">
              We couldn't confirm this order. Please check
              My Orders or contact support.
            </p>
          ) : (
            <div className="success-details">
              <div>
                <small>
                  Order ID
                </small>

                <strong>
                  {orderId}
                </strong>
              </div>

              {/* ordered items — the REAL order, not the
                  cart currently on screen */}
              {orderItems.length > 0 && (
                <ul className="success-items">
                  {orderItems.map((p, i) => (
                    <li key={i}>
                      <div className="success-order-item">
                        <span>{p.name} × {p.quantity || 1}</span>
                        {p.customizationType === "brochure" && (
                          <div className="success-brochure-preview">
                            <BrochureArtwork item={p} />
                          </div>
                        )}
                      </div>
                      <span>
                        ₹
                        {(
                          Number(p.price || 0) *
                          (p.quantity || 1)
                        ).toLocaleString("en-IN")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div>
                <small>
                  Total Amount
                </small>

                <strong>
                  ₹
                  {totalPrice.toLocaleString(
                    "en-IN"
                  )}
                </strong>
              </div>
            </div>
          )}

          <div className="success-buttons">
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem(
                  "printExpertOrderSuccess"
                );
                navigate("/");
              }}
            >
              Continue Shopping
            </button>

            <button
              type="button"
              className="secondary-success-btn"
              onClick={() => {
                localStorage.removeItem(
                  "printExpertOrderSuccess"
                );
                navigate("/profile");
              }}
            >
              View My Account
            </button>
          </div>
        </div>
      </main>
    );
  }

  /*
  =====================================================
  CHECKOUT PAGE
  =====================================================
  */

  return (
    <main className="checkout-page">
      <div className="checkout-container">

        <div className="checkout-header">
          <button
            type="button"
            className="back-button"
            onClick={() =>
              navigate(-1)
            }
          >
            <ArrowLeft size={18} />
            Back to Cart
          </button>

          <span>
            PRINT EXPERT
          </span>

          <h1>Checkout</h1>

          <p>
            Complete your details and
            place your order securely.
          </p>
        </div>

        <div className="checkout-layout">

          {/* LEFT */}

          <form
            className="checkout-form"
            onSubmit={handlePlaceOrder}
          >

            {/* CUSTOMER */}

            <section className="checkout-card">
              <div className="checkout-card-title">
                <div className="title-icon">
                  <User size={19} />
                </div>

                <div>
                  <h2>
                    Customer Details
                  </h2>

                  <p>
                    Your contact information
                  </p>
                </div>
              </div>

              <div className="form-grid">

                <div className="form-group">
                  <label>
                    Full Name *
                  </label>

                  <div className="input-box">
                    <User size={17} />

                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Enter full name"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    Phone Number *
                  </label>

                  <div className="input-box">
                    <Phone size={17} />

                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="10 digit mobile number"
                      maxLength="10"
                    />
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>
                    Email Address *
                  </label>

                  <div className="input-box">
                    <Mail size={17} />

                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Enter email address"
                    />
                  </div>
                </div>

              </div>
            </section>

            {/* DELIVERY */}

            <section className="checkout-card">

              <div className="checkout-card-title">

                <div className="title-icon">
                  <MapPin size={19} />
                </div>

                <div>
                  <h2>
                    Delivery Address
                  </h2>

                  <p>
                    Where should we deliver your order?
                  </p>
                </div>

              </div>

              <div className="form-grid">

                {/* ADDRESS */}

                <div className="form-group full-width">

                  <label>
                    Complete Address *
                  </label>

                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="House no., street, area, landmark..."
                    rows="4"
                  />

                </div>

                {/* CITY */}

                <div className="form-group">

                  <label>
                    City *
                  </label>

                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="City"
                  />

                </div>

                {/* STATE */}

                <div className="form-group">

                  <label>
                    State *
                  </label>

                  <input
                    type="text"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="State"
                  />

                </div>

                {/* PINCODE */}

                <div className="form-group">

                  <label>
                    Pincode *
                    {pinLoading && <span style={{ fontWeight: 400, fontSize: "11px", color: "#6b7280", marginLeft: "6px" }}>Fetching...</span>}
                  </label>

                  <input
                    type="text"
                    name="pincode"
                    value={form.pincode}
                    onChange={(e) => {
                      const value =
                        e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6);

                      handleChange({
                        target: {
                          name: "pincode",
                          value,
                        },
                      });
                    }}
                    placeholder="6 digit pincode"
                    maxLength="6"
                    inputMode="numeric"
                  />

                  <div
                    style={{
                      marginTop: "10px",
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={
                        checkDeliveryAvailability
                      }
                      disabled={
                        checkingDelivery ||
                        !/^[1-9][0-9]{5}$/.test(
                          form.pincode
                        )
                      }
                      style={{
                        padding:
                          "10px 14px",

                        border: "none",

                        borderRadius: "8px",

                        cursor:
                          checkingDelivery ||
                          !/^[1-9][0-9]{5}$/.test(
                            form.pincode
                          )
                            ? "not-allowed"
                            : "pointer",

                        opacity:
                          checkingDelivery ||
                          !/^[1-9][0-9]{5}$/.test(
                            form.pincode
                          )
                            ? 0.6
                            : 1,
                      }}
                    >
                      {checkingDelivery
                        ? "Checking..."
                        : "Check Delivery Availability"}
                    </button>
                  </div>

                  {deliveryMessage && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: 600,
                        

                        background:
                          deliveryStatus ===
                          "available"
                            ? "#ecfdf5"
                            : deliveryStatus ===
                              "checking"
                            ? "#fef0f7"
                            : "#a5f1c4",

                        color:
                          deliveryStatus ===
                          "available"
                            ? "#15803d"
                            : deliveryStatus ===
                              "checking"
                            ? "#d81d77"
                            : "#991b1b",
                      }}
                    >
                      {deliveryStatus ===
                      "available"
                        ? "✓ "
                        : ""}

                      {deliveryMessage}
                    </div>
                  )}

                </div>

              </div>
            </section>

            {/* PAYMENT */}

            <section className="checkout-card">

              <div className="checkout-card-title">

                <div className="title-icon">
                  <CreditCard size={19} />
                </div>

                <div>
                  <h2>
                    Payment Method
                  </h2>

                  <p>
                    Select your preferred payment method
                  </p>
                </div>

              </div>

              <div className="payment-options">

                {/* COD */}

                <label
                  className={
                    paymentMethod === "cod"
                      ? "payment-option active"
                      : "payment-option"
                  }
                >
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={
                      paymentMethod === "cod"
                    }
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value
                      )
                    }
                  />

                  <div className="payment-icon">
                    <Wallet size={21} />
                  </div>

                  <div>
                    <strong>
                      Cash on Delivery
                    </strong>

                    <span>
                      Pay when your order arrives
                    </span>
                  </div>
                </label>

                {/* ONLINE */}

                <label
                  className={
                    paymentMethod === "online"
                      ? "payment-option active"
                      : "payment-option"
                  }
                >
                  <input
                    type="radio"
                    name="payment"
                    value="online"
                    checked={
                      paymentMethod === "online"
                    }
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value
                      )
                    }
                  />

                  <div className="payment-icon">
                    <CreditCard size={21} />
                  </div>

                  <div>
                    <strong>
                      Online Payment
                    </strong>

                    <span>
                      UPI, Card & Net Banking
                    </span>
                  </div>
                </label>

              </div>

              {/* SHIPPING QUOTE STATUS — mirrors the
                  delivery-charge calculation; order cannot
                  be placed until it resolves to a charge */}

              {deliveryStatus === "available" &&
                shippingQuote.status !== "ok" && (
                  <div
                    style={{
                      marginTop: "14px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 600,
                      background:
                        shippingQuote.status === "loading"
                          ? "#fef0f7"
                          : "#fef2f2",
                      color:
                        shippingQuote.status === "loading"
                          ? "#d81d77"
                          : "#b91c1c",
                    }}
                  >
                    {shippingQuote.status === "loading" ? (
                      <>Calculating delivery charge...</>
                    ) : (
                      <>
                        {shippingQuote.message ||
                          "Delivery charge is not available yet."}
                        {shippingQuote.code ===
                          "WEIGHT_MISSING" &&
                          shippingQuote.missing?.length >
                            0 && (
                            <div
                              style={{
                                marginTop: "4px",
                                fontWeight: 500,
                                fontSize: "12px",
                              }}
                            >
                              {shippingQuote.missing
                                .map(
                                  (m) =>
                                    m.name ||
                                    `Product #${m.productId}`
                                )
                                .join(", ")}
                            </div>
                          )}
                      </>
                    )}
                  </div>
                )}
            </section>

            {/* PLACE ORDER */}

            <button
              type="submit"
              className="place-order-btn"
              disabled={
                checkingDelivery ||
                placing ||
                shippingQuote.status !== "ok"
              }
              style={{
                opacity:
                  checkingDelivery ||
                  placing ||
                  shippingQuote.status !== "ok"
                    ? 0.6
                    : 1,

                cursor:
                  checkingDelivery ||
                  placing ||
                  shippingQuote.status !== "ok"
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {placing
                ? "Placing Order..."
                : checkingDelivery
                ? "Checking Address..."
                : deliveryStatus !== "available"
                ? "Check Delivery Availability First"
                : shippingQuote.status === "loading"
                ? "Calculating Delivery..."
                : shippingQuote.status !== "ok"
                ? "Delivery Unavailable"
                : paymentMethod === "online"
                ? "Continue to Payment"
                : "Place Order"}

              <ArrowRight size={18} />
            </button>

          </form>

          {/* RIGHT SUMMARY */}

          <aside className="checkout-summary">

            <h2>
              Order Summary
            </h2>

            <div className="checkout-products">

              {cart.map(
                (item, index) => {
                  const price =
                    Number(item.price) || 0;

                  const quantity =
                    Number(item.quantity) || 1;

                  const itemTotal =
                    price * quantity;

                  const image =
                    item.image ||
                    item.images?.[0] ||
                    "";
                  const isBrochure = /brochure/i.test(
                    `${item.customizationType || ""} ${item.name || ""}`
                  );

                  return (
                    <div
                      className="checkout-product"
                      key={`${
                        item.productId ||
                        item.id ||
                        "product"
                      }-${index}`}
                    >

                      <div className={`checkout-product-image${isBrochure ? " checkout-product-image-brochure" : ""}`}>

                        {isBrochure ? (
                          <BrochureArtwork item={item} />
                        ) : image ? (
                          <img
                            src={image}
                            alt={
                              item.name ||
                              "Product"
                            }
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              background:
                                "#f9f1f5",
                              color:
                                "#64748b",
                            }}
                          >
                            <ShoppingBag
                              size={25}
                            />
                          </div>
                        )}

                        <span>
                          {quantity}
                        </span>

                      </div>

                      <div className="checkout-product-info">

                        <strong>
                          {item.name ||
                            "Product"}
                        </strong>

                        <small>
                          ₹
                          {price.toLocaleString(
                            "en-IN"
                          )}{" "}
                          × {quantity}{" "}
                          {item.unit ||
                            "Pieces"}
                        </small>

                      </div>

                      <b>
                        ₹
                        {itemTotal.toLocaleString(
                          "en-IN"
                        )}
                      </b>

                    </div>
                  );
                }
              )}

            </div>

            <div className="checkout-summary-line" />

            <div className="summary-price-row">
              <span>
                Products
              </span>

              <span>
                {cart.length}
              </span>
            </div>

            <div className="summary-price-row">
              <span>
                Total Quantity
              </span>

              <span>
                {totalQuantity}
              </span>
            </div>

            <div className="summary-price-row">
              <span>
                Delivery
              </span>

              <strong>
                {shippingQuote.status === "loading" ? (
                  "…"
                ) : shippingQuote.status === "ok" ? (
                  quotedCharge === 0 ? (
                    "FREE"
                  ) : (
                    `₹${quotedCharge.toLocaleString("en-IN")}`
                  )
                ) : (
                  "—"
                )}
              </strong>
            </div>

            {/* COUPON */}

            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "14px",
              }}
            >
              <input
                type="text"
                value={couponInput}
                onChange={(e) =>
                  setCouponInput(
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="Coupon code"
                disabled={Boolean(appliedCoupon)}
                style={{
                  flex: 1,
                  height: "40px",
                  padding: "0 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "13px",
                  textTransform: "uppercase",
                  outline: "none",
                }}
              />

              {appliedCoupon ? (
                <button
                  type="button"
                  onClick={removeCoupon}
                  style={{
                    height: "40px",
                    padding: "0 14px",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    background: "#fef2f2",
                    color: "#dc2626",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={applyingCoupon}
                  style={{
                    height: "40px",
                    padding: "0 16px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#bd1265",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: applyingCoupon
                      ? "not-allowed"
                      : "pointer",
                  }}
                >
                  {applyingCoupon
                    ? "Checking..."
                    : "Apply"}
                </button>
              )}
            </div>

            {couponMessage && (
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "12px",
                  color: "#dc2626",
                }}
              >
                {couponMessage}
              </p>
            )}

            {appliedCoupon && (
              <div
                className="summary-price-row"
                style={{
                  marginTop: "10px",
                  color: "#15803d",
                }}
              >
                <span>
                  Discount ({appliedCoupon.code}
                  {" — "}
                  {appliedCoupon.label})
                </span>

                <strong>
                  − ₹
                  {couponDiscount.toLocaleString(
                    "en-IN"
                  )}
                </strong>
              </div>
            )}

            <div className="checkout-summary-line" />

            <div className="checkout-final-total">

              <span>
                Total Amount
              </span>

              <strong>
                ₹
                {payableTotal.toLocaleString(
                  "en-IN"
                )}
              </strong>

            </div>

            <div className="secure-payment">

              <ShieldCheck size={16} />

              <span>
                Secure & trusted checkout
              </span>

            </div>

          </aside>

        </div>
      </div>
    </main>
  );
}

export default Checkout;
