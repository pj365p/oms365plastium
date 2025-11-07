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

/* === ORDER FORM WITH AUTOCOMPLETE === */
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

/* === SINGLE ORDER CARD === */
function OrderRow({ order, onUpdateStatus, onDelete, onEdit, isTrash }) {
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
              onChange={(e) => setForm({ ...form, customer: e.target.value })}
            />
            <input
              value={form.product}
              onChange={(e) => setForm({ ...form, product: e.target.value })}
            />
            <input
              type="number"
              value={form.qty}
              min="1"
              onChange={(e) => setForm({ ...form, qty: e.target.value })}
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
            <button className="btn small" onClick={() => setEditing(false)}>
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
            <div className="order-times">
              Created: {formatDateLocal(order.createdAt)} <br />
              Updated: {formatDateLocal(order.updatedAt)}
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
                <button className="btn small" onClick={() => setEditing(true)}>
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
          </div>
        </div>
      )}
    </div>
  );
}

/* === MAIN APP === */
export default function App() {
  const [orders, setOrders] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);

  const ordersRef = collection(db, "orders");

  useEffect(() => {
    const unsub = onSnapshot(ordersRef, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const totalPendingQty = orders
    .filter((o) => o.status === "pending")
    .reduce((sum, o) => sum + Number(o.qty || 0), 0);

  // extract dispatch dates for dots
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
                tileContent={({ date, view }) => {
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
        <section className="right">
          <div className="pending-summary">
            Total Pending Qty:
            <span className="pending-highlight">{totalPendingQty} MT</span>
          </div>

          {/* your order list, tabs etc go here */}
        </section>
      </main>
    </div>
  );
}
