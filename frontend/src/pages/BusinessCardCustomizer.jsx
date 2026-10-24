import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  BringToFront,
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  Eye,
  EyeOff,
  AtSign,
  Globe,
  ImagePlus,
  Users,
  Italic,
  Layers,
  Briefcase,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Redo2,
  Replace,
  RotateCcw,
  Save,
  SendToBack,
  Shapes,
  ShoppingCart,
  Trash2,
  Type,
  Underline,
  Undo2,
} from "lucide-react";

import "./BusinessCardCustomizer.css";
import { fetchProductTemplates } from "../services/templateApi";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { uploadDesignFile, fetchFileBlob } from "../services/fileApi";
import {
  getDraft,
  saveDraft,
  deleteDraft,
  writeLocalDraft,
} from "../services/draftApi";
import { addFavorite } from "../services/favoritesApi";

/* ── icon registry ── */
const iconMap = {
  Phone,
  Mail,
  Globe,
  MapPin,
  Instagram: AtSign,
  Facebook: Users,
  Linkedin: Briefcase,
  WhatsApp: MessageCircle,
};
const iconChoices = ["Phone", "Mail", "Globe", "MapPin", "Instagram", "Facebook", "Linkedin", "WhatsApp"];
const textPresets = [
  { label: "Name", text: "Your Name", x: 28, y: 25, width: 44, fontSize: 24, fontWeight: 700 },
  { label: "Company Name", text: "Company Name", x: 28, y: 43, width: 44, fontSize: 14, fontWeight: 600 },
  { label: "Designation", text: "Your Designation", x: 28, y: 55, width: 44, fontSize: 10, color: "#64748b" },
  { label: "Phone", text: "+91 00000 00000", x: 72, y: 25, width: 42, fontSize: 10 },
  { label: "Email", text: "you@example.com", x: 72, y: 39, width: 42, fontSize: 10 },
  { label: "Website", text: "www.example.com", x: 72, y: 53, width: 42, fontSize: 10 },
  { label: "Address", text: "Your address", x: 72, y: 70, width: 42, fontSize: 10, lineHeight: 1.4 },
];
const fonts = ["Inter", "Poppins", "Montserrat", "Georgia", "Arial", "Times New Roman"];

/* ── element factories ── */
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
  id: uid(), type: "shape", label: shape === "circle" ? "Circle" : shape === "line" ? "Line" : "Rectangle",
  shape, x, y, width: 25, color: "#2563eb", rotation: 0, opacity: 1, visible: true,
  ...overrides,
});

/* ── helper: clone template elements with fresh IDs ── */
const cloneElements = (elements) =>
  elements.map((el) => ({ ...el, id: uid() }));

