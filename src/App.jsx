import React, { useEffect, useState, useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./App.css";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
} from "firebase/firestore";

function nowISO() {
  return new Date().toISOString();
}

function formatDateLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/* === ORDER FORM === */
function OrderForm({ onAdd }) {
  const [customer, setCustomer] = useState("");
  const [product, setProduct] = useState("");
  const [qty, setQty] = useState(1);
  const [dispatchAt, setDispatchAt] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const customerList = [
    "Shri Khemisati Polysacks",
    "Geotex Textile",
    "Vivacity Woven",
    "Bhagwan Shree Polyfab",
    "Tribhuvan Polymers",
    "Pristine",
    "Shavyaa Geotex",
    "Moneypackers",
    "Aparna Polyplast",
    "Salasar Polysacks",
    "Siddhi Vinayak Industries",
    "GVM Woven",
    "Bhim Polyfab",
    "Premier Plaaspack",
    "Shree Shyam Industries",
    "Splenzo Polyfab",
    "Kwality",
    "Kelsey",
    "Vraj Packaging",
    "Pratik Enterprises",
    "Ambaji Geotex",
    "Bhagwati Polyweave",
    "Cryston Polyflex",
    "Mukesh Associates",
    "Shubh Polypack",
    "SP Pack",
    "Euro Panel Products",
    "SS Corporation",
    "Kshitij Polyline",
    "Aareha Elastin FIBC",
    "Ace Packaging",
    "Boston Polyplast",
    "HJ Industries",
    "Inara Polyfab",
    "Omkar Polyfab",
    "Other",
    "Priyadarshini Polysacks",
    "Pulkit Polyexports",
    "Star Polypack",
    "Visma Plastics",
  ];

  const filteredSuggestions = customerList.filter((name) =>
    name.toLowerCase().includes(customer.toLowerCase())
  );

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
        <label style={{ position: "relative" }}>
          Customer
          <input
            value={customer}
            onChange={(e) => {
              setCustomer(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Customer name"
            autoComplete="off"
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <ul className="suggestion-list">
              {filteredSuggestions.map((s, i) => (
                <li
                  key={i}
                  onClick={() => {
                    setCustomer(s);
                    setShowSuggestions(false);
                  }}
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
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

/* === ORDER ROW === */
function OrderRow({ order, onUpdateStatus, onDelete, onRestore, isTrash }) {
  return (
    <div className="order-row">
      <div className="order-main">
        <div className="order-title">{order.customer}</div>
        <div className="order-meta">
          <strong>Product:</strong> {order.product} <br />
          <strong>Qty:</strong> {order.qty} MT <br />
          <strong>Dispatch:</strong>{" "}
          {order.dispatchAt ? formatDateLocal(order.dispatchAt) : "No dispatch"}
        </div>
      </div>

      <div className="order-side">
        <div className={`status-pill ${order.status || "trash"}`}>
          {isTrash ? "DELETED" : order.status.toUpperCase()}
        </div>

        <div className="order-actions">
          {!isTrash ? (
            <>
              {order.status === "pending" ? (
                <button
                  className="btn small"
                  onClick={() => onUpdateStatus(order.id, "completed")}
                >
                  Mark Completed
                </button>
              ) : (
                <button
                  className="btn small"
                  onClick={() => onUpdateStatus(order.id, "pending")}
                >
                  Move to Pending
                </button>
              )}
              <button className="btn small danger" onClick={() => onDelete(order)}>
                Delete
              </button>
            </>
          ) : (
            <>
              <button className="btn small" onClick={() => onRestore(order)}>
                Restore
              </button>
              <button
                className="btn small danger"
                onClick={() => deleteDoc(doc(db, "deleted_orders", order.id))}
              >
                Delete Permanently
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* === MAIN APP === */
export default function App() {
  const [orders, setOrders] = useState([]);
  const [deletedOrders, setDeletedOrders] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");

  const [showFilter, setShowFilter] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterProduct, setFilterProduct] = useState("");

  const ordersRef = collection(db, "orders");
  const trashRef = collection(db, "deleted_orders");

  useEffect(() => {
    const unsub1 = onSnapshot(ordersRef, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsub2 = onSnapshot(trashRef, (snap) => {
      setDeletedOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const filtered = useMemo(() => {
    let list = tab === "trash" ? [...deletedOrders] : [...orders];
    if (tab !== "all" && tab !== "trash") list = list.filter((o) => o.status === tab);
    if (q.trim()) {
      const tq = q.toLowerCase();
      list = list.filter(
        (o) =>
          o.customer.toLowerCase().includes(tq) ||
          o.product.toLowerCase().includes(tq)
      );
    }
    if (filterCustomer.trim()) {
      const fc = filterCustomer.toLowerCase();
      list = list.filter((o) => o.customer.toLowerCase().includes(fc));
    }
    if (filterProduct.trim()) {
      const fp = filterProduct.toLowerCase();
      list = list.filter((o) => o.product.toLowerCase().includes(fp));
    }
    return list;
  }, [orders, deletedOrders, tab, q, filterCustomer, filterProduct]);

  const totalPendingQty = orders
    .filter((o) => o.status === "pending")
    .reduce((sum, o) => sum + Number(o.qty || 0), 0);

  const dispatchDates = orders
    .filter((o) => o.dispatchAt)
    .map((o) => o.dispatchAt.split("T")[0]);

  const today = new Date();
  const formattedToday = today.toLocaleDateString("en-GB");
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });

  // ✅ Fixed delete & restore to move doc, not duplicate
  async function moveToTrash(o) {
    await setDoc(doc(db, "deleted_orders", o.id), {
      ...o,
      deletedAt: nowISO(),
    });
    await deleteDoc(doc(db, "orders", o.id));
  }

  async function restoreFromTrash(o) {
    await setDoc(doc(db, "orders", o.id), {
      ...o,
      restoredAt: nowISO(),
      status: "pending",
    });
    await deleteDoc(doc(db, "deleted_orders", o.id));
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <img src="/pwa-192x192.png" alt="logo" className="logo" />
          <div className="brand-block">
            <h1 className="title-text">Order Book</h1>
            <p className="subtitle">Edit, track, and recover orders</p>
            <span className="brand-side-text">
              <span className="blue-text">365 PLASTIUM</span>
            </span>
          </div>
        </div>

        <div className="header-right">
          <div
            className="date-display"
            onClick={() => setShowCalendar(!showCalendar)}
          >
            {formattedToday}
            <div className="day-text">{dayName}</div>
          </div>
          {showCalendar && (
            <div className="calendar-popup">
              <Calendar
                tileContent={({ date }) => {
                  const iso = date.toISOString().split("T")[0];
                  if (dispatchDates.includes(iso)) {
                    return <div className="dot"></div>;
                  }
                  return null;
                }}
              />
            </div>
          )}
        </div>
      </header>

      <main>
        <section className="left">
          <OrderForm onAdd={(o) => addDoc(ordersRef, o)} />
        </section>

        <section className="right">
          <div className="pending-summary">
            Total Pending Qty:
            <span className="pending-highlight">{totalPendingQty} MT</span>
          </div>

          <div className="right-header">
            <div className="tabs">
              {["all", "pending", "completed", "trash"].map((t) => (
                <button
                  key={t}
                  className={`tab ${tab === t ? "active" : ""}`}
                  onClick={() => setTab(t)}
                >
                  {t === "trash"
                    ? "Trash"
                    : t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <input
            placeholder="Search..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="search-input"
          />

          <div className="orders">
            {filtered.length === 0 ? (
              <div className="empty">No orders found.</div>
            ) : (
              filtered.map((o) => (
                <OrderRow
                  key={o.id}
                  order={o}
                  isTrash={tab === "trash"}
                  onUpdateStatus={(id, s) =>
                    updateDoc(doc(db, "orders", id), {
                      status: s,
                      updatedAt: nowISO(),
                    })
                  }
                  onDelete={moveToTrash}
                  onRestore={restoreFromTrash}
                />
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
