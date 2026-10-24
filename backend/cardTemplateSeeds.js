/* Builtin business-card template seeds — realistic print-style
   designs. Used once at startup to migrate them into
   product_templates per business-card product.
   DB is the source of truth afterwards.

   SAMPLE PLACEHOLDER CONTENT — these are demo values that the
   customer replaces during customization (label drives the
   mapping). Never real customer data.

   Canvas: percentage coordinates, 3.5:2 ratio.
   Safe print margin kept ~6-8% from edges.
   Type scale: name ~24-26px, company 11-14px,
   designation 8-10px, contact 7.5-9px. */

let _seq = 0;
const uid = () => `el-${Date.now()}-${++_seq}`;

const makeText = (text = "Edit text", x = 50, y = 50, overrides = {}) => ({
  id: uid(), type: "text", label: overrides.label || "", text, x, y,
  width: 42, fontFamily: "Inter", fontSize: 18, fontWeight: 500,
  italic: false, underline: false, color: "#172033", align: "left",
  letterSpacing: 0, lineHeight: 1.2, rotation: 0, opacity: 1, visible: true,
  ...overrides,
});

const makeIcon = (icon = "Phone", x = 15, y = 72, overrides = {}) => ({
  id: uid(), type: "icon", label: icon, icon, x, y,
  width: 7, color: "#172033", rotation: 0, opacity: 1, visible: true,
  ...overrides,
});

const makeShape = (shape = "rectangle", x = 50, y = 50, overrides = {}) => ({
  id: uid(), type: "shape",
  label: shape === "circle" ? "Circle" : shape === "line" ? "Line" : "Rectangle",
  shape, x, y, width: 25, color: "#2563eb", rotation: 0, opacity: 1, visible: true,
  ...overrides,
});

/* ============================================================
   SAMPLE VALUES — replaced by customer input at customize time
============================================================ */
const NAME = "ARUN SHARMA";
const ROLE_DIR = "MANAGING DIRECTOR";
const ROLE_CREATIVE = "CREATIVE DIRECTOR";
const COMPANY = "PRINT EXPERT";
const TAGLINE = "PRINTING • BRANDING • PACKAGING";
const PHONE = "+91 98765 43210";
const EMAIL = "hello@company.com";
const WEBSITE = "www.company.com";
const CITY = "Kanpur, Uttar Pradesh";
const MONOGRAM = "AT";

