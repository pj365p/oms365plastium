import React, { useEffect, useState, useMemo } from "react";
import "./App.css";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";

function nowISO() {
  return new Date().toISOString();
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// ✅ Updated to dd/mm/yyyy format
function formatDateLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function OrderForm({ onAdd }) {
  const [customer, setCustomer] = useState("");
  const [product, setProduct] = useState("");
  const [qty, setQty] = useState(1);
  const [dispatchAt, setDispatchAt] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!customer.trim() || !product.trim())
      return alert("Customer & product required");
    const order = {
      customer: customer.trim(),
      product: product.trim(),
      qty: Number(qty) || 1,
      dispatchAt: dispatchAt || null,
      status: "pending",
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    onAdd(order);
    setCustomer("");
    setProduct("");
    setQty(1);
    setDispatchAt("");
  }

  return (
    <form className="order-form" onSubmit={submit}>
      <div className="row">
        <label>
          Customer
          <input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Customer name"
          />
        </label>
        <label>
          Product
          <input
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="Product name"
          />
        </label>
      </div>

      <div className="row">
        <label>
          Qty
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </label>
        <label>
          Dispatch Date
          <input
            type="date"
            value={dispatchAt}
            onChange={(e) => setDispatchAt(e.target.value)}
          />
        </label>
      </div>

      <div className="row actions">
        <button type="submit" className="btn primary">
          Add Order
        </button>
      </div>
    </form>
  );
}