/* ── RICH TEMPLATE DEFINITIONS (front + back, fully editable elements) ── */
const templates = {
  Minimal: {
    frontDesign: {
      background: "#ffffff", gradient: "", backgroundImage: "",
      elements: [
        makeShape("line", 50, 58, { width: 30, color: "#e2e8f0", label: "Divider" }),
        makeText("YOUR NAME", 50, 30, { fontSize: 24, fontWeight: 700, width: 80, align: "center", label: "Name" }),
        makeText("YOUR DESIGNATION", 50, 44, { fontSize: 10, letterSpacing: 3, color: "#64748b", width: 60, align: "center", label: "Designation" }),
        makeIcon("Phone", 30, 70, { width: 4, color: "#94a3b8" }),
        makeText("+91 00000 00000", 50, 70, { fontSize: 9, width: 30, color: "#475569", align: "center", label: "Phone" }),
        makeIcon("Mail", 30, 82, { width: 4, color: "#94a3b8" }),
        makeText("you@example.com", 50, 82, { fontSize: 9, width: 30, color: "#475569", align: "center", label: "Email" }),
      ],
    },
    backDesign: {
      background: "#ffffff", gradient: "", backgroundImage: "",
      elements: [
        makeText("YN", 50, 40, { fontSize: 48, fontWeight: 800, color: "#e2e8f0", align: "center", width: 40, label: "Monogram" }),
        makeText("www.example.com", 50, 70, { fontSize: 9, color: "#94a3b8", align: "center", width: 60, label: "Website" }),
      ],
    },
  },
  Luxury: {
    frontDesign: {
      background: "#111111", gradient: "linear-gradient(135deg, #090909, #26211a)", backgroundImage: "",
      elements: [
        makeShape("line", 50, 46, { width: 20, color: "#d4af37", label: "Gold Line" }),
        makeText("YN", 50, 25, { fontSize: 36, fontWeight: 700, color: "#d4af37", align: "center", width: 30, letterSpacing: 4, label: "Monogram" }),
        makeText("YOUR NAME", 50, 58, { fontSize: 18, color: "#ffffff", align: "center", width: 70, letterSpacing: 3, label: "Name" }),
        makeText("YOUR DESIGNATION", 50, 70, { fontSize: 9, color: "#d4af37", align: "center", width: 50, letterSpacing: 3, label: "Designation" }),
        makeIcon("Phone", 28, 86, { width: 3.5, color: "#d4af37" }),
        makeText("+91 00000 00000", 42, 86, { fontSize: 8, color: "#a89060", width: 22, label: "Phone" }),
        makeIcon("Mail", 62, 86, { width: 3.5, color: "#d4af37" }),
        makeText("you@example.com", 76, 86, { fontSize: 8, color: "#a89060", width: 22, label: "Email" }),
      ],
    },
    backDesign: {
      background: "#111111", gradient: "linear-gradient(135deg, #090909, #26211a)", backgroundImage: "",
      elements: [
        makeShape("rectangle", 50, 50, { width: 92, color: "rgba(212,175,55,0.08)", label: "Border" }),
        makeText("YN", 50, 42, { fontSize: 56, fontWeight: 800, color: "#d4af37", align: "center", width: 40, letterSpacing: 6, label: "Monogram" }),
        makeText("YOUR COMPANY", 50, 68, { fontSize: 9, color: "#a89060", align: "center", width: 50, letterSpacing: 4, label: "Tagline" }),
      ],
    },
  },
  Corporate: {
    frontDesign: {
      background: "#f8fafc", gradient: "linear-gradient(120deg, #0f3d68 0 34%, #f8fafc 34%)", backgroundImage: "",
      elements: [
        makeText("YN", 16, 42, { fontSize: 32, fontWeight: 700, color: "#ffffff", align: "center", width: 25, label: "Monogram" }),
        makeText("Your Name", 60, 24, { fontSize: 22, fontWeight: 700, width: 48, label: "Name" }),
        makeText("Your Designation", 60, 38, { fontSize: 11, color: "#2563eb", width: 42, label: "Designation" }),
        makeShape("line", 60, 48, { width: 15, color: "#2563eb", label: "Divider" }),
        makeIcon("Phone", 44, 58, { width: 3.5, color: "#2563eb" }),
        makeText("+91 00000 00000", 62, 58, { fontSize: 9, color: "#475569", width: 30, label: "Phone" }),
        makeIcon("Mail", 44, 68, { width: 3.5, color: "#2563eb" }),
        makeText("you@example.com", 62, 68, { fontSize: 9, color: "#475569", width: 30, label: "Email" }),
        makeIcon("Globe", 44, 78, { width: 3.5, color: "#2563eb" }),
        makeText("www.example.com", 62, 78, { fontSize: 9, color: "#475569", width: 30, label: "Website" }),
        makeIcon("MapPin", 44, 88, { width: 3.5, color: "#2563eb" }),
        makeText("Your City, India", 62, 88, { fontSize: 9, color: "#475569", width: 30, label: "Address" }),
      ],
    },
    backDesign: {
      background: "#0f3d68", gradient: "", backgroundImage: "",
      elements: [
        makeText("COMPANY", 50, 35, { fontSize: 28, fontWeight: 800, color: "#ffffff", align: "center", width: 80, letterSpacing: 5, label: "Company" }),
        makeText("TAGLINE", 50, 52, { fontSize: 14, color: "#60a5fa", align: "center", width: 60, letterSpacing: 6, label: "Tagline" }),
        makeShape("line", 50, 65, { width: 20, color: "#60a5fa", label: "Divider" }),
        makeText("www.example.com", 50, 78, { fontSize: 9, color: "#93c5fd", align: "center", width: 50, label: "Website" }),
      ],
    },
  },
  Modern: {
    frontDesign: {
      background: "#ffffff", gradient: "linear-gradient(145deg, #ffffff 0 72%, #7c3aed 72%)", backgroundImage: "",
      elements: [
        makeText("YOUR", 12, 22, { fontSize: 30, fontWeight: 800, width: 40, lineHeight: 1, label: "First Name" }),
        makeText("NAME", 12, 36, { fontSize: 30, fontWeight: 800, width: 45, lineHeight: 1, label: "Last Name" }),
        makeText("YOUR DESIGNATION", 12, 52, { fontSize: 9, color: "#7c3aed", letterSpacing: 3, width: 40, label: "Designation" }),
        makeShape("line", 12, 62, { width: 12, color: "#7c3aed", label: "Accent Line" }),
        makeIcon("Mail", 8, 74, { width: 3.5, color: "#7c3aed" }),
        makeText("you@example.com", 22, 74, { fontSize: 9, color: "#64748b", width: 35, label: "Email" }),
        makeIcon("Phone", 8, 84, { width: 3.5, color: "#7c3aed" }),
        makeText("+91 00000 00000", 22, 84, { fontSize: 9, color: "#64748b", width: 35, label: "Phone" }),
        makeText("YN", 84, 86, { fontSize: 22, fontWeight: 800, color: "#ffffff", align: "center", width: 15, label: "Monogram" }),
      ],
    },
    backDesign: {
      background: "#7c3aed", gradient: "", backgroundImage: "",
      elements: [
        makeText("YN", 50, 40, { fontSize: 60, fontWeight: 800, color: "rgba(255,255,255,0.12)", align: "center", width: 50, label: "Monogram" }),
        makeText("www.example.com", 50, 72, { fontSize: 10, color: "#e9d5ff", align: "center", width: 60, label: "Website" }),
      ],
    },
  },
  Creative: {
    frontDesign: {
      background: "#fff7ed", gradient: "radial-gradient(circle at 85% 20%, #fb7185 0 18%, transparent 18%), linear-gradient(135deg, #fff7ed, #fef3c7)", backgroundImage: "",
      elements: [
        makeShape("circle", 87, 20, { width: 5, color: "#fbbf24", label: "Dot Accent" }),
        makeText("Your", 14, 24, { fontSize: 28, fontWeight: 800, color: "#7c2d12", width: 45, label: "First Name" }),
        makeText("Name", 14, 40, { fontSize: 28, fontWeight: 800, color: "#ea580c", width: 45, label: "Last Name" }),
        makeText("Your Designation", 14, 56, { fontSize: 11, color: "#ea580c", width: 50, label: "Designation" }),
        makeShape("line", 14, 65, { width: 10, color: "#fb923c", label: "Accent Line" }),
        makeIcon("Mail", 10, 76, { width: 3.5, color: "#ea580c" }),
        makeText("you@example.com", 22, 76, { fontSize: 9, color: "#9a3412", width: 35, label: "Email" }),
        makeIcon("AtSign", 10, 86, { width: 3.5, color: "#ea580c", icon: "Instagram" }),
        makeText("@yourhandle", 22, 86, { fontSize: 9, color: "#9a3412", width: 35, label: "Social" }),
      ],
    },
    backDesign: {
      background: "#fff7ed", gradient: "linear-gradient(135deg, #fff7ed, #fef3c7)", backgroundImage: "",
      elements: [
        makeShape("circle", 80, 25, { width: 28, color: "rgba(251,113,133,0.15)", label: "Circle Accent" }),
        makeShape("circle", 20, 75, { width: 16, color: "rgba(251,191,36,0.15)", label: "Circle Accent 2" }),
        makeText("YOUR\nCOMPANY", 50, 40, { fontSize: 24, fontWeight: 800, color: "#7c2d12", align: "center", width: 70, lineHeight: 1.1, label: "Company" }),
        makeText("www.example.com", 50, 70, { fontSize: 9, color: "#9a3412", align: "center", width: 50, label: "Website" }),
      ],
    },
  },
};

const defaultTemplate = "Minimal";

/* ── blank/initial ── */
const buildInitialDesign = () => {
  const t = templates[defaultTemplate];
  return {
    front: { ...t.frontDesign, elements: cloneElements(t.frontDesign.elements) },
    back: { ...t.backDesign, elements: cloneElements(t.backDesign.elements) },
  };
};

/* ── element label for layers panel ── */
const elementLabel = (el) => {
  if (el.label) return el.label;
  if (el.type === "text") return el.text?.slice(0, 18) || "Text";
  if (el.type === "image") return el.name?.slice(0, 18) || "Image";
  if (el.type === "icon") return el.icon || "Icon";
  if (el.type === "shape") return el.shape || "Shape";
  return "Element";
};