const TEMPLATES = {
  /* ----------------------------------------------------------
     1. MINIMAL — off-white, navy type, single blue accent.
        logo mark top-left, centered name block, contact row.
  ---------------------------------------------------------- */
  Minimal: {
    frontDesign: {
      background: "#fafaf7", gradient: "", backgroundImage: "",
      elements: [
        /* logo mark + company, top-left */
        makeText(MONOGRAM, 9, 14, {
          fontSize: 17, fontWeight: 800, color: "#16324f",
          width: 10, label: "Logo",
        }),
        makeText(COMPANY, 30, 13, {
          fontSize: 12, fontWeight: 700, color: "#16324f",
          letterSpacing: 2, width: 40, label: "Company Name",
        }),
        makeText(TAGLINE, 30, 21, {
          fontSize: 7.5, color: "#8a9199", letterSpacing: 1.5,
          width: 42, label: "Tagline",
        }),
        /* name block — center */
        makeText(NAME, 50, 47, {
          fontSize: 26, fontWeight: 700, color: "#16324f",
          align: "center", width: 70, letterSpacing: 1.5,
          label: "Name",
        }),
        makeText(ROLE_DIR, 50, 58, {
          fontSize: 9, color: "#7a828e", align: "center",
          letterSpacing: 3, width: 50, label: "Designation",
        }),
        /* thin divider */
        makeShape("line", 50, 66, {
          width: 22, color: "#2563eb", label: "Divider",
        }),
        /* contact row — bottom, 3 columns */
        makeIcon("Phone", 20, 80, { width: 3, color: "#2563eb" }),
        makeText(PHONE, 31, 80, {
          fontSize: 8, color: "#475569", width: 20,
          label: "Phone",
        }),
        makeIcon("Mail", 49, 80, { width: 3, color: "#2563eb" }),
        makeText(EMAIL, 60, 80, {
          fontSize: 8, color: "#475569", width: 20,
          label: "Email",
        }),
        makeIcon("Globe", 77, 80, { width: 3, color: "#2563eb" }),
        makeText(WEBSITE, 88, 80, {
          fontSize: 8, color: "#475569", width: 18,
          label: "Website",
        }),
      ],
    },
    backDesign: {
      background: "#fafaf7", gradient: "", backgroundImage: "",
      elements: [
        makeText(MONOGRAM, 50, 38, {
          fontSize: 42, fontWeight: 800, color: "#16324f",
          align: "center", width: 40, letterSpacing: 4,
          label: "Monogram",
        }),
        makeText(COMPANY, 50, 55, {
          fontSize: 9, color: "#16324f", align: "center",
          letterSpacing: 3, width: 60, label: "Company Name",
        }),
        makeShape("line", 50, 64, {
          width: 14, color: "#2563eb", label: "Divider",
        }),
        makeText("PRINTING   PACKAGING   BRANDING", 50, 73, {
          fontSize: 7.5, color: "#8a9199", align: "center",
          letterSpacing: 2, width: 60, label: "Services",
        }),
        makeText(WEBSITE, 50, 85, {
          fontSize: 8, color: "#94a3b8", align: "center",
          width: 50, label: "Website",
        }),
      ],
    },
  },

  /* ----------------------------------------------------------
     2. LUXURY — charcoal, gold type, restrained serif look.
  ---------------------------------------------------------- */
  Luxury: {
    frontDesign: {
      background: "#101013",
      gradient: "linear-gradient(150deg, #0c0c0e 0%, #1c1913 100%)",
      backgroundImage: "",
      elements: [
        makeShape("line", 50, 20, {
          width: 12, color: "#c9a227", label: "Gold Rule",
        }),
        makeText(MONOGRAM, 50, 36, {
          fontSize: 30, fontWeight: 600, color: "#c9a227",
          fontFamily: "Georgia", align: "center", width: 30,
          letterSpacing: 3, label: "Monogram",
        }),
        makeText(NAME, 50, 57, {
          fontSize: 19, fontWeight: 600, color: "#f5f2ea",
          fontFamily: "Georgia", align: "center", width: 70,
          letterSpacing: 3, label: "Name",
        }),
        makeText(ROLE_DIR, 50, 67, {
          fontSize: 8, color: "#c9a227", align: "center",
          letterSpacing: 3, width: 50, label: "Designation",
        }),
        makeText(COMPANY, 50, 77, {
          fontSize: 8, color: "#a89060", align: "center",
          letterSpacing: 2, width: 55, label: "Company Name",
        }),
        makeIcon("Phone", 33, 89, { width: 3, color: "#c9a227" }),
        makeText(PHONE, 42, 89, {
          fontSize: 7.5, color: "#a89060", width: 18,
          label: "Phone",
        }),
        makeIcon("Mail", 61, 89, { width: 3, color: "#c9a227" }),
        makeText(EMAIL, 70, 89, {
          fontSize: 7.5, color: "#a89060", width: 18,
          label: "Email",
        }),
      ],
    },
    backDesign: {
      background: "#101013",
      gradient: "linear-gradient(150deg, #0c0c0e 0%, #1c1913 100%)",
      backgroundImage: "",
      elements: [
        makeText(MONOGRAM, 50, 40, {
          fontSize: 46, fontWeight: 600, color: "#c9a227",
          fontFamily: "Georgia", align: "center", width: 40,
          letterSpacing: 6, label: "Monogram",
        }),
        makeShape("line", 50, 58, {
          width: 16, color: "#c9a227", label: "Gold Rule",
        }),
        makeText(COMPANY, 50, 66, {
          fontSize: 9, color: "#a89060", align: "center",
          letterSpacing: 4, width: 60, label: "Company Name",
        }),
        makeText(TAGLINE, 50, 76, {
          fontSize: 7, color: "#6f6248", align: "center",
          letterSpacing: 2, width: 60, label: "Tagline",
        }),
      ],
    },
  },

  /* ----------------------------------------------------------
     3. CORPORATE — white + navy left panel, contact column.
  ---------------------------------------------------------- */
  Corporate: {
    frontDesign: {
      background: "#ffffff",
      gradient: "linear-gradient(115deg, #16324f 0 30%, #ffffff 30%)",
      backgroundImage: "",
      elements: [
        /* navy panel — logo + company */
        makeText(MONOGRAM, 16, 34, {
          fontSize: 26, fontWeight: 800, color: "#ffffff",
          align: "center", width: 22, label: "Logo",
        }),
        makeText("PRINT\nEXPERT", 16, 55, {
          fontSize: 8.5, fontWeight: 600, color: "#cfe0f4",
          align: "center", width: 22, letterSpacing: 1.5,
          lineHeight: 1.5, label: "Company Name",
        }),
        /* right column — person */
        makeText(NAME, 62, 22, {
          fontSize: 21, fontWeight: 700, color: "#16324f",
          width: 52, label: "Name",
        }),
        makeText("Managing Director", 62, 33, {
          fontSize: 10, color: "#1263bd", width: 48,
          label: "Designation",
        }),
        makeShape("line", 44, 42, {
          width: 12, color: "#1263bd", label: "Divider",
        }),
        makeIcon("Phone", 40, 53, { width: 3, color: "#1263bd" }),
        makeText(PHONE, 55, 53, {
          fontSize: 8.5, color: "#3f4a5a", width: 30,
          label: "Phone",
        }),
        makeIcon("Mail", 40, 63, { width: 3, color: "#1263bd" }),
        makeText(EMAIL, 55, 63, {
          fontSize: 8.5, color: "#3f4a5a", width: 30,
          label: "Email",
        }),
        makeIcon("Globe", 40, 73, { width: 3, color: "#1263bd" }),
        makeText(WEBSITE, 55, 73, {
          fontSize: 8.5, color: "#3f4a5a", width: 30,
          label: "Website",
        }),
        makeIcon("MapPin", 40, 83, { width: 3, color: "#1263bd" }),
        makeText(CITY, 55, 83, {
          fontSize: 8.5, color: "#3f4a5a", width: 30,
          label: "Address",
        }),
      ],
    },
    backDesign: {
      background: "#16324f", gradient: "", backgroundImage: "",
      elements: [
        makeText(COMPANY, 50, 38, {
          fontSize: 22, fontWeight: 800, color: "#ffffff",
          align: "center", width: 80, letterSpacing: 4,
          label: "Company Name",
        }),
        makeText(TAGLINE, 50, 52, {
          fontSize: 9, color: "#93c5fd", align: "center",
          letterSpacing: 3, width: 60, label: "Tagline",
        }),
        makeShape("line", 50, 62, {
          width: 16, color: "#60a5fa", label: "Divider",
        }),
        makeText(WEBSITE, 50, 74, {
          fontSize: 9, color: "#93c5fd", align: "center",
          width: 50, label: "Website",
        }),
      ],
    },
  },

  /* ----------------------------------------------------------
     4. MODERN — white, navy + violet accent, left-aligned
        type block, single subtle diagonal corner.
  ---------------------------------------------------------- */
  Modern: {
    frontDesign: {
      background: "#ffffff",
      gradient:
        "linear-gradient(140deg, #ffffff 0 76%, #6d28d9 76%)",
      backgroundImage: "",
      elements: [
        makeText("PRINT EXPERT", 14, 20, {
          fontSize: 26, fontWeight: 800, color: "#172033",
          width: 45, label: "Company Name", lineHeight: 1,
        }),
        makeText("TRADING CO.", 14, 31, {
          fontSize: 12, fontWeight: 600, color: "#6d28d9",
          letterSpacing: 3, width: 45, label: "Tagline",
        }),
        makeText(NAME, 14, 49, {
          fontSize: 22, fontWeight: 700, color: "#172033",
          width: 55, label: "Name",
        }),
        makeText(ROLE_DIR, 14, 60, {
          fontSize: 8.5, color: "#6d28d9", letterSpacing: 2.5,
          width: 45, label: "Designation",
        }),
        makeShape("line", 14, 67, {
          width: 11, color: "#6d28d9", label: "Accent Line",
        }),
        makeIcon("Phone", 9, 77, { width: 3, color: "#6d28d9" }),
        makeText(PHONE, 21, 77, {
          fontSize: 8.5, color: "#4b5563", width: 30,
          label: "Phone",
        }),
        makeIcon("Mail", 9, 87, { width: 3, color: "#6d28d9" }),
        makeText(EMAIL, 21, 87, {
          fontSize: 8.5, color: "#4b5563", width: 34,
          label: "Email",
        }),
        /* monogram on violet corner */
        makeText(MONOGRAM, 88, 87, {
          fontSize: 17, fontWeight: 800, color: "#ffffff",
          align: "center", width: 14, label: "Monogram",
        }),
      ],
    },
    backDesign: {
      background: "#6d28d9", gradient: "", backgroundImage: "",
      elements: [
        makeText(MONOGRAM, 50, 38, {
          fontSize: 54, fontWeight: 800,
          color: "rgba(255,255,255,0.16)", align: "center",
          width: 50, letterSpacing: 5, label: "Monogram",
        }),
        makeText(COMPANY, 50, 58, {
          fontSize: 10, color: "#ffffff", align: "center",
          letterSpacing: 4, width: 65, label: "Company Name",
        }),
        makeText(WEBSITE, 50, 73, {
          fontSize: 8.5, color: "#e9d5ff", align: "center",
          width: 50, label: "Website",
        }),
      ],
    },
  },

  /* ----------------------------------------------------------
     5. CREATIVE — warm off-white, coral accents, small dots.
  ---------------------------------------------------------- */
  Creative: {
    frontDesign: {
      background: "#fdf6ee",
      gradient:
        "radial-gradient(circle at 92% 14%, rgba(251,146,60,0.25) 0 7%, transparent 7%), radial-gradient(circle at 6% 92%, rgba(251,191,36,0.22) 0 5%, transparent 5%)",
      backgroundImage: "",
      elements: [
        makeText(COMPANY, 12, 15, {
          fontSize: 11, fontWeight: 700, color: "#7c2d12",
          letterSpacing: 1.5, width: 60, label: "Company Name",
        }),
        makeText(NAME, 12, 37, {
          fontSize: 26, fontWeight: 800, color: "#1c1917",
          width: 60, label: "Name",
        }),
        makeText(ROLE_CREATIVE, 12, 49, {
          fontSize: 9, color: "#ea580c", letterSpacing: 2.5,
          width: 50, label: "Designation",
        }),
        makeText("Branding • Design • Print", 12, 59, {
          fontSize: 8.5, color: "#9a3412", fontFamily: "Georgia",
          italic: true, width: 50, label: "Tagline",
        }),
        makeIcon("Phone", 10, 72, { width: 3, color: "#ea580c" }),
        makeText(PHONE, 22, 72, {
          fontSize: 8.5, color: "#7c2d12", width: 32,
          label: "Phone",
        }),
        makeIcon("Mail", 10, 81, { width: 3, color: "#ea580c" }),
        makeText(EMAIL, 22, 81, {
          fontSize: 8.5, color: "#7c2d12", width: 32,
          label: "Email",
        }),
        makeIcon("Globe", 10, 90, { width: 3, color: "#ea580c" }),
        makeText(WEBSITE, 22, 90, {
          fontSize: 8.5, color: "#7c2d12", width: 32,
          label: "Website",
        }),
        /* restrained decorative dots */
        makeShape("circle", 88, 80, {
          width: 3.5, color: "#fb923c", label: "Dot",
        }),
        makeShape("circle", 92, 86, {
          width: 2.5, color: "#fbbf24", label: "Dot 2",
        }),
      ],
    },
    backDesign: {
      background: "#fdf6ee",
      gradient:
        "radial-gradient(circle at 85% 78%, rgba(251,113,133,0.16) 0 12%, transparent 12%)",
      backgroundImage: "",
      elements: [
        makeText("PRINT\nEXPERT", 50, 40, {
          fontSize: 21, fontWeight: 800, color: "#7c2d12",
          align: "center", width: 70, lineHeight: 1.15,
          label: "Company Name",
        }),
        makeText("Branding • Design • Print", 50, 60, {
          fontSize: 9, color: "#ea580c", align: "center",
          width: 60, label: "Tagline",
        }),
        makeText(WEBSITE, 50, 74, {
          fontSize: 9, color: "#9a3412", align: "center",
          width: 50, label: "Website",
        }),
      ],
    },
  },
};

/* Built as an ordered array for the DB seed */
const CARD_TEMPLATE_SEEDS = Object.entries(TEMPLATES).map(
  ([name, design], index) => ({
    name,
    sortOrder: index,
    design: {
      frontDesign: design.frontDesign,
      backDesign: design.backDesign,
    },
  })
);

module.exports = { CARD_TEMPLATE_SEEDS };
