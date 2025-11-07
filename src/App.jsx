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

/* === SINGLE ORDER === */
function OrderRow({ order, onUpdateStatus, onDelete }) {
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
        <div className={`status-pill ${order.status}`}>
          {order.status.toUpperCase()}
        </div>
        <div className="order-actions">
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
          <button
            className="btn small danger"
            onClick={() => onDelete(order)}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* === MAIN APP === */
export default function App() {
  const [orders, setOrders] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");

  const ordersRef = collection(db, "orders");

  useEffect(() => {
    const unsub = onSnapshot(ordersRef, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    let list = [...orders];
    if (tab !== "all") list = list.filter((o) => o.status === tab);
    if (q.trim()) {
      const tq = q.toLowerCase();
      list = list.filter(
        (o) =>
          o.customer.toLowerCase().includes(tq) ||
          o.product.toLowerCase().includes(tq)
      );
    }
    return list;
  }, [orders, tab, q]);

  const totalPendingQty = orders
    .filter((o) => o.status === "pending")
    .reduce((sum, o) => sum + Number(o.qty || 0), 0);

  const dispatchDates = orders
    .filter((o) => o.dispatchAt)
    .map((o) => o.dispatchAt.split("T")[0]);

  const today = new Date();
  const formattedToday = today.toLocaleDateString("en-GB");
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });

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
          <OrderForm
            onAdd={(o) => addDoc(ordersRef, o)}
          />
        </section>

        <section className="right">
          <div className="pending-summary">
            Total Pending Qty:
            <span className="pending-highlight">{totalPendingQty} MT</span>
          </div>

          

          <div className="right-header">
            <div className="tabs">
              {["all", "pending", "completed"].map((t) => (
                <button
                  key={t}
                  className={`tab ${tab === t ? "active" : ""}`}
                  onClick={() => setTab(t)}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          
            <div className="filter-container">
              <button
                className="filter-btn"
                onClick={() => setShowFilter(!showFilter)}
              >
                🔍 Filter
              </button>
          
              {showFilter && (
                <div className="filter-box">
                  <label>
                    Customer
                    <input
                      type="text"
                      value={filterCustomer}
                      onChange={(e) => setFilterCustomer(e.target.value)}
                      placeholder="Enter customer name"
                    />
                  </label>
                  <label>
                    Product
                    <input
                      type="text"
                      value={filterProduct}
                      onChange={(e) => setFilterProduct(e.target.value)}
                      placeholder="Enter product name"
                    />
                  </label>
                  <div className="filter-actions">
                    <button
                      className="btn small primary"
                      onClick={() => setShowFilter(false)}
                    >
                      Apply
                    </button>
                    <button
                      className="btn small"
                      onClick={() => {
                        setFilterCustomer("");
                        setFilterProduct("");
                        setShowFilter(false);
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        

          
          <div className="tabs">
            {["all", "pending", "completed"].map((t) => (
              <button
                key={t}
                className={`tab ${tab === t ? "active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
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
                  onUpdateStatus={(id, s) =>
                    updateDoc(doc(db, "orders", id), { status: s, updatedAt: nowISO() })
                  }
                  onDelete={(o) => deleteDoc(doc(db, "orders", o.id))}
                />
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