const layerIcon = (el) => {
  if (el.type === "text") return "T";
  if (el.type === "image") return "\u{1f5bc}";
  if (el.type === "icon") return "\u26a1";
  if (el.type === "shape") return "\u25a0";
  return "\u25cf";
};

/* ── mini template preview renderer ── */
export function TemplatePreview({ tpl }) {
  const side = tpl.frontDesign;
  const bg = side.gradient || side.background || "#fff";
  return (
    <div className="bc-tpl-preview" style={{ background: bg, backgroundImage: side.backgroundImage ? `url(${side.backgroundImage})` : side.gradient || "none" }}>
      {side.elements.slice(0, 8).map((el) => {
        const s = { position: "absolute", left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, transform: "translate(-50%,-50%)", opacity: el.opacity ?? 1 };
        if (el.type === "text") return <div key={el.id} style={{ ...s, fontFamily: el.fontFamily, fontSize: `${Math.max(3, el.fontSize * 0.3)}px`, fontWeight: el.fontWeight, fontStyle: el.italic ? "italic" : "normal", color: el.color, textAlign: el.align, whiteSpace: "pre-line", lineHeight: el.lineHeight, letterSpacing: `${(el.letterSpacing || 0) * 0.3}px`, overflow: "hidden" }}>{el.text}</div>;
        if (el.type === "shape") {
          if (el.shape === "line") return <div key={el.id} style={{ ...s, height: "1px", background: el.color }} />;
          return <div key={el.id} style={{ ...s, aspectRatio: el.shape === "circle" ? "1" : "2", borderRadius: el.shape === "circle" ? "50%" : "2px", background: el.color }} />;
        }
        if (el.type === "icon") {
          const Icon = iconMap[el.icon] || Phone;
          return <div key={el.id} style={s}><Icon style={{ width: "100%", height: "auto" }} /></div>;
        }
        return null;
      })}
    </div>
  );
}

/* ══════════════════ MAIN COMPONENT ══════════════════
   embedded mode (admin template designer):
   propProduct/initialDesign/onSaveTemplate/onCancel */
