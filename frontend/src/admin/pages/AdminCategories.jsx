import { useState, useEffect } from "react";
import { API_URL } from "../../services/apiConfig";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  fetchTags,
  createTag,
  updateTag,
  deleteTag,
  fetchAttributes,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  createAttributeValue,
  updateAttributeValue,
  deleteAttributeValue,
} from "../../services/categoryApi";
import {
  Tags,
  ChevronRight,
  Package,
  FolderOpen,
  Eye,
  Plus,
  Pencil,
  Trash2,
  X,
  Tag,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/* =====================================================
   CATEGORY COLORS
===================================================== */

const categoryColors = [
  "#f14096",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#f35fa7",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#f163a8",
];

export default function AdminCategories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [productCounts, setProductCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState(null);

  /* Add/Edit form state */
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formName, setFormName] = useState("");
  const [formItems, setFormItems] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  /* Subcategory + Tag state */
  const [subInputs, setSubInputs] = useState({});
  const [busySubId, setBusySubId] = useState(null);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [busyTagId, setBusyTagId] = useState(null);

  /* Attribute state */
  const [attributes, setAttributes] = useState([]);
  const [attrName, setAttrName] = useState("");
  const [attrType, setAttrType] = useState("select");
  const [valueInputs, setValueInputs] = useState({});
  const [busyAttrId, setBusyAttrId] = useState(null);
  const [busyValueId, setBusyValueId] = useState(null);

  /* =====================================================
     FETCH CATEGORIES + PRODUCT COUNTS
  ===================================================== */

  const loadCategories = async () => {
    const list = await fetchCategories();
    setCategories(list);
    return list;
  };

  useEffect(() => {
    const load = async () => {
      await loadCategories();

      try {
        const res = await fetch(
          `${API_URL}/products`
        );
        const data = await res.json();

        if (data.success && Array.isArray(data.products)) {
          const counts = {};
          data.products.forEach((p) => {
            const cat = p.category || "Uncategorized";
            counts[cat] = (counts[cat] || 0) + 1;
          });
          setProductCounts(counts);
        }
      } catch {
        // fallback — no counts
      } finally {
        setLoading(false);
      }

      loadTags();
      loadAttributes();
    };

    load();
  }, []);

  const loadTags = async () => {
    try {
      setTags(await fetchTags());
    } catch {
      // tags optional
    }
  };

  const loadAttributes = async () => {
    try {
      setAttributes(await fetchAttributes());
    } catch {
      // attributes optional
    }
  };

  /* =====================================================
     ATTRIBUTE ACTIONS
  ===================================================== */

  const handleAddAttribute = async (e) => {
    e.preventDefault();

    const name = attrName.trim();
    if (name.length < 2) {
      alert("Attribute name must be at least 2 characters.");
      return;
    }

    setBusyAttrId("new");

    try {
      await createAttribute({ name, type: attrType });
      setAttrName("");
      await loadAttributes();
    } catch (error) {
      alert(error.message || "Unable to add attribute.");
    } finally {
      setBusyAttrId(null);
    }
  };

  const handleToggleAttribute = async (attr) => {
    setBusyAttrId(attr.id);

    try {
      await updateAttribute(attr.id, {
        status: attr.status === "Active" ? "Inactive" : "Active",
      });
      await loadAttributes();
    } catch (error) {
      alert(error.message || "Unable to update attribute.");
    } finally {
      setBusyAttrId(null);
    }
  };

  const handleDeleteAttribute = async (attr) => {
    if (
      !window.confirm(
        `Delete attribute "${attr.name}"? If used by products it will be deactivated instead.`
      )
    ) {
      return;
    }

    setBusyAttrId(attr.id);

    try {
      const result = await deleteAttribute(attr.id);
      if (result?.message) alert(result.message);
      await loadAttributes();
    } catch (error) {
      alert(error.message || "Unable to delete attribute.");
    } finally {
      setBusyAttrId(null);
    }
  };

  const handleAddValue = async (attrId) => {
    const value = (valueInputs[attrId] || "").trim();
    if (!value) return;

    setBusyValueId(`add-${attrId}`);

    try {
      await createAttributeValue(attrId, value);
      setValueInputs((prev) => ({ ...prev, [attrId]: "" }));
      await loadAttributes();
    } catch (error) {
      alert(error.message || "Unable to add value.");
    } finally {
      setBusyValueId(null);
    }
  };

  const handleToggleValue = async (val) => {
    setBusyValueId(val.id);

    try {
      await updateAttributeValue(val.id, {
        status: val.status === "Active" ? "Inactive" : "Active",
      });
      await loadAttributes();
    } catch (error) {
      alert(error.message || "Unable to update value.");
    } finally {
      setBusyValueId(null);
    }
  };

  const handleDeleteValue = async (val) => {
    if (!window.confirm(`Delete value "${val.value}"?`)) return;

    setBusyValueId(val.id);

    try {
      await deleteAttributeValue(val.id);
      await loadAttributes();
    } catch (error) {
      alert(error.message || "Unable to delete value.");
    } finally {
      setBusyValueId(null);
    }
  };

  /* =====================================================
     SUBCATEGORY ACTIONS
  ===================================================== */

  const handleAddSubcategory = async (categoryId) => {
    const name = (subInputs[categoryId] || "").trim();

    if (name.length < 2) {
      alert("Subcategory name must be at least 2 characters.");
      return;
    }

    setBusySubId(`add-${categoryId}`);

    try {
      await createSubcategory(categoryId, name);
      setSubInputs((prev) => ({ ...prev, [categoryId]: "" }));
      await loadCategories();
    } catch (error) {
      alert(error.message || "Unable to add subcategory.");
    } finally {
      setBusySubId(null);
    }
  };

  const handleToggleSubcategory = async (sub) => {
    setBusySubId(sub.id);

    try {
      await updateSubcategory(sub.id, {
        status: sub.status === "Active" ? "Inactive" : "Active",
      });
      await loadCategories();
    } catch (error) {
      alert(error.message || "Unable to update subcategory.");
    } finally {
      setBusySubId(null);
    }
  };

  const handleDeleteSubcategory = async (sub) => {
    if (
      !window.confirm(
        `Delete subcategory "${sub.name}"? If products use it, it will be deactivated instead.`
      )
    ) {
      return;
    }

    setBusySubId(sub.id);

    try {
      const result = await deleteSubcategory(sub.id);
      if (result?.message) alert(result.message);
      await loadCategories();
    } catch (error) {
      alert(error.message || "Unable to delete subcategory.");
    } finally {
      setBusySubId(null);
    }
  };

  /* =====================================================
     TAG ACTIONS
  ===================================================== */

  const handleAddTag = async (e) => {
    e.preventDefault();

    const name = tagInput.trim();
    if (name.length < 2) {
      alert("Tag name must be at least 2 characters.");
      return;
    }

    setBusyTagId("new");

    try {
      await createTag(name);
      setTagInput("");
      await loadTags();
    } catch (error) {
      alert(error.message || "Unable to add tag.");
    } finally {
      setBusyTagId(null);
    }
  };

  const handleToggleTag = async (tag) => {
    setBusyTagId(tag.id);

    try {
      await updateTag(tag.id, {
        status: tag.status === "Active" ? "Inactive" : "Active",
      });
      await loadTags();
    } catch (error) {
      alert(error.message || "Unable to update tag.");
    } finally {
      setBusyTagId(null);
    }
  };

  const handleDeleteTag = async (tag) => {
    if (
      !window.confirm(
        `Delete tag "${tag.name}"? It will be removed from ${tag.productCount || 0} product(s).`
      )
    ) {
      return;
    }

    setBusyTagId(tag.id);

    try {
      await deleteTag(tag.id);
      await loadTags();
    } catch (error) {
      alert(error.message || "Unable to delete tag.");
    } finally {
      setBusyTagId(null);
    }
  };

  /* =====================================================
     FORM OPEN/CLOSE
  ===================================================== */

  const openAddForm = () => {
    setEditingCategory(null);
    setFormName("");
    setFormItems("");
    setShowForm(true);
  };

  const openEditForm = (category) => {
    setEditingCategory(category);
    setFormName(category.name);
    setFormItems((category.items || []).join(", "));
    setShowForm(true);
    setExpandedCategory(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormName("");
    setFormItems("");
  };

  /* =====================================================
     SAVE CATEGORY (ADD + EDIT)
  ===================================================== */

  const handleSaveCategory = async (e) => {
    e.preventDefault();

    const name = formName.trim();
    if (name.length < 2) {
      alert("Category name must be at least 2 characters.");
      return;
    }

    const items = formItems
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    setSaving(true);

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, name, items);
      } else {
        await createCategory(name, items);
      }
      closeForm();
      await loadCategories();
    } catch (error) {
      alert(error.message || "Unable to save category.");
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     DELETE CATEGORY
  ===================================================== */

  const handleDeleteCategory = async (category) => {
    if (!category.id) {
      alert("This category cannot be deleted (default static data).");
      return;
    }

    const count = productCounts[category.name] || 0;
    const message =
      count > 0
        ? `Delete "${category.name}"? ${count} product(s) belong to this category — they will keep their category label.`
        : `Delete "${category.name}"?`;

    if (!window.confirm(message)) {
      return;
    }

    setDeletingId(category.id);

    try {
      await deleteCategory(category.id);
      await loadCategories();
    } catch (error) {
      alert(error.message || "Unable to delete category.");
    } finally {
      setDeletingId(null);
    }
  };

  /* =====================================================
     STATS
  ===================================================== */

  const totalCategories = categories.length;
  const totalSubcategories = categories.reduce(
    (sum, c) => sum + (c.items?.length || 0),
    0
  );
  const totalProducts = Object.values(productCounts).reduce(
    (s, n) => s + n,
    0
  );

  return (
    <div style={{ width: "100%" }}>

      {/* =====================================================
          PAGE HEADING
      ===================================================== */}

      <div className="page-heading">
        <div>
          <h2>Categories</h2>
          <p>Manage product categories and subcategories</p>
        </div>

        <button
          type="button"
          onClick={() => (showForm ? closeForm() : openAddForm())}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            border: "none",
            borderRadius: "10px",
            background: "#bd1265",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "Add Category"}
        </button>
      </div>

      {/* =====================================================
          ADD / EDIT CATEGORY FORM
      ===================================================== */}

      {showForm && (
        <form
          onSubmit={handleSaveCategory}
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "14px",
            padding: "22px 24px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#191a1f",
              marginBottom: "16px",
            }}
          >
            {editingCategory
              ? `Edit Category: ${editingCategory.name}`
              : "Add New Category"}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              gap: "16px",
              alignItems: "end",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Category Name *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Diaries & Journals"
                style={{
                  width: "100%",
                  height: "42px",
                  padding: "0 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Subcategories (comma separated)
              </label>
              <input
                type="text"
                value={formItems}
                onChange={(e) => setFormItems(e.target.value)}
                placeholder="e.g. Diaries, Journals, Planners"
                style={{
                  width: "100%",
                  height: "42px",
                  padding: "0 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                height: "42px",
                padding: "0 22px",
                border: "none",
                borderRadius: "8px",
                background: saving ? "#9ca3af" : "#10b981",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {editingCategory
                ? saving
                  ? "Saving..."
                  : "Save"
                : saving
                  ? "Adding..."
                  : "Add"}
            </button>
          </div>
        </form>
      )}

      {/* =====================================================
          STATS CARDS
      ===================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        {[
          {
            label: "Total Categories",
            value: totalCategories,
            icon: Tags,
            color: "#f14096",
            bg: "#fef0f7",
          },
          {
            label: "Subcategories",
            value: totalSubcategories,
            icon: FolderOpen,
            color: "#10b981",
            bg: "#ecfdf5",
          },
          {
            label: "Total Products",
            value: loading ? "..." : totalProducts,
            icon: Package,
            color: "#f59e0b",
            bg: "#fffbeb",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "20px 24px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: stat.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <stat.icon size={22} color={stat.color} />
            </div>
            <div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  marginBottom: "4px",
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontSize: "26px",
                  fontWeight: 700,
                  color: "#191a1f",
                }}
              >
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* =====================================================
          CATEGORIES GRID
      ===================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "20px",
        }}
      >
        {categories.map((category, index) => {
          const color = categoryColors[index % categoryColors.length];
          const count = productCounts[category.name] || 0;
          const isExpanded = expandedCategory === index;

          return (
            <div
              key={category.name}
              style={{
                background: "#fff",
                borderRadius: "14px",
                border: "1px solid #e5e7eb",
                overflow: "hidden",
                transition: "box-shadow 0.2s",
              }}
            >
              {/* Category Header */}
              <div
                style={{
                  padding: "20px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  borderBottom: isExpanded
                    ? "1px solid #f3f4f6"
                    : "none",
                }}
                onClick={() =>
                  setExpandedCategory(isExpanded ? null : index)
                }
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                  }}
                >
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "10px",
                      background: color + "15",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Tags size={20} color={color} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "#191a1f",
                      }}
                    >
                      {category.name}
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#6b7280",
                        marginTop: "2px",
                      }}
                    >
                      {category.items.length} subcategories
                      {count > 0 && (
                        <span
                          style={{
                            marginLeft: "8px",
                            color: color,
                            fontWeight: 600,
                          }}
                        >
                          {count} products
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  {category.id && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditForm(category);
                      }}
                      title="Edit category"
                      style={{
                        width: "32px",
                        height: "32px",
                        border: "none",
                        borderRadius: "8px",
                        background: "#fef0f7",
                        color: "#eb2585",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                  )}

                  {category.id && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(category);
                      }}
                      disabled={deletingId === category.id}
                      title="Delete category"
                      style={{
                        width: "32px",
                        height: "32px",
                        border: "none",
                        borderRadius: "8px",
                        background: "#fef2f2",
                        color: "#dc2626",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor:
                          deletingId === category.id
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          deletingId === category.id ? 0.5 : 1,
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}

                  <ChevronRight
                    size={20}
                    color="#9ca3af"
                    style={{
                      transform: isExpanded
                        ? "rotate(90deg)"
                        : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  />
                </div>
              </div>

              {/* Subcategories — relational DB rows */}
              {isExpanded && (
                <div style={{ padding: "8px 24px 20px" }}>
                  {(
                    category.subcategories ||
                    (category.items || []).map((n) => ({
                      name: n,
                      status: "Active",
                    }))
                  ).map((sub) => (
                    <div
                      key={sub.id || sub.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        marginBottom: "4px",
                        transition: "background 0.15s",
                        cursor: "pointer",
                        opacity:
                          sub.status === "Inactive" ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                      onClick={() =>
                        navigate(
                          `/category?type=${encodeURIComponent(sub.name)}`
                        )
                      }
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background:
                              sub.status === "Inactive"
                                ? "#9ca3af"
                                : color,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: "14px",
                            color: "#374151",
                          }}
                        >
                          {sub.name}
                        </span>
                        {sub.status === "Inactive" && (
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              color: "#dc2626",
                              textTransform: "uppercase",
                            }}
                          >
                            Inactive
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <Eye size={15} color="#9ca3af" />
                        {sub.id && (
                          <>
                            <button
                              type="button"
                              disabled={busySubId === sub.id}
                              title={
                                sub.status === "Active"
                                  ? "Deactivate"
                                  : "Activate"
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSubcategory(sub);
                              }}
                              style={{
                                border: "none",
                                borderRadius: "6px",
                                padding: "4px 8px",
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: "pointer",
                                background:
                                  sub.status === "Active"
                                    ? "#fef2f2"
                                    : "#ecfdf5",
                                color:
                                  sub.status === "Active"
                                    ? "#dc2626"
                                    : "#059669",
                              }}
                            >
                              {sub.status === "Active"
                                ? "Off"
                                : "On"}
                            </button>
                            <button
                              type="button"
                              disabled={busySubId === sub.id}
                              title="Delete subcategory"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubcategory(sub);
                              }}
                              style={{
                                border: "none",
                                borderRadius: "6px",
                                padding: "4px 6px",
                                cursor: "pointer",
                                background: "#fef2f2",
                                color: "#dc2626",
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add subcategory */}
                  {category.id && (
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginTop: "10px",
                      }}
                    >
                      <input
                        type="text"
                        value={subInputs[category.id] || ""}
                        onChange={(e) =>
                          setSubInputs((prev) => ({
                            ...prev,
                            [category.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSubcategory(category.id);
                          }
                        }}
                        placeholder="New subcategory name"
                        style={{
                          flex: 1,
                          height: "34px",
                          padding: "0 10px",
                          border: "1px solid #d1d5db",
                          borderRadius: "7px",
                          fontSize: "13px",
                          outline: "none",
                        }}
                      />
                      <button
                        type="button"
                        disabled={busySubId === `add-${category.id}`}
                        onClick={() =>
                          handleAddSubcategory(category.id)
                        }
                        style={{
                          height: "34px",
                          padding: "0 12px",
                          border: "none",
                          borderRadius: "7px",
                          background: "#bd1265",
                          color: "#fff",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* =====================================================
          TAGS MANAGEMENT
      ===================================================== */}

      <div
        style={{
          marginTop: "32px",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "14px",
          padding: "22px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Tag size={18} color="#bd1265" />
            <div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#191a1f",
                }}
              >
                Product Tags
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>
                Tags can be assigned to products from the
                product form
              </div>
            </div>
          </div>

          <form
            onSubmit={handleAddTag}
            style={{ display: "flex", gap: "8px" }}
          >
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="New tag (e.g. bestseller)"
              style={{
                height: "36px",
                padding: "0 12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "13px",
                outline: "none",
                width: "220px",
              }}
            />
            <button
              type="submit"
              disabled={busyTagId === "new"}
              style={{
                height: "36px",
                padding: "0 16px",
                border: "none",
                borderRadius: "8px",
                background: "#bd1265",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Plus size={14} /> Add Tag
            </button>
          </form>
        </div>

        {tags.length === 0 ? (
          <p
            style={{
              fontSize: "13px",
              color: "#9ca3af",
              margin: 0,
            }}
          >
            No tags yet.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            {tags.map((tag) => (
              <span
                key={tag.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 10px",
                  borderRadius: "999px",
                  fontSize: "13px",
                  fontWeight: 500,
                  border: "1px solid #e5e7eb",
                  background:
                    tag.status === "Active"
                      ? "#fef0f7"
                      : "#f3f4f6",
                  color:
                    tag.status === "Active"
                      ? "#d81d77"
                      : "#6b7280",
                  opacity:
                    tag.status === "Inactive" ? 0.6 : 1,
                }}
              >
                {tag.name}
                <small style={{ color: "#6b7280" }}>
                  {tag.productCount || 0}
                </small>
                <button
                  type="button"
                  disabled={busyTagId === tag.id}
                  title={
                    tag.status === "Active"
                      ? "Deactivate"
                      : "Activate"
                  }
                  onClick={() => handleToggleTag(tag)}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    color:
                      tag.status === "Active"
                        ? "#dc2626"
                        : "#059669",
                    padding: 0,
                  }}
                >
                  {tag.status === "Active" ? "Off" : "On"}
                </button>
                <button
                  type="button"
                  disabled={busyTagId === tag.id}
                  title="Delete tag"
                  onClick={() => handleDeleteTag(tag)}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "#dc2626",
                    display: "flex",
                    padding: 0,
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================
          DYNAMIC ATTRIBUTES MANAGEMENT
      ===================================================== */}

      <div
        style={{
          marginTop: "32px",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "14px",
          padding: "22px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <FolderOpen size={18} color="#bd1265" />
            <div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#191a1f",
                }}
              >
                Product Attributes
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>
                Size, Material, Capacity, Paper Type — shown on
                product form &amp; detail page
              </div>
            </div>
          </div>

          <form
            onSubmit={handleAddAttribute}
            style={{ display: "flex", gap: "8px" }}
          >
            <input
              type="text"
              value={attrName}
              onChange={(e) => setAttrName(e.target.value)}
              placeholder="New attribute (e.g. Weight)"
              style={{
                height: "36px",
                padding: "0 12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "13px",
                outline: "none",
                width: "200px",
              }}
            />
            <select
              value={attrType}
              onChange={(e) => setAttrType(e.target.value)}
              style={{
                height: "36px",
                padding: "0 8px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "13px",
                background: "#fff",
              }}
            >
              <option value="select">select</option>
              <option value="multi-select">multi-select</option>
              <option value="text">text</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
            </select>
            <button
              type="submit"
              disabled={busyAttrId === "new"}
              style={{
                height: "36px",
                padding: "0 16px",
                border: "none",
                borderRadius: "8px",
                background: "#bd1265",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Plus size={14} /> Add
            </button>
          </form>
        </div>

        {attributes.length === 0 ? (
          <p
            style={{
              fontSize: "13px",
              color: "#9ca3af",
              margin: 0,
            }}
          >
            No attributes yet.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "16px",
            }}
          >
            {attributes.map((attr) => (
              <div
                key={attr.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  opacity:
                    attr.status === "Inactive" ? 0.55 : 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#191a1f",
                    }}
                  >
                    {attr.name}
                    <span
                      style={{
                        marginLeft: "8px",
                        fontSize: "11px",
                        fontWeight: 500,
                        color: "#6b7280",
                      }}
                    >
                      {attr.type}
                      {attr.scopes?.length
                        ? ` · ${attr.scopes.length} scope(s)`
                        : " · global"}
                    </span>
                  </div>

                  <div
                    style={{ display: "flex", gap: "6px" }}
                  >
                    <button
                      type="button"
                      disabled={busyAttrId === attr.id}
                      title={
                        attr.status === "Active"
                          ? "Deactivate"
                          : "Activate"
                      }
                      onClick={() => handleToggleAttribute(attr)}
                      style={{
                        border: "none",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        background:
                          attr.status === "Active"
                            ? "#fef2f2"
                            : "#ecfdf5",
                        color:
                          attr.status === "Active"
                            ? "#dc2626"
                            : "#059669",
                      }}
                    >
                      {attr.status === "Active" ? "Off" : "On"}
                    </button>
                    <button
                      type="button"
                      disabled={busyAttrId === attr.id}
                      title="Delete attribute"
                      onClick={() => handleDeleteAttribute(attr)}
                      style={{
                        border: "none",
                        borderRadius: "6px",
                        padding: "4px 6px",
                        cursor: "pointer",
                        background: "#fef2f2",
                        color: "#dc2626",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                  }}
                >
                  {(attr.values || []).map((val) => (
                    <span
                      key={val.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "3px 8px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        border: "1px solid #e5e7eb",
                        background: "#f9fafb",
                        color: "#374151",
                        opacity:
                          val.status === "Inactive" ? 0.5 : 1,
                      }}
                    >
                      {val.value}
                      <button
                        type="button"
                        disabled={busyValueId === val.id}
                        title={
                          val.status === "Active"
                            ? "Deactivate"
                            : "Activate"
                        }
                        onClick={() => handleToggleValue(val)}
                        style={{
                          border: "none",
                          background: "transparent",
                          fontSize: "10px",
                          fontWeight: 700,
                          cursor: "pointer",
                          color:
                            val.status === "Active"
                              ? "#dc2626"
                              : "#059669",
                          padding: 0,
                        }}
                      >
                        {val.status === "Active" ? "off" : "on"}
                      </button>
                      <button
                        type="button"
                        disabled={busyValueId === val.id}
                        title="Delete value"
                        onClick={() => handleDeleteValue(val)}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          color: "#dc2626",
                          display: "flex",
                          padding: 0,
                        }}
                      >
                        <Trash2 size={10} />
                      </button>
                    </span>
                  ))}

                  {["select", "multi-select"].includes(
                    attr.type
                  ) && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <input
                        type="text"
                        value={valueInputs[attr.id] || ""}
                        onChange={(e) =>
                          setValueInputs((prev) => ({
                            ...prev,
                            [attr.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddValue(attr.id);
                          }
                        }}
                        placeholder="+ value"
                        style={{
                          height: "26px",
                          width: "90px",
                          padding: "0 8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "999px",
                          fontSize: "12px",
                          outline: "none",
                        }}
                      />
                      <button
                        type="button"
                        disabled={
                          busyValueId === `add-${attr.id}`
                        }
                        onClick={() => handleAddValue(attr.id)}
                        style={{
                          height: "26px",
                          width: "26px",
                          border: "none",
                          borderRadius: "50%",
                          background: "#bd1265",
                          color: "#fff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Plus size={12} />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
