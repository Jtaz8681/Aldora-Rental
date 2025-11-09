"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

type Item = {
  internal_id: string;
  category: string;
  price: number;
};

type Props = {
  customerName: string;
  startAt: string;
  endAt: string;
  items: Item[];
  total: number;
};

export default function PickList({ customerName, startAt, endAt, items, total }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [generatedDate, setGeneratedDate] = useState<string>(""); // State for client-side date

  useEffect(() => {
    setGeneratedDate(new Date().toLocaleString()); // Set date only on client
  }, []);

  const days = useMemo(() => {
    if (!startAt || !endAt) return 1;
    const ms = new Date(endAt).getTime() - new Date(startAt).getTime();
    const d = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return Math.max(d, 1);
  }, [startAt, endAt]);

  const print = () => {
    const content = containerRef.current?.innerHTML || "";
    const w = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Pick List</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 16px; color: #111827; }
            h1 { font-size: 18px; margin: 0 0 10px; }
            h2 { font-size: 16px; margin: 16px 0 8px; }
            .muted { color: #6b7280; font-size: 12px; }
            .grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
            .table { width: 100%; border-collapse: collapse; }
            .table th, .table td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; text-align: left; }
            .flex-between { display: flex; align-items: center; justify-content: space-between; }
            .total { font-weight: 600; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          ${content}
          <script>window.focus(); window.print();</script>
        </body>
      </html>
    `);
    w.document.close();
  };

  return (
    <div className="border rounded p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Pick List</h2>
        <Button type="button" size="sm" onClick={print}>Print</Button>
      </div>

      <div ref={containerRef}>
        <h1>Aldora Dive Gear Management System</h1>
        <p className="muted">Generated: {generatedDate}</p> {/* Use client-side state */}

        <div className="grid">
          <div><strong>Customer:</strong> {customerName || "-"}</div>
          <div><strong>Start:</strong> {startAt ? new Date(startAt).toLocaleString() : "-"}</div>
          <div><strong>Expected End:</strong> {endAt ? new Date(endAt).toLocaleString() : "-"}</div>
          <div><strong>Duration:</strong> {days} day{days > 1 ? "s" : ""}</div>
        </div>

        <h2>Items to Pull</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Internal ID</th>
              <th>Category</th>
              <th>Price (per day)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i, idx) => (
              <tr key={idx}>
                <td>{i.internal_id}</td>
                <td>{i.category}</td>
                <td>${Number(i.price || 0).toFixed(2)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">No items selected.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex-between" style={{ marginTop: 8 }}>
          <span className="muted">Subtotal:</span>
          <span>${total.toFixed(2)}</span>
        </div>
        <div className="flex-between">
          <span className="total">Total ({days} day{days > 1 ? "s" : ""}):</span>
          <span className="total">${total.toFixed(2)}</span>
        </div>

        <p className="muted" style={{ marginTop: 12 }}>
          Note: Ensure all pre-rental checks are completed before checkout.
        </p>
      </div>
    </div>
  );
}