import { useState } from "react";
import {
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  createAttribute,
  createAttributeValue,
  deleteAttribute,
  deleteAttributeValue,
  updateAttribute,
  updateAttributeValue,
} from "../../services/categoryApi";

import "./AttributeManager.css";

/* ============================================================
   ATTRIBUTE MANAGER — CRUD UI for dynamic product attributes.
   Reuses the existing taxonomy API; DB is source of truth.
   Selections (which values the product offers) stay in the
   parent's state — this only manages definitions + values.
============================================================ */

const ATTR_TYPES = [
  "select",
  "multi-select",
  "text",
  "number",
  "boolean",
];

const HAS_VALUES = (type) =>
  type === "select" || type === "multi-select";

export default function AttributeManager({
  attributes = [],
  selected = {},
  texts = {},
  onToggleValue,
  onSelectValue,
  onTextChange,
  onRefresh,
}) {
  const [attrModal, setAttrModal] = useState(null);
  const [valueModal, setValueModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [valueSearch, setValueSearch] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  /* ---------- attribute CRUD ---------- */

  const saveAttribute = async () => {
    const name = (attrModal.name || "").trim();
    if (!name) {
      setError("Attribute name required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = {
        name,
        type: attrModal.type,
        status: attrModal.status,
      };
      if (attrModal.mode === "edit") {
        await updateAttribute(attrModal.attr.id, payload);
      } else {
        await createAttribute(payload);
      }
      setAttrModal(null);
      await onRefresh?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const requestDeleteAttribute = (attr) => {
    setConfirm({
      title: `Delete "${attr.name}"?`,
      message:
        "If this attribute is used by products it will be deactivated instead of deleted, so existing product data stays safe.",
      actionLabel: "Delete / Deactivate",
      onConfirm: async () => {
        await deleteAttribute(attr.id);
        await onRefresh?.();
      },
    });
  };

  /* ---------- value CRUD ---------- */

  const saveValue = async () => {
    const value = (valueModal.value || "").trim();
    if (!value) {
      setError("Value required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (valueModal.mode === "edit") {
        await updateAttributeValue(valueModal.valueId, {
          value,
          status: valueModal.status,
        });
      } else {
        await createAttributeValue(valueModal.attrId, value);
      }
      setValueModal(null);
      await onRefresh?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const requestDeleteValue = (attr, val) => {
    setConfirm({
      title: `Delete "${val.value}"?`,
      message:
        "If products already use this value, the assignment is removed but product data is preserved otherwise.",
      actionLabel: "Delete",
      onConfirm: async () => {
        await deleteAttributeValue(val.id);
        await onRefresh?.();
      },
    });
  };

  const runConfirm = async () => {
    setBusy(true);
    setError("");
    try {
      await confirm.onConfirm();
      setConfirm(null);
    } catch (e) {
      setError(e.message);
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  /* ---------- render ---------- */

  return (
    <div className="am-root">
      <div className="am-toolbar">
        <span className="am-hint">
          Manage attribute definitions — selections below
          assign values to this product.
        </span>
        <button
          type="button"
          className="am-add"
          onClick={() => {
            setError("");
            setAttrModal({
              mode: "add",
              name: "",
              type: "multi-select",
              status: "Active",
            });
          }}
        >
          <Plus size={13} /> Add Attribute
        </button>
      </div>

      {error && !attrModal && !valueModal && (
        <p className="am-error">{error}</p>
      )}

      {attributes.map((attr) => {
        const values = (attr.values || []);
        const term = (valueSearch[attr.id] || "").toLowerCase();
        const visible = term
          ? values.filter((v) =>
              v.value.toLowerCase().includes(term)
            )
          : values;

        return (
          <div className="am-attr" key={attr.id}>
            <div className="am-attr-head">
              <span className="am-attr-name">
                {attr.name}
                <em className="am-type">{attr.type}</em>
              </span>
              <span className="am-attr-actions">
                <button
                  type="button"
                  className="am-ico"
                  title="Edit attribute"
                  onClick={() => {
                    setError("");
                    setAttrModal({
                      mode: "edit",
                      attr,
                      name: attr.name,
                      type: attr.type,
                      status: attr.status || "Active",
                    });
                  }}
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  className="am-ico danger"
                  title="Delete attribute"
                  onClick={() => requestDeleteAttribute(attr)}
                >
                  <Trash2 size={13} />
                </button>
              </span>
            </div>

            {/* value management — select / multi-select only */}
            {HAS_VALUES(attr.type) && (
              <>
                <div className="am-value-tools">
                  <button
                    type="button"
                    className="am-add-value"
                    onClick={() => {
                      setError("");
                      setValueModal({
                        mode: "add",
                        attrId: attr.id,
                        attrName: attr.name,
                        value: "",
                        status: "Active",
                      });
                    }}
                  >
                    <Plus size={12} /> Add Value
                  </button>

                  {values.length > 10 && (
                    <span className="am-search">
                      <Search size={12} />
                      <input
                        type="text"
                        placeholder="Search values..."
                        value={valueSearch[attr.id] || ""}
                        onChange={(e) =>
                          setValueSearch((p) => ({
                            ...p,
                            [attr.id]: e.target.value,
                          }))
                        }
                      />
                    </span>
                  )}
                </div>

                <div className="am-pills">
                  {visible.map((val) => {
                    const isSel = (
                      selected[attr.id] || []
                    ).includes(val.id);
                    const off = val.status === "Inactive";

                    return (
                      <span
                        key={val.id}
                        className={`am-pill ${
                          isSel ? "on" : ""
                        } ${off ? "off" : ""}`}
                      >
                        <label className="am-pill-label">
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() =>
                              attr.type === "select"
                                ? onSelectValue?.(
                                    attr.id,
                                    isSel ? null : val.id
                                  )
                                : onToggleValue?.(
                                    attr.id,
                                    val.id
                                  )
                            }
                          />
                          {val.value}
                        </label>
                        <span className="am-pill-actions">
                          <button
                            type="button"
                            title="Edit value"
                            onClick={() => {
                              setError("");
                              setValueModal({
                                mode: "edit",
                                attrId: attr.id,
                                attrName: attr.name,
                                valueId: val.id,
                                value: val.value,
                                status: val.status || "Active",
                              });
                            }}
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            type="button"
                            title="Delete value"
                            onClick={() =>
                              requestDeleteValue(attr, val)
                            }
                          >
                            <Trash2 size={11} />
                          </button>
                        </span>
                      </span>
                    );
                  })}
                  {visible.length === 0 && (
                    <span className="am-none">
                      {term
                        ? "No matching values"
                        : "No values yet"}
                    </span>
                  )}
                </div>
              </>
            )}

            {/* text / number / boolean — no value list */}
            {(attr.type === "text" || attr.type === "number") && (
              <input
                className="am-text-input"
                type={attr.type === "number" ? "number" : "text"}
                value={texts[attr.id] || ""}
                onChange={(e) =>
                  onTextChange?.(attr.id, e.target.value)
                }
              />
            )}

            {attr.type === "boolean" && (
              <label className="am-bool">
                <input
                  type="checkbox"
                  checked={texts[attr.id] === "true"}
                  onChange={(e) =>
                    onTextChange?.(
                      attr.id,
                      e.target.checked ? "true" : ""
                    )
                  }
                />
                Yes
              </label>
            )}
          </div>
        );
      })}

      {/* ── attribute modal ── */}
      {attrModal && (
        <div
          className="am-overlay"
          onClick={() => setAttrModal(null)}
        >
          <div
            className="am-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="am-modal-head">
              <strong>
                {attrModal.mode === "edit"
                  ? "Edit Attribute"
                  : "Add Attribute"}
              </strong>
              <button
                type="button"
                className="am-ico"
                onClick={() => setAttrModal(null)}
              >
                <X size={15} />
              </button>
            </div>
            <div className="am-modal-body">
              <label>Attribute Name</label>
              <input
                type="text"
                value={attrModal.name}
                autoFocus
                onChange={(e) =>
                  setAttrModal((m) => ({
                    ...m,
                    name: e.target.value,
                  }))
                }
              />
              <label>Type</label>
              <select
                value={attrModal.type}
                onChange={(e) =>
                  setAttrModal((m) => ({
                    ...m,
                    type: e.target.value,
                  }))
                }
              >
                {ATTR_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <label>Status</label>
              <select
                value={attrModal.status}
                onChange={(e) =>
                  setAttrModal((m) => ({
                    ...m,
                    status: e.target.value,
                  }))
                }
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              {error && <p className="am-error">{error}</p>}
            </div>
            <div className="am-modal-foot">
              <button
                type="button"
                onClick={() => setAttrModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={saveAttribute}
              >
                {attrModal.mode === "edit"
                  ? "Save Changes"
                  : "Save Attribute"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── value modal ── */}
      {valueModal && (
        <div
          className="am-overlay"
          onClick={() => setValueModal(null)}
        >
          <div
            className="am-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="am-modal-head">
              <strong>
                {valueModal.mode === "edit"
                  ? "Edit Value"
                  : "Add Value"}{" "}
                — {valueModal.attrName}
              </strong>
              <button
                type="button"
                className="am-ico"
                onClick={() => setValueModal(null)}
              >
                <X size={15} />
              </button>
            </div>
            <div className="am-modal-body">
              <label>Value</label>
              <input
                type="text"
                value={valueModal.value}
                autoFocus
                onChange={(e) =>
                  setValueModal((m) => ({
                    ...m,
                    value: e.target.value,
                  }))
                }
              />
              <label>Status</label>
              <select
                value={valueModal.status}
                onChange={(e) =>
                  setValueModal((m) => ({
                    ...m,
                    status: e.target.value,
                  }))
                }
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              {error && <p className="am-error">{error}</p>}
            </div>
            <div className="am-modal-foot">
              <button
                type="button"
                onClick={() => setValueModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={saveValue}
              >
                {valueModal.mode === "edit"
                  ? "Save Changes"
                  : "Add Value"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── delete/deactivate confirm ── */}
      {confirm && (
        <div
          className="am-overlay"
          onClick={() => setConfirm(null)}
        >
          <div
            className="am-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="am-modal-head">
              <strong>{confirm.title}</strong>
            </div>
            <div className="am-modal-body">
              <p className="am-confirm-text">
                {confirm.message}
              </p>
            </div>
            <div className="am-modal-foot">
              <button
                type="button"
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary danger-btn"
                disabled={busy}
                onClick={runConfirm}
              >
                {confirm.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
