import React, { useEffect, useState, useMemo } from "react";
import "./App.css";
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

/*
  OMS365Plastium - synced with Firebase Firestore
  - Orders have: id, customer, product, qty, dispatchAt, status, createdAt, updatedAt
  - status: "new" | "pending" | "completed"
*/

function nowISO() {
  return new Date().toISOString();
}

function formatDateLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}

function OrderForm({ onAdd }) {
  const [customer, setCustomer] = useState("");
  const [product, setProduct] = useState("");
  const [qty, setQty] = useState(1);
  const [dispatchAt, setDispatchAt] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!customer.trim() || !product.trim()) return alert("Customer & product required");
    const order = {
      customer: customer.trim(),
      product: product.trim(),
      qty: Number(qty) || 1,
      dispatchAt: dispatchAt || null,
      status: "new",
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
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" />
        </label>
        <label>
          Product
          <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Product name" />
        </label>
      </div>

      <div className="row">
        <label>
          Qty
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
        </label>
        <label>
          Dispatch (optional)
          <input type="datetime-local" value={dispatchAt} onChange={(e) => setDispatchAt(e.target.value)} />
        </label>
      </div>

      <div className="row actions">
        <button type="submit" className="btn primary">Add Order</button>
        <small className="hint">New orders default to <strong>New</strong> status.</small>
      </div>
    </form>
  );
}

function OrderRow({ order, onUpdateStatus, onDelete }) {
  return (
    <div className="order-row">
      <div className="order-main">
        <div className="order-title">
          <strong>{order.customer}</strong>
          <span className="muted"> — {order.product}</span>
        </div>
        <div className="order-meta">
          Qty: {order.qty} ·
          {order.dispatchAt ? ` Dispatch: ${formatDateLocal(order.dispatchAt)}` : " No dispatch"}
        </div>
      </div>

      <div className="order-side">
        <div className={`status-pill ${order.status}`}>{order.status.toUpperCase()}</div>
        <div className="order-times muted">
          <div>Created: {formatDateLocal(order.createdAt)}</div>
          <div>Updated: {formatDateLocal(order.updatedAt)}</div>
        </div>

        <div className="order-actions">
          {order.status !== "completed" && (
            <button className="btn small" onClick={() => onUpdateStatus(order.id, "completed")}>Mark Completed</button>
          )}
          {order.status === "new" && (
            <button className="btn small" onClick={() => onUpdateStatus(order.id, "pending")}>Start</button>
          )}
          {order.status === "pending" && (
            <button className="btn small" onClick={() => onUpdateStatus(order.id, "new")}>Back to New</button>
          )}
          <button className="btn small danger" onClick={() => onDelete(order.id)}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  const ordersRef = collection(db, "orders");

  // Sync with Firestore in realtime
  useEffect(() => {
    const unsub = onSnapshot(ordersRef, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setOrders(data.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    });
    return () => unsub();
  }, []);

  async function addOrder(order) {
    await addDoc(ordersRef, { ...order, createdAt: nowISO(), updatedAt: nowISO() });
  }

  async function updateStatus(id, status) {
    const ref = doc(db, "orders", id);
    await updateDoc(ref, { status, updatedAt: nowISO() });
  }

  async function deleteOrder(id) {
    if (!confirm("Delete this order?")) return;
    await deleteDoc(doc(db, "orders", id));
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(orders, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "oms365plastium_orders.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = useMemo(() => {
    let out = orders.slice();
    if (tab !== "all") out = out.filter((o) => o.status === tab);
    if (q.trim()) {
      const tq = q.toLowerCase();
      out = out.filter((o) =>
        o.customer.toLowerCase().includes(tq) ||
        o.product.toLowerCase().includes(tq)
      );
    }
    out.sort((a, b) => {
      let A = a[sortKey] || "";
      let B = b[sortKey] || "";
      if (sortKey === "qty") {
        A = Number(A); B = Number(B);
      }
      if (A < B) return sortDir === "asc" ? -1 : 1;
      if (A > B) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return out;
  }, [orders, tab, q, sortKey, sortDir]);

  return (
    <div className="app">
      <header>
        <div className="brand">
          <img src="/pwa-192x192.png" alt="logo" className="logo" />
          <div>
            <h1>OMS365 Plastium</h1>
            <div className="muted small">Punch & track orders — synced via Firebase</div>
          </div>
        </div>
        <div className="top-actions">
          <button className="btn" onClick={exportJSON}>Export</button>
        </div>
      </header>

      <main>
        <section className="left">
          <OrderForm onAdd={addOrder} />
          <div className="controls">
            <input placeholder="Search customer or product..." value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="selects">
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                <option value="createdAt">Sort: Created</option>
                <option value="dispatchAt">Sort: Dispatch</option>
                <option value="qty">Sort: Qty</option>
                <option value="customer">Sort: Customer</option>
              </select>
              <select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </div>
        </section>

        <section className="right">
          <div className="tabs">
            {["all", "new", "pending", "completed"].map((t) => (
              <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                {t === "all" ? "All" : t[0].toUpperCase() + t.slice(1)}
                {t !== "all" && ` (${orders.filter(o => o.status === t).length})`}
              </button>
            ))}
          </div>

          <div className="orders">
            {filtered.length === 0 ? (
              <div className="empty">No orders found — add one on the left.</div>
            ) : (
              filtered.map((o) => (
                <OrderRow key={o.id} order={o} onUpdateStatus={updateStatus} onDelete={deleteOrder} />
              ))
            )}
          </div>
        </section>
      </main>

      <footer>
        <div className="muted">Data synced to Firebase Firestore — shared across users.</div>
      </footer>
    </div>
  );
}