export default function BusinessCardCustomizer({
  embedded = false,
  propProduct = null,
  initialDesign = null,
  onSaveTemplate = null,
  onCancel = null,
} = {}) {
  const navigate = useNavigate();
  const { addToCart: contextAddToCart } = useCart();
  const fileRef = useRef(null);
  const replaceFileRef = useRef(null);
  const backgroundRef = useRef(null);
  const tapRef = useRef(null);

  const storedProduct = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("selectedCustomizeProduct") || "null"); }
    catch { return null; }
  }, []);

  const product = propProduct || storedProduct;

  const savedDesign = useMemo(() => {
    if (embedded) return null;
    try {
      const raw = JSON.parse(localStorage.getItem(`businessCardDesign-${product?.id || "draft"}`) || "null");
      /* stale/incompatible saved shapes must not crash the editor —
         only restore when both sides carry an elements array */
      return raw &&
        Array.isArray(raw.frontDesign?.elements) &&
        Array.isArray(raw.backDesign?.elements)
        ? raw
        : null;
    } catch { return null; }
  }, [product?.id, embedded]);

  const [side, setSide] = useState("front");
  const [design, setDesign] = useState(() => {
    if (savedDesign?.frontDesign && savedDesign?.backDesign) {
      return { front: savedDesign.frontDesign, back: savedDesign.backDesign };
    }
    /* embedded admin designer may pass an existing template */
    const initFront = initialDesign?.frontDesign || initialDesign?.front;
    const initBack = initialDesign?.backDesign || initialDesign?.back;
    if (initFront || initBack) {
      return {
        front: {
          background: "#ffffff", gradient: "", backgroundImage: "",
          ...(initFront || {}),
          elements: cloneElements(initFront?.elements || []),
        },
        back: {
          background: "#ffffff", gradient: "", backgroundImage: "",
          ...(initBack || {}),
          elements: cloneElements(initBack?.elements || []),
        },
      };
    }
    return buildInitialDesign();
  });
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [template, setTemplate] = useState(savedDesign?.template || (savedDesign ? null : defaultTemplate));
  const [preview, setPreview] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  /* ── draft auto-save / resume ── */
  const { user } = useAuth();
  const EDITOR_KEY = "business-card";
  const draftProductId = product?.id ?? "draft";
  /* embedded = admin template designer → no drafts */
  const draftsEnabled = !embedded;
  const [draftReady, setDraftReady] = useState(embedded);
  const [resumeDraft, setResumeDraft] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [favToast, setFavToast] = useState(false);
  const revisionRef = useRef(0);
  const saveSeqRef = useRef(0);
  const pendingSaveRef = useRef(null);
  const retryTimerRef = useRef(null);

  /* product-specific templates — API/DB authoritative,
     builtin set is only an offline fallback */
  const [tplMap, setTplMap] = useState(templates);
  const tplAutoApplied = useRef(false);

  useEffect(() => {
    if (!product?.id) return;
    let cancelled = false;

    fetchProductTemplates(product.id)
      .then((list) => {
        if (cancelled || !Array.isArray(list) || !list.length) return;

        const map = {};
        list.forEach((t) => {
          if (t.design?.frontDesign) map[t.name] = t.design;
        });
        if (!Object.keys(map).length) return;
        setTplMap(map);

        /* untouched canvas -> auto-load this product's
           first template */
        if (
          !tplAutoApplied.current &&
          !savedDesign &&
          !initialDesign
        ) {
          tplAutoApplied.current = true;
          const first = map[list[0].name];
          if (first) {
            setDesign({
              front: {
                ...first.frontDesign,
                elements: cloneElements(
                  first.frontDesign.elements
                ),
              },
              back: {
                ...(first.backDesign || {}),
                elements: cloneElements(
                  first.backDesign?.elements || []
                ),
              },
            });
            setTemplate(list[0].name);
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [product?.id]);

  const current = design[side];
  const elements = Array.isArray(current?.elements) ? current.elements : [];
  const selected = elements.find((el) => el.id === selectedId) || null;

  /* ── history helpers ── */
  const commit = useCallback((updater) => {
    setHistory((h) => [...h.slice(-29), design]);
    setFuture([]);
    setDesign((v) => (typeof updater === "function" ? updater(v) : updater));
  }, [design]);

  const updateSide = useCallback((changes) => {
    commit((v) => ({ ...v, [side]: { ...v[side], ...changes } }));
  }, [commit, side]);

  const updateElement = useCallback((changes, saveHistory = true) => {
    const apply = (v) => ({
      ...v,
      [side]: {
        ...v[side],
        elements: v[side].elements.map((el) => el.id === selectedId ? { ...el, ...changes } : el),
      },
    });
    if (saveHistory) commit(apply);
    else setDesign(apply);
  }, [commit, side, selectedId]);

  /* update any element by id — keystroke typing must not
     spam undo history */
  const updateElementById = useCallback((id, changes) => {
    setDesign((v) => ({
      ...v,
      [side]: {
        ...v[side],
        elements: v[side].elements.map((el) =>
          el.id === id ? { ...el, ...changes } : el
        ),
      },
    }));
  }, [side]);

  /* direct-in-canvas text editing — double-click/double-tap.
     One undo checkpoint per edit session; typing itself is
     committed live without history entries. */
  const startTextEdit = useCallback(
    (element) => {
      if (preview || element.type !== "text" || element.visible === false)
        return;
      setSelectedId(element.id);
      if (editingId !== element.id) {
        setHistory((h) => [...h.slice(-29), design]);
        setFuture([]);
      }
      setEditingId(element.id);
    },
    [preview, editingId, design]
  );

  const addElement = useCallback((element) => {
    const existingPreset = element.preset ? elements.find((el) => el.preset === element.preset) : null;
    if (existingPreset) { setSelectedId(existingPreset.id); return; }
    commit((v) => ({ ...v, [side]: { ...v[side], elements: [...v[side].elements, element] } }));
    setSelectedId(element.id);
  }, [commit, side, elements]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    commit((v) => ({ ...v, [side]: { ...v[side], elements: v[side].elements.filter((el) => el.id !== selectedId) } }));
    setSelectedId(null);
    setEditingId(null);
  }, [commit, side, selectedId]);

  const duplicateSelected = useCallback(() => {
    if (!selected) return;
    const clone = { ...selected, id: uid(), preset: undefined, x: Math.min(92, selected.x + 4), y: Math.min(92, selected.y + 4) };
    commit((v) => ({ ...v, [side]: { ...v[side], elements: [...v[side].elements, clone] } }));
    setSelectedId(clone.id);
  }, [selected, commit, side]);

  const moveLayer = useCallback((direction) => {
    if (!selected) return;
    commit((v) => {
      const elements = [...v[side].elements];
      const idx = elements.findIndex((el) => el.id === selectedId);
      if (idx < 0) return v;
      let target;
      if (direction === "front") target = elements.length - 1;
      else if (direction === "back") target = 0;
      else if (direction === "up") target = Math.min(elements.length - 1, idx + 1);
      else target = Math.max(0, idx - 1);
      const [el] = elements.splice(idx, 1);
      elements.splice(target, 0, el);
      return { ...v, [side]: { ...v[side], elements } };
    });
  }, [selected, commit, side, selectedId]);

  const toggleVisibility = useCallback((elId) => {
    commit((v) => ({
      ...v,
      [side]: {
        ...v[side],
        elements: v[side].elements.map((el) => el.id === elId ? { ...el, visible: !(el.visible !== false ? true : false) } : el),
      },
    }));
  }, [commit, side]);

  const selectLayerItem = useCallback((elId) => {
    setSelectedId(elId);
  }, []);

  /* ── undo / redo / reset ── */
  const undo = useCallback(() => {
    if (!history.length) return;
    setFuture((f) => [...f, design]);
    setDesign(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setSelectedId(null);
    setEditingId(null);
  }, [history, design]);

  const redo = useCallback(() => {
    if (!future.length) return;
    setHistory((h) => [...h, design]);
    setDesign(future[future.length - 1]);
    setFuture((f) => f.slice(0, -1));
    setSelectedId(null);
    setEditingId(null);
  }, [future, design]);

  const reset = useCallback(() => {
    const tpl =
      tplMap[template] ||
      tplMap[defaultTemplate] ||
      Object.values(tplMap)[0];

    if (tpl) {
      commit({
        front: {
          ...tpl.frontDesign,
          elements: cloneElements(tpl.frontDesign.elements),
        },
        back: {
          ...(tpl.backDesign || {}),
          elements: cloneElements(tpl.backDesign?.elements || []),
        },
      });
    } else {
      commit(buildInitialDesign());
    }
    setSelectedId(null);
  }, [commit, tplMap, template]);

  /* ── template application with confirmation ── */
  const applyTemplate = useCallback((name) => {
    const hasElements = design.front.elements.length > 0 || design.back.elements.length > 0;
    const doApply = () => {
      const tpl = tplMap[name];
      if (!tpl) return;
      const newDesign = {
        front: { ...tpl.frontDesign, elements: cloneElements(tpl.frontDesign.elements) },
        back: { ...(tpl.backDesign || {}), elements: cloneElements(tpl.backDesign?.elements || []) },
      };
      commit(() => newDesign);
      setTemplate(name);
      setSelectedId(null);
      setEditingId(null);
      setConfirmDialog(null);
    };
    if (hasElements && template !== name) {
      setConfirmDialog({
        title: "Switch Template?",
        message: "Changing the template will replace your current design. This cannot be undone.",
        onConfirm: doApply,
        onCancel: () => setConfirmDialog(null),
      });
    } else {
      doApply();
    }
  }, [commit, design, template, tplMap]);

  /* ══════════════════ draft auto-save / resume ══════════════════ */

  /* mount: server draft (logged-in) or localStorage (guest);
     legacy businessCardDesign-<id> counts as a draft too */
  useEffect(() => {
    if (!draftsEnabled) return;
    let cancelled = false;
    (async () => {
      let found = await getDraft(EDITOR_KEY, draftProductId).catch(() => null);
      if (!found?.draft && savedDesign) {
        found = {
          draft: {
            frontDesign: savedDesign.frontDesign,
            backDesign: savedDesign.backDesign,
            template: savedDesign.template,
          },
          revision: 1,
          updatedAt: null,
        };
      }
      if (cancelled) return;
      const d = found?.draft;
      if (d?.frontDesign || d?.backDesign) {
        setResumeDraft(found);
      } else {
        setDraftReady(true);
      }
      /* dead pre-draft key — free the quota */
      try { localStorage.removeItem(`businessCardDesign-${draftProductId}`); } catch {}
    })();
    return () => { cancelled = true; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const stripSrc = (e) =>
    e?.fileId &&
    typeof e.src === "string" &&
    (e.src.startsWith("data:") || e.src.startsWith("blob:"))
      ? { ...e, src: `file:${e.fileId}` }
      : e;

  const stripSide = (s) => ({
    ...s,
    elements: (s?.elements || []).map(stripSrc),
  });

  const buildDraftPayload = () => ({
    frontDesign: stripSide(design.front),
    backDesign: stripSide(design.back),
    template,
    side,
  });

  const doDraftSave = async (pending) => {
    if (!pending) return;
    setSaveStatus("saving");
    const revision = ++revisionRef.current;
    const res = await saveDraft(EDITOR_KEY, draftProductId, pending.payload, revision);
    if (pending.seq !== saveSeqRef.current) return; // newer edits pending
    if (res.ok || res.conflict) {
      if (res.revision) revisionRef.current = Math.max(revisionRef.current, res.revision);
      pendingSaveRef.current = null;
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => doDraftSave(pending), 3000);
    }
  };

  /* debounced autosave */
  useEffect(() => {
    if (!draftReady || !draftsEnabled) return;
    const seq = ++saveSeqRef.current;
    pendingSaveRef.current = { payload: buildDraftPayload(), seq };
    setSaveStatus((s) => (s === "saved" ? s : "saving"));
    const t = setTimeout(() => doDraftSave(pendingSaveRef.current), 700);
    return () => clearTimeout(t);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [design, template, side, draftReady]);

  /* warn-on-leave + flush on unmount */
  useEffect(() => {
    const warn = (e) => {
      if (pendingSaveRef.current || saveStatus === "saving" || saveStatus === "error") {
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
        writeLocalDraft(EDITOR_KEY, draftProductId, pendingSaveRef.current.payload, rev);
        saveDraft(EDITOR_KEY, draftProductId, pendingSaveRef.current.payload, rev).catch(() => {});
        pendingSaveRef.current = null;
      }
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [saveStatus, draftReady, draftProductId]);

  const restoreDraftImages = async (sideObj) => ({
    ...sideObj,
    elements: await Promise.all(
      (sideObj?.elements || []).map(async (e) => {
        const src = String(e?.src || "");
        if (src.startsWith("file:")) {
          const blob = await fetchFileBlob(src.slice(5));
          return blob ? { ...e, src: URL.createObjectURL(blob) } : e;
        }
        /* stale blob: URLs die across sessions */
        if (src.startsWith("blob:")) {
          if (e.fileId) {
            const blob = await fetchFileBlob(e.fileId);
            return blob ? { ...e, src: URL.createObjectURL(blob) } : e;
          }
          return { ...e, visible: false, src: "" };
        }
        return e;
      })
    ),
  });

  const continueDraft = async () => {
    const found = resumeDraft;
    setResumeDraft(null);
    revisionRef.current = found?.revision || 0;
    const d = found.draft;
    setDesign({
      front: await restoreDraftImages(d.frontDesign || { elements: [] }),
      back: await restoreDraftImages(d.backDesign || { elements: [] }),
    });
    if (d.template !== undefined) setTemplate(d.template);
    setDraftReady(true);
  };

  const startNewDesign = async () => {
    setResumeDraft(null);
    await deleteDraft(EDITOR_KEY, draftProductId);
    try { localStorage.removeItem(`businessCardDesign-${draftProductId}`); } catch {}
    revisionRef.current = 0;
    setDesign(buildInitialDesign());
    setTemplate(defaultTemplate);
    setDraftReady(true);
  };

  const discardDraft = async () => {
    if (!window.confirm("Discard the saved draft permanently?")) return;
    await startNewDesign();
  };

  /* ── image upload ── */
  const uploadImage = useCallback((event, background = false) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      alert("Please select a PNG, JPG/JPEG, or WEBP image up to 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (background) updateSide({ backgroundImage: reader.result });
      else {
        const el = { id: uid(), type: "image", src: reader.result, name: file.name, label: file.name.slice(0, 16), x: 50, y: 50, width: 25, rotation: 0, opacity: 1, visible: true };
        addElement(el);
        /* logged-in: keep a stable server file ref for drafts */
        if (user) {
          uploadDesignFile({ name: file.name || "image", type: file.type, dataUrl: reader.result })
            .then((up) => {
              if (up?.success && up.fileId) updateElementById(el.id, { fileId: up.fileId });
            })
            .catch(() => {});
        }
      }
    };
    reader.readAsDataURL(file);
  }, [updateSide, addElement, user, updateElementById]);

  /* ── replace image for selected image element ── */
  const replaceImage = useCallback((event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      alert("Please select a PNG, JPG/JPEG, or WEBP image up to 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateElement({ src: reader.result, name: file.name, label: file.name.slice(0, 16), fileId: undefined });
      if (user) {
        uploadDesignFile({ name: file.name || "image", type: file.type, dataUrl: reader.result })
          .then((up) => {
            if (up?.success && up.fileId) updateElement({ fileId: up.fileId });
          })
          .catch(() => {});
      }
    };
    reader.readAsDataURL(file);
  }, [updateElement, user]);

  /* ── drag ── */
  const startDrag = useCallback((event, element) => {
    if (preview) return;
    if (element.visible === false) return;
    /* dragging must never start while a text field is open —
       the textarea stops propagation, this is a safety net */
    if (editingId === element.id) return;
    event.preventDefault();
    setSelectedId(element.id);
    const canvas = event.currentTarget.parentElement.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const downAt = Date.now();
    let moved = false;
    const origX = element.x;
    const origY = element.y;
    setHistory((h) => [...h.slice(-29), design]);
    setFuture([]);
    const move = (e) => {
      if (Math.abs(e.clientX - startX) > 4 || Math.abs(e.clientY - startY) > 4) moved = true;
      const x = Math.max(0, Math.min(100, origX + ((e.clientX - startX) / canvas.width) * 100));
      const y = Math.max(0, Math.min(100, origY + ((e.clientY - startY) / canvas.height) * 100));
      setDesign((v) => ({
        ...v,
        [side]: { ...v[side], elements: v[side].elements.map((el) => el.id === element.id ? { ...el, x, y } : el) },
      }));
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      /* quick tap on the same text element twice = enter
         edit mode (covers touch where dblclick is unreliable) */
      const quickTap = !moved && Date.now() - downAt < 350;
      if (quickTap && element.type === "text") {
        if (tapRef.current === element.id) {
          tapRef.current = null;
          startTextEdit(element);
        } else {
          tapRef.current = element.id;
        }
      } else if (moved) {
        tapRef.current = null;
      }
      /* a click with no movement created a needless history
         entry — pop it back unless a tap pair just fired */
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }, [preview, design, side, editingId, startTextEdit]);

  /* ── save / cart ── */
  /* Save Design → draft save + favourites (same behavior
     as the generic customizer) */
  const saveDesign = useCallback(() => {
    /* draft save through the shared pipeline — status
       shows in the badge, no alerts */
    const seq = ++saveSeqRef.current;
    pendingSaveRef.current = { payload: buildDraftPayload(), seq };
    doDraftSave(pendingSaveRef.current);

    /* cart's "Edit Design" still reads this key */
    const state = { productId: product?.id, paperType: product?.paperType, size: product?.size, quantity: product?.quantity, frontDesign: design.front, backDesign: design.back, uploadedDesign: null, template };
    try {
      localStorage.setItem(`businessCardDesign-${product?.id || "draft"}`, JSON.stringify(state));
    } catch { /* quota — non-fatal */ }

    /* favourites — server for logged-in, local mirror
       for guests; full snapshot (with image) goes to DB */
    addFavorite({
      ...product,
      badge: product?.badge || "Custom Design",
    }).catch(() => {});

    setFavToast(true);
    setTimeout(() => setFavToast(false), 2500);
  }, [product, design, template]);

  const addToCart = useCallback(async () => {
    if (!product) return;
    const customization = { productId: product.id, paperType: product.paperType, size: product.size, quantity: product.quantity || 100, frontDesign: design.front, backDesign: design.back, uploadedDesign: null, template };

    /* design persist — Cart "Edit Design" isi key se restore karta hai */
    try {
      localStorage.setItem(
        `businessCardDesign-${product.id}`,
        JSON.stringify({
          productId: product.id,
          paperType: product.paperType,
          size: product.size,
          quantity: product.quantity,
          frontDesign: design.front,
          backDesign: design.back,
          template,
        })
      );
    } catch { /* storage full — ignore */ }

    await contextAddToCart({
      productId: product.id,
      product_id: product.id,
      originalProductId: product.id,
      name: product.name,
      image: product.image || product.images?.[0] || "",
      price: Number(product.price || 0),
      quantity: product.quantity || 100,
      paperType: product.paperType || "Standard",
      size: product.size || "Standard",
      isCustomized: true,
      customized: true,
      itemType: "business-card",
      customizationType: "business-card",
      customization,
      frontDesign: design.front,
      backDesign: design.back,
      template,
    });
    navigate("/cart");
  }, [product, design, template, navigate, contextAddToCart]);

  /* ── render element on canvas ── */
  const renderElement = (element) => {
    const style = {
      left: `${element.x}%`, top: `${element.y}%`, width: `${element.width}%`,
      transform: `translate(-50%, -50%) rotate(${element.rotation || 0}deg)`,
      opacity: element.opacity ?? 1, color: element.color,
    };
    if (element.type === "text") {
      const textStyle = {
        ...style, fontFamily: element.fontFamily, fontSize: `${element.fontSize}px`,
        fontWeight: element.fontWeight, fontStyle: element.italic ? "italic" : "normal",
        textDecoration: element.underline ? "underline" : "none", textAlign: element.align,
        letterSpacing: `${element.letterSpacing}px`, lineHeight: element.lineHeight, whiteSpace: "pre-line",
      };
      /* direct-in-canvas editing: textarea overlays the text
         element with identical styling; updates are live */
      if (editingId === element.id) {
        return (
          <textarea
            className="bc-inline-edit"
            style={textStyle}
            value={element.text}
            rows={Math.max(1, String(element.text).split("\n").length)}
            maxLength={500}
            ref={(el) => {
              if (el && !el.dataset.focused) {
                el.dataset.focused = "1";
                el.focus({ preventScroll: true });
                const end = el.value.length;
                el.setSelectionRange(end, end);
              }
            }}
            onChange={(e) =>
              updateElementById(element.id, { text: e.target.value })
            }
            onKeyDown={(e) => {
              e.stopPropagation();
              if (
                e.key === "Escape" ||
                (e.key === "Enter" && (e.ctrlKey || e.metaKey))
              ) {
                e.target.blur();
              }
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => setEditingId(null)}
          />
        );
      }
      return <div style={textStyle}>{element.text}</div>;
    }
    if (element.type === "image") return <img src={element.src} alt={element.name || "Design element"} style={style} />;
    if (element.type === "shape") {
      if (element.shape === "line") return <div style={{ ...style, height: "2px", background: element.color }} />;
      return <div style={{ ...style, aspectRatio: element.shape === "circle" ? "1" : "2", borderRadius: element.shape === "circle" ? "50%" : "8px", background: element.color }} />;
    }
    const Icon = iconMap[element.icon] || Phone;
    return <div style={style}><Icon style={{ width: "100%", height: "auto" }} /></div>;
  };

  /* ══════════════════ JSX ══════════════════ */
  return (
    <main className="bc-editor">
      {/* ── favourites toast ── */}
      {favToast && (
        <div className="fav-toast">
          <span>❤️ Added to Favourites</span>
        </div>
      )}

      {/* ── resume draft prompt ── */}
      {resumeDraft && (
        <div className="draft-overlay">
          <div className="draft-modal">
            <h3>Continue previous design?</h3>
            <p>
              You have an unfinished design for this product
              {resumeDraft.updatedAt
                ? ` (saved ${new Date(resumeDraft.updatedAt).toLocaleString()})`
                : ""}
              . Continue where you left off or start fresh.
            </p>
            <button type="button" className="draft-btn draft-primary" onClick={continueDraft}>
              Continue Previous Design
            </button>
            <button type="button" className="draft-btn" onClick={startNewDesign}>
              Start New Design
            </button>
            <button type="button" className="draft-btn draft-danger" onClick={discardDraft}>
              Discard Draft
            </button>
          </div>
        </div>
      )}

      {/* ── confirmation dialog ── */}
      {confirmDialog && (
        <div className="bc-dialog-overlay" onClick={confirmDialog.onCancel}>
          <div className="bc-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmDialog.title}</h3>
            <p>{confirmDialog.message}</p>
            <div className="bc-dialog-actions">
              <button type="button" onClick={confirmDialog.onCancel}>Cancel</button>
              <button type="button" className="primary" onClick={confirmDialog.onConfirm}>Continue</button>
            </div>
          </div>
        </div>
      )}

      {/* ── top bar ── */}
      <header className="bc-topbar">
        <button type="button" className="bc-icon-btn" onClick={() => (embedded ? onCancel?.() : navigate(-1))}><ArrowLeft size={19} /></button>
        <div className="bc-title"><span>{embedded ? "TEMPLATE DESIGNER" : "BUSINESS CARD EDITOR"}</span><strong>{product?.name || "Custom Business Card"}</strong></div>
        <div className="bc-history-actions">
          {!embedded && (
            <span className={`draft-status ds-${saveStatus}`}>
              {saveStatus === "saving" && "Saving…"}
              {saveStatus === "saved" && "Saved"}
              {saveStatus === "error" && "Save failed — retrying"}
            </span>
          )}
          <button type="button" onClick={undo} disabled={!history.length}><Undo2 size={17} /> Undo</button>
          <button type="button" onClick={redo} disabled={!future.length}><Redo2 size={17} /> Redo</button>
          <button type="button" onClick={() => setPreview((v) => { setEditingId(null); return !v; })}><Eye size={17} /> Preview</button>
          {embedded ? (
            <button
              type="button"
              className="bc-cart-btn"
              onClick={() =>
                onSaveTemplate?.({
                  frontDesign: design.front,
                  backDesign: design.back,
                  template,
                })
              }
            >
              <Save size={17} /> Save Template
            </button>
          ) : (
            <>
              <button type="button" onClick={saveDesign}><Save size={17} /> Save Design</button>
              <button type="button" className="bc-cart-btn" onClick={addToCart}><ShoppingCart size={17} /> Save &amp; Continue</button>
            </>
          )}
        </div>
      </header>

      {/* ── workspace ── */}
      <div className="bc-workspace">
        {/* ── LEFT SIDEBAR: tools ── */}
        <aside className="bc-tools">
          <h3>Design Tools</h3>

          {/* text presets */}
          <section>
            <h4><Type size={15} /> Add Text</h4>
            <div className="bc-preset-list">
              {textPresets.map(({ label, text, x, y, ...style }) => (
                <button type="button" key={label} onClick={() => addElement(makeText(text, x, y, { ...style, preset: label, label }))}>{label}</button>
              ))}
            </div>
          </section>

          {/* logo / image */}
          <section>
            <h4><ImagePlus size={15} /> Logo / Image</h4>
            <button type="button" className="bc-wide-btn" onClick={() => fileRef.current?.click()}><ImagePlus size={16} /> Upload image</button>
            <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp" hidden onChange={(e) => uploadImage(e)} />
          </section>

          {/* shapes */}
          <section>
            <h4><Shapes size={15} /> Shapes</h4>
            <div className="bc-tool-grid">
              <button type="button" onClick={() => addElement(makeShape("rectangle"))}><Shapes size={17} /> Rectangle</button>
              <button type="button" onClick={() => addElement(makeShape("circle", 50, 50, { width: 15 }))}><Circle size={17} /> Circle</button>
              <button type="button" onClick={() => addElement(makeShape("line", 50, 50, { width: 30, color: "#94a3b8" }))}>&#8213; Line</button>
            </div>
          </section>

          {/* business icons */}
          <section>
            <h4>Business Icons</h4>
            <div className="bc-icons-grid">
              {iconChoices.map((name) => { const Icon = iconMap[name]; return <button type="button" key={name} title={name} onClick={() => addElement(makeIcon(name))}><Icon size={18} /></button>; })}
            </div>
          </section>

          {/* templates with mini preview */}
          <section>
            <h4>Templates</h4>
            <div className="bc-template-grid">
              {Object.entries(tplMap).map(([name, tpl]) => (
                <button type="button" className={template === name ? "active" : ""} key={name} onClick={() => applyTemplate(name)}>
                  <TemplatePreview tpl={tpl} />
                  <span className="bc-tpl-label">{name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* layers */}
          <section>
            <h4 className="bc-layers-toggle" onClick={() => setShowLayers((v) => !v)}>
              <Layers size={15} /> Layers
              {showLayers ? <ChevronUp size={14} style={{ marginLeft: "auto" }} /> : <ChevronDown size={14} style={{ marginLeft: "auto" }} />}
            </h4>
            {showLayers && (
              <div className="bc-layers-list">
                {elements.length === 0 && <p className="bc-layers-empty">No elements</p>}
                {[...elements].reverse().map((el) => (
                  <div key={el.id} className={`bc-layer-item ${el.id === selectedId ? "active" : ""} ${el.visible === false ? "hidden-layer" : ""}`} onClick={() => selectLayerItem(el.id)}>
                    <span className="bc-layer-icon">{layerIcon(el)}</span>
                    <span className="bc-layer-name">{elementLabel(el)}</span>
                    <button type="button" className="bc-layer-vis" title={el.visible === false ? "Show" : "Hide"} onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id); }}>
                      {el.visible === false ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button type="button" className="bc-layer-move" title="Move up" onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); moveLayer("up"); }}><ChevronUp size={13} /></button>
                    <button type="button" className="bc-layer-move" title="Move down" onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); moveLayer("down"); }}><ChevronDown size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>

        {/* ── CENTER: canvas ── */}
        <section className="bc-stage">
          <div className="bc-side-tabs">
            <button type="button" className={side === "front" ? "active" : ""} onClick={() => { setSide("front"); setSelectedId(null); setEditingId(null); }}>Front Side</button>
            <button type="button" className={side === "back" ? "active" : ""} onClick={() => { setSide("back"); setSelectedId(null); setEditingId(null); }}>Back Side</button>
          </div>
          <div className="bc-card-shell">
            <div
              className={`bc-card-canvas ${preview ? "preview" : ""}`}
              style={{ background: current.gradient || current.background, backgroundImage: current.backgroundImage ? `url(${current.backgroundImage})` : current.gradient || "none" }}
              onClick={() => { setSelectedId(null); setEditingId(null); }}
            >
              {elements.map((element) => (
                <div
                  key={element.id}
                  className={`bc-canvas-element ${selectedId === element.id ? "selected" : ""} ${element.visible === false ? "bc-el-hidden" : ""}`}
                  onPointerDown={(e) => startDrag(e, element)}
                  onClick={(e) => { e.stopPropagation(); if (element.visible !== false) setSelectedId(element.id); }}
                  onDoubleClick={(e) => { e.stopPropagation(); startTextEdit(element); }}
                >
                  {renderElement(element)}
                </div>
              ))}
            </div>
          </div>
          <p className="bc-dimensions">Standard business card &middot; 3.5 &times; 2 inches &middot; Live preview</p>
        </section>

        {/* ── RIGHT SIDEBAR: properties ── */}
        <aside className="bc-properties">
          <h3>Properties</h3>

          {/* background section (always visible) */}
          <section>
            <h4>Background</h4>
            <label>Color<input type="color" value={current.background} onChange={(e) => updateSide({ background: e.target.value, gradient: "" })} /></label>
            <label>Gradient
              <select value={current.gradient} onChange={(e) => updateSide({ gradient: e.target.value })}>
                <option value="">None</option>
                <option value="linear-gradient(135deg, #0f172a, #334155)">Midnight</option>
                <option value="linear-gradient(135deg, #1e3a8a, #06b6d4)">Ocean</option>
                <option value="linear-gradient(135deg, #581c87, #ec4899)">Violet</option>
                <option value="linear-gradient(135deg, #fff7ed, #f59e0b)">Amber</option>
                <option value="linear-gradient(135deg, #090909, #26211a)">Luxury Dark</option>
                <option value="linear-gradient(120deg, #0f3d68 0 34%, #f8fafc 34%)">Corporate Split</option>
                <option value="linear-gradient(145deg, #ffffff 0 72%, #7c3aed 72%)">Modern Accent</option>
              </select>
            </label>
            <button type="button" className="bc-wide-btn" onClick={() => backgroundRef.current?.click()}>Background Image</button>
            {current.backgroundImage && <button type="button" className="bc-wide-btn bc-remove-bg" onClick={() => updateSide({ backgroundImage: "" })}>Remove Background Image</button>}
            <input ref={backgroundRef} type="file" accept=".png,.jpg,.jpeg,.webp" hidden onChange={(e) => uploadImage(e, true)} />
          </section>

          {/* selected element properties */}
          {selected ? (
            <section className="bc-selected-properties">
              <h4>Selected: {selected.type === "text" ? "Text" : selected.type === "image" ? "Image" : selected.type === "icon" ? "Icon" : "Shape"}</h4>

              {/* ── TEXT properties ── */}
              {selected.type === "text" && (
                <>
                  <label>Content<textarea value={selected.text} onChange={(e) => updateElement({ text: e.target.value }, false)} /></label>
                  <label>Font
                    <select value={selected.fontFamily} onChange={(e) => updateElement({ fontFamily: e.target.value })}>
                      {fonts.map((f) => <option key={f}>{f}</option>)}
                    </select>
                  </label>
                  <label>Font size
                    <input type="range" min="7" max="48" value={selected.fontSize} onChange={(e) => updateElement({ fontSize: Number(e.target.value) }, false)} />
                    <span>{selected.fontSize}px</span>
                  </label>
                  <div className="bc-format-row">
                    <button type="button" className={selected.fontWeight >= 700 ? "active" : ""} onClick={() => updateElement({ fontWeight: selected.fontWeight >= 700 ? 400 : 700 })}><Bold size={16} /></button>
                    <button type="button" className={selected.italic ? "active" : ""} onClick={() => updateElement({ italic: !selected.italic })}><Italic size={16} /></button>
                    <button type="button" className={selected.underline ? "active" : ""} onClick={() => updateElement({ underline: !selected.underline })}><Underline size={16} /></button>
                    <button type="button" className={selected.align === "left" ? "active" : ""} onClick={() => updateElement({ align: "left" })}><AlignLeft size={16} /></button>
                    <button type="button" className={selected.align === "center" ? "active" : ""} onClick={() => updateElement({ align: "center" })}><AlignCenter size={16} /></button>
                    <button type="button" className={selected.align === "right" ? "active" : ""} onClick={() => updateElement({ align: "right" })}><AlignRight size={16} /></button>
                  </div>
                  <label>Letter spacing<input type="range" min="-1" max="10" step="0.5" value={selected.letterSpacing} onChange={(e) => updateElement({ letterSpacing: Number(e.target.value) }, false)} /></label>
                  <label>Line height<input type="range" min="0.8" max="2.5" step="0.1" value={selected.lineHeight} onChange={(e) => updateElement({ lineHeight: Number(e.target.value) }, false)} /></label>
                </>
              )}

              {/* ── IMAGE properties ── */}
              {selected.type === "image" && (
                <>
                  <div className="bc-img-preview"><img src={selected.src} alt={selected.name || "Image"} /></div>
                  <button type="button" className="bc-wide-btn" onClick={() => replaceFileRef.current?.click()}><Replace size={15} /> Replace Image</button>
                  <input ref={replaceFileRef} type="file" accept=".png,.jpg,.jpeg,.webp" hidden onChange={replaceImage} />
                </>
              )}

              {/* ── ICON properties ── */}
              {selected.type === "icon" && (
                <label>Icon type
                  <select value={selected.icon} onChange={(e) => updateElement({ icon: e.target.value, label: e.target.value })}>
                    {iconChoices.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                </label>
              )}

              {/* ── SHAPE properties ── */}
              {selected.type === "shape" && (
                <label>Shape type
                  <select value={selected.shape} onChange={(e) => updateElement({ shape: e.target.value, label: e.target.value === "circle" ? "Circle" : e.target.value === "line" ? "Line" : "Rectangle" })}>
                    <option value="rectangle">Rectangle</option>
                    <option value="circle">Circle</option>
                    <option value="line">Line</option>
                  </select>
                </label>
              )}

              {/* ── common controls (all types) ── */}
              <label>Color<input type="color" value={selected.color || "#172033"} onChange={(e) => updateElement({ color: e.target.value }, false)} /></label>
              <label>Size / Width<input type="range" min="3" max="95" value={selected.width} onChange={(e) => updateElement({ width: Number(e.target.value) }, false)} /><span>{selected.width}%</span></label>
              <label>Rotation<input type="range" min="-180" max="180" value={selected.rotation || 0} onChange={(e) => updateElement({ rotation: Number(e.target.value) }, false)} /><span>{selected.rotation || 0}&deg;</span></label>
              <label>Opacity<input type="range" min="0.05" max="1" step="0.05" value={selected.opacity ?? 1} onChange={(e) => updateElement({ opacity: Number(e.target.value) }, false)} /><span>{Math.round((selected.opacity ?? 1) * 100)}%</span></label>

              <div className="bc-element-actions">
                <button type="button" onClick={duplicateSelected}><Copy size={15} /> Duplicate</button>
                <button type="button" onClick={() => moveLayer("front")}><BringToFront size={15} /> Front</button>
                <button type="button" onClick={() => moveLayer("back")}><SendToBack size={15} /> Back</button>
                <button type="button" className="danger" onClick={deleteSelected}><Trash2 size={15} /> Delete</button>
              </div>
            </section>
          ) : (
            <div className="bc-empty-properties">
              <Layers size={30} />
              <strong>Select an element</strong>
              <span>Click any element on the card to edit its properties.</span>
            </div>
          )}

          <div className="bc-bottom-actions">
            <button type="button" onClick={reset}><RotateCcw size={16} /> Reset</button>
            {embedded ? (
              <button
                type="button"
                className="primary"
                onClick={() =>
                  onSaveTemplate?.({
                    frontDesign: design.front,
                    backDesign: design.back,
                    template,
                  })
                }
              >
                <Save size={16} /> Save Template
              </button>
            ) : (
              <button type="button" className="primary" onClick={addToCart}><ShoppingCart size={16} /> Add to Cart</button>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
