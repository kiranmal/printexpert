import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Circle,
  Image as ImageIcon,
  Italic,
  Minus,
  Plus,
  Redo2,
  Square,
  Trash2,
  Type,
  Underline,
  Undo2,
} from "lucide-react";

import { MugSvg } from "../../pages/Customizer";

import "./MugDesigner.css";

/* ============================================================
   MUG TEMPLATE DESIGNER (admin)
   Element model matches customer Customizer.jsx:
   designs = { front: [els], back: [els] }
   el.x / el.y = % of print area, center-anchored.
   fontSize & line height are px in a 260px-tall reference
   print area — preview + editor scale them proportionally.
============================================================ */

const REF_PRINT_H = 260; // px reference print-area height
const MAX_TEXT = 500; // matches server sanitizer
const MAX_IMG_BYTES = 4 * 1000 * 1000; // ~4MB file → base64 < 6M char limit

const FONT_OPTIONS = [
  "Poppins",
  "Arial",
  "Montserrat",
  "Georgia",
  "Roboto",
];

const TEXT_COLORS = [
  "#111827",
  "#16324f",
  "#ffffff",
  "#e12432",
  "#2878df",
  "#075c51",
  "#c9a227",
  "#ea580c",
];

const uid = () =>
  `el-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

const clone = (v) => JSON.parse(JSON.stringify(v));

/* mug print zone on the mockup preview box
   (same numbers Customizer.jsx uses for mugs) */
const MUG_PRINT = {
  left: 40,
  top: 42,
  width: 18,
  height: 26,
};

/* ---------- element renderer (shared: flat editor + mug
   preview). scale = canvasH / REF_PRINT_H ---------- */
const renderElement = (
  el,
  scale,
  {
    selectedId,
    editingId,
    onPointerDown,
    onResizeDown,
    onDoubleClick,
    onDelete,
    interactive,
  } = {}
) => {
  const base = {
    position: "absolute",
    left: `${el.x}%`,
    top: `${el.y}%`,
    transform: `translate(-50%,-50%) rotate(${
      el.rotation || 0
    }deg)`,
    opacity: el.opacity ?? 1,
  };

  const selected = interactive && selectedId === el.id;
  const editing = editingId === el.id;

  const handles = selected && !editing && (
    <>
      <button
        type="button"
        className="md-el-delete"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(el.id);
        }}
      >
        ×
      </button>
      <button
        type="button"
        className="md-el-resize"
        onPointerDown={(e) => onResizeDown(e, el)}
      />
    </>
  );

  const cls = `md-el${selected ? " sel" : ""}`;

  if (el.type === "text")
    return (
      <div
        key={el.id}
        className={cls}
        style={{
          ...base,
          fontFamily: el.fontFamily || "Poppins",
          fontSize: `${Math.max(
            4,
            (el.fontSize || 12) * scale
          )}px`,
          fontWeight: el.bold ? 700 : 400,
          fontStyle: el.italic ? "italic" : "normal",
          textDecoration: el.underline
            ? "underline"
            : "none",
          color: el.color || "#111827",
          textAlign: el.align || "center",
          letterSpacing: `${
            (el.letterSpacing || 0) * scale
          }px`,
          whiteSpace: "pre-line",
          lineHeight: 1.25,
          cursor: interactive ? "grab" : "default",
        }}
        onPointerDown={
          interactive
            ? (e) => onPointerDown(e, el)
            : undefined
        }
        onDoubleClick={
          interactive
            ? (e) => {
                e.stopPropagation();
                onDoubleClick(el);
              }
            : undefined
        }
      >
        {el.text}
        {handles}
      </div>
    );

  if (el.type === "shape")
    return (
      <div
        key={el.id}
        className={cls}
        style={{
          ...base,
          width: `${el.width || 10}%`,
          height:
            el.shape === "line"
              ? `${Math.max(
                  1,
                  (el.height || 2) * scale
                )}px`
              : `${el.height || el.width || 10}%`,
          background: el.color || "#16324f",
          borderRadius:
            el.shape === "circle"
              ? "50%"
              : el.shape === "line"
              ? "2px"
              : "6px",
          cursor: interactive ? "grab" : "default",
        }}
        onPointerDown={
          interactive
            ? (e) => onPointerDown(e, el)
            : undefined
        }
      >
        {handles}
      </div>
    );

  if (el.type === "image" && el.src)
    return (
      <div
        key={el.id}
        className={cls}
        style={{
          ...base,
          width: `${el.width || 30}%`,
          cursor: interactive ? "grab" : "default",
        }}
        onPointerDown={
          interactive
            ? (e) => onPointerDown(e, el)
            : undefined
        }
      >
        <img src={el.src} alt="" draggable="false" />
        {handles}
      </div>
    );

  if (el.type === "qr")
    return (
      <div
        key={el.id}
        className={cls}
        style={{ ...base, width: `${el.width || 20}%` }}
      >
        {el.src ? (
          <img src={el.src} alt="QR" draggable="false" />
        ) : (
          <div className="md-qr" />
        )}
        {handles}
      </div>
    );

  return null;
};

/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function MugDesigner({
  initialDesign,
  productName = "Photo Mug",
  onSaveTemplate,
  onCancel,
}) {
  const [elements, setElements] = useState(() =>
    clone(
      Array.isArray(initialDesign?.front)
        ? initialDesign.front
        : []
    )
  );
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [notice, setNotice] = useState("");

  const historyRef = useRef([]);
  const futureRef = useRef([]);
  const editRef = useRef(null);

  const areaRef = useRef(null);
  const mugAreaRef = useRef(null);
  const fileRef = useRef(null);
  const qrFileRef = useRef(null);

  const [areaH, setAreaH] = useState(REF_PRINT_H);
  const [mugAreaH, setMugAreaH] = useState(REF_PRINT_H);

  useEffect(() => {
    const measure = () => {
      if (areaRef.current)
        setAreaH(areaRef.current.clientHeight || REF_PRINT_H);
      if (mugAreaRef.current)
        setMugAreaH(
          mugAreaRef.current.clientHeight || REF_PRINT_H
        );
    };
    measure();
    window.addEventListener("resize", measure);
    return () =>
      window.removeEventListener("resize", measure);
  }, [zoom]);

  const scale = areaH / REF_PRINT_H;

  /* ---------- history ---------- */
  const pushHistory = () => {
    historyRef.current = [
      ...historyRef.current.slice(-39),
      clone(elements),
    ];
    futureRef.current = [];
  };

  const undo = () => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    futureRef.current.push(clone(elements));
    setElements(prev);
    setSelectedId(null);
    setEditingId(null);
  };

  const redo = () => {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push(clone(elements));
    setElements(next);
    setSelectedId(null);
    setEditingId(null);
  };

  /* ---------- element helpers ---------- */
  const patchEl = (id, patch) =>
    setElements((els) =>
      els.map((e) =>
        e.id === id ? { ...e, ...patch } : e
      )
    );

  const selected = elements.find((e) => e.id === selectedId);

  const addElement = (el) => {
    pushHistory();
    setElements((els) => [...els, el]);
    setSelectedId(el.id);
  };

  const addText = (kind = "custom") =>
    addElement({
      id: uid(),
      type: "text",
      kind,
      label:
        kind === "person"
          ? "Name"
          : kind === "company"
          ? "Company"
          : "Text",
      text:
        kind === "person"
          ? "YOUR NAME"
          : kind === "company"
          ? "COMPANY NAME"
          : "YOUR TEXT",
      x: 50,
      y: 50,
      fontSize: 18,
      fontFamily: "Poppins",
      color: "#16324f",
      bold: kind !== "custom",
      italic: false,
      underline: false,
      align: "center",
      letterSpacing: 1,
      rotation: 0,
      hidden: false,
    });

  const addShape = (shape) =>
    addElement({
      id: uid(),
      type: "shape",
      shape,
      label:
        shape === "line"
          ? "Line"
          : shape === "circle"
          ? "Circle"
          : "Rectangle",
      x: 50,
      y: 50,
      width: shape === "line" ? 40 : 24,
      height: shape === "line" ? 2 : 24,
      color: "#16324f",
      opacity: 1,
      rotation: 0,
      hidden: false,
    });

  const deleteElement = (id) => {
    pushHistory();
    setElements((els) => els.filter((e) => e.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) setEditingId(null);
  };

  /* ---------- image upload ---------- */
  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setNotice("Only image files (PNG/JPG/SVG) allowed.");
      return;
    }
    if (file.size > MAX_IMG_BYTES) {
      setNotice("Image too large — keep under 4MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) =>
      addElement({
        id: uid(),
        type: "image",
        kind: "logo",
        label: file.name.slice(0, 80),
        src: ev.target.result,
        x: 50,
        y: 42,
        width: 42,
        rotation: 0,
        opacity: 1,
        hidden: false,
      });
    reader.readAsDataURL(file);
  };

  /* QR upload — real scannable QR image as element */
  const onPickQr = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setNotice("Only image files (PNG/JPG/SVG) allowed.");
      return;
    }
    if (file.size > MAX_IMG_BYTES) {
      setNotice("Image too large — keep under 4MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) =>
      addElement({
        id: uid(),
        type: "qr",
        label: "QR Code",
        src: ev.target.result,
        x: 50,
        y: 68,
        width: 26,
        rotation: 0,
        opacity: 1,
        hidden: false,
      });
    reader.readAsDataURL(file);
  };

  /* ---------- drag / resize ---------- */
  const startDrag = (e, el) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(el.id);
    if (editingId === el.id) return;
    const area = areaRef.current;
    if (!area) return;
    pushHistory();
    const rect = area.getBoundingClientRect();
    const sx = e.clientX;
    const sy = e.clientY;
    const ox = el.x;
    const oy = el.y;

    const move = (ev) => {
      const nx =
        ox + ((ev.clientX - sx) / rect.width) * 100;
      const ny =
        oy + ((ev.clientY - sy) / rect.height) * 100;
      patchEl(el.id, {
        x: Math.max(0, Math.min(100, nx)),
        y: Math.max(0, Math.min(100, ny)),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startResize = (e, el) => {
    e.preventDefault();
    e.stopPropagation();
    const area = areaRef.current;
    if (!area) return;
    pushHistory();
    const rect = area.getBoundingClientRect();
    const sx = e.clientX;
    const oFont = el.fontSize || 14;
    const oW = el.width || 10;

    const move = (ev) => {
      const dx = ((ev.clientX - sx) / rect.width) * 100;
      if (el.type === "text") {
        patchEl(el.id, {
          fontSize: Math.max(
            4,
            Math.min(200, oFont + dx * 0.8)
          ),
        });
      } else {
        patchEl(el.id, {
          width: Math.max(4, Math.min(150, oW + dx)),
        });
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /* ---------- direct text editing ---------- */
  const beginEdit = (el) => {
    if (el.type !== "text") return;
    pushHistory();
    setSelectedId(el.id);
    setEditingId(el.id);
  };

  /* keep focus inside the inline editor */
  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  /* ---------- save ---------- */
  const handleSave = () =>
    onSaveTemplate({
      front: elements,
      back: Array.isArray(initialDesign?.back)
        ? initialDesign.back
        : [],
    });

  /* ---------- out-of-area warning ---------- */
  const outside = elements.some(
    (e) => e.x < 3 || e.x > 97 || e.y < 3 || e.y > 97
  );

  const editing = elements.find((e) => e.id === editingId);

  return (
    <div className="mug-designer">
      {/* TOOLBAR */}
      <div className="md-toolbar">
        <button
          type="button"
          onClick={() => addText("custom")}
        >
          <Type size={14} /> Text
        </button>
        <button
          type="button"
          onClick={() => addText("person")}
        >
          <Type size={14} /> Name
        </button>
        <button
          type="button"
          onClick={() => addText("company")}
        >
          <Type size={14} /> Company
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
        >
          <ImageIcon size={14} /> Upload Image
        </button>
        <button
          type="button"
          onClick={() => qrFileRef.current?.click()}
          title="Upload your own QR code image"
        >
          <ImageIcon size={14} /> Upload QR
        </button>
        <button
          type="button"
          onClick={() => addShape("rect")}
        >
          <Square size={14} />
        </button>
        <button
          type="button"
          onClick={() => addShape("circle")}
        >
          <Circle size={14} />
        </button>
        <button
          type="button"
          onClick={() => addShape("line")}
          title="Add line"
        >
          <Minus size={14} />
        </button>
        <span className="md-sep" />
        <button
          type="button"
          onClick={undo}
          disabled={!historyRef.current.length}
          title="Undo"
        >
          <Undo2 size={14} />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!futureRef.current.length}
          title="Redo"
        >
          <Redo2 size={14} />
        </button>
        <span className="md-sep" />
        <button
          type="button"
          onClick={() =>
            setZoom((z) => Math.max(0.6, z - 0.15))
          }
          title="Zoom out"
        >
          −
        </button>
        <span className="md-zoom">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={() =>
            setZoom((z) => Math.min(2, z + 0.15))
          }
          title="Zoom in"
        >
          <Plus size={13} />
        </button>
        <span className="md-spacer" />
        <button
          type="button"
          className="md-btn-ghost"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="md-btn-primary"
          onClick={handleSave}
        >
          Save Design
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onPickImage}
      />
      <input
        ref={qrFileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onPickQr}
      />

      {notice && (
        <div
          className="md-notice"
          onClick={() => setNotice("")}
        >
          {notice}
        </div>
      )}
      {outside && (
        <div className="md-notice warn">
          Some elements touch the print-area edge — they may
          be clipped on the mug.
        </div>
      )}

      <div className="md-body">
        {/* FLAT PRINT-AREA EDITOR */}
        <div className="md-pane">
          <span className="md-pane-title">
            Print Area — {productName}
          </span>
          <div
            className="md-canvas-wrap"
            style={{ height: `${410 * zoom}px` }}
          >
            <div
              ref={areaRef}
              className="md-canvas"
              style={{
                width: `${340 * zoom}px`,
                height: `${410 * zoom}px`,
              }}
              onPointerDown={() => {
                setSelectedId(null);
                setEditingId(null);
              }}
            >
              {elements
                .filter((e) => !e.hidden)
                .map((el) =>
                  renderElement(el, scale, {
                    selectedId,
                    editingId,
                    interactive: true,
                    onPointerDown: startDrag,
                    onResizeDown: startResize,
                    onDoubleClick: beginEdit,
                    onDelete: deleteElement,
                  })
                )}

              {/* inline text editor */}
              {editing && (
                <textarea
                  ref={editRef}
                  className="md-text-edit"
                  style={{
                    left: `${editing.x}%`,
                    top: `${editing.y}%`,
                    fontFamily: editing.fontFamily,
                    fontSize: `${Math.max(
                      4,
                      (editing.fontSize || 12) * scale
                    )}px`,
                    fontWeight: editing.bold ? 700 : 400,
                    fontStyle: editing.italic
                      ? "italic"
                      : "normal",
                    textAlign: editing.align || "center",
                    color: editing.color,
                  }}
                  value={editing.text}
                  maxLength={MAX_TEXT}
                  onChange={(e) =>
                    patchEl(editing.id, {
                      text: e.target.value,
                    })
                  }
                  onBlur={() => setEditingId(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape")
                      setEditingId(null);
                    e.stopPropagation();
                  }}
                />
              )}
            </div>
          </div>
          <span className="md-hint">
            Drag to move • double-click text to edit • corner
            handle to resize
          </span>
        </div>

        {/* MUG PREVIEW */}
        <div className="md-pane md-pane-mug">
          <span className="md-pane-title">Mug Preview</span>
          <div className="md-mug-box">
            <MugSvg color="#ffffff" />
            <div
              ref={mugAreaRef}
              className="md-mug-print"
              style={{
                left: `${MUG_PRINT.left}%`,
                top: `${MUG_PRINT.top}%`,
                width: `${MUG_PRINT.width}%`,
                height: `${MUG_PRINT.height}%`,
              }}
            >
              {elements
                .filter((e) => !e.hidden)
                .map((el) =>
                  renderElement(el, mugAreaH / REF_PRINT_H)
                )}
            </div>
          </div>
          <span className="md-hint">
            White ceramic mug — print view
          </span>
        </div>

        {/* PROPERTIES */}
        <div className="md-props">
          {!selected ? (
            <p className="md-props-empty">
              Select an element to edit its properties.
            </p>
          ) : (
            <>
              <strong className="md-props-title">
                {selected.label || selected.type}
              </strong>

              {selected.type === "text" && (
                <>
                  <label>
                    Text
                    <textarea
                      rows={3}
                      maxLength={MAX_TEXT}
                      value={selected.text}
                      onFocus={pushHistory}
                      onChange={(e) =>
                        patchEl(selected.id, {
                          text: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Font
                    <select
                      value={selected.fontFamily}
                      onChange={(e) => {
                        pushHistory();
                        patchEl(selected.id, {
                          fontFamily: e.target.value,
                        });
                      }}
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Size — {Math.round(selected.fontSize)}px
                    <input
                      type="range"
                      min="4"
                      max="120"
                      value={selected.fontSize}
                      onChange={(e) =>
                        patchEl(selected.id, {
                          fontSize: Number(e.target.value),
                        })
                      }
                      onPointerDown={pushHistory}
                    />
                  </label>
                  <label>
                    Spacing — {selected.letterSpacing || 0}
                    <input
                      type="range"
                      min="-2"
                      max="20"
                      step="0.5"
                      value={selected.letterSpacing || 0}
                      onChange={(e) =>
                        patchEl(selected.id, {
                          letterSpacing: Number(
                            e.target.value
                          ),
                        })
                      }
                      onPointerDown={pushHistory}
                    />
                  </label>
                  <div className="md-row">
                    <button
                      type="button"
                      className={selected.bold ? "on" : ""}
                      onClick={() => {
                        pushHistory();
                        patchEl(selected.id, {
                          bold: !selected.bold,
                        });
                      }}
                    >
                      <Bold size={14} />
                    </button>
                    <button
                      type="button"
                      className={selected.italic ? "on" : ""}
                      onClick={() => {
                        pushHistory();
                        patchEl(selected.id, {
                          italic: !selected.italic,
                        });
                      }}
                    >
                      <Italic size={14} />
                    </button>
                    <button
                      type="button"
                      className={
                        selected.underline ? "on" : ""
                      }
                      onClick={() => {
                        pushHistory();
                        patchEl(selected.id, {
                          underline: !selected.underline,
                        });
                      }}
                    >
                      <Underline size={14} />
                    </button>
                    <span className="md-sep" />
                    {[
                      ["left", AlignLeft],
                      ["center", AlignCenter],
                      ["right", AlignRight],
                    ].map(([a, Icon]) => (
                      <button
                        key={a}
                        type="button"
                        className={
                          (selected.align || "center") === a
                            ? "on"
                            : ""
                        }
                        onClick={() => {
                          pushHistory();
                          patchEl(selected.id, { align: a });
                        }}
                      >
                        <Icon size={14} />
                      </button>
                    ))}
                  </div>
                  <label>
                    Color
                    <input
                      type="color"
                      value={
                        /^#/.test(selected.color || "")
                          ? selected.color
                          : "#16324f"
                      }
                      onChange={(e) =>
                        patchEl(selected.id, {
                          color: e.target.value,
                        })
                      }
                    />
                  </label>
                  <div className="md-swatches">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        style={{ background: c }}
                        className={
                          selected.color === c ? "on" : ""
                        }
                        onClick={() => {
                          pushHistory();
                          patchEl(selected.id, {
                            color: c,
                          });
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              {selected.type === "shape" && (
                <>
                  <label>
                    Width — {Math.round(selected.width)}%
                    <input
                      type="range"
                      min="2"
                      max="100"
                      value={selected.width}
                      onChange={(e) =>
                        patchEl(selected.id, {
                          width: Number(e.target.value),
                        })
                      }
                      onPointerDown={pushHistory}
                    />
                  </label>
                  {selected.shape !== "line" && (
                    <label>
                      Height — {Math.round(selected.height)}%
                      <input
                        type="range"
                        min="2"
                        max="100"
                        value={selected.height}
                        onChange={(e) =>
                          patchEl(selected.id, {
                            height: Number(e.target.value),
                          })
                        }
                        onPointerDown={pushHistory}
                      />
                    </label>
                  )}
                  <label>
                    Color
                    <input
                      type="color"
                      value={
                        /^#/.test(selected.color || "")
                          ? selected.color
                          : "#16324f"
                      }
                      onChange={(e) =>
                        patchEl(selected.id, {
                          color: e.target.value,
                        })
                      }
                    />
                  </label>
                </>
              )}

              {selected.type === "image" && (
                <label>
                  Width — {Math.round(selected.width)}%
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={selected.width}
                    onChange={(e) =>
                      patchEl(selected.id, {
                        width: Number(e.target.value),
                      })
                    }
                    onPointerDown={pushHistory}
                  />
                </label>
              )}

              <label>
                Rotation — {Math.round(selected.rotation || 0)}°
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={selected.rotation || 0}
                  onChange={(e) =>
                    patchEl(selected.id, {
                      rotation: Number(e.target.value),
                    })
                  }
                  onPointerDown={pushHistory}
                />
              </label>
              <label>
                Opacity —{" "}
                {Math.round((selected.opacity ?? 1) * 100)}%
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={(selected.opacity ?? 1) * 100}
                  onChange={(e) =>
                    patchEl(selected.id, {
                      opacity: Number(e.target.value) / 100,
                    })
                  }
                  onPointerDown={pushHistory}
                />
              </label>

              <button
                type="button"
                className="md-btn-danger"
                onClick={() => deleteElement(selected.id)}
              >
                <Trash2 size={13} /> Delete element
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