function OrderRow({
  order,
  onUpdateStatus,
  onDelete,
  onRestore,
  onEdit,
  isTrash,
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    customer: order.customer,
    product: order.product,
    qty: order.qty,
    dispatchAt: order.dispatchAt ? order.dispatchAt.slice(0, 10) : "",
  });

  const handleSave = () => {
    if (!form.customer.trim() || !form.product.trim())
      return alert("Fields required");
    onEdit(order.id, form);
    setEditing(false);
  };

  return (
    <div className="order-row">
      <div className="order-main">
        {editing ? (
          <div className="edit-form">
            <input
              value={form.customer}
              onChange={(e) =>
                setForm({ ...form, customer: e.target.value })
              }
            />
            <input
              value={form.product}
              onChange={(e) =>
                setForm({ ...form, product: e.target.value })
              }
            />
            <input
              type="number"
              value={form.qty}
              min="1"
              onChange={(e) =>
                setForm({ ...form, qty: e.target.value })
              }
            />
            <input
              type="date"
              value={form.dispatchAt}
              onChange={(e) =>
                setForm({ ...form, dispatchAt: e.target.value })
              }
            />
            <button className="btn small primary" onClick={handleSave}>
              Save
            </button>
            <button
              className="btn small"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className="order-title">{order.customer}</div>
            <div className="order-meta">
              <strong>Product:</strong> {order.product} <br />
              <strong>Qty:</strong> {order.qty} MT <br />
              <strong>Dispatch:</strong>{" "}
              {order.dispatchAt
                ? formatDateLocal(order.dispatchAt)
                : "No dispatch"}
            </div>
            {/* ✅ Move timestamps here */}
            <div className="order-times">
              Created: {formatDateLocal(order.createdAt)} <br />
              Updated: {formatDateLocal(order.updatedAt)}
              {isTrash && (
                <>
                  <br />
                  Deleted: {formatDateLocal(order.deletedAt)}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {!editing && (
        <div className="order-side">
          <div className={`status-pill ${order.status}`}>
            {order.status.toUpperCase()}
          </div>

          <div className="order-actions">
            {!isTrash && order.status === "pending" && (
              <button
                className="btn small"
                onClick={() => onUpdateStatus(order.id, "completed")}
              >
                Mark Completed
              </button>
            )}
            {!isTrash && order.status === "completed" && (
              <button
                className="btn small"
                onClick={() => onUpdateStatus(order.id, "pending")}
              >
                Move to Pending
              </button>
            )}
            {!isTrash && (
              <>
                <button
                  className="btn small"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </button>
                <button
                  className="btn small danger"
                  onClick={() => onDelete(order)}
                >
                  Delete
                </button>
              </>
            )}
            {isTrash && (
              <>
                <button
                  className="btn small"
                  onClick={() => onRestore(order)}
                >
                  Restore
                </button>
                <button
                  className="btn small danger"
                  onClick={() => onDelete(order, true)}
                >
                  Delete Permanently
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [orders, setOrders] = useState([]);
  const [deletedOrders, setDeletedOrders] = useState([]);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  const ordersRef = collection(db, "orders");
  const trashRef = collection(db, "deleted_orders");

  // Live listeners
  useEffect(() => {
    const unsub = onSnapshot(ordersRef, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setOrders(data);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(trashRef, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDeletedOrders(data);
    });
    return unsub;
  }, []);

  // Auto cleanup (delete trash older than 10 days)
  useEffect(() => {
    const cleanup = async () => {
      const tenDaysAgo = daysAgo(10);
      const snapshot = await getDocs(trashRef);
      snapshot.forEach(async (docu) => {
        const data = docu.data();
        if (data.deletedAt < tenDaysAgo) {
          await deleteDoc(doc(trashRef, docu.id));
        }
      });
    };
    cleanup();
  }, []);

  async function addOrder(order) {
    await addDoc(ordersRef, order);
  }

  async function updateStatus(id, status) {
    const ref = doc(db, "orders", id);
    await updateDoc(ref, { status, updatedAt: nowISO() });
  }

  async function editOrder(id, updates) {
    const ref = doc(db, "orders", id);
    await updateDoc(ref, {
      ...updates,
      qty: Number(updates.qty) || 1,
      updatedAt: nowISO(),
    });
  }

  async function deleteOrder(order, permanent = false) {
    try {
      if (!permanent) {
        const trashData = { ...order, deletedAt: nowISO() };
        await setDoc(doc(trashRef, order.id), trashData);
        await deleteDoc(doc(ordersRef, order.id));
      } else {
        await deleteDoc(doc(trashRef, order.id));
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("❌ Could not delete this order. Try reloading the app.");
    }
  }

  async function restoreOrder(order) {
    const restored = { ...order, status: "pending" };
    delete restored.deletedAt;
    await setDoc(doc(ordersRef, order.id), restored);
    await deleteDoc(doc(trashRef, order.id));
    alert("✅ Order restored successfully!");
  }

  const filtered = useMemo(() => {
    const list = tab === "trash" ? deletedOrders : orders;
    let out = [...list];
    if (tab !== "all" && tab !== "trash")
      out = out.filter((o) => o.status === tab);
    if (q.trim()) {
      const tq = q.toLowerCase();
      out = out.filter(
        (o) =>
          o.customer.toLowerCase().includes(tq) ||
          o.product.toLowerCase().includes(tq)
      );
    }
    out.sort((a, b) => {
      let A = a[sortKey] || "";
      let B = b[sortKey] || "";
      if (sortKey === "qty") {
        A = Number(A);
        B = Number(B);
      }
      if (A < B) return sortDir === "asc" ? -1 : 1;
      if (A > B) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return out;
  }, [orders, deletedOrders, tab, q, sortKey, sortDir]);

  return (
    <div className="app">
      <header>
        <div className="brand">
          <img src="/pwa-192x192.png" alt="logo" className="logo" />
          <div>
            <h1>OMS365 Plastium</h1>
            <div className="muted small">
              Edit, track, and recover orders
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="left">
          {tab !== "trash" && <OrderForm onAdd={addOrder} />}
          <div className="controls">
            <input
              placeholder="Search..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="selects">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
              >
                <option value="createdAt">Created</option>
                <option value="dispatchAt">Dispatch</option>
                <option value="qty">Qty</option>
                <option value="customer">Customer</option>
              </select>
              <select
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value)}
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </div>
        </section>

        <section className="right">
          <div className="tabs">
            {["all", "pending", "completed", "trash"].map((t) => (
              <button
                key={t}
                className={`tab ${tab === t ? "active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t === "all"
                  ? "All"
                  : t === "trash"
                  ? "Trash"
                  : t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="orders">
            {filtered.length === 0 ? (
              <div className="empty">
                No {tab === "trash" ? "deleted" : ""} orders found.
              </div>
            ) : (
              filtered.map((o) => (
                <OrderRow
                  key={o.id}
                  order={o}
                  onUpdateStatus={updateStatus}
                  onDelete={deleteOrder}
                  onRestore={restoreOrder}
                  onEdit={editOrder}
                  isTrash={tab === "trash"}
                />
              ))
            )}
          </div>
        </section>
      </main>

      <footer>
        <div className="muted">
          Data synced via Firebase · Editable orders · Trash kept 10 days
        </div>
      </footer>
    </div>
  );
}
