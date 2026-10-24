import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  UploadCloud,
  Type,
  Palette,
  Move,
  Layers,
  Trash2,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  ShoppingCart,
  Heart,
  X,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RefreshCcw,
  CheckCircle,
  FileText,
  MessageSquare,
  Info,
  PackageCheck,
  ClipboardList,
  Building2,
  User,
  Briefcase,
  MapPin,
  CornerUpLeft,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  LayoutTemplate,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { saveInquiryContext } from "../services/inquiryApi";
import { fetchProductTemplates } from "../services/templateApi";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import {
  uploadDesignFile,
  fetchFileBlob,
} from "../services/fileApi";
import {
  getDraft,
  saveDraft,
  deleteDraft,
  writeLocalDraft,
  migrateLegacyDraft,
} from "../services/draftApi";
import { addFavorite } from "../services/favoritesApi";

import "./Customizer.css";

/* =====================================================
   HELPERS
===================================================== */

const uid = () =>
  `el-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

const isDarkColor = (hex) => {
  const c = String(hex || "#ffffff").replace("#", "");

  if (c.length < 6) return false;

  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);

  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55;
};

const printColorFor = (shirtColor) =>
  isDarkColor(shirtColor) ? "#f5f7fa" : "#102a4c";

/* hex color ko lighten (+amt) / darken (-amt) karta hai */
const shadeHex = (hex, amt) => {
  const c = String(hex || "#123d70").replace("#", "");

  if (c.length < 6) return hex;

  const f = (v) =>
    Math.max(
      0,
      Math.min(255, v + Math.round(255 * amt))
    );

  const r = f(parseInt(c.slice(0, 2), 16));
  const g = f(parseInt(c.slice(2, 4), 16));
  const b = f(parseInt(c.slice(4, 6), 16));

  return `rgb(${r},${g},${b})`;
};

const FONT_OPTIONS = [
  "Poppins",
  "Arial",
  "Montserrat",
  "Georgia",
  "Roboto",
];

const TEXT_KINDS = [
  { key: "company", label: "Company Name", placeholder: "COMPANY NAME" },
  { key: "person", label: "Person Name", placeholder: "YOUR NAME" },
  { key: "designation", label: "Designation", placeholder: "DESIGNATION" },
  { key: "custom", label: "Custom Text", placeholder: "YOUR TEXT" },
];

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

/* envelope-specific text presets — har field ek
   independent element banta hai */
const ENVELOPE_TEXT_KINDS = [
  {
    key: "company",
    label: "Company Name",
    placeholder: "COMPANY NAME",
  },
  {
    key: "person",
    label: "Recipient Name",
    placeholder: "RECIPIENT NAME",
  },
  {
    key: "address",
    label: "Address",
    placeholder: "Address Line 1\nCity, State - PIN",
  },
  {
    key: "return_addr",
    label: "Return Address",
    placeholder: "If undelivered, return to:\nCOMPANY, CITY - PIN",
  },
  {
    key: "custom",
    label: "Custom Text",
    placeholder: "YOUR TEXT",
  },
];

/* =====================================================
   COLOR HELPERS + PICKER — presets ke saath HEX/RGB input
===================================================== */

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const hexToRgb = (hex) => {
  const h = String(hex || "").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(
    h.slice(2, 4),
    16
  )}, ${parseInt(h.slice(4, 6), 16)})`;
};

function ColorPickerField({ value, onChange }) {
  const safeValue = HEX_RE.test(value) ? value : "#111827";
  const [draft, setDraft] = useState(safeValue);

  useEffect(() => {
    setDraft(
      HEX_RE.test(value)
        ? String(value).toUpperCase()
        : safeValue
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commitHex = () => {
    let v = draft.trim();
    if (!v.startsWith("#")) v = `#${v}`;
    if (HEX_RE.test(v)) {
      onChange(v.toUpperCase());
    } else {
      setDraft(safeValue.toUpperCase());
    }
  };

  const rgb = hexToRgb(safeValue);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "8px",
        flexWrap: "wrap",
      }}
    >
      {/* native color picker — free color select */}
      <input
        type="color"
        value={safeValue}
        onChange={(e) => onChange(e.target.value)}
        title="Pick any color"
        style={{
          width: "42px",
          height: "34px",
          padding: 0,
          border: "1px solid #d1d5db",
          borderRadius: "6px",
          cursor: "pointer",
          background: "#fff",
        }}
      />

      {/* HEX input */}
      <input
        className="text-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitHex}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitHex();
          }
        }}
        placeholder="#RRGGBB"
        maxLength={7}
        style={{
          width: "90px",
          textTransform: "uppercase",
        }}
      />

      {/* RGB readout */}
      {rgb && (
        <small style={{ color: "#6b7280", fontSize: "11px" }}>
          {rgb}
        </small>
      )}
    </div>
  );
}

/* =====================================================
   GARMENT MOCKUP (vector T-shirt — color changeable)
===================================================== */

function GarmentSvg({ color, back }) {
  const dark = isDarkColor(color);
  const seam = dark
    ? "rgba(0,0,0,0.35)"
    : "rgba(0,0,0,0.12)";
  const shade = dark
    ? "rgba(0,0,0,0.28)"
    : "rgba(0,0,0,0.10)";
  const light = dark
    ? "rgba(255,255,255,0.10)"
    : "rgba(255,255,255,0.45)";

  const body =
    "M150 32 " +
    "C162 50 238 50 250 32 " +
    "L296 46 L372 120 L330 207 L298 181 " +
    "L301 384 C301 400 292 406 277 406 " +
    "L123 406 C108 406 99 400 99 384 " +
    "L102 181 L70 207 L28 120 L104 46 Z";

  return (
    <svg
      viewBox="0 0 400 430"
      className="garment-svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient
          id="gshade"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={light} />
          <stop offset="35%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor={shade} />
        </linearGradient>
      </defs>

      {/* shirt silhouette */}
      <path d={body} fill={color} />
      <path d={body} fill="url(#gshade)" />

      {/* sleeve seams */}
      <path
        d="M104 46 L70 207 M296 46 L330 207"
        stroke={seam}
        strokeWidth="2"
        fill="none"
        opacity="0.5"
      />

      {/* sleeve hems */}
      <path
        d="M33 132 L75 218 M367 132 L325 218"
        stroke={seam}
        strokeWidth="2"
        fill="none"
        opacity="0.35"
      />

      {/* fabric folds */}
      <path
        d="M130 240 Q200 255 270 240"
        stroke={seam}
        strokeWidth="2.5"
        fill="none"
        opacity="0.28"
      />
      <path
        d="M135 300 Q200 315 265 300"
        stroke={seam}
        strokeWidth="2.5"
        fill="none"
        opacity="0.22"
      />

      {/* bottom hem */}
      <path
        d="M101 388 Q200 396 299 388"
        stroke={seam}
        strokeWidth="2.5"
        fill="none"
        opacity="0.45"
      />

      {/* collar */}
      {back ? (
        <path
          d="M152 32 C165 42 235 42 248 32"
          stroke={seam}
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <>
          <path
            d="M150 32 C162 50 238 50 250 32"
            stroke={seam}
            strokeWidth="9"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M156 34 C168 49 232 49 244 34"
            stroke={shade}
            strokeWidth="4"
            fill="none"
            opacity="0.6"
          />
        </>
      )}
    </svg>
  );
}

/* =====================================================
   SPIRAL NOTEBOOK MOCKUP
   (cover + pages; spiral alag overlay mein — design ke UPAR)
===================================================== */

function NotebookSvg({ color, back }) {
  const dark = isDarkColor(color);
  const seam = dark
    ? "rgba(0,0,0,0.4)"
    : "rgba(0,0,0,0.14)";
  const shade = dark
    ? "rgba(0,0,0,0.30)"
    : "rgba(0,0,0,0.08)";
  const light = dark
    ? "rgba(255,255,255,0.10)"
    : "rgba(255,255,255,0.5)";

  return (
    <svg
      viewBox="0 0 380 480"
      className="garment-svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient
          id="nbshade"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop offset="0%" stopColor={light} />
          <stop offset="40%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor={shade} />
        </linearGradient>
      </defs>

      {/* page block — cover se thoda offset (thickness) */}
      <rect
        x="62"
        y="32"
        width="292"
        height="428"
        rx="10"
        fill="#f3f0ea"
      />
      <rect
        x="62"
        y="32"
        width="292"
        height="428"
        rx="10"
        fill="none"
        stroke="#d8d3c8"
        strokeWidth="2"
      />

      {/* page edge lines */}
      <path
        d="M66 48 L348 48 M66 440 L348 440 M340 36 L340 456"
        stroke="#ddd8cc"
        strokeWidth="1.6"
        fill="none"
      />

      {/* front/back cover */}
      <rect
        x="46"
        y="20"
        width="300"
        height="440"
        rx="14"
        fill={color}
      />
      <rect
        x="46"
        y="20"
        width="300"
        height="440"
        rx="14"
        fill="url(#nbshade)"
      />
      <rect
        x="46"
        y="20"
        width="300"
        height="440"
        rx="14"
        fill="none"
        stroke={seam}
        strokeWidth="2"
      />

      {/* spiral hole shadows on cover edge */}
      {Array.from({ length: 15 }).map((_, i) => {
        const y = 48 + i * 27;
        return (
          <circle
            key={i}
            cx="50"
            cy={y}
            r="4.5"
            fill={shade}
          />
        );
      })}
    </svg>
  );
}

/* spiral rings — design layer ke UPAR render hota hai */
function SpiralOverlay() {
  return (
    <svg
      viewBox="0 0 380 480"
      className="spiral-overlay"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient
          id="ringmetal"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor="#e8ecf0" />
          <stop offset="45%" stopColor="#9aa4b0" />
          <stop offset="100%" stopColor="#5c6672" />
        </linearGradient>
      </defs>

      {Array.from({ length: 15 }).map((_, i) => {
        const y = 48 + i * 27;
        return (
          <g key={i}>
            {/* ring shadow */}
            <ellipse
              cx="41"
              cy={y + 2}
              rx="17"
              ry="8"
              fill="none"
              stroke="rgba(0,0,0,0.25)"
              strokeWidth="5"
            />
            {/* metal ring */}
            <ellipse
              cx="40"
              cy={y}
              rx="16"
              ry="8"
              fill="none"
              stroke="url(#ringmetal)"
              strokeWidth="5"
            />
            {/* ring highlight */}
            <ellipse
              cx="40"
              cy={y - 1.5}
              rx="16"
              ry="8"
              fill="none"
              stroke="rgba(255,255,255,0.65)"
              strokeWidth="1.4"
            />
          </g>
        );
      })}
    </svg>
  );
}

/* QR placeholder element */
function QrPattern() {
  const cells = [];
  const size = 21;
  const inFinder = (x, y) =>
    (x < 7 && y < 7) ||
    (x >= size - 7 && y < 7) ||
    (x < 7 && y >= size - 7);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (inFinder(x, y)) continue;
      if ((x * 7 + y * 13 + x * y) % 3 === 0) {
        cells.push(
          <rect
            key={`${x}-${y}`}
            x={x * 4}
            y={y * 4}
            width="4"
            height="4"
          />
        );
      }
    }
  }

  const finder = (ox, oy) => (
    <g key={`${ox}-${oy}`}>
      <rect
        x={ox * 4}
        y={oy * 4}
        width="28"
        height="28"
        fill="#111827"
      />
      <rect
        x={(ox + 1) * 4}
        y={(oy + 1) * 4}
        width="20"
        height="20"
        fill="#fff"
      />
      <rect
        x={(ox + 2) * 4}
        y={(oy + 2) * 4}
        width="12"
        height="12"
        fill="#111827"
      />
    </g>
  );

  return (
    <svg
      viewBox="0 0 84 84"
      className="qr-pattern"
    >
      <rect
        width="84"
        height="84"
        fill="#ffffff"
        rx="4"
      />
      <g fill="#111827">{cells}</g>
      {finder(0, 0)}
      {finder(size - 7, 0)}
      {finder(0, size - 7)}
    </svg>
  );
}

/* =====================================================
   NOTEBOOK TEMPLATES — sab elements editable rehte hain
===================================================== */

/* =========================================================
   BALL PEN MOCKUP (vector — barrel color changeable)
   Pen horizontal — CSS tilt print-area ke saath rotate hota
   hai, isliye text/logo pen ke angle ko follow karte hain.
========================================================= */

function PenSvg({ color }) {
  const c = color || "#123d70";
  const top = shadeHex(c, 0.3);
  const bot = shadeHex(c, -0.32);

  return (
    <svg
      className="garment-svg"
      viewBox="0 0 600 500"
    >
      <defs>
        <linearGradient
          id="penBarrel"
          x1="0" y1="0" x2="0" y2="1"
        >
          <stop offset="0" stopColor={top} />
          <stop offset=".45" stopColor={c} />
          <stop offset="1" stopColor={bot} />
        </linearGradient>
        <linearGradient
          id="penMetal"
          x1="0" y1="0" x2="0" y2="1"
        >
          <stop offset="0" stopColor="#f4f7fa" />
          <stop offset=".5" stopColor="#c2cad4" />
          <stop offset="1" stopColor="#8d97a4" />
        </linearGradient>
      </defs>

      {/* soft shadow */}
      <ellipse
        cx="300" cy="302"
        rx="200" ry="14"
        fill="#000" opacity=".12"
      />

      {/* click button (left end) */}
      <rect
        x="92" y="238" width="26" height="24"
        rx="8" fill="url(#penMetal)"
      />
      <rect
        x="92" y="240" width="26" height="7"
        rx="3.5" fill="#ffffff" opacity=".35"
      />

      {/* end cap */}
      <rect
        x="116" y="230" width="18" height="40"
        rx="6" fill={bot}
      />

      {/* pocket clip — barrel ke upar, print area
          se alag */}
      <path
        d="M150 224 Q144 206 158 206 L238 206 L238 216 L162 216 Q158 216 160 224 Z"
        fill="#39424f"
      />
      <rect
        x="150" y="214" width="92" height="7"
        rx="3.5" fill="#2b323d"
      />

      {/* BARREL — printable zone yahan hoti hai */}
      <rect
        x="132" y="228" width="288" height="44"
        rx="9" fill="url(#penBarrel)"
        stroke="#00000018"
      />

      {/* cylinder sheen + bottom shade */}
      <rect
        x="140" y="233" width="270" height="7"
        rx="3.5" fill="#ffffff" opacity=".28"
      />
      <rect
        x="140" y="263" width="270" height="5"
        rx="2.5" fill="#000000" opacity=".12"
      />

      {/* grip rings near tip */}
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={390 + i * 7}
          y="228"
          width="3.5"
          height="44"
          fill="#000000"
          opacity=".13"
        />
      ))}

      {/* tip cone */}
      <path
        d="M420 228 L484 244 Q494 250 484 256 L420 272 Z"
        fill="url(#penMetal)"
      />
      <path
        d="M420 228 L484 244 L484 248 L420 234 Z"
        fill="#ffffff" opacity=".3"
      />

      {/* nib point */}
      <path
        d="M484 244 L498 250 L484 256 Z"
        fill="#4a5462"
      />
    </svg>
  );
}



/* =========================================================
   WATER BOTTLE MOCKUP (vector — body color changeable)
========================================================= */

function BottleSvg({ color }) {
  const c = color || "#2878df";
  const top = shadeHex(c, 0.28);
  const bot = shadeHex(c, -0.3);

  return (
    <svg
      className="garment-svg"
      viewBox="0 0 600 500"
    >
      <defs>
        <linearGradient
          id="bottleBody"
          x1="0" y1="0" x2="1" y2="0"
        >
          <stop offset="0" stopColor={top} />
          <stop offset=".35" stopColor={c} />
          <stop offset=".8" stopColor={bot} />
          <stop offset="1" stopColor={top} />
        </linearGradient>
      </defs>

      {/* shadow */}
      <ellipse
        cx="300" cy="445"
        rx="110" ry="16"
        fill="#000" opacity=".12"
      />

      {/* cap */}
      <rect
        x="272" y="58" width="56" height="34"
        rx="8" fill={bot}
        stroke="#00000022"
      />
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={284 + i * 11}
          y="58"
          width="4"
          height="34"
          fill="#000"
          opacity=".14"
        />
      ))}

      {/* neck ring */}
      <rect
        x="280" y="92" width="40" height="16"
        rx="4" fill={shadeHex(c, -0.15)}
      />

      {/* neck taper */}
      <path
        d="M270 108 L330 108 L345 150 L255 150 Z"
        fill={shadeHex(c, 0.1)}
      />

      {/* BODY */}
      <path
        d="M255 150 L345 150 L370 195 Q378 210 378 235 L378 400 Q378 435 340 435 L260 435 Q222 435 222 400 L222 235 Q222 210 230 195 Z"
        fill="url(#bottleBody)"
        stroke="#0000001e"
      />

      {/* cylinder sheen */}
      <rect
        x="238" y="175" width="16" height="235"
        rx="8" fill="#ffffff" opacity=".3"
      />
      <rect
        x="352" y="200" width="10" height="200"
        rx="5" fill="#000000" opacity=".1"
      />

      {/* label band — printable zone yahan hoti hai */}
      <rect
        x="222" y="232" width="156" height="88"
        fill="#ffffff" opacity=".14"
      />
    </svg>
  );
}

/* =========================================================
   MUG MOCKUP (vector — mug color changeable)
========================================================= */

