import { useEffect, useState } from "react";
import { PackageOpen, RefreshCw } from "lucide-react";

import AdminTable from "../components/AdminTable";
import {
  fetchProducts,
  updateProduct,
} from "../../services/productApi";

import "./AdminInventory.css";

const getStockStatus = (stock) => {
  if (stock <= 0) return "Out of Stock";
  if (stock <= 10) return "Low Stock";
  return "In Stock";
};

export default function AdminInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const loadProducts = async () => {
    try {
      setProducts(await fetchProducts("", { includeAll: true }));
    } catch (error) {
      console.error("Inventory loading error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    fetchProducts("", { includeAll: true })
      .then((loadedProducts) => {
        if (active) setProducts(loadedProducts);
      })
      .catch((error) => {
        console.error("Inventory loading error:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleUpdateStock = async (product) => {
    const enteredStock = window.prompt(
      `Enter the new stock quantity for ${product.name}:`,
      String(product.stock ?? 0)
    );

    if (enteredStock === null) return;

    const stock = Number(enteredStock);

    if (!Number.isInteger(stock) || stock < 0) {
      alert("Please enter a valid stock quantity of 0 or more.");
      return;
    }

    setUpdatingId(product.id);

    try {
      await updateProduct(product.id, {
        ...product,
        stock,
        status: getStockStatus(stock),
      });
      await loadProducts();
    } catch (error) {
      console.error("Stock update error:", error);
      alert(error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="admin-inventory-page">
      <div className="page-heading inventory-heading">
        <div>
          <span className="inventory-label">INVENTORY MANAGEMENT</span>
          <h2>Inventory</h2>
          <p>Monitor and update product stock levels</p>
        </div>

        <button
          type="button"
          className="inventory-refresh-btn"
          onClick={loadProducts}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      <section className="panel inventory-panel">
        {loading ? (
          <div className="inventory-state">Loading inventory...</div>
        ) : products.length === 0 ? (
          <div className="inventory-state">
            <PackageOpen size={38} />
            <strong>No products found</strong>
            <span>Add products from Product Management first.</span>
          </div>
        ) : (
          <AdminTable
            headers={[
              "Product",
              "SKU",
              "Category",
              "Stock",
              "Status",
              "Action",
            ]}
          >
            {products.map((product) => {
              const stock = Number(product.stock || 0);
              const status = getStockStatus(stock);

              return (
                <tr key={product.id}>
                  <td>
                    <strong>{product.name}</strong>
                  </td>
                  <td>SKU-{String(product.id).padStart(4, "0")}</td>
                  <td>{product.category || "General"}</td>
                  <td>
                    <strong className="inventory-stock">{stock}</strong>
                  </td>
                  <td>
                    <span
                      className={`inventory-status ${status
                        .toLowerCase()
                        .replaceAll(" ", "-")}`}
                    >
                      {status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="inventory-update-btn"
                      onClick={() => handleUpdateStock(product)}
                      disabled={updatingId === product.id}
                    >
                      {updatingId === product.id
                        ? "Updating..."
                        : "Update Stock"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        )}
      </section>
    </div>
  );
}