export function MugSvg({ color }) {
  const c = color || "#ffffff";
  const dark = isDarkColor(c);
  const rim = dark ? shadeHex(c, 0.15) : "#e8edf3";
  const bot = shadeHex(c, -0.15);

  return (
    <svg
      className="garment-svg"
      viewBox="0 0 600 500"
    >
      <defs>
        <linearGradient
          id="mugBody"
          x1="0" y1="0" x2="1" y2="0"
        >
          <stop offset="0" stopColor={shadeHex(c, 0.12)} />
          <stop offset=".4" stopColor={c} />
          <stop offset="1" stopColor={bot} />
        </linearGradient>
      </defs>

      {/* shadow */}
      <ellipse
        cx="295" cy="415"
        rx="150" ry="18"
        fill="#000" opacity=".12"
      />

      {/* handle */}
      <path
        d="M378 195 Q465 205 455 275 Q445 340 378 350"
        fill="none"
        stroke={bot}
        strokeWidth="20"
        strokeLinecap="round"
      />

      {/* body */}
      <path
        d="M205 150 L205 365 Q205 405 250 405 L335 405 Q380 405 380 365 L380 150 Z"
        fill="url(#mugBody)"
        stroke="#00000018"
      />

      {/* rim / opening */}
      <ellipse
        cx="292" cy="150"
        rx="88" ry="16"
        fill={rim}
        stroke="#00000012"
      />
      <ellipse
        cx="292" cy="150"
        rx="72" ry="10"
        fill={dark ? shadeHex(c, -0.25) : "#c9d2dd"}
      />

      {/* sheen */}
      <rect
        x="222" y="175" width="18" height="195"
        rx="9" fill="#ffffff" opacity=".28"
      />

      {/* print zone hint band */}
      <rect
        x="240" y="205" width="105" height="130"
        fill="#ffffff" opacity={dark ? ".1" : ".05"}
      />
    </svg>
  );
}

/* =========================================================
   ENVELOPE MOCKUP — landscape DL/C5/C4, paper colorable.
   viewBox size follows the selected envelope size.
========================================================= */

const ENVELOPE_DIMS = {
  DL: [600, 300], /* 220×110mm → 2:1 */
  C5: [600, 425], /* 229×162mm ≈ 1.41:1 */
  C4: [600, 425], /* 324×229mm ≈ 1.41:1 */
};

function EnvelopeSvg({ color = "#f8f6f1", back, size = "DL" }) {
  const [W, H] = ENVELOPE_DIMS[size] || ENVELOPE_DIMS.DL;
  const dark = isDarkColor(color);
  const edge = dark ? "rgba(0,0,0,.4)" : "#ccd4df";
  const foldLine = dark ? "rgba(0,0,0,.28)" : "#dfe5ec";
  const body = dark ? color : color;
  const bodyLo = shadeHex(color, dark ? 0.08 : -0.06);
  const flapHi = dark ? shadeHex(color, -0.12) : shadeHex(color, -0.04);

  /* geometry — body spans nearly the whole viewBox */
  const L = W * 0.07;
  const R = W * 0.93;
  const T = H * 0.10;
  const B = H * 0.90;
  const cx = W / 2;
  const flapTip = H * 0.62;

  return (
    <svg
      className="garment-svg envelope-svg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient
          id="envPaper"
          x1="0" y1="0" x2="0" y2="1"
        >
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={bodyLo} />
        </linearGradient>
      </defs>

      {/* ground shadow */}
      <ellipse
        cx={cx}
        cy={B + H * 0.055}
        rx={W * 0.4}
        ry={H * 0.045}
        fill="#000"
        opacity=".12"
      />

      {/* body */}
      <rect
        x={L}
        y={T}
        width={R - L}
        height={B - T}
        rx={Math.min(10, H * 0.03)}
        fill="url(#envPaper)"
        stroke={edge}
      />

      {!back ? (
        <>
          {/* FRONT — flap seam V + side fold shading */}
          <path
            d={`M${L} ${T} L${cx} ${flapTip} L${R} ${T}`}
            fill="none"
            stroke={foldLine}
            strokeWidth="2.4"
          />
          <path
            d={`M${L} ${T} L${cx} ${flapTip} L${R} ${T} L${R} ${T + 6} L${cx} ${flapTip + 6} L${L} ${T + 6} Z`}
            fill={flapHi}
            opacity=".5"
          />
          <path
            d={`M${L} ${B} L${cx - W * 0.12} ${T + (B - T) * 0.42} L${L} ${T + 10} Z`}
            fill="#000"
            opacity=".03"
          />
          <path
            d={`M${R} ${B} L${cx + W * 0.12} ${T + (B - T) * 0.42} L${R} ${T + 10} Z`}
            fill="#000"
            opacity=".03"
          />
          {/* paper texture — faint fibres */}
          {Array.from({ length: 9 }).map((_, i) => (
            <rect
              key={i}
              x={L + 14}
              y={T + 16 + i * ((B - T - 32) / 8)}
              width={(R - L - 28) * (0.7 + (i % 3) * 0.12)}
              height="1"
              fill={dark ? "#ffffff" : "#94a3b8"}
              opacity=".05"
            />
          ))}
        </>
      ) : (
        <>
          {/* BACK — closed top flap + bottom pocket */}
          <path
            d={`M${L} ${T} L${R} ${T} L${cx} ${B - H * 0.06} Z`}
            fill={flapHi}
            stroke={foldLine}
            strokeWidth="2"
          />
          <path
            d={`M${L} ${T} L${cx} ${B - H * 0.06} L${R} ${T}`}
            fill="none"
            stroke={edge}
            strokeWidth="1.4"
          />
          <path
            d={`M${L} ${B} L${cx} ${B - H * 0.3} L${R} ${B}`}
            fill="none"
            stroke={foldLine}
            strokeWidth="2.2"
          />
        </>
      )}
    </svg>
  );
}



/* =========================================================
   PRINT AREA per customization type
   (% of preview box — product mockup ke upar safe zone)
========================================================= */

/* =====================================================
   VINYL STICKER MOCKUP — die-cut round sticker.

   400x400 viewBox, square face so the print-area maps 1:1:
   - r=186 white ring  = die-cut vinyl edge (stays white)
   - r=166 inner disc  = printable face (base colour)
   - subtle inner shade on the edge = realistic thickness
   - editing mode shows a dashed cut-line
===================================================== */

const StickerSvg = ({ color = "#f6f8fc" }) => (
  <svg
    viewBox="0 0 400 400"
    className="sticker-svg"
    aria-hidden="true"
  >
    <defs>
      <radialGradient
        id="stickerFace"
        cx="38%"
        cy="30%"
        r="75%"
      >
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
        <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="100%" stopColor="#0f2544" stopOpacity="0.06" />
      </radialGradient>
    </defs>

    {/* ground shadow */}
    <ellipse
      cx="200"
      cy="386"
      rx="152"
      ry="12"
      fill="rgba(15, 23, 42, 0.16)"
    />

    {/* die-cut vinyl edge */}
    <circle
      cx="200"
      cy="200"
      r="186"
      fill="#ffffff"
      stroke="#dfe4ec"
      strokeWidth="1.5"
    />

    {/* printable face */}
    <circle cx="200" cy="200" r="166" fill={color} />
    <circle cx="200" cy="200" r="166" fill="url(#stickerFace)" />
  </svg>
);

/* =====================================================
   GIFT SET MOCKUP — premium navy gift box, front view.

   400x400 viewBox. Body sits centred; print area maps to
   the box face (see PRINT_AREAS.giftset).
===================================================== */

const GiftSetSvg = ({ color = "#102a4c" }) => (
  <svg
    viewBox="0 0 400 400"
    className="giftset-svg"
    aria-hidden="true"
  >
    <defs>
      <linearGradient
        id="giftBox"
        x1="0"
        y1="0"
        x2="0"
        y2="1"
      >
        <stop offset="0%" stopColor={color} />
        <stop
          offset="100%"
          stopColor={shadeHex(color, -0.18)}
        />
      </linearGradient>
      <linearGradient
        id="giftLid"
        x1="0"
        y1="0"
        x2="0"
        y2="1"
      >
        <stop
          offset="0%"
          stopColor={shadeHex(color, 0.14)}
        />
        <stop offset="100%" stopColor={color} />
      </linearGradient>
    </defs>

    {/* ground shadow */}
    <ellipse
      cx="200"
      cy="352"
      rx="150"
      ry="13"
      fill="rgba(15, 23, 42, 0.16)"
    />

    {/* box body */}
    <rect
      x="70"
      y="152"
      width="260"
      height="196"
      rx="10"
      fill="url(#giftBox)"
    />

    {/* lid (overhang) */}
    <rect
      x="58"
      y="128"
      width="284"
      height="52"
      rx="10"
      fill="url(#giftLid)"
      stroke="rgba(0,0,0,0.12)"
      strokeWidth="1"
    />

    {/* ribbon — off-centre on the left third so the face
        keeps a clean print zone on the right */}
    <rect
      x="92"
      y="128"
      width="28"
      height="220"
      fill="#c9a227"
    />
    <rect
      x="58"
      y="136"
      width="284"
      height="36"
      fill="rgba(255,255,255,0.10)"
    />

    {/* ribbon bow */}
    <g transform="translate(-94 0)">
      <path
        d="M200 108
           c-14-24 -44-28 -52-12
           c-8 16 6 34 30 36
           c-16 8 -18 28 -6 36
           c12 8 28-2 28-18
           c0 16 16 26 28 18
           c12-8 10-28 -6-36
           c24-2 38-20 30-36
           c-8-16 -38-12 -52 12 z"
        fill="#c9a227"
        opacity="0.95"
      />
      <circle cx="200" cy="126" r="9" fill="#8a6d14" />
    </g>
  </svg>
);

/* =====================================================
   TOTE BAG MOCKUP — canvas tote, front view.

   400x400 viewBox. Handles + slightly tapered body;
   print zone = bag face under the handles
   (see PRINT_AREAS["tote-bag"]).
===================================================== */

const ToteBagSvg = ({ color = "#e8e0d0", back = false }) => {
  const body = color;
  const seam = shadeHex(color, -0.12);
  const handle = shadeHex(color, -0.22);

  return (
    <svg
      viewBox="0 0 400 400"
      className="totebag-svg"
      aria-hidden="true"
    >
      {/* ground shadow */}
      <ellipse
        cx="200"
        cy="356"
        rx="128"
        ry="12"
        fill="rgba(15, 23, 42, 0.15)"
      />

      {/* handles (behind body so they read as attached) */}
      <path
        d="M148 156
           C148 84 170 66 200 66
           C230 66 252 84 252 156"
        fill="none"
        stroke={handle}
        strokeWidth="12"
        strokeLinecap="round"
      />
      {!back && (
        <path
          d="M156 156
             C156 98 174 82 200 82
             C226 82 244 98 244 156"
          fill="none"
          stroke={shadeHex(handle, 0.16)}
          strokeWidth="7"
          strokeLinecap="round"
        />
      )}

      {/* bag body — gently tapered, wider at the base */}
      <path
        d="M104 150
           L296 150
           L308 344
           Q200 358 92 344
           Z"
        fill={body}
        stroke={seam}
        strokeWidth="2"
      />

      {/* top stitched edge */}
      <rect
        x="104"
        y="150"
        width="192"
        height="14"
        rx="3"
        fill={seam}
        opacity="0.5"
      />

      {/* side seam hints */}
      <line
        x1="104"
        y1="164"
        x2="92"
        y2="344"
        stroke={seam}
        strokeWidth="1.4"
        opacity="0.6"
      />
      <line
        x1="296"
        y1="164"
        x2="308"
        y2="344"
        stroke={seam}
        strokeWidth="1.4"
        opacity="0.6"
      />
    </svg>
  );
};

/* =====================================================
   CAP MOCKUP — baseball cap, front view.

   400x400 viewBox. Crown dome with centre panel + seams,
   curved brim extending right. Embroidery zone = the
   centre front panel between the side seams.
===================================================== */

const CapSvg = ({ color = "#102a4c" }) => {
  const seam = shadeHex(color, -0.22);
  const brim = shadeHex(color, -0.10);
  const sheen = shadeHex(color, 0.18);

  return (
    <svg
      viewBox="0 0 400 400"
      className="cap-svg"
      aria-hidden="true"
    >
      {/* ground shadow */}
      <ellipse
        cx="205"
        cy="316"
        rx="150"
        ry="13"
        fill="rgba(15, 23, 42, 0.16)"
      />

      {/* curved brim — extends right */}
      <path
        d="M118 244
           Q200 282 356 246
           Q362 230 344 222
           Q236 252 118 228 Z"
        fill={brim}
        stroke={seam}
        strokeWidth="1.5"
      />
      {/* brim stitching */}
      <path
        d="M128 236 Q200 264 344 234"
        fill="none"
        stroke={seam}
        strokeWidth="1"
        opacity="0.5"
      />

      {/* crown */}
      <path
        d="M96 232
           Q90 128 200 116
           Q310 128 304 232
           L96 232 Z"
        fill={color}
      />
      {/* crown sheen */}
      <path
        d="M104 214 Q108 138 200 126 Q160 138 158 214 Z"
        fill={sheen}
        opacity="0.5"
      />

      {/* top button */}
      <circle cx="200" cy="114" r="7" fill={seam} />

      {/* panel seams — front panel sits between these */}
      <path
        d="M200 120 Q150 148 144 232"
        fill="none"
        stroke={seam}
        strokeWidth="1.6"
        opacity="0.75"
      />
      <path
        d="M200 120 Q250 148 256 232"
        fill="none"
        stroke={seam}
        strokeWidth="1.6"
        opacity="0.75"
      />
      <path
        d="M200 120 L200 232"
        stroke={seam}
        strokeWidth="1"
        opacity="0.35"
      />
    </svg>
  );
};

/* =====================================================
   SHIPPING BOX MOCKUP - kraft box, front view.

   400x400 viewBox. Top flap + body + vertical tape strip
   on the RIGHT side so the left face stays a clean print
   zone (see PRINT_AREAS.box).
===================================================== */

const BoxSvg = ({ color = "#d9b382" }) => {
  const shade = shadeHex(color, -0.14);
  const dark = shadeHex(color, -0.3);

  return (
    <svg
      viewBox="0 0 400 400"
      className="box-svg"
      aria-hidden="true"
    >
      {/* ground shadow */}
      <ellipse
        cx="200"
        cy="344"
        rx="140"
        ry="12"
        fill="rgba(15, 23, 42, 0.15)"
      />

      {/* top flap - shallow trapezoid */}
      <path
        d="M96 148 L304 148 L316 118 L84 118 Z"
        fill={shade}
        stroke={dark}
        strokeWidth="1"
      />
      {/* flap centre slit */}
      <line
        x1="200"
        y1="118"
        x2="200"
        y2="148"
        stroke={dark}
        strokeWidth="1.5"
      />

      {/* box body */}
      <rect
        x="96"
        y="148"
        width="208"
        height="192"
        rx="3"
        fill={color}
        stroke={dark}
        strokeWidth="1.5"
      />

      {/* vertical packing tape - right of centre */}
      <rect
        x="244"
        y="148"
        width="26"
        height="192"
        fill="rgba(255,255,255,0.35)"
        stroke="rgba(0,0,0,0.06)"
      />
      <rect
        x="244"
        y="148"
        width="26"
        height="20"
        fill="rgba(255,255,255,0.45)"
      />

      {/* bottom edge hint */}
      <line
        x1="96"
        y1="334"
        x2="304"
        y2="334"
        stroke={dark}
        strokeWidth="1"
        opacity="0.4"
      />
    </svg>
  );
};

/* =====================================================
   LETTERHEAD MOCKUP - A4 sheet with a brand header band.

   400x560 viewBox (A4). The print zone is the header
   band (see PRINT_AREAS.letterhead); the body shows
   faint content lines only.
===================================================== */

const LetterheadSvg = ({ color = "#102a4c" }) => (
  <svg
    viewBox="0 0 400 560"
    className="letterhead-svg"
    aria-hidden="true"
    /* "none" keeps the print-area % aligned with the
       band for both A4 and Letter aspect ratios */
    preserveAspectRatio="none"
  >
    {/* ground shadow */}
    <ellipse
      cx="200"
      cy="546"
      rx="140"
      ry="10"
      fill="rgba(15, 23, 42, 0.14)"
    />

    {/* back sheets */}
    <rect
      x="72"
      y="30"
      width="270"
      height="500"
      rx="4"
      fill="#e8ecf2"
      transform="rotate(2 200 280)"
    />
    <rect
      x="66"
      y="26"
      width="270"
      height="500"
      rx="4"
      fill="#f2f5f9"
      transform="rotate(1 200 280)"
    />

    {/* main sheet */}
    <rect
      x="60"
      y="20"
      width="280"
      height="510"
      rx="4"
      fill="#ffffff"
      stroke="#e2e8f0"
    />

    {/* brand header band - the print zone */}
    <rect
      x="60"
      y="20"
      width="280"
      height="86"
      rx="4"
      fill={color}
    />
    {/* gold accent underline */}
    <rect
      x="60"
      y="106"
      width="280"
      height="4"
      fill="#c9a227"
    />

    {/* faint body content lines */}
    {[150, 178, 206, 234, 262, 318, 346, 374].map(
      (y, i) => (
        <rect
          key={i}
          x="84"
          y={y}
          width={i % 4 === 3 ? 150 : 232}
          height="7"
          rx="3"
          fill="#eef1f6"
        />
      )
    )}
    <rect
      x="84"
      y="290"
      width="110"
      height="7"
      rx="3"
      fill={color}
      opacity="0.35"
    />

    {/* footer strip */}
    <rect
      x="60"
      y="478"
      width="280"
      height="52"
      fill="#f4f6fa"
    />
    <rect
      x="84"
      y="494"
      width="180"
      height="6"
      rx="3"
      fill="#dfe5ee"
    />
    <rect
      x="84"
      y="510"
      width="130"
      height="6"
      rx="3"
      fill="#dfe5ee"
    />
  </svg>
);

/* =====================================================
   EVENT POSTER - blank A-series sheet.

   400x566 viewBox (1/sqrt(2) - the ISO A-series ratio).
   The sheet itself is plain paper; every visual lives as
   an editable element inside the print zone.
===================================================== */

const PosterSvg = () => (
  <svg
    viewBox="0 0 400 566"
    className="poster-svg"
    aria-hidden="true"
    preserveAspectRatio="none"
  >
    <ellipse
      cx="200"
      cy="556"
      rx="150"
      ry="9"
      fill="rgba(15, 23, 42, 0.14)"
    />
    <rect
      x="20"
      y="14"
      width="360"
      height="538"
      rx="2"
      fill="#ffffff"
      stroke="#e2e8f0"
      strokeWidth="1"
    />
  </svg>
);

/* =====================================================
   PAPER BAG MOCKUP - kraft shopping bag, front view.

   400x400 viewBox. Folded top edge + twisted-paper
   handles; print zone = the bag face.
===================================================== */

const PaperBagSvg = ({ color = "#d9b382" }) => {
  const shade = shadeHex(color, -0.16);
  const dark = shadeHex(color, -0.32);

  return (
    <svg
      viewBox="0 0 400 400"
      className="paperbag-svg"
      aria-hidden="true"
    >
      {/* ground shadow */}
      <ellipse
        cx="200"
        cy="352"
        rx="130"
        ry="12"
        fill="rgba(15, 23, 42, 0.15)"
      />

      {/* twisted-paper handles */}
      <path
        d="M148 124 C148 70 252 70 252 124"
        fill="none"
        stroke={shade}
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M162 124 C162 84 238 84 238 124"
        fill="none"
        stroke={dark}
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* folded top band */}
      <rect
        x="108"
        y="124"
        width="184"
        height="22"
        rx="3"
        fill={shade}
        stroke={dark}
        strokeWidth="1"
      />

      {/* bag body - slightly tapered trapezoid */}
      <path
        d="M108 146 L292 146 L304 340 Q200 352 96 340 Z"
        fill={color}
        stroke={dark}
        strokeWidth="1.5"
      />

      {/* bottom fold hint */}
      <path
        d="M104 322 L296 322"
        stroke={dark}
        strokeWidth="1"
        opacity="0.5"
      />
    </svg>
  );
};

const PRINT_AREAS = {
  /* mug front print zone (body center) */
  mug: { left: 40, top: 42, width: 18, height: 26 },
  /* premium pen barrel — engraving area must match the full body and
     stay centered without clipping at the cap/tip */
  pen: { left: 18, top: 41, width: 64, height: 18 },
  /* bottle label band — cap/neck/base se door */
  bottle: { left: 37, top: 46, width: 26, height: 20 },
  "water-bottle": {
    left: 37,
    top: 46,
    width: 26,
    height: 20,
  },
  /* letterhead - the navy header band only
     (x 76-324 of 400, y 26-100 of 560) */
  letterhead: { left: 19, top: 4.7, width: 62, height: 13.3 },
  /* flyer = whole sheet minus a small safe margin — every
     part of the page is a customizable element */
  flyer: { left: 3, top: 3, width: 94, height: 94 },
  brochure: { left: 24, top: 24, width: 52, height: 52 },
  /* poster - full bleed minus a paper edge margin;
     every part of the sheet is editable */
  poster: { left: 6, top: 4, width: 88, height: 92 },
  /* die-cut circle — inner disc of StickerSvg (r=166/400 →
     83% of the square preview, centered) */
  sticker: { left: 8.5, top: 8.5, width: 83, height: 83 },
  /* envelope — front body (flap V seam ke neeche tak),
     back = flap surface */
  envelope: {
    front: { left: 9, top: 16, width: 82, height: 72 },
    back: { left: 18, top: 14, width: 64, height: 55 },
  },
  /* paper bag face - below the folded band, inside the
     trapezoid body */
  "paper-bag": { left: 30, top: 42, width: 40, height: 36 },
  /* shipping box - left face, clear of the tape strip
     (tape occupies ~61-67%) and the top flap */
  box: { left: 26, top: 46, width: 33, height: 30 },
  /* tote face — inside the bag body, under the stitched
     top edge and clear of the side seams */
  "tote-bag": { left: 32, top: 46, width: 36, height: 30 },
  /* cap — centre front panel between the panel seams,
     above the brim (embroidery-safe zone) */
  cap: { left: 37, top: 40, width: 26, height: 17 },
  /* gift box face — right of the vertical ribbon (which
     sits at ~23-30%), centred on the box body */
  giftset: { left: 34, top: 48, width: 47, height: 34 },
};

const FLYER_SIZE_CONFIG = {
  A4: {
    aspect: 210 / 297,
    scale: 1,
    font: { company: 22, person: 14, designation: 11, custom: 13 },
  },
  A5: {
    aspect: 148 / 210,
    scale: 0.86,
    font: { company: 19, person: 13, designation: 10, custom: 12 },
  },
  DL: {
    aspect: 99 / 210,
    scale: 0.72,
    font: { company: 15, person: 11, designation: 9, custom: 10 },
  },
};

const getFlyerSizeConfig = (flyerSize) =>
  FLYER_SIZE_CONFIG[flyerSize] || FLYER_SIZE_CONFIG.A4;

const textBoxForKind = (kind, isCompact = false) => {
  const boxes = {
    company: { width: isCompact ? 80 : 86, height: isCompact ? 12 : 10 },
    person: { width: 76, height: 8 },
    designation: { width: 72, height: 7 },
    custom: { width: 76, height: 12 },
    address: { width: 70, height: 20 },
    return_addr: { width: 76, height: 16 },
  };

  return boxes[kind] || boxes.custom;
};

const normalizeTextElement = (el, flyerSize = "A4") => {
  if (!el || el.type !== "text") return el;

  const box = textBoxForKind(el.kind, flyerSize === "DL");
  const cfg = getFlyerSizeConfig(flyerSize);
  const fallbackFont =
    cfg.font[el.kind] ||
    cfg.font.custom;

  return {
    ...el,
    width: el.width || box.width,
    height: el.height || box.height,
    fontSize: el.width
      ? el.fontSize || fallbackFont
      : Math.min(el.fontSize || fallbackFont, fallbackFont),
    lineHeight: el.lineHeight || 1.12,
  };
};

const constrainElementPatch = (el, patch = {}) => {
  const next = { ...el, ...patch };
  const halfW =
    next.type === "text" || next.type === "shape" || next.type === "image" || next.type === "qr"
      ? (Number(next.width) || (next.type === "text" ? 70 : 20)) / 2
      : 0;
  const halfH =
    next.type === "text"
      ? (Number(next.height) || 10) / 2
      : next.type === "shape"
      ? (Number(next.height || next.width) || 20) / 2
      : (Number(next.width) || 20) / 2;

  const safePatch = { ...patch };

  if (patch.x != null) {
    safePatch.x = clamp(next.x, halfW, 100 - halfW);
  }

  if (patch.y != null) {
    safePatch.y = clamp(next.y, halfH, 100 - halfH);
  }

  return safePatch;
};

const NOTEBOOK_TEMPLATES = [
  {
    id: "minimal",
    name: "Minimal",
    elements: (ink) => [
      {
        type: "shape",
        shape: "line",
        label: "Divider",
        x: 50,
        y: 30,
        width: 40,
        height: 2,
        color: ink,
        opacity: 1,
        rotation: 0,
        hidden: false,
      },
      {
        type: "text",
        kind: "company",
        label: "Company Name",
        text: "COMPANY NAME",
        x: 50,
        y: 40,
        fontSize: 24,
        fontFamily: "Poppins",
        color: ink,
        bold: true,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 2,
        rotation: 0,
        hidden: false,
      },
      {
        type: "text",
        kind: "person",
        label: "Person Name",
        text: "YOUR NAME",
        x: 50,
        y: 58,
        fontSize: 16,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1,
        rotation: 0,
        hidden: false,
      },
    ],
  },
  {
    id: "corporate",
    name: "Corporate",
    elements: (ink) => [
      {
        type: "shape",
        shape: "rect",
        label: "Header Band",
        x: 50,
        y: 14,
        width: 100,
        height: 12,
        color: ink,
        opacity: 0.9,
        rotation: 0,
        hidden: false,
      },
      {
        type: "text",
        kind: "company",
        label: "Company Name",
        text: "COMPANY NAME",
        x: 50,
        y: 32,
        fontSize: 26,
        fontFamily: "Montserrat",
        color: ink,
        bold: true,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1,
        rotation: 0,
        hidden: false,
      },
      {
        type: "text",
        kind: "person",
        label: "Person Name",
        text: "YOUR NAME",
        x: 50,
        y: 50,
        fontSize: 17,
        fontFamily: "Montserrat",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1,
        rotation: 0,
        hidden: false,
      },
      {
        type: "text",
        kind: "designation",
        label: "Designation",
        text: "DESIGNATION",
        x: 50,
        y: 60,
        fontSize: 13,
        fontFamily: "Montserrat",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 2,
        rotation: 0,
        hidden: false,
      },
      {
        type: "shape",
        shape: "line",
        label: "Divider",
        x: 50,
        y: 72,
        width: 55,
        height: 2,
        color: ink,
        opacity: 0.7,
        rotation: 0,
        hidden: false,
      },
    ],
  },
  {
    id: "modern",
    name: "Modern",
    elements: (ink) => [
      {
        type: "shape",
        shape: "circle",
        label: "Accent Circle",
        x: 18,
        y: 16,
        width: 22,
        height: 22,
        color: ink,
        opacity: 0.25,
        rotation: 0,
        hidden: false,
      },
      {
        type: "text",
        kind: "company",
        label: "Company Name",
        text: "COMPANY\nNAME",
        x: 50,
        y: 38,
        fontSize: 28,
        fontFamily: "Poppins",
        color: ink,
        bold: true,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 3,
        rotation: 0,
        hidden: false,
      },
      {
        type: "text",
        kind: "custom",
        label: "Tagline",
        text: "CUSTOM NOTEBOOK",
        x: 50,
        y: 60,
        fontSize: 12,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 4,
        rotation: 0,
        hidden: false,
      },
    ],
  },
  {
    id: "business-back",
    name: "Business (Back)",
    elements: (ink) => [
      {
        type: "text",
        kind: "company",
        label: "Company Name",
        text: "COMPANY NAME",
        x: 50,
        y: 24,
        fontSize: 22,
        fontFamily: "Poppins",
        color: ink,
        bold: true,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 2,
        rotation: 0,
        hidden: false,
      },
      {
        type: "text",
        kind: "custom",
        label: "Website",
        text: "www.yourcompany.com",
        x: 50,
        y: 42,
        fontSize: 14,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 0,
        rotation: 0,
        hidden: false,
      },
      {
        type: "text",
        kind: "custom",
        label: "Phone",
        text: "+91 XXXXX XXXXX",
        x: 50,
        y: 52,
        fontSize: 14,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1,
        rotation: 0,
        hidden: false,
      },
      {
        type: "qr",
        label: "QR Code",
        x: 50,
        y: 76,
        width: 26,
        rotation: 0,
        opacity: 1,
        hidden: false,
      },
    ],
  },
];

/* =====================================================
   DEFAULT DESIGN
===================================================== */

const makeNotebookDefaults = (shirtColor) => {
  const ink = printColorFor(shirtColor);

  return {
    front: [
      {
        id: uid(),
        type: "text",
        kind: "company",
        label: "Company Name",
        text: "COMPANY NAME",
        x: 50,
        y: 34,
        fontSize: 26,
        fontFamily: "Poppins",
        color: ink,
        bold: true,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 2,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "custom",
        label: "Tagline",
        text: "CUSTOM NOTEBOOK",
        x: 50,
        y: 46,
        fontSize: 12,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 4,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "person",
        label: "Person Name",
        text: "YOUR NAME",
        x: 50,
        y: 62,
        fontSize: 18,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "designation",
        label: "Designation",
        text: "DESIGNATION",
        x: 50,
        y: 72,
        fontSize: 13,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 2,
        rotation: 0,
        hidden: false,
      },
    ],
    back: [
      {
        id: uid(),
        type: "text",
        kind: "company",
        label: "Company Name",
        text: "COMPANY NAME",
        x: 50,
        y: 26,
        fontSize: 22,
        fontFamily: "Poppins",
        color: ink,
        bold: true,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 2,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "custom",
        label: "Website",
        text: "www.yourcompany.com",
        x: 50,
        y: 44,
        fontSize: 14,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 0,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "custom",
        label: "Phone",
        text: "+91 XXXXX XXXXX",
        x: 50,
        y: 54,
        fontSize: 14,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "qr",
        label: "QR Code",
        x: 50,
        y: 78,
        width: 26,
        rotation: 0,
        opacity: 1,
        hidden: false,
      },
    ],
  };
};

/* envelope defaults — sender top-left, recipient block
   center-right, back flap pe return address */
const makeEnvelopeDefaults = (paperColor) => {
  const ink = printColorFor(paperColor);

  return {
    front: [
      {
        id: uid(),
        type: "text",
        kind: "company",
        label: "Company Name",
        text: "COMPANY NAME",
        x: 28,
        y: 16,
        fontSize: 15,
        fontFamily: "Poppins",
        color: ink,
        bold: true,
        italic: false,
        underline: false,
        align: "left",
        letterSpacing: 1,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "person",
        label: "Recipient Name",
        text: "RECIPIENT NAME",
        x: 60,
        y: 52,
        fontSize: 17,
        fontFamily: "Poppins",
        color: ink,
        bold: true,
        italic: false,
        underline: false,
        align: "left",
        letterSpacing: 1,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "address",
        label: "Recipient Address",
        text: "Street / Area\nCity, State - PIN",
        x: 60,
        y: 70,
        fontSize: 11,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "left",
        letterSpacing: 0.5,
        rotation: 0,
        hidden: false,
      },
    ],
    back: [
      {
        id: uid(),
        type: "text",
        kind: "return_addr",
        label: "Return Address",
        text: "If undelivered, return to:\nCOMPANY NAME, CITY - PIN",
        x: 50,
        y: 30,
        fontSize: 9,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 0.5,
        rotation: 0,
        hidden: false,
      },
    ],
  };
};

const makeFlyerDefaults = (paperColor, flyerSize = "A4") => {
  const ink = printColorFor(paperColor);
  const cfg = getFlyerSizeConfig(flyerSize);

  const textEl = (kind, label, text, x, y, extra = {}) =>
    normalizeTextElement(
      {
        id: uid(),
        type: "text",
        kind,
        label,
        text,
        x,
        y,
        fontSize:
          extra.fontSize ||
          cfg.font[kind] ||
          cfg.font.custom,
        fontFamily: extra.fontFamily || "Poppins",
        color: extra.color || ink,
        bold: extra.bold ?? kind === "company",
        italic: false,
        underline: false,
        align: extra.align || "center",
        letterSpacing: extra.letterSpacing ?? (kind === "company" ? 0.4 : 0),
        rotation: 0,
        hidden: false,
        ...textBoxForKind(kind, flyerSize === "DL"),
        ...extra,
      },
      flyerSize
    );

  /* decorations are REAL shape elements — selectable,
     draggable, recolorable, deletable (was static CSS) */
  const ACCENT = "#e1523d";
  const NAVY = "#1d3252";
  const GRAY = "#c8d2de";

  const shapeEl = (label, x, y, width, height, color, extra = {}) => ({
    id: uid(),
    type: "shape",
    shape: extra.shape || "rect",
    label,
    x,
    y,
    width,
    height,
    color,
    opacity: 1,
    rotation: 0,
    hidden: false,
    ...extra,
  });

  return {
    front: [
      shapeEl("Header Block", 50, 16, 100, 32, ACCENT),
      shapeEl("Logo Circle", 50, 16, 12, 8.4, NAVY, {
        shape: "circle",
      }),
      shapeEl("Divider — Bold", 50, 40, 72, 4, NAVY),
      shapeEl("Divider — Light 1", 50, 47, 78, 1.5, GRAY),
      shapeEl("Divider — Light 2", 50, 53, 68, 1.5, GRAY),
      shapeEl("Divider — Light 3", 50, 59, 58, 1.5, GRAY),
      textEl("company", "Company Name", "COMPANY NAME", 50, 67),
      textEl("person", "Person Name", "YOUR NAME", 50, 75, {
        bold: false,
      }),
      textEl("designation", "Designation", "DESIGNATION", 50, 81, {
        bold: false,
        letterSpacing: 0.8,
      }),
      shapeEl("CTA Bar", 31, 89, 38, 8, ACCENT, {
        shape: "pill",
      }),
    ],
    back: [
      shapeEl("Header Band", 50, 10, 100, 20, ACCENT),
      shapeEl("Divider — Bold", 50, 32, 72, 4, NAVY),
      shapeEl("Divider — Light 1", 50, 40, 78, 1.5, GRAY),
      shapeEl("Divider — Light 2", 50, 47, 68, 1.5, GRAY),
      shapeEl("Divider — Light 3", 50, 54, 58, 1.5, GRAY),
      textEl("company", "Company Name", "COMPANY NAME", 50, 63),
      textEl("custom", "Website", "www.yourcompany.com", 50, 73, {
        fontSize: cfg.font.custom,
        bold: false,
      }),
      textEl("custom", "Phone", "+91 XXXXX XXXXX", 50, 80, {
        fontSize: cfg.font.custom,
        bold: false,
      }),
    ],
  };
};

const makePenDefaults = (penColor) => {
  const ink = printColorFor(penColor);

  return {
    front: [
      {
        id: uid(),
        type: "text",
        kind: "company",
        label: "Company Name",
        text: "COMPANY NAME",
        x: 50,
        y: 38,
        fontSize: 15,
        fontFamily: "Poppins",
        color: ink,
        bold: true,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 2,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "custom",
        label: "Website",
        text: "www.yourcompany.com",
        x: 50,
        y: 68,
        fontSize: 9,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1,
        rotation: 0,
        hidden: false,
      },
    ],
    back: [],
  };
};

/* vinyl sticker — balanced die-cut layout:
   logo slot top, name centre, divider, tagline below.
   All inside the circular print area (clipped). */
const makeStickerDefaults = (faceColor) => {
  const ink = printColorFor(faceColor);

  return {
    front: [
      {
        id: uid(),
        type: "shape",
        kind: "shape",
        label: "Logo Circle",
        shape: "circle",
        x: 50,
        y: 26,
        width: 24,
        height: 24,
        color: ink,
        opacity: 1,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "company",
        label: "Company Name",
        text: "COMPANY NAME",
        x: 50,
        y: 52,
        fontSize: 19,
        fontFamily: "Poppins",
        color: ink,
        bold: true,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1.5,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "shape",
        kind: "shape",
        label: "Divider",
        shape: "line",
        x: 50,
        y: 61,
        width: 40,
        height: 2,
        color: ink,
        opacity: 0.55,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "custom",
        label: "Tagline",
        text: "PREMIUM VINYL STICKER",
        x: 50,
        y: 70,
        fontSize: 10,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 3,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "custom",
        label: "Website",
        text: "www.yourcompany.com",
        x: 50,
        y: 82,
        fontSize: 9,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1,
        rotation: 0,
        hidden: false,
      },
    ],
    back: [],
  };
};

/* gift set — company mark + name on the box face, clear of
   the ribbon band */
const makeGiftSetDefaults = (boxColor) => {
  const ink = "#f0e3b3"; /* gold print on navy box */
  const safe = printColorFor(boxColor);

  return {
    front: [
      {
        id: uid(),
        type: "text",
        kind: "company",
        label: "Company Name",
        text: "COMPANY NAME",
        x: 50,
        y: 42,
        fontSize: 15,
        fontFamily: "Poppins",
        color: isDarkColor(boxColor) ? ink : safe,
        bold: true,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1.5,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "custom",
        label: "Tagline",
        text: "PREMIUM GIFT SET",
        x: 50,
        y: 62,
        fontSize: 9,
        fontFamily: "Poppins",
        color: isDarkColor(boxColor) ? ink : safe,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 3,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "shape",
        kind: "shape",
        label: "Divider",
        shape: "line",
        x: 50,
        y: 53,
        width: 44,
        height: 1.5,
        color: isDarkColor(boxColor) ? ink : safe,
        opacity: 0.6,
        rotation: 0,
        hidden: false,
      },
    ],
    back: [],
  };
};

/* tote bag — logo mark above, company name centred below;
   both inside the bag-face print zone */
const makeToteDefaults = (bagColor) => {
  const ink = printColorFor(bagColor);

  return {
    front: [
      {
        id: uid(),
        type: "shape",
        kind: "shape",
        label: "Logo Circle",
        shape: "circle",
        x: 50,
        y: 28,
        width: 26,
        height: 26,
        color: ink,
        opacity: 0.85,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "company",
        label: "Company Name",
        text: "COMPANY NAME",
        x: 50,
        y: 55,
        fontSize: 14,
        fontFamily: "Poppins",
        color: ink,
        bold: true,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1.5,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "custom",
        label: "Tagline",
        text: "EST. 2024",
        x: 50,
        y: 70,
        fontSize: 8,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 3,
        rotation: 0,
        hidden: false,
      },
    ],
    back: [
      {
        id: uid(),
        type: "text",
        kind: "custom",
        label: "Website",
        text: "www.yourcompany.com",
        x: 50,
        y: 52,
        fontSize: 11,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1,
        rotation: 0,
        hidden: false,
      },
    ],
  };
};

/* cap — small logo mark on the front panel + company name
   under it; embroidery-safe zone is compact, so defaults
   stay small and stacked */
const makeCapDefaults = (capColor) => {
  const ink = printColorFor(capColor);

  return {
    front: [
      {
        id: uid(),
        type: "shape",
        kind: "shape",
        label: "Logo Circle",
        shape: "circle",
        x: 50,
        y: 34,
        width: 30,
        height: 30,
        color: ink,
        opacity: 0.85,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "company",
        label: "Company Name",
        text: "COMPANY",
        x: 50,
        y: 70,
        fontSize: 11,
        fontFamily: "Poppins",
        color: ink,
        bold: true,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 2,
        rotation: 0,
        hidden: false,
      },
    ],
    back: [],
  };
};

/* shipping box - brand mark + name on the left face,
   clear of the tape strip */
const makeBoxDefaults = (boxColor) => {
  const ink = isDarkColor(boxColor)
    ? "#f5f0e6"
    : "#3d2b15";

  return {
    front: [
      {
        id: uid(),
        type: "shape",
        kind: "shape",
        label: "Logo Circle",
        shape: "circle",
        x: 50,
        y: 30,
        width: 30,
        height: 30,
        color: ink,
        opacity: 0.85,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "company",
        label: "Company Name",
        text: "COMPANY NAME",
        x: 50,
        y: 58,
        fontSize: 13,
        fontFamily: "Poppins",
        color: ink,
        bold: true,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1.5,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "custom",
        label: "Tagline",
        text: "HANDLE WITH CARE",
        x: 50,
        y: 74,
        fontSize: 8,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 3,
        rotation: 0,
        hidden: false,
      },
    ],
    back: [],
  };
};

/* letterhead - logo mark + company name inside the header
   band, contact line small underneath */
const makeLetterheadDefaults = (bandColor) => {
  /* white product colour means the band renders as navy
     (same fallback as LetterheadSvg) - ink must contrast
     with the RENDERED colour, not the raw option */
  const ink = printColorFor(
    bandColor === "#ffffff" ? "#102a4c" : bandColor
  );

  return {
    front: [
      {
        id: uid(),
        type: "shape",
        kind: "shape",
        label: "Logo Circle",
        shape: "circle",
        x: 14,
        y: 50,
        width: 9,
        height: 9,
        color: ink,
        opacity: 0.9,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "company",
        label: "Company Name",
        text: "COMPANY NAME",
        x: 56,
        y: 40,
        fontSize: 14,
        fontFamily: "Poppins",
        color: ink,
        bold: true,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 2,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "custom",
        label: "Contact Line",
        text: "yourcompany.com  |  +91 00000 00000",
        x: 56,
        y: 70,
        fontSize: 8,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1,
        rotation: 0,
        hidden: false,
      },
    ],
    back: [],
  };
};

/* event poster - real template: navy hero band + logo,
   event title, date/venue, divider, CTA bar, footer.
   Every piece is an editable element. */
const makePosterDefaults = (brandColor) => {
  const band =
    brandColor === "#ffffff" ? "#102a4c" : brandColor;
  const bandInk = printColorFor(band);
  const gold = "#c9a227";

  return {
    front: [
      /* navy hero band */
      {
        id: uid(),
        type: "shape",
        kind: "shape",
        label: "Hero Band",
        shape: "rect",
        x: 50,
        y: 13,
        width: 110,
        height: 26,
        color: band,
        opacity: 1,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "shape",
        kind: "shape",
        label: "Logo Circle",
        shape: "circle",
        x: 50,
        y: 9,
        width: 13,
        height: 13,
        color: "#ffffff",
        opacity: 0.95,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "company",
        label: "Event Title",
        text: "ANNUAL BUSINESS SUMMIT",
        x: 50,
        y: 20,
        fontSize: 15,
        fontFamily: "Poppins",
        color: bandInk,
        bold: true,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1.5,
        rotation: 0,
        hidden: false,
      },
      /* event details */
      {
        id: uid(),
        type: "text",
        kind: "custom",
        label: "Date & Venue",
        text: "JUNE 12-14  |  CONVENTION CENTRE",
        x: 50,
        y: 40,
        fontSize: 10,
        fontFamily: "Poppins",
        color: "#102a4c",
        bold: true,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "custom",
        label: "Subtitle",
        text: "Keynotes, workshops & networking",
        x: 50,
        y: 49,
        fontSize: 9,
        fontFamily: "Poppins",
        color: "#475569",
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 0,
        rotation: 0,
        hidden: false,
      },
      /* gold divider */
      {
        id: uid(),
        type: "shape",
        kind: "shape",
        label: "Divider",
        shape: "line",
        x: 50,
        y: 58,
        width: 46,
        height: 2,
        color: gold,
        opacity: 1,
        rotation: 0,
        hidden: false,
      },
      /* CTA bar + text */
      {
        id: uid(),
        type: "shape",
        kind: "shape",
        label: "CTA Bar",
        shape: "rect",
        x: 50,
        y: 72,
        width: 56,
        height: 9,
        color: gold,
        opacity: 1,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "custom",
        label: "CTA",
        text: "REGISTER NOW",
        x: 50,
        y: 72,
        fontSize: 11,
        fontFamily: "Poppins",
        color: "#102a4c",
        bold: true,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 2.5,
        rotation: 0,
        hidden: false,
      },
      /* footer */
      {
        id: uid(),
        type: "text",
        kind: "custom",
        label: "Organizer",
        text: "Organized by YOUR COMPANY",
        x: 50,
        y: 88,
        fontSize: 8,
        fontFamily: "Poppins",
        color: "#64748b",
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1,
        rotation: 0,
        hidden: false,
      },
    ],
    back: [],
  };
};

/* paper bag - logo mark + company name on the face */
const makePaperBagDefaults = (bagColor) => {
  const ink = isDarkColor(bagColor)
    ? "#f5f0e6"
    : "#3d2b15";

  return {
    front: [
      {
        id: uid(),
        type: "shape",
        kind: "shape",
        label: "Logo Circle",
        shape: "circle",
        x: 50,
        y: 28,
        width: 30,
        height: 30,
        color: ink,
        opacity: 0.85,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "company",
        label: "Company Name",
        text: "COMPANY NAME",
        x: 50,
        y: 56,
        fontSize: 14,
        fontFamily: "Poppins",
        color: ink,
        bold: true,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1.5,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "custom",
        label: "Tagline",
        text: "THANK YOU",
        x: 50,
        y: 74,
        fontSize: 9,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 3,
        rotation: 0,
        hidden: false,
      },
    ],
    back: [],
  };
};

const makeDefaultDesigns = (shirtColor) => {
  const ink = printColorFor(shirtColor);

  return {
    front: [
      {
        id: uid(),
        type: "text",
        kind: "company",
        label: "Company Name",
        text: "COMPANY NAME",
        x: 50,
        y: 42,
        fontSize: 26,
        fontFamily: "Poppins",
        color: ink,
        bold: true,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1,
        rotation: 0,
        hidden: false,
      },
    ],
    back: [
      {
        id: uid(),
        type: "text",
        kind: "company",
        label: "Company Name",
        text: "COMPANY NAME",
        x: 50,
        y: 28,
        fontSize: 32,
        fontFamily: "Poppins",
        color: ink,
        bold: true,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "person",
        label: "Person Name",
        text: "YOUR NAME",
        x: 50,
        y: 48,
        fontSize: 20,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1,
        rotation: 0,
        hidden: false,
      },
      {
        id: uid(),
        type: "text",
        kind: "designation",
        label: "Designation",
        text: "DESIGNATION",
        x: 50,
        y: 62,
        fontSize: 14,
        fontFamily: "Poppins",
        color: ink,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        letterSpacing: 1,
        rotation: 0,
        hidden: false,
      },
    ],
  };
};

function Customizer() {
  const navigate = useNavigate();
  const { addToCart: contextAddToCart } = useCart();
  const { user } = useAuth();

  /* =====================================================
     DRAFT AUTO-SAVE / RESUME
  ===================================================== */

  const EDITOR_KEY = "customizer";

  /* draftReady = autosave allowed (false while the resume
     prompt is open so defaults can't clobber the draft) */
  const [draftReady, setDraftReady] = useState(false);
  const [resumeDraft, setResumeDraft] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [favToast, setFavToast] = useState(false);

  const revisionRef = useRef(0);      // monotonically increasing
  const saveSeqRef = useRef(0);       // latest change generation
  const pendingSaveRef = useRef(null);
  const retryTimerRef = useRef(null);

  const fileInputRef = useRef(null);
  const qrFileInputRef = useRef(null);
  const printAreaRef = useRef(null);

  /* =====================================================
     SELECTED PRODUCT
  ===================================================== */

  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const productId = selectedProduct?.id ?? "draft";

  /* =====================================================
     BASIC STATES
  ===================================================== */

  const [activeTool, setActiveTool] =
    useState("text");

  const [side, setSide] =
    useState("front");

  const [productColor, setProductColor] =
    useState("#ffffff");

  const [size, setSize] =
    useState("M");

  const [paperType, setPaperType] =
    useState("");

  /* custom sticker size (inches) — Custom Size option */
  const [customW, setCustomW] =
    useState("4");
  const [customH, setCustomH] =
    useState("4");

  const [zoom, setZoom] =
    useState(1);

  const [preview, setPreview] =
    useState(false);

  /* =====================================================
     DESIGN ELEMENTS (front + back independent)
  ===================================================== */

  const [designs, setDesigns] = useState({
    front: [],
    back: [],
  });

  /* product-specific templates — API/DB authoritative */
  const [dbTemplates, setDbTemplates] = useState([]);

  const [selectedId, setSelectedId] =
    useState(null);

  const elements = designs[side] || [];

  const selectedElement =
    elements.find((e) => e.id === selectedId) ||
    null;

  /* =====================================================
     CUSTOMER DESCRIPTION / NOTE
  ===================================================== */

  const [
    customerDescription,
    setCustomerDescription,
  ] = useState("");

  const [
    customerNote,
    setCustomerNote,
  ] = useState("");

  const [cartSuccess, setCartSuccess] =
    useState(false);

  const [isPlacingOrder, setIsPlacingOrder] =
    useState(false);

  /* =====================================================
     HISTORY
  ===================================================== */

  const [history, setHistory] =
    useState([]);

  const [future, setFuture] =
    useState([]);

  /* =====================================================
     LOAD PRODUCT + SAVED DESIGN
  ===================================================== */

  const [noProduct, setNoProduct] = useState(false);

  useEffect(() => {
    const savedProduct = localStorage.getItem("selectedCustomizeProduct");

    if (!savedProduct) {
      setNoProduct(true);
      return;
    }

    try {
      const product = JSON.parse(savedProduct);

      setSelectedProduct(product);

      /* product-specific templates from API —
         customer gets Active only */
      if (product?.id) {
        fetchProductTemplates(product.id)
          .then((list) => {
            if (Array.isArray(list) && list.length) {
              setDbTemplates(
                list.filter(
                  (t) =>
                    t.design &&
                    (Array.isArray(t.design.front) ||
                      Array.isArray(t.design.back))
                )
              );
            }
          })
          .catch(() => {});
      }

      const shirtColor =
        product?.color || "#ffffff";

      setProductColor(shirtColor);

      if (product?.sizes?.length) {
        /* detail page pe selected size sync karo */
        setSize(
          product.size &&
            product.sizes.includes(product.size)
            ? product.size
            : product.sizes[0]
        );
      }

      if (product?.paperTypes?.length) {
        setPaperType(
          product.paperType &&
            product.paperTypes.includes(
              product.paperType
            )
            ? product.paperType
            : product.paperTypes[0]
        );
      }

      const isNb =
        ["spiral-notebook", "notebook"].includes(
          String(
            product?.customizationType ||
              product?.type ||
              ""
          ).toLowerCase()
        ) ||
        /notebook/i.test(product?.name || "") ||
        /notebook/i.test(
          product?.category || ""
        );

      const ctype = String(
        product?.customizationType ||
          product?.type ||
          ""
      ).toLowerCase();

      /* default designs for a fresh start (also rendered
         behind the resume prompt) */
      const loadDefaults = () =>
        setDesigns(
          isNb
            ? makeNotebookDefaults(shirtColor)
            : ctype === "envelope"
            ? makeEnvelopeDefaults("#f8f6f1")
            : ctype === "sticker" ||
              /sticker|vinyl/i.test(
                product?.name || ""
              )
            ? makeStickerDefaults(shirtColor)
            : ctype === "giftset" ||
              /gift\s?set|corporate gift/i.test(
                product?.name || ""
              )
            ? makeGiftSetDefaults(shirtColor)
            : ctype === "tote-bag" ||
              /tote\s?bag/i.test(product?.name || "")
            ? makeToteDefaults(shirtColor)
            : ctype === "cap" ||
              /cap/i.test(product?.name || "")
            ? makeCapDefaults(shirtColor)
            : ctype === "box" ||
              /\bbox(es)?\b/i.test(product?.name || "")
            ? makeBoxDefaults(shirtColor)
            : ctype === "letterhead" ||
              /letterhead|letter\s?head/i.test(
                product?.name || ""
              )
            ? makeLetterheadDefaults(shirtColor)
            : ctype === "poster" ||
              /poster/i.test(product?.name || "")
            ? makePosterDefaults(shirtColor)
            : ctype === "paper-bag" ||
              /paper\s?bag|shopping\s?bag/i.test(
                product?.name || ""
              )
            ? makePaperBagDefaults(shirtColor)
            : ctype === "flyer" ||
              /flyer/i.test(product?.name || "")
            ? makeFlyerDefaults(
                shirtColor,
                product?.size || product?.sizes?.[0] || "A4"
              )
            : [
                "pen",
                "bottle",
                "water-bottle",
                "mug",
              ].includes(ctype) ||
              /pen/i.test(product?.name || "")
            ? makePenDefaults(shirtColor)
            : makeDefaultDesigns(shirtColor)
        );

      loadDefaultsRef.current = loadDefaults;

      /* render defaults IMMEDIATELY — the draft check is
         async (server round-trip); don't block the canvas
         on it or reopening feels slow */
      loadDefaults();

      /* dead keys from the pre-draft system — freeing them
         keeps localStorage under quota */
      try {
        localStorage.removeItem("savedCustomDesign");
      } catch {}

      /* ---------- draft restore ----------
         server draft for logged-in, localStorage for guests;
         legacy savedDesign_<id> folds in as a draft */
      (async () => {
        let found = await getDraft(
          EDITOR_KEY,
          product.id
        ).catch(() => null);

        if (!found?.draft) {
          found = migrateLegacyDraft(
            EDITOR_KEY,
            product.id,
            `savedDesign_${product.id}`
          );
        }

        const d = found?.draft;
        if (
          d?.designs &&
          (d.designs.front?.length ||
            d.designs.back?.length)
        ) {
          setResumeDraft(found);
        } else {
          setDraftReady(true);
        }
      })();
    } catch (error) {
      console.error("Selected product load error:", error);
    }
  }, []);

  /* =====================================================
     DRAFT — apply / save / resume handlers
  ===================================================== */

  const loadDefaultsRef = useRef(null);

  /* file-backed images: src "file:<id>" → blob → objectURL */
  const restoreDraftImages = async (designsIn) => {
    const fix = async (e) => {
      const src = String(e?.src || "");
      /* file:<id> → fetch the stored blob */
      if (src.startsWith("file:")) {
        const blob = await fetchFileBlob(src.slice(5));
        return blob
          ? { ...e, src: URL.createObjectURL(blob) }
          : e;
      }
      /* stale blob: URLs are dead across sessions — keep
         the element only if we have a fileId to refetch */
      if (src.startsWith("blob:")) {
        if (e.fileId) {
          const blob = await fetchFileBlob(e.fileId);
          return blob
            ? { ...e, src: URL.createObjectURL(blob) }
            : e;
        }
        return { ...e, hidden: true, src: "" };
      }
      return e;
    };
    return {
      front: await Promise.all(
        (designsIn.front || []).map(fix)
      ),
      back: await Promise.all(
        (designsIn.back || []).map(fix)
      ),
    };
  };

  const applyDraftState = async (d) => {
    setDesigns(d.designs);
    if (d.productColor) setProductColor(d.productColor);
    if (d.size) setSize(d.size);
    if (d.paperType) setPaperType(d.paperType);
    if (d.customW) setCustomW(String(d.customW));
    if (d.customH) setCustomH(String(d.customH));
    if (d.side) setSide(d.side);
    setCustomerDescription(d.customerDescription || "");
    setCustomerNote(d.customerNote || "");

    const hasFileRefs = ["front", "back"].some((s) =>
      (d.designs[s] || []).some(
        (e) =>
          typeof e?.src === "string" &&
          e.src.startsWith("file:")
      )
    );
    if (hasFileRefs) {
      setDesigns(await restoreDraftImages(d.designs));
    }
  };

  /* draft payload — file-backed images keep the stable
     server fileId, not the bulky dataURL */
  const stripImageSrc = (e) =>
    e?.fileId &&
    typeof e.src === "string" &&
    (e.src.startsWith("data:") ||
      e.src.startsWith("blob:"))
      ? { ...e, src: `file:${e.fileId}` }
      : e;

  const buildDraftPayload = () => ({
    designs: {
      front: designs.front.map(stripImageSrc),
      back: designs.back.map(stripImageSrc),
    },
    productColor,
    size,
    paperType,
    customW,
    customH,
    side,
    customerDescription,
    customerNote,
  });

  const doDraftSave = async (pending) => {
    if (!pending) return;
    setSaveStatus("saving");
    const revision = ++revisionRef.current;
    const res = await saveDraft(
      EDITOR_KEY,
      productId,
      pending.payload,
      revision
    );

    /* newer edits already queued — don't claim "saved" for
       a stale write */
    if (pending.seq !== saveSeqRef.current) return;

    if (res.ok || res.conflict) {
      if (res.revision)
        revisionRef.current = Math.max(
          revisionRef.current,
          res.revision
        );
      pendingSaveRef.current = null;
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(
        () => doDraftSave(pending),
        3000
      );
    }
  };

  /* debounced autosave — every meaningful design change */
  useEffect(() => {
    if (!draftReady || !selectedProduct) return;

    const seq = ++saveSeqRef.current;
    pendingSaveRef.current = {
      payload: buildDraftPayload(),
      seq,
    };
    setSaveStatus((s) => (s === "saved" ? s : "saving"));

    const t = setTimeout(
      () => doDraftSave(pendingSaveRef.current),
      700
    );
    return () => clearTimeout(t);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [
    designs,
    productColor,
    size,
    paperType,
    customW,
    customH,
    side,
    customerDescription,
    customerNote,
    draftReady,
  ]);

  /* warn before leaving with unsaved changes + flush draft
     on unmount (guests: localStorage is synchronous) */
  useEffect(() => {
    const warn = (e) => {
      if (
        pendingSaveRef.current ||
        saveStatus === "saving" ||
        saveStatus === "error"
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);

    return () => {
      window.removeEventListener("beforeunload", warn);
      clearTimeout(retryTimerRef.current);

      if (draftReady && pendingSaveRef.current) {
        const rev = ++revisionRef.current;
        /* local write is synchronous — survives unmount;
           server save fires without awaiting */
        writeLocalDraft(
          EDITOR_KEY,
          productId,
          pendingSaveRef.current.payload,
          rev
        );
        saveDraft(
          EDITOR_KEY,
          productId,
          pendingSaveRef.current.payload,
          rev
        ).catch(() => {});
        pendingSaveRef.current = null;
      }
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [saveStatus, draftReady, productId]);

  const continueDraft = async () => {
    const found = resumeDraft;
    setResumeDraft(null);
    revisionRef.current = found?.revision || 0;
    await applyDraftState(found.draft);
    setDraftReady(true);
  };

  const startNewDesign = async () => {
    setResumeDraft(null);
    await deleteDraft(EDITOR_KEY, productId);
    revisionRef.current = 0;
    loadDefaultsRef.current?.();
    setDraftReady(true);
  };

  const discardDraft = async () => {
    if (
      !window.confirm(
        "Discard the saved draft permanently?"
      )
    )
      return;
    await startNewDesign();
  };

  /* =====================================================
     PRICE
  ===================================================== */

  const basePrice =
    Number(selectedProduct?.price) || 599;

  const customizationPrice =
    Number(
      selectedProduct?.customizationPrice
    ) || 199;

  const totalPrice =
    basePrice + customizationPrice;

  /* =====================================================
     PRODUCT
  ===================================================== */

  const productType =
    selectedProduct?.type ||
    "tshirt";

  const productName =
    selectedProduct?.name ||
    "Custom Product";

  const customizationType = String(
    selectedProduct?.customizationType ||
      productType ||
      ""
  ).toLowerCase();

  const isApparel = [
    "tshirt",
    "hoodie",
    "apparel",
  ].includes(customizationType);

  const isNotebook =
    ["spiral-notebook", "notebook"].includes(
      customizationType
    ) ||
    /notebook/i.test(productName) ||
    /notebook/i.test(
      selectedProduct?.category || ""
    );

  const isPen =
    customizationType === "pen" ||
    (/pen/i.test(productName) &&
      !/bottle|open/i.test(productName));

  const isBottle = ["bottle", "water-bottle"].includes(
    customizationType
  );

  const isMug = customizationType === "mug";

  const isEnvelope = customizationType === "envelope";

  const isBrochure =
    customizationType === "brochure" ||
    /brochure/i.test(productName);

  const isFlyer =
    customizationType === "flyer" ||
    /flyer/i.test(productName) ||
    isBrochure;

  const isSticker =
    customizationType === "sticker" ||
    /sticker|vinyl/i.test(productName);

  const isGiftSet =
    customizationType === "giftset" ||
    /gift\s?set|corporate gift/i.test(productName);

  const isTote =
    customizationType === "tote-bag" ||
    /tote\s?bag/i.test(productName);

  const isCap =
    customizationType === "cap" ||
    (/cap/i.test(productName) &&
      !/capacit/i.test(productName));

  const isBox =
    customizationType === "box" ||
    /\bbox(es)?\b/i.test(productName);

  const isLetterhead =
    customizationType === "letterhead" ||
    /letterhead|letter\s?head/i.test(productName);

  const isPoster =
    customizationType === "poster" ||
    /poster/i.test(productName);

  const isPaperBag =
    customizationType === "paper-bag" ||
    /paper\s?bag|shopping\s?bag/i.test(productName);

  /* single printable surface — front/back switch nahi */
  const singleSide =
    isPen ||
    isBottle ||
    isMug ||
    isSticker ||
    isGiftSet ||
    isCap ||
    isBox ||
    isLetterhead ||
    isPoster ||
    isPaperBag;

  /* image/pen products ka type-specific print area;
     envelope ke front/back alag zones hain */
  const typeAreaDef =
    !isNotebook &&
    !isApparel &&
    (isFlyer
      ? { left: 7, top: 8, width: 86, height: 84 }
      : isPen
      ? PRINT_AREAS.pen
      : isBottle
      ? PRINT_AREAS.bottle
      : isMug
      ? PRINT_AREAS.mug
      : PRINT_AREAS[customizationType] || PRINT_AREAS.pen);

  const typePrintArea =
    isEnvelope && typeAreaDef?.front
      ? typeAreaDef[side]
      : typeAreaDef;

  const printAreaStyle = typePrintArea
    ? {
        left: `${typePrintArea.left}%`,
        top: `${typePrintArea.top}%`,
        width: `${typePrintArea.width}%`,
        height: `${typePrintArea.height}%`,
      }
    : undefined;

  const flyerConfig = getFlyerSizeConfig(size);

  /* product sizes — DB/product data se; fallback type-wise */
  const sizeOptions =
    selectedProduct?.sizes?.length
      ? selectedProduct.sizes
      : isNotebook
      ? ["A5", "A4", "B5"]
      : ["S", "M", "L", "XL", "XXL"];

  /* paper options — sirf jab product support kare */
  const paperTypes =
    selectedProduct?.paperTypes || null;

  /* envelope paper — White / Kraft drives mockup + ink */
  const envelopePaper = isEnvelope
    ? String(paperType).toLowerCase() === "kraft"
      ? "#c8a56b"
      : "#f8f6f1"
    : null;

  /* canvas aspect per envelope size — DL 2:1, C5/C4 ~1.41:1 */
  const envelopeAspect =
    size === "DL" ? 600 / 300 : 600 / 425;

  const productImage =
    selectedProduct?.image ||
    selectedProduct?.img ||
    selectedProduct?.productImage ||
    selectedProduct?.thumbnail ||
    selectedProduct?.images?.[0] ||
    "";

  /* =====================================================
     CURRENT STATE / HISTORY
  ===================================================== */

  const getCurrentState = () => ({
    designs: JSON.parse(JSON.stringify(designs)),
    productColor,
    size,
    side,
  });

  const saveHistory = () => {
    setHistory((prev) => [
      ...prev.slice(-25),
      getCurrentState(),
    ]);

    setFuture([]);
  };

  const restoreState = (state) => {
    if (!state) return;

    setDesigns(
      state.designs || { front: [], back: [] }
    );

    setProductColor(
      state.productColor || "#ffffff"
    );

    setSize(state.size || "M");

    setSide(state.side || "front");

    setSelectedId(null);
  };

  const undo = () => {
    if (history.length === 0) return;

    const previous =
      history[history.length - 1];

    setFuture((prev) => [
      ...prev,
      getCurrentState(),
    ]);

    setHistory((prev) => prev.slice(0, -1));

    restoreState(previous);
  };

  const redo = () => {
    if (future.length === 0) return;

    const next =
      future[future.length - 1];

    setHistory((prev) => [
      ...prev,
      getCurrentState(),
    ]);

    setFuture((prev) => prev.slice(0, -1));

    restoreState(next);
  };

  /* =====================================================
     ELEMENT OPERATIONS
  ===================================================== */

  const updateElement = (id, patch, record = true) => {
    if (record) saveHistory();

    setDesigns((prev) => ({
      ...prev,
      [side]: prev[side].map((e) =>
        e.id === id
          ? {
              ...e,
              ...constrainElementPatch(
                isFlyer && e.type === "text"
                  ? normalizeTextElement(e, size)
                  : e,
                patch
              ),
            }
          : e
      ),
    }));
  };

  /* drag ke dauran history spam na ho — move bina record */
  const moveElementLive = (id, patch) => {
    setDesigns((prev) => ({
      ...prev,
      [side]: prev[side].map((e) =>
        e.id === id
          ? {
              ...e,
              ...constrainElementPatch(
                isFlyer && e.type === "text"
                  ? normalizeTextElement(e, size)
                  : e,
                patch
              ),
            }
          : e
      ),
    }));
  };

  const deleteElement = (id) => {
    saveHistory();

    setDesigns((prev) => ({
      ...prev,
      [side]: prev[side].filter(
        (e) => e.id !== id
      ),
    }));

    if (selectedId === id) setSelectedId(null);
  };

  const reorderElement = (id, dir) => {
    saveHistory();

    setDesigns((prev) => {
      const list = [...prev[side]];
      const idx = list.findIndex(
        (e) => e.id === id
      );
      const swap = idx + dir;

      if (
        idx < 0 ||
        swap < 0 ||
        swap >= list.length
      ) {
        return prev;
      }

      [list[idx], list[swap]] = [
        list[swap],
        list[idx],
      ];

      return { ...prev, [side]: list };
    });
  };

  const addTextElement = (kind) => {
    saveHistory();

    const preset = (
      isEnvelope ? ENVELOPE_TEXT_KINDS : TEXT_KINDS
    ).find((k) => k.key === kind);

    if (!preset) return;

    /* same kind dobara add ho toh y thoda neeche */
    const sameKind = elements.filter(
      (e) => e.kind === kind
    ).length;

    /* envelope ke liye realistic placement */
    const envPos = {
      company: { x: 28, y: 16 },
      person: { x: 60, y: 52 },
      address: { x: 60, y: 70 },
      return_addr: { x: 50, y: 30 },
      custom: { x: 50, y: 50 },
    };

    const envFont = {
      company: 15,
      person: 17,
      address: 11,
      return_addr: 9,
      custom: 13,
    };

    const flyerFont = getFlyerSizeConfig(size).font;
    const flyerPos = {
      company: { x: 50, y: 58 },
      person: { x: 50, y: 69 },
      designation: { x: 50, y: 77 },
      custom: { x: 50, y: 86 },
    };
    const flyerBox = textBoxForKind(kind, size === "DL");

    const newEl = {
      id: uid(),
      type: "text",
      kind,
      label: preset.label,
      text: preset.placeholder,
      x: isEnvelope
        ? envPos[kind]?.x ?? 50
        : isFlyer
        ? flyerPos[kind]?.x ?? 50
        : 50,
      y: isEnvelope
        ? (envPos[kind]?.y ?? 50) + sameKind * 10
        : isFlyer
        ? Math.min(
            92 - flyerBox.height / 2,
            (flyerPos[kind]?.y ?? 56) + sameKind * 8
          )
        : Math.min(85, 42 + sameKind * 14),
      fontSize: isEnvelope
        ? envFont[kind] || 13
        : isFlyer
        ? flyerFont[kind] || flyerFont.custom
        : singleSide
        ? kind === "company"
          ? 15
          : kind === "designation"
          ? 9
          : 11
        : kind === "company"
        ? 26
        : kind === "designation"
        ? 14
        : 20,
      fontFamily: "Poppins",
      color: printColorFor(
        isEnvelope ? envelopePaper : productColor
      ),
      bold:
        kind === "company" || kind === "person",
      italic: false,
      underline: false,
      align: isEnvelope
        ? kind === "return_addr" || kind === "custom"
          ? "center"
          : "left"
        : "center",
      letterSpacing: 1,
      rotation: 0,
      hidden: false,
      ...(isFlyer ? flyerBox : {}),
      ...(isFlyer ? { lineHeight: 1.12 } : {}),
    };

    setDesigns((prev) => ({
      ...prev,
      [side]: [...prev[side], newEl],
    }));

    setSelectedId(newEl.id);
    setActiveTool("text");
  };

  /* =====================================================
     LOGO / IMAGE UPLOAD
  ===================================================== */

  const handleLogoUpload = (event) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      saveHistory();

      /* a selected logo slot (the placeholder circle or a
         previously uploaded logo) gets its image REPLACED
         instead of stacking a new element on top */
      const selected = elements.find(
        (el) => el.id === selectedId
      );
      const isLogoSlot =
        selected &&
        (selected.kind === "logo" ||
          /logo/i.test(selected.label || ""));

      const newEl = {
        id: uid(),
        type: "image",
        kind: "logo",
        label: file.name || "Logo",
        src: e.target.result,
        x: isFlyer ? 50 : 50,
        y: isFlyer ? 24 : 32,
        width: isFlyer ? 24 : 38,
        rotation: 0,
        opacity: 1,
        hidden: false,
      };

      if (isLogoSlot) {
        /* replace — keeps the slot's position + size */
        setDesigns((prev) => ({
          ...prev,
          [side]: prev[side].map((el) =>
            el.id === selected.id
              ? {
                  ...el,
                  type: "image",
                  kind: "logo",
                  label: file.name || "Logo",
                  src: e.target.result,
                  fileId: undefined,
                  shape: undefined,
                  color: undefined,
                }
              : el
          ),
        }));
        setSelectedId(selected.id);
      } else {
        setDesigns((prev) => ({
          ...prev,
          [side]: [...prev[side], newEl],
        }));
        setSelectedId(newEl.id);
      }

      const targetId = isLogoSlot
        ? selected.id
        : newEl.id;

      /* logged-in: persist the image server-side so drafts
         hold a stable file reference, not a giant dataURL */
      if (user) {
        uploadDesignFile({
          name: file.name || "logo",
          type: file.type || "image/png",
          dataUrl: e.target.result,
        })
          .then((up) => {
            if (up?.success && up.fileId) {
              setDesigns((prev) => ({
                ...prev,
                [side]: prev[side].map((el) =>
                  el.id === targetId
                    ? { ...el, fileId: up.fileId }
                    : el
                ),
              }));
            }
          })
          .catch(() => {});
      }
    };

    reader.readAsDataURL(file);

    event.target.value = "";
  };

  /* selected QR element pe real QR image upload */
  const handleQrUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid QR image.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      saveHistory();
      moveElementLive(selectedElement?.id, {
        src: e.target.result,
      });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  /* =====================================================
     DRAG (pointer — mouse + touch)
  ===================================================== */

  const startDrag = (el) => (event) => {
    event.preventDefault();
    event.stopPropagation();

    setSelectedId(el.id);
    saveHistory();

    const area = printAreaRef.current;
    if (!area) return;

    const rect =
      area.getBoundingClientRect();

    const startX = event.clientX;
    const startY = event.clientY;
    const initX = el.x;
    const initY = el.y;

    const onMove = (ev) => {
      const dx =
        ((ev.clientX - startX) / rect.width) *
        100;
      const dy =
        ((ev.clientY - startY) / rect.height) *
        100;

      moveElementLive(el.id, {
        x: Math.max(
          0,
          Math.min(100, initX + dx)
        ),
        y: Math.max(
          0,
          Math.min(100, initY + dy)
        ),
      });
    };

    const onUp = () => {
      window.removeEventListener(
        "pointermove",
        onMove
      );
      window.removeEventListener(
        "pointerup",
        onUp
      );
    };

    window.addEventListener(
      "pointermove",
      onMove
    );
    window.addEventListener(
      "pointerup",
      onUp
    );
  };

  /* =====================================================
     RESIZE HANDLE
  ===================================================== */

  const startResize = (el) => (event) => {
    event.preventDefault();
    event.stopPropagation();

    saveHistory();

    const area = printAreaRef.current;
    const rect = area
      ? area.getBoundingClientRect()
      : { width: 200 };

    const startX = event.clientX;
    const initSize =
      el.type === "text"
        ? el.fontSize
        : el.width;

    const onMove = (ev) => {
      const dx = ev.clientX - startX;

      if (el.type !== "text") {
        const delta =
          (dx / rect.width) * 100;

        moveElementLive(el.id, {
          width: Math.max(
            8,
            Math.min(
              100,
              initSize + delta
            )
          ),
        });
      } else {
        moveElementLive(el.id, {
          fontSize: Math.max(
            10,
            Math.min(
              80,
              initSize + dx / 4
            )
          ),
        });
      }
    };

    const onUp = () => {
      window.removeEventListener(
        "pointermove",
        onMove
      );
      window.removeEventListener(
        "pointerup",
        onUp
      );
    };

    window.addEventListener(
      "pointermove",
      onMove
    );
    window.addEventListener(
      "pointerup",
      onUp
    );
  };

  /* =====================================================
     RESET
  ===================================================== */

  const resetDesign = () => {
    saveHistory();

    const shirtColor =
      selectedProduct?.color || "#ffffff";

    setDesigns(
      isNotebook
        ? makeNotebookDefaults(shirtColor)
        : isEnvelope
        ? makeEnvelopeDefaults(envelopePaper || "#f8f6f1")
        : isFlyer
        ? makeFlyerDefaults(shirtColor, size)
        : isSticker
        ? makeStickerDefaults(shirtColor)
        : isGiftSet
        ? makeGiftSetDefaults(shirtColor)
        : isTote
        ? makeToteDefaults(shirtColor)
        : isCap
        ? makeCapDefaults(shirtColor)
        : isBox
        ? makeBoxDefaults(shirtColor)
        : isLetterhead
        ? makeLetterheadDefaults(shirtColor)
        : isPoster
        ? makePosterDefaults(shirtColor)
        : isPaperBag
        ? makePaperBagDefaults(shirtColor)
        : singleSide
        ? makePenDefaults(shirtColor)
        : makeDefaultDesigns(shirtColor)
    );

    setProductColor(shirtColor);

    setSize(
      selectedProduct?.sizes?.[0] || "M"
    );

    setZoom(1);

    setSide("front");

    setSelectedId(null);

    setCustomerDescription("");

    setCustomerNote("");

    setCartSuccess(false);
  };

  /* =====================================================
     CREATE CUSTOM PRODUCT
  ===================================================== */

  const createCustomProduct = () => {
    const now = Date.now();

    const firstText =
      designs.front.find(
        (e) => e.type === "text"
      ) ||
      designs.back.find(
        (e) => e.type === "text"
      ) ||
      null;

    const firstImage =
      designs.front.find(
        (e) => e.type === "image"
      ) ||
      designs.back.find(
        (e) => e.type === "image"
      ) ||
      null;

    const findText = (kind) =>
      designs.front.find(
        (e) => e.kind === kind
      )?.text ||
      designs.back.find(
        (e) => e.kind === kind
      )?.text ||
      "";

    return {
      id:
        `custom-${selectedProduct?.id || "product"}-${now}`,

      productId:
        `custom-${selectedProduct?.id || "product"}-${now}`,

      originalProductId:
        selectedProduct?.id ||
        null,

      name:
        selectedProduct?.name ||
        "Customized Product",

      category:
        selectedProduct?.category ||
        "CUSTOM",

      type:
        selectedProduct?.type ||
        "tshirt",

      image:
        productImage,

      description:
        selectedProduct?.description ||
        "",

      customerDescription:
        customerDescription.trim(),

      customerNote:
        customerNote.trim(),

      basePrice,

      customizationPrice,

      price:
        totalPrice,

      totalPrice,

      quantity: 1,

      size:
        /custom/i.test(size) &&
        customW &&
        customH
          ? `Custom ${customW}×${customH} in`
          : size,

      customWidth:
        /custom/i.test(size) ? customW : null,
      customHeight:
        /custom/i.test(size) ? customH : null,

      paperType: paperType || null,

      color:
        productColor,

      side,

      /* full design data */
      designs,

      companyName:
        findText("company"),

      personName:
        findText("person"),

      designation:
        findText("designation"),

      /* legacy fields (cart/orders compatibility) */
      logo:
        firstImage?.src || null,

      logoPosition: firstImage
        ? { x: firstImage.x, y: firstImage.y }
        : { x: 50, y: 31 },

      logoSize:
        firstImage?.width || 0,

      text:
        firstText?.text || "",

      textPosition: firstText
        ? { x: firstText.x, y: firstText.y }
        : { x: 50, y: 55 },

      textColor:
        firstText?.color || "#102a4c",

      fontSize:
        firstText?.fontSize || 25,

      fontFamily:
        firstText?.fontFamily || "Poppins",

      bold:
        firstText?.bold ?? true,

      italic:
        firstText?.italic ?? false,

      underline:
        firstText?.underline ?? false,

      createdAt:
        new Date().toISOString(),
    };
  };

  /* =====================================================
     ADD TO CART
  ===================================================== */

  const addToCart = async () => {
    const customProduct = createCustomProduct();

    try {
      const result = await contextAddToCart({
        productId: customProduct.originalProductId || customProduct.id,
        product_id: customProduct.originalProductId || customProduct.id,
        originalProductId: customProduct.originalProductId,
        name: customProduct.name,
        image: customProduct.image,
        price: customProduct.price,
        quantity: customProduct.quantity || 1,
        size: customProduct.size,
        paperType: customProduct.paperType,
        itemType: "custom",
        customization: {
          designs: customProduct.designs,
          text: customProduct.text,
          color: customProduct.color,
          personName: customProduct.personName,
          designation: customProduct.designation,
          companyName: customProduct.companyName,
          customerDescription: customProduct.customerDescription,
          customerNote: customProduct.customerNote,
        },
        /* legacy fields preserved for cart/order compatibility */
        designs: customProduct.designs,
        text: customProduct.text,
        color: customProduct.color,
        personName: customProduct.personName,
        designation: customProduct.designation,
        companyName: customProduct.companyName,
      });

      if (result?.error) {
        alert(result.error);
        return;
      }
    } catch (error) {
      console.error("Cart save error:", error);
      alert("Product cart me save nahi ho paya.");
      return;
    }

    setCartSuccess(true);
    setTimeout(() => {
      setCartSuccess(false);
    }, 4000);
  };

  /* =====================================================
     PLACE ORDER
  ===================================================== */

  const placeOrder = async () => {
    if (isPlacingOrder) {
      return;
    }

    setIsPlacingOrder(true);

    /* Place Order = put the customized product in the
       cart and go to Checkout — order is created ONLY
       by Checkout's confirmed submission (stock, price,
       auth all validated server-side there) */
    const customProduct =
      createCustomProduct();

    try {
      const result =
        await contextAddToCart({
          productId:
            customProduct.originalProductId ||
            customProduct.id,
          product_id:
            customProduct.originalProductId ||
            customProduct.id,
          originalProductId:
            customProduct.originalProductId,
          name: customProduct.name,
          image: customProduct.image,
          price: customProduct.price,
          quantity:
            customProduct.quantity || 1,
          size: customProduct.size,
          paperType: customProduct.paperType,
          itemType: "custom",
          customization: {
            designs: customProduct.designs,
            text: customProduct.text,
            color: customProduct.color,
            personName: customProduct.personName,
            designation:
              customProduct.designation,
            companyName:
              customProduct.companyName,
            customerDescription:
              customProduct.customerDescription,
            customerNote:
              customProduct.customerNote,
          },
          designs: customProduct.designs,
          text: customProduct.text,
          color: customProduct.color,
          personName: customProduct.personName,
          designation:
            customProduct.designation,
          companyName: customProduct.companyName,
        });

      if (result?.error) {
        alert(result.error);
        setIsPlacingOrder(false);
        return;
      }
    } catch (error) {
      console.error(
        "Cart save error:",
        error
      );
      alert(
        "Checkout ke liye product add nahi ho paya."
      );
      setIsPlacingOrder(false);
      return;
    }

    navigate("/checkout");
  };

  const saveDesign = () => {
    if (!selectedProduct) return;

    const seq = ++saveSeqRef.current;
    pendingSaveRef.current = {
      payload: buildDraftPayload(),
      seq,
    };
    doDraftSave(pendingSaveRef.current);

    /* favourites — server for logged-in, localStorage for
       guests (full snapshot goes to the server; the local
       mirror keeps a lean copy to stay under quota) */
    addFavorite({
      ...selectedProduct,
      badge: selectedProduct.badge || "Custom Design",
    }).catch(() => {});

    setFavToast(true);
    setTimeout(() => setFavToast(false), 2500);
  };

  /* =====================================================
     COLORS
  ===================================================== */

  const productColors = isPen
    ? [
        "#17191f",
        "#f5f5f5",
        "#123d70",
        "#d92132",
        "#075c51",
      ]
    : isBottle
    ? [
        "#2878df",
        "#17191f",
        "#f5f5f5",
        "#d92132",
        "#075c51",
        "#0e7490",
      ]
    : isMug
    ? [
        "#ffffff",
        "#17191f",
        "#123d70",
        "#d92132",
        "#075c51",
      ]
    : [
        "#ffffff",
        "#17191f",
        "#112b4c",
        "#d92132",
        "#075c51",
      ];

  const textColors = [
    "#111827",
    "#ffffff",
    "#e12432",
    "#2878df",
    "#075c51",
    "#7434d1",
    "#ff7a00",
  ];

  /* =====================================================
     CANVAS (shared by editor + preview)
  ===================================================== */

  const renderCanvas = () => (
    <div
      className={`product-canvas${isPen ? " pen-product-canvas" : ""}`}
      style={{
        transform: `scale(${zoom})`,
      }}
    >
      <div
        className={
          isNotebook
            ? "real-product-preview notebook-preview"
            : isPen
            ? "real-product-preview pen-preview"
            : isBottle
            ? "real-product-preview has-image"
            : isMug
            ? "real-product-preview has-image"
            : isFlyer
            ? "real-product-preview flyer-preview"
            : isEnvelope
            ? "real-product-preview envelope-preview"
            : isSticker
            ? "real-product-preview sticker-preview"
            : isGiftSet
            ? "real-product-preview giftset-preview"
            : isTote
            ? "real-product-preview totebag-preview"
            : isCap
            ? "real-product-preview cap-preview"
            : isBox
            ? "real-product-preview box-preview"
            : isLetterhead
            ? "real-product-preview letterhead-preview"
            : isPoster
            ? "real-product-preview poster-preview"
            : isPaperBag
            ? "real-product-preview paperbag-preview"
            : !isApparel && productImage
            ? "real-product-preview has-image"
            : "real-product-preview"
        }
        style={
          isEnvelope
            ? { aspectRatio: `${envelopeAspect}` }
            : isFlyer
            ? { aspectRatio: `${flyerConfig.aspect}` }
            : isLetterhead
            ? {
                aspectRatio: /letter/i.test(size)
                  ? "400 / 518" /* US Letter 215.9x279.4 */
                  : "400 / 560", /* A4 210x297 */
              }
            : isPoster
            ? { aspectRatio: "400 / 566" } /* ISO A-series */
            : undefined
        }
      >
        {isNotebook ? (
          <NotebookSvg
            color={productColor}
            back={side === "back"}
          />
        ) : isPen ? (
          <PenSvg color={productColor} />
        ) : isBottle ? (
          <BottleSvg color={productColor} />
        ) : isMug ? (
          <MugSvg color={productColor} />
        ) : isEnvelope ? (
          <EnvelopeSvg
            color={envelopePaper}
            back={side === "back"}
            size={size}
          />
        ) : isFlyer ? (
          /* plain paper — every visible piece is an editable
             shape/text element inside the print area */
          <div
            className={`flyer-sheet flyer-sheet-${String(
              size
            ).toLowerCase()}`}
          />
        ) : isSticker ? (
          <StickerSvg color={productColor} />
        ) : isGiftSet ? (
          <GiftSetSvg color={productColor} />
        ) : isTote ? (
          <ToteBagSvg
            color={
              /* plain white colour option → canvas beige,
                 the material look of a real tote */
              productColor === "#ffffff"
                ? "#e8e0d0"
                : productColor
            }
            back={side === "back"}
          />
        ) : isCap ? (
          <CapSvg color={productColor} />
        ) : isBox ? (
          <BoxSvg
            color={
              /* no colour set → kraft brown */
              productColor === "#ffffff"
                ? "#d9b382"
                : productColor
            }
          />
        ) : isLetterhead ? (
          <LetterheadSvg
            color={
              /* white -> brand navy header band */
              productColor === "#ffffff"
                ? "#102a4c"
                : productColor
            }
          />
        ) : isPoster ? (
          <PosterSvg />
        ) : isPaperBag ? (
          <PaperBagSvg
            color={
              productColor === "#ffffff"
                ? "#d9b382"
                : productColor
            }
          />
        ) : isApparel ? (
          <GarmentSvg
            color={productColor}
            back={side === "back"}
          />
        ) : productImage ? (
          <img
            className="selected-product-image"
            src={productImage}
            alt={productName}
            draggable="false"
          />
        ) : (
          <GarmentSvg
            color={productColor}
            back={side === "back"}
          />
        )}

        {/* PRINTABLE AREA — design clipped inside */}
        <div
          ref={printAreaRef}
          style={printAreaStyle}
          className={`print-area${
            isNotebook
              ? " print-area-notebook"
              : ""
          }${
            isFlyer
              ? " print-area-flyer"
              : ""
          }${
            isSticker
              ? " print-area-sticker"
              : ""
          }${
            isGiftSet
              ? " print-area-giftset"
              : ""
          }${
            isTote
              ? " print-area-tote"
              : ""
          }${
            isCap
              ? " print-area-cap"
              : ""
          }${
            isBox
              ? " print-area-box"
              : ""
          }${
            isLetterhead
              ? " print-area-letterhead"
              : ""
          }${
            isPoster
              ? " print-area-poster"
              : ""
          }${
            isPaperBag
              ? " print-area-paperbag"
              : ""
          } ${
            preview ? "preview-clean" : "editing"
          }`}
          onPointerDown={() =>
            setSelectedId(null)
          }
        >
          {elements
            .filter((el) => !el.hidden)
            .map((rawEl) => {
              const el =
                isFlyer && rawEl.type === "text"
                  ? normalizeTextElement(rawEl, size)
                  : rawEl;

              return (
              el.type === "shape" ? (
                <div
                  key={el.id}
                  className={`design-el design-shape${
                    selectedId === el.id &&
                    !preview
                      ? " el-selected"
                      : ""
                  }`}
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: `${el.width}%`,
                    height:
                      el.shape === "line"
                        ? `${el.height || 2}px`
                        : `${el.height || el.width}%`,
                    background: el.color,
                    opacity: el.opacity ?? 1,
                    borderRadius:
                      el.shape === "circle" || el.shape === "pill"
                        ? "999px"
                        : el.shape === "line"
                        ? "2px"
                        : "6px",
                    transform: `translate(-50%,-50%) rotate(${el.rotation || 0}deg)`,
                  }}
                  onPointerDown={
                    preview
                      ? undefined
                      : startDrag(el)
                  }
                >
                  {selectedId === el.id &&
                    !preview && (
                      <>
                        <button
                          type="button"
                          className="el-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteElement(el.id);
                          }}
                        >
                          <X size={11} />
                        </button>

                        <button
                          type="button"
                          className="el-resize"
                          onPointerDown={startResize(el)}
                        >
                          ↘
                        </button>
                      </>
                    )}
                </div>
              ) : el.type === "qr" ? (
                <div
                  key={el.id}
                  className={`design-el design-image-el${
                    selectedId === el.id &&
                    !preview
                      ? " el-selected"
                      : ""
                  }`}
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: `${el.width}%`,
                    opacity: el.opacity ?? 1,
                    transform: `translate(-50%,-50%) rotate(${el.rotation || 0}deg)`,
                  }}
                  onPointerDown={
                    preview
                      ? undefined
                      : startDrag(el)
                  }
                >
                  {el.src ? (
                    <img
                      src={el.src}
                      alt="QR Code"
                      draggable="false"
                    />
                  ) : (
                    <QrPattern />
                  )}

                  {selectedId === el.id &&
                    !preview && (
                      <>
                        <button
                          type="button"
                          className="el-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteElement(el.id);
                          }}
                        >
                          <X size={11} />
                        </button>

                        <button
                          type="button"
                          className="el-resize"
                          onPointerDown={startResize(el)}
                        >
                          ↘
                        </button>
                      </>
                    )}
                </div>
              ) : el.type === "image" ? (
                <div
                  key={el.id}
                  className={`design-el design-image-el${
                    selectedId === el.id &&
                    !preview
                      ? " el-selected"
                      : ""
                  }`}
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: `${el.width}%`,
                    opacity: el.opacity ?? 1,
                    transform: `translate(-50%,-50%) rotate(${el.rotation || 0}deg)`,
                  }}
                  onPointerDown={
                    preview
                      ? undefined
                      : startDrag(el)
                  }
                >
                  <img
                    src={el.src}
                    alt={el.label}
                    draggable="false"
                  />

                  {selectedId === el.id &&
                    !preview && (
                      <>
                        <button
                          type="button"
                          className="el-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteElement(el.id);
                          }}
                        >
                          <X size={11} />
                        </button>

                        <button
                          type="button"
                          className="el-resize"
                          onPointerDown={startResize(el)}
                        >
                          ↘
                        </button>
                      </>
                    )}
                </div>
              ) : (
                <div
                  key={el.id}
                  className={`design-el design-text${
                    selectedId === el.id &&
                    !preview
                      ? " el-selected"
                      : ""
                  }`}
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: `${el.width || textBoxForKind(el.kind).width}%`,
                    minHeight: `${el.height || textBoxForKind(el.kind).height}%`,
                    fontSize: `${el.fontSize}px`,
                    fontFamily: el.fontFamily,
                    color: el.color,
                    fontWeight: el.bold ? 700 : 400,
                    fontStyle: el.italic
                      ? "italic"
                      : "normal",
                    textDecoration: el.underline
                      ? "underline"
                      : "none",
                    letterSpacing: `${el.letterSpacing || 0}px`,
                    textAlign: el.align || "center",
                    transform: `translate(-50%,-50%) rotate(${el.rotation || 0}deg)`,
                    lineHeight: el.lineHeight || 1.12,
                  }}
                  onPointerDown={
                    preview
                      ? undefined
                      : startDrag(el)
                  }
                >
                  {el.text}

                  {selectedId === el.id &&
                    !preview && (
                      <>
                        <button
                          type="button"
                          className="el-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteElement(el.id);
                          }}
                        >
                          <X size={11} />
                        </button>

                        <button
                          type="button"
                          className="el-resize"
                          onPointerDown={startResize(el)}
                        >
                          ↘
                        </button>
                      </>
                    )}
                </div>
              )
            );
            })}
        </div>

        {/* SPIRAL — design ke UPAR (notebook only) */}
        {isNotebook && <SpiralOverlay />}
      </div>
    </div>
  );

  /* =====================================================
     LOADING
  ===================================================== */

  if (!selectedProduct) {
    return (
      <div className="customizer-loading">
        <div>
          <h2>
            Loading Product...
          </h2>

          <p>
            Please wait while we
            prepare your product.
          </p>

          <button
            onClick={() =>
              navigate(-1)
            }
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  /* =====================================================
     PREVIEW MODE
  ===================================================== */

  if (preview) {
    return (
      <div className="customizer-page">
        <section className="customizer-title">
          <button
            className="back-product"
            onClick={() => setPreview(false)}
          >
            <ArrowLeft size={18} />

            <span>Edit Design</span>
          </button>

          <div className="title-center">
            <h1>
              {productName} —{" "}
              {singleSide
                ? "Preview"
                : side === "front"
                ? "Front Preview"
                : "Back Preview"}
            </h1>

            <p>
              This is how your print will
              look on the product
            </p>
          </div>

          {!singleSide && (
            <div className="side-switch">
              <button
                className={
                  side === "front" ? "selected" : ""
                }
                onClick={() => setSide("front")}
              >
                Front
              </button>

              <button
                className={
                  side === "back" ? "selected" : ""
                }
                onClick={() => setSide("back")}
              >
                Back
              </button>
            </div>
          )}
        </section>

        <main className="preview-main">
          <div className="preview-stage">
            {renderCanvas()}
          </div>

          <div className="preview-actions">
            <button
              type="button"
              className="save-design-btn"
              onClick={() => setPreview(false)}
            >
              <Type size={18} />
              Edit Design
            </button>

            <button
              type="button"
              className="add-cart-btn"
              onClick={addToCart}
            >
              <ShoppingCart size={18} />
              Add to Cart — ₹{totalPrice.toLocaleString("en-IN")}
            </button>
          </div>
        </main>
      </div>
    );
  }

  /* =====================================================
     NO PRODUCT — opened /customize directly
  ===================================================== */

  if (noProduct) {
    return (
      <div className="customizer-page">
        <div className="no-product-state">
          <h2>Pick a product to customize</h2>
          <p>
            Choose any customizable product first — your
            design will open in this editor.
          </p>
          <button
            type="button"
            onClick={() => navigate("/products")}
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  /* =====================================================
     RETURN (EDITOR)
  ===================================================== */

  return (
    <div className="customizer-page">

      {/* =================================================
          TITLE
      ================================================= */}

      <section className="customizer-title">

        <button
          className="back-product"
          onClick={() =>
            navigate(-1)
          }
        >
          <ArrowLeft size={18} />

          <span>
            Back to Product
          </span>
        </button>

        {/* draft auto-save status */}
        <div className={`draft-status ds-${saveStatus}`}>
          {saveStatus === "saving" && "Saving…"}
          {saveStatus === "saved" && "Saved"}
          {saveStatus === "error" &&
            "Save failed — retrying"}
        </div>

        <div className="title-center">

          <h1>
            Customize {productName}
          </h1>

          <p>
            Design it your way and
            make it unique
          </p>

        </div>

        {!singleSide && (
          <div className="side-switch">

            <button
              className={
                side === "front"
                  ? "selected"
                  : ""
              }
              onClick={() => {
                setSide("front");
                setSelectedId(null);
              }}
            >
              Front
            </button>

            <button
              className={
                side === "back"
                  ? "selected"
                  : ""
              }
              onClick={() => {
                setSide("back");
                setSelectedId(null);
              }}
            >
              Back
            </button>

          </div>
        )}

      </section>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="customizer-main">

        {/* =================================================
            LEFT TOOLBAR
        ================================================= */}

        <aside className="left-toolbar">

          <button
            className={
              activeTool === "text"
                ? "tool-active"
                : ""
            }
            onClick={() =>
              setActiveTool("text")
            }
          >
            <Type />

            <span>
              Add Text
            </span>
          </button>

          <button
            className={
              activeTool === "upload"
                ? "tool-active"
                : ""
            }
            onClick={() => {
              setActiveTool("upload");
              fileInputRef.current?.click();
            }}
          >
            <UploadCloud />

            <span>
              Add Logo
            </span>
          </button>

          {(isNotebook || dbTemplates.length > 0) && (
            <button
              className={
                activeTool === "templates"
                  ? "tool-active"
                  : ""
              }
              onClick={() =>
                setActiveTool("templates")
              }
            >
              <LayoutTemplate />

              <span>
                Templates
              </span>
            </button>
          )}

          <button
            className={
              activeTool === "color"
                ? "tool-active"
                : ""
            }
            onClick={() =>
              setActiveTool("color")
            }
          >
            <Palette />

            <span>
              Text Color
            </span>
          </button>

          <button
            className={
              activeTool === "position"
                ? "tool-active"
                : ""
            }
            onClick={() =>
              setActiveTool("position")
            }
          >
            <Move />

            <span>
              Position
            </span>
          </button>

          <button
            className={
              activeTool === "layers"
                ? "tool-active"
                : ""
            }
            onClick={() =>
              setActiveTool("layers")
            }
          >
            <Layers />

            <span>
              Layers
            </span>
          </button>

          <button
            onClick={() => {
              if (selectedElement) {
                deleteElement(
                  selectedElement.id
                );
              }
            }}
          >
            <Trash2 />

            <span>
              Delete
            </span>
          </button>

        </aside>

        {/* =================================================
            SETTINGS
        ================================================= */}

        <section className="settings-panel">

          {/* TEXT / COLOR / POSITION — quick add + selected element controls */}

          {["text", "color", "position"].includes(
            activeTool
          ) && (
            <div className="settings-content">

              {activeTool === "text" && (
                <>
                  <h3>
                    Add to Design
                  </h3>

                  <div className="quick-add-list">
                    {(isEnvelope
                      ? ENVELOPE_TEXT_KINDS
                      : TEXT_KINDS
                    ).map((kind) => (
                      <button
                        key={kind.key}
                        type="button"
                        className="quick-add-btn"
                        onClick={() =>
                          addTextElement(kind.key)
                        }
                      >
                        {(kind.key === "company") && (
                          <Building2 size={16} />
                        )}
                        {kind.key === "person" && (
                          <User size={16} />
                        )}
                        {kind.key === "designation" && (
                          <Briefcase size={16} />
                        )}
                        {kind.key === "address" && (
                          <MapPin size={16} />
                        )}
                        {kind.key === "return_addr" && (
                          <CornerUpLeft size={16} />
                        )}
                        {kind.key === "custom" && (
                          <Type size={16} />
                        )}
                        + {kind.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {selectedElement?.type ===
                "text" && (
                <>
                  <h4>
                    {selectedElement.label}
                  </h4>

                  {/* multiline text editor — Enter se new
                      line, pasted text supported */}
                  <textarea
                    className="text-input"
                    rows={3}
                    value={selectedElement.text}
                    onChange={(event) =>
                      moveElementLive(
                        selectedElement.id,
                        {
                          text:
                            event.target.value.slice(
                              0,
                              500
                            ),
                        }
                      )
                    }
                    onBlur={() => saveHistory()}
                    placeholder="Enter your text (multiple lines supported)"
                    style={{ resize: "vertical" }}
                  />

                  <h4>Font</h4>

                  <select
                    className="font-select"
                    value={selectedElement.fontFamily}
                    onChange={(event) =>
                      updateElement(
                        selectedElement.id,
                        {
                          fontFamily:
                            event.target.value,
                        }
                      )
                    }
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>

                  <div className="format-buttons">
                    <button
                      className={
                        selectedElement.bold
                          ? "active-format"
                          : ""
                      }
                      onClick={() =>
                        updateElement(
                          selectedElement.id,
                          {
                            bold: !selectedElement.bold,
                          }
                        )
                      }
                    >
                      <Bold size={18} />
                    </button>

                    <button
                      className={
                        selectedElement.italic
                          ? "active-format"
                          : ""
                      }
                      onClick={() =>
                        updateElement(
                          selectedElement.id,
                          {
                            italic:
                              !selectedElement.italic,
                          }
                        )
                      }
                    >
                      <Italic size={18} />
                    </button>

                    <button
                      className={
                        selectedElement.underline
                          ? "active-format"
                          : ""
                      }
                      onClick={() =>
                        updateElement(
                          selectedElement.id,
                          {
                            underline:
                              !selectedElement.underline,
                          }
                        )
                      }
                    >
                      <Underline size={18} />
                    </button>

                    <button
                      onClick={() =>
                        updateElement(
                          selectedElement.id,
                          {
                            text:
                              selectedElement.text ===
                              selectedElement.text.toUpperCase()
                                ? selectedElement.text
                                    .toLowerCase()
                                    .replace(
                                      /(^|\s)\S/g,
                                      (c) =>
                                        c.toUpperCase()
                                    )
                                : selectedElement.text.toUpperCase(),
                          }
                        )
                      }
                    >
                      Aa
                    </button>
                  </div>

                  <h4>Text Color</h4>

                  <div className="color-row">
                    {textColors.map((color) => (
                      <button
                        key={color}
                        className={
                          selectedElement.color ===
                          color
                            ? "text-color selected-text-color"
                            : "text-color"
                        }
                        style={{
                          background: color,
                        }}
                        onClick={() =>
                          updateElement(
                            selectedElement.id,
                            { color }
                          )
                        }
                      />
                    ))}
                  </div>

                  {/* custom color — HEX / picker / RGB */}
                  <ColorPickerField
                    value={selectedElement.color}
                    onChange={(color) =>
                      updateElement(selectedElement.id, {
                        color,
                      })
                    }
                  />

                  <h4>Font Size</h4>

                  <div className="range-row">
                    <span>12</span>

                    <input
                      type="range"
                      min={singleSide ? 8 : 12}
                      max={singleSide ? 30 : 70}
                      value={selectedElement.fontSize}
                      onChange={(event) =>
                        moveElementLive(
                          selectedElement.id,
                          {
                            fontSize: Number(
                              event.target.value
                            ),
                          }
                        )
                      }
                      onMouseUp={() => saveHistory()}
                    />

                    <span>
                      {Math.round(
                        selectedElement.fontSize
                      )}
                    </span>
                  </div>

                  <h4>Letter Spacing</h4>

                  <div className="range-row">
                    <span>0</span>

                    <input
                      type="range"
                      min="0"
                      max="12"
                      value={
                        selectedElement.letterSpacing || 0
                      }
                      onChange={(event) =>
                        moveElementLive(
                          selectedElement.id,
                          {
                            letterSpacing: Number(
                              event.target.value
                            ),
                          }
                        )
                      }
                      onMouseUp={() => saveHistory()}
                    />

                    <span>
                      {selectedElement.letterSpacing || 0}
                    </span>
                  </div>

                  <h4>Rotation</h4>

                  <div className="range-row">
                    <span>-90°</span>

                    <input
                      type="range"
                      min="-90"
                      max="90"
                      value={selectedElement.rotation || 0}
                      onChange={(event) =>
                        moveElementLive(
                          selectedElement.id,
                          {
                            rotation: Number(
                              event.target.value
                            ),
                          }
                        )
                      }
                      onMouseUp={() => saveHistory()}
                    />

                    <span>
                      {selectedElement.rotation || 0}°
                    </span>
                  </div>

                  <h4>Alignment</h4>

                  <div className="alignment-buttons">
                    <button
                      className={
                        selectedElement.align === "left"
                          ? "selected-align"
                          : ""
                      }
                      onClick={() =>
                        updateElement(
                          selectedElement.id,
                          { align: "left" }
                        )
                      }
                    >
                      <AlignLeft />
                    </button>

                    <button
                      className={
                        selectedElement.align ===
                          "center" ||
                        !selectedElement.align
                          ? "selected-align"
                          : ""
                      }
                      onClick={() =>
                        updateElement(
                          selectedElement.id,
                          { align: "center" }
                        )
                      }
                    >
                      <AlignCenter />
                    </button>

                    <button
                      className={
                        selectedElement.align === "right"
                          ? "selected-align"
                          : ""
                      }
                      onClick={() =>
                        updateElement(
                          selectedElement.id,
                          { align: "right" }
                        )
                      }
                    >
                      <AlignRight />
                    </button>
                  </div>
                </>
              )}

              {/* SHAPE selected */}
              {selectedElement?.type ===
                "shape" && (
                <>
                  <h4>
                    {selectedElement.label}
                  </h4>

                  <h4>Shape Color</h4>

                  <div className="color-row">
                    {textColors.map((color) => (
                      <button
                        key={color}
                        className={
                          selectedElement.color ===
                          color
                            ? "text-color selected-text-color"
                            : "text-color"
                        }
                        style={{
                          background: color,
                        }}
                        onClick={() =>
                          updateElement(
                            selectedElement.id,
                            { color }
                          )
                        }
                      />
                    ))}
                  </div>

                  <ColorPickerField
                    value={selectedElement.color}
                    onChange={(color) =>
                      updateElement(selectedElement.id, {
                        color,
                      })
                    }
                  />

                  <h4>Width</h4>

                  <div className="range-row">
                    <span>5%</span>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={selectedElement.width}
                      onChange={(e) =>
                        moveElementLive(
                          selectedElement.id,
                          {
                            width: Number(
                              e.target.value
                            ),
                          }
                        )
                      }
                      onMouseUp={() => saveHistory()}
                    />
                    <span>
                      {Math.round(
                        selectedElement.width
                      )}
                      %
                    </span>
                  </div>

                  <h4>Height</h4>

                  <div className="range-row">
                    <span>2</span>
                    <input
                      type="range"
                      min="2"
                      max="80"
                      value={selectedElement.height || 10}
                      onChange={(e) =>
                        moveElementLive(
                          selectedElement.id,
                          {
                            height: Number(
                              e.target.value
                            ),
                          }
                        )
                      }
                      onMouseUp={() => saveHistory()}
                    />
                    <span>
                      {Math.round(
                        selectedElement.height || 10
                      )}
                    </span>
                  </div>

                  <h4>Opacity</h4>

                  <div className="range-row">
                    <span>0.2</span>
                    <input
                      type="range"
                      min="0.2"
                      max="1"
                      step="0.05"
                      value={selectedElement.opacity ?? 1}
                      onChange={(e) =>
                        moveElementLive(
                          selectedElement.id,
                          {
                            opacity: Number(
                              e.target.value
                            ),
                          }
                        )
                      }
                      onMouseUp={() => saveHistory()}
                    />
                    <span>
                      {(
                        selectedElement.opacity ?? 1
                      ).toFixed(2)}
                    </span>
                  </div>
                </>
              )}

              {/* QR selected */}
              {selectedElement?.type === "qr" && (
                <>
                  <h4>QR Code</h4>

                  <div
                    className="upload-area"
                    onClick={() =>
                      qrFileInputRef.current?.click()
                    }
                  >
                    <UploadCloud size={26} />
                    <strong>Upload QR Image</strong>
                    <span>
                      PNG / JPG — apna scanable QR use
                      karein
                    </span>
                  </div>

                  <input
                    ref={qrFileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleQrUpload}
                  />

                  {selectedElement.src && (
                    <div className="uploaded-preview">
                      <img
                        src={selectedElement.src}
                        alt="QR"
                      />
                    </div>
                  )}

                  <div className="range-row">
                    <span>10%</span>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      value={selectedElement.width}
                      onChange={(e) =>
                        moveElementLive(
                          selectedElement.id,
                          {
                            width: Number(
                              e.target.value
                            ),
                          }
                        )
                      }
                      onMouseUp={() => saveHistory()}
                    />
                    <span>
                      {Math.round(
                        selectedElement.width
                      )}
                      %
                    </span>
                  </div>
                </>
              )}

              {/* IMAGE selected (upload tool ke bahar bhi controls) */}
              {selectedElement?.type ===
                "image" &&
                activeTool !== "upload" && (
                  <>
                    <h4>
                      {selectedElement.label}
                    </h4>

                    <div className="uploaded-preview">
                      <img
                        src={selectedElement.src}
                        alt="Uploaded"
                      />
                    </div>

                    {/* pick a new file — replaces this
                        element's image in place */}
                    <button
                      type="button"
                      className="replace-logo-btn"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                    >
                      <UploadCloud size={15} />
                      Replace{" "}
                      {selectedElement.kind === "logo"
                        ? "Logo"
                        : "Image"}
                    </button>

                    <h4>Size</h4>

                    <div className="range-row">
                      <span>10%</span>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={selectedElement.width}
                        onChange={(e) =>
                          moveElementLive(
                            selectedElement.id,
                            {
                              width: Number(
                                e.target.value
                              ),
                            }
                          )
                        }
                        onMouseUp={() => saveHistory()}
                      />
                      <span>
                        {Math.round(
                          selectedElement.width
                        )}
                        %
                      </span>
                    </div>

                    <h4>Rotation</h4>

                    <div className="range-row">
                      <span>-90°</span>
                      <input
                        type="range"
                        min="-90"
                        max="90"
                        value={selectedElement.rotation || 0}
                        onChange={(e) =>
                          moveElementLive(
                            selectedElement.id,
                            {
                              rotation: Number(
                                e.target.value
                              ),
                            }
                          )
                        }
                        onMouseUp={() => saveHistory()}
                      />
                      <span>
                        {selectedElement.rotation || 0}°
                      </span>
                    </div>

                    <h4>Opacity</h4>

                    <div className="range-row">
                      <span>0.3</span>
                      <input
                        type="range"
                        min="0.3"
                        max="1"
                        step="0.05"
                        value={selectedElement.opacity ?? 1}
                        onChange={(e) =>
                          moveElementLive(
                            selectedElement.id,
                            {
                              opacity: Number(
                                e.target.value
                              ),
                            }
                          )
                        }
                        onMouseUp={() => saveHistory()}
                      />
                      <span>
                        {(
                          selectedElement.opacity ?? 1
                        ).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}

              {/* POSITION quick buttons */}
              {activeTool === "position" &&
                selectedElement && (
                  <div className="position-buttons">
                    <button
                      onClick={() =>
                        updateElement(
                          selectedElement.id,
                          { x: 50, y: 30 }
                        )
                      }
                    >
                      Top Center
                    </button>

                    <button
                      onClick={() =>
                        updateElement(
                          selectedElement.id,
                          { x: 50, y: 50 }
                        )
                      }
                    >
                      Center
                    </button>

                    <button
                      onClick={() =>
                        updateElement(
                          selectedElement.id,
                          { x: 50, y: 70 }
                        )
                      }
                    >
                      Bottom Center
                    </button>

                    <button
                      onClick={() =>
                        updateElement(
                          selectedElement.id,
                          { x: 18, y: 22 }
                        )
                      }
                    >
                      {isNotebook
                        ? "Left Side"
                        : "Left Chest"}
                    </button>
                  </div>
                )}

              {!selectedElement &&
                activeTool !== "text" && (
                  <p className="position-info">
                    {activeTool === "color"
                      ? "Pehle cover par kisi element ko select karein, phir color choose karein."
                      : "Cover par element ko directly drag karke move karein, ya element select karke quick position use karein."}
                  </p>
                )}

            </div>
          )}

          {/* UPLOAD */}

          {activeTool === "upload" && (
            <div className="settings-content">

              <h3>
                Upload Logo / Image
              </h3>

              <div
                className="upload-area"
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                <UploadCloud size={40} />

                <strong>
                  Upload Logo
                </strong>

                <span>
                  PNG, JPG, WEBP, SVG —
                  transparent PNG recommended
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={
                  handleLogoUpload
                }
              />

              {selectedElement?.type ===
                "image" && (
                <>
                  <div className="uploaded-preview">
                    <img
                      src={selectedElement.src}
                      alt="Uploaded"
                    />
                  </div>

                  <h4>Logo Size</h4>

                  <div className="range-row">
                    <span>10%</span>

                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={selectedElement.width}
                      onChange={(event) =>
                        moveElementLive(
                          selectedElement.id,
                          {
                            width: Number(
                              event.target.value
                            ),
                          }
                        )
                      }
                      onMouseUp={() => saveHistory()}
                    />

                    <span>
                      {Math.round(
                        selectedElement.width
                      )}
                      %
                    </span>
                  </div>

                  <h4>Rotation</h4>

                  <div className="range-row">
                    <span>-90°</span>

                    <input
                      type="range"
                      min="-90"
                      max="90"
                      value={selectedElement.rotation || 0}
                      onChange={(event) =>
                        moveElementLive(
                          selectedElement.id,
                          {
                            rotation: Number(
                              event.target.value
                            ),
                          }
                        )
                      }
                      onMouseUp={() => saveHistory()}
                    />

                    <span>
                      {selectedElement.rotation || 0}°
                    </span>
                  </div>

                  <h4>Opacity</h4>

                  <div className="range-row">
                    <span>0.3</span>

                    <input
                      type="range"
                      min="0.3"
                      max="1"
                      step="0.05"
                      value={selectedElement.opacity ?? 1}
                      onChange={(event) =>
                        moveElementLive(
                          selectedElement.id,
                          {
                            opacity: Number(
                              event.target.value
                            ),
                          }
                        )
                      }
                      onMouseUp={() => saveHistory()}
                    />

                    <span>
                      {(
                        selectedElement.opacity ?? 1
                      ).toFixed(2)}
                    </span>
                  </div>

                  <button
                    className="delete-logo-btn"
                    onClick={() =>
                      deleteElement(
                        selectedElement.id
                      )
                    }
                  >
                    <Trash2 size={17} />
                    Remove Logo
                  </button>
                </>
              )}

            </div>
          )}

          {/* TEMPLATES — notebook only */}

          {activeTool === "templates" && (
            <div className="settings-content">

              <h3>
                Design Templates
              </h3>

              <p className="position-info">
                Template select karne par sab
                elements editable rehte hain —
                text, color, position sab badal
                sakte ho.
              </p>

              <div className="template-list">
                {dbTemplates.length > 0 &&
                  dbTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      className="template-btn"
                      onClick={() => {
                        saveHistory();

                        const clone = (arr) =>
                          (Array.isArray(arr)
                            ? arr
                            : []
                          ).map((e) => ({
                            ...e,
                            id: uid(),
                          }));

                        setDesigns({
                          front: clone(tpl.design?.front),
                          back: clone(tpl.design?.back),
                        });

                        setSelectedId(null);
                      }}
                    >
                      <span className="template-name">
                        {tpl.name}
                      </span>

                      <span className="template-desc">
                        {(tpl.design?.front?.length ||
                          0) +
                          (tpl.design?.back?.length ||
                            0)}{" "}
                        editable elements
                      </span>
                    </button>
                  ))}

                {dbTemplates.length === 0 &&
                  NOTEBOOK_TEMPLATES.map(
                  (tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      className="template-btn"
                      onClick={() => {
                        saveHistory();

                        const ink =
                          printColorFor(
                            productColor
                          );

                        const newEls =
                          tpl.elements(ink).map(
                            (e) => ({
                              ...e,
                              id: uid(),
                            })
                          );

                        setDesigns((prev) => ({
                          ...prev,
                          [side]: newEls,
                        }));

                        setSelectedId(null);
                      }}
                    >
                      <span className="template-name">
                        {tpl.name}
                      </span>

                      <span className="template-desc">
                        {tpl.elements().length} editable elements
                      </span>
                    </button>
                  )
                )}
              </div>

            </div>
          )}

          {/* LAYERS */}

          {activeTool === "layers" && (
            <div className="settings-content">

              <h3>
                Layers —{" "}
                {isPen
                  ? "Barrel"
                  : isBottle
                  ? "Bottle"
                  : isMug
                  ? "Mug"
                  : side === "front"
                  ? "Front"
                  : "Back"}
              </h3>

              {elements.length === 0 && (
                <p className="position-info">
                  Is side par koi design element
                  nahi hai. Text ya logo add
                  karein.
                </p>
              )}

              {[...elements]
                .reverse()
                .map((el, i, arr) => {
                  const realIndex =
                    elements.indexOf(el);

                  return (
                    <div
                      key={el.id}
                      className={`layer-item${
                        selectedId === el.id
                          ? " layer-selected"
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedId(el.id)
                      }
                    >
                      {el.type === "image" ? (
                        <img src={el.src} alt="" />
                      ) : (
                        <Type size={17} />
                      )}

                      <span className="layer-label">
                        {el.type === "image"
                          ? "Image"
                          : el.text ||
                            el.label}
                      </span>

                      <div className="layer-actions">
                        <button
                          type="button"
                          title="Move up"
                          disabled={i === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            reorderElement(el.id, 1);
                          }}
                        >
                          <ChevronUp size={14} />
                        </button>

                        <button
                          type="button"
                          title="Move down"
                          disabled={i === arr.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            reorderElement(el.id, -1);
                          }}
                        >
                          <ChevronDown size={14} />
                        </button>

                        <button
                          type="button"
                          title={el.hidden ? "Show" : "Hide"}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateElement(el.id, {
                              hidden: !el.hidden,
                            });
                          }}
                        >
                          {el.hidden ? (
                            <EyeOff size={14} />
                          ) : (
                            <Eye size={14} />
                          )}
                        </button>

                        <button
                          type="button"
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteElement(el.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}

            </div>
          )}

        </section>

        {/* =================================================
            PRODUCT PREVIEW
        ================================================= */}

        <section className="product-area">

          <div className="product-canvas-wrapper">

            {renderCanvas()}

            {/* CANVAS TOOLS */}

            <div className="canvas-tools">

              <button
                onClick={undo}
                disabled={
                  history.length === 0
                }
              >
                <RotateCcw />

                <span>
                  Undo
                </span>
              </button>

              <button
                onClick={redo}
                disabled={
                  future.length === 0
                }
              >
                <RotateCw />

                <span>
                  Redo
                </span>
              </button>

              <button
                onClick={() =>
                  setZoom(
                    Math.min(
                      1.4,
                      zoom + 0.1
                    )
                  )
                }
              >
                <ZoomIn />

                <span>
                  Zoom In
                </span>
              </button>

              <button
                onClick={() =>
                  setZoom(
                    Math.max(
                      0.7,
                      zoom - 0.1
                    )
                  )
                }
              >
                <ZoomOut />

                <span>
                  Zoom Out
                </span>
              </button>

              <button
                onClick={() =>
                  setPreview(true)
                }
              >
                <Eye />

                <span>
                  Preview
                </span>
              </button>

              <button
                onClick={
                  resetDesign
                }
              >
                <RefreshCcw />

                <span>
                  Reset
                </span>
              </button>

            </div>

          </div>

        </section>

        {/* =================================================
            RIGHT SETTINGS
        ================================================= */}

        <aside className="product-settings">

          <div className="selected-product-info">

            <span>
              {selectedProduct.category ||
                "PRODUCT"}
            </span>

            <h2>
              {productName}
            </h2>

            <p>
              {selectedProduct.description ||
                "Customize this product according to your requirements."}
            </p>

          </div>

          {/* PRODUCT COLOR — sirf vector products pe */}

          {(isApparel || isNotebook || singleSide) && (
            <>
              <h3>
                {isPen
                  ? "Choose Pen Color"
                  : isBottle
                  ? "Choose Bottle Color"
                  : isMug
                  ? "Choose Mug Color"
                  : isNotebook
                  ? "Notebook Cover"
                  : "Choose Product Color"}
              </h3>

              <div className="product-colors">

                {productColors.map(
                  (color) => (
                    <button
                      key={color}
                      className={
                        productColor === color
                          ? "product-color selected-product-color"
                          : "product-color"
                      }
                      style={{
                        background:
                          color,
                      }}
                      onClick={() => {
                        saveHistory();

                        setProductColor(
                          color
                        );
                      }}
                    />
                  )
                )}

              </div>

              {/* custom product color — HEX / picker / RGB */}
              <ColorPickerField
                value={productColor}
                onChange={(color) => {
                  saveHistory();
                  setProductColor(color);
                }}
              />

              <div className="setting-divider" />
            </>
          )}

          {/* SIZE */}

          <h3>
            Choose Size
          </h3>

          <div
            className={`size-options${
              isSticker ? " size-options-cards" : ""
            }`}
          >

            {sizeOptions.map(
              (item) => (
                <button
                  key={item}
                  className={
                    (size === item
                      ? "size-selected"
                      : "") +
                    (isSticker
                      ? " size-option-card"
                      : "")
                  }
                  onClick={() =>
                    {
                      saveHistory();
                      setSize(item);

                      if (isFlyer) {
                        const cfg = getFlyerSizeConfig(item);

                        setDesigns((prev) => ({
                          ...prev,
                          front: prev.front.map((el) =>
                            el.type === "text"
                              ? normalizeTextElement(
                                  {
                                    ...el,
                                    fontSize:
                                      cfg.font[el.kind] ||
                                      cfg.font.custom,
                                  },
                                  item
                                )
                              : el
                          ),
                          back: prev.back.map((el) =>
                            el.type === "text"
                              ? normalizeTextElement(
                                  {
                                    ...el,
                                    fontSize:
                                      cfg.font[el.kind] ||
                                      cfg.font.custom,
                                  },
                                  item
                                )
                              : el
                          ),
                        }));
                      }
                    }
                  }
                >
                  <span>{item}</span>
                  {isSticker && (
                    <small>
                      {/custom/i.test(item)
                        ? "Set your own width × height"
                        : /a4|sheet/i.test(item)
                        ? "Many stickers on one A4 sheet"
                        : "Pre-cut sticker size"}
                    </small>
                  )}
                </button>
              )
            )}

          </div>

          {/* custom sticker size — only when Custom Size */}
          {isSticker && /custom/i.test(size) && (
            <div className="custom-size-fields">
              <label>
                <span>Width (in)</span>
                <input
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={customW}
                  onChange={(e) =>
                    setCustomW(e.target.value)
                  }
                />
              </label>
              <label>
                <span>Height (in)</span>
                <input
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={customH}
                  onChange={(e) =>
                    setCustomH(e.target.value)
                  }
                />
              </label>
            </div>
          )}

          {/* PAPER TYPE — sirf supported products pe */}
          {paperTypes?.length > 0 && (
            <>
              <div className="setting-divider" />

              <h3>
                {isSticker ? "Material" : "Paper Type"}
              </h3>

              <div
                className={`size-options${
                  isSticker ? " size-options-cards" : ""
                }`}
              >
                {paperTypes.map((p) => (
                  <button
                    key={p}
                    className={
                      (paperType === p
                        ? "size-selected"
                        : "") +
                      (isSticker
                        ? " size-option-card"
                        : "")
                    }
                    onClick={() => setPaperType(p)}
                  >
                    <span>{p}</span>
                    {isSticker && (
                      <small>
                        {/matt|matte/i.test(p)
                          ? "Flat, no glare finish"
                          : /gloss/i.test(p)
                          ? "Shiny, vivid finish"
                          : /transparent/i.test(p)
                          ? "See-through film"
                          : "Standard finish"}
                      </small>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="setting-divider" />

          {/* DESCRIPTION */}

          <div className="customer-request-box">

            <div className="customer-request-title">

              <FileText size={18} />

              <div>

                <strong>
                  Product Description
                </strong>

                <span>
                  Tell us about your customization
                </span>

              </div>

            </div>

            <textarea
              className="customer-description-input"
              value={
                customerDescription
              }
              onChange={(event) =>
                setCustomerDescription(
                  event.target.value
                )
              }
              maxLength={500}
              placeholder="Example: Logo should be placed on the left chest area..."
            />

            <div className="character-count">

              {customerDescription.length}
              /500 characters

            </div>

          </div>

          {/* SPECIAL NOTE */}

          <div className="customer-request-box">

            <div className="customer-request-title">

              <MessageSquare size={18} />

              <div>

                <strong>
                  Customer Instructions / Special Note
                </strong>

                <span>
                  Write any special requirement
                </span>

              </div>

            </div>

            <textarea
              className="customer-description-input customer-note-input"
              value={customerNote}
              onChange={(event) =>
                setCustomerNote(
                  event.target.value
                )
              }
              maxLength={500}
              placeholder="Example: Logo left side me chahiye. Text ka color blue rakho. Delivery se pehle mujhe confirm karna hai."
            />

            <div className="character-count">

              {customerNote.length}
              /500 characters

            </div>

          </div>

          {/* INFO */}

          <div className="customer-info-message">

            <Info size={16} />

            <span>
              Your description and special
              instructions will be saved with
              this customized product.
            </span>

          </div>

          {/* NEED HELP — inquiry form with product context */}

          <button
            type="button"
            className="need-help-link"
            onClick={() => {
              saveInquiryContext({
                productId: selectedProduct?.id,
                productName:
                  selectedProduct?.name,
                size,
                color: productColor,
                quantity: null,
                source: "customizer",
              });

              navigate("/#contact-inquiry");
            }}
          >
            <MessageSquare size={15} />
            Need help with this product?
          </button>

          <div className="setting-divider" />

          {/* PRICE */}

          <h3>
            Price Details
          </h3>

          <div className="price-row">

            <span>
              Product Price
            </span>

            <strong>
              ₹
              {basePrice.toLocaleString(
                "en-IN"
              )}
            </strong>

          </div>

          <div className="price-row">

            <span>
              Customization
            </span>

            <strong>
              ₹
              {customizationPrice.toLocaleString(
                "en-IN"
              )}
            </strong>

          </div>

          <div className="price-divider" />

          <div className="total-price-row">

            <span>
              Total Price
            </span>

            <strong>
              ₹
              {totalPrice.toLocaleString(
                "en-IN"
              )}
            </strong>

          </div>

          {/* CART SUCCESS */}

          {cartSuccess && (
            <div className="cart-success-message">

              <CheckCircle size={19} />

              <div>

                <strong>
                  Added to Cart
                </strong>

                <span>
                  Product and your instructions
                  have been saved.
                </span>

              </div>

              <button
                type="button"
                onClick={() =>
                  setCartSuccess(false)
                }
              >
                <X size={16} />
              </button>

            </div>
          )}

          {/* ADD TO CART */}

          <button
            type="button"
            className="add-cart-btn"
            onClick={addToCart}
          >
            <ShoppingCart size={20} />

            Add to Cart
          </button>

          {/* PLACE ORDER */}

          <button
            type="button"
            className="place-order-btn"
            onClick={placeOrder}
            disabled={isPlacingOrder}
          >
            <PackageCheck size={20} />

            {isPlacingOrder
              ? "Placing Order..."
              : "Place Order"}

          </button>

          {/* SAVE DESIGN */}

          <button
            type="button"
            className="save-design-btn"
            onClick={saveDesign}
          >
            <Heart size={20} />

            Save Design
          </button>

        </aside>

      </main>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="features-footer">

        <div className="feature">

          <div className="feature-icon">
            ✧
          </div>

          <div>

            <strong>
              Premium Quality
            </strong>

            <span>
              Best materials used
            </span>

          </div>

        </div>

        <div className="feature">

          <div className="feature-icon">
            🚚
          </div>

          <div>

            <strong>
              Fast Shipping
            </strong>

            <span>
              Charges calculated at checkout
            </span>

          </div>

        </div>

        <div className="feature">

          <div className="feature-icon">
            ♙
          </div>

          <div>

            <strong>
              Cash on Delivery
            </strong>

            <span>
              Available
            </span>

          </div>

        </div>

        <div className="feature">

          <div className="feature-icon">
            ↻
          </div>

          <div>

            <strong>
              Easy Returns
            </strong>

            <span>
              7 days return policy
            </span>

          </div>

        </div>

        <div className="feature">

          <div className="feature-icon">
            ▣
          </div>

          <div>

            <strong>
              Secure Payment
            </strong>

            <span>
              100% protected
            </span>

          </div>

        </div>

      </footer>

      {/* =================================================
          RESUME DRAFT PROMPT
      ================================================= */}

      {/* =================================================
          FAVOURITES TOAST
      ================================================= */}

      {favToast && (
        <div className="fav-toast">
          <Heart size={16} />
          <span>Added to Favourites</span>
        </div>
      )}

      {resumeDraft && (
        <div className="draft-overlay">
          <div className="draft-modal">
            <h3>Continue previous design?</h3>
            <p>
              You have an unfinished design for this product
              {resumeDraft.updatedAt
                ? ` (saved ${new Date(
                    resumeDraft.updatedAt
                  ).toLocaleString()})`
                : ""}
              . Continue where you left off or start fresh.
            </p>

            <button
              type="button"
              className="draft-btn draft-primary"
              onClick={continueDraft}
            >
              Continue Previous Design
            </button>

            <button
              type="button"
              className="draft-btn"
              onClick={startNewDesign}
            >
              Start New Design
            </button>

            <button
              type="button"
              className="draft-btn draft-danger"
              onClick={discardDraft}
            >
              Discard Draft
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default Customizer;
