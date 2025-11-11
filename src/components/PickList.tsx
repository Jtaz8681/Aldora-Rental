"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { PickListSettings, loadPickListSettings, DEFAULT_PICKLIST_SETTINGS } from "@/lib/picklist";

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
  settings?: PickListSettings;
};

export default function PickList({ customerName, startAt, endAt, items, total, settings }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [generatedDate, setGeneratedDate] = useState<string>("");
  const [effectiveSettings, setEffectiveSettings] = useState<PickListSettings>(settings || DEFAULT_PICKLIST_SETTINGS);

  useEffect(() => {
    setGeneratedDate(new Date().toLocaleString());
  }, []);

  useEffect(() => {
    if (settings) {
      setEffectiveSettings(settings);
    } else {
      setEffectiveSettings(loadPickListSettings());
    }
  }, [settings]);

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
          <title>${effectiveSettings.titleText || "Pick List"}</title>
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
            .logo { max-height: 40px; margin-bottom: 8px; }
            .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; }
            .cards { display: grid; grid-template-columns: 1fr; gap: 8px; }
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
        <h2 className="text-base font-semibold">{effectiveSettings.titleText || "Pick List"}</h2>
        <Button type="button" size="sm" onClick={print}>Print</Button>
      </div>

      <div ref={containerRef}>
        {effectiveSettings.logoUrl ? (
          <img src={effectiveSettings.logoUrl} alt="Logo" className="logo" />
        ) : null}
        <h1 className="text-base font-semibold">{effectiveSettings.titleText || "Pick List"}</h1>
        <p className="muted">Generated: {generatedDate}</p>

        <div className="grid">
          <div><strong>Customer:</strong> {customerName || "-"}</div>
          <div><strong>Start:</strong> {startAt ? new Date(startAt).toLocaleString() : "-"}</div>
          <div><strong>Expected End:</strong> {endAt ? new Date(endAt).toLocaleString() : "-"}</div>
          <div><strong>Duration:</strong> {days} day{days > 1 ? "s" : ""}</div>
        </div>

        <h2>Items to Pull</h2>

        {effectiveSettings.layout === "table" ? (
          <table className="table">
            <thead>
              <tr>
                <th>Internal ID</th>
                {effectiveSettings.showCategory && <th>Category</th>}
                {effectiveSettings.showPricePerDay && <th>Price (per day)</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((i, idx) => (
                <tr key={idx}>
                  <td>{i.internal_id}</td>
                  {effectiveSettings.showCategory && <td>{i.category}</td>}
                  {effectiveSettings.showPricePerDay && <td>{formatCurrency(i.price)}</td>}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={1 + Number(effectiveSettings.showCategory) + Number(effectiveSettings.showPricePerDay)} className="muted">No items selected.</td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <div className="cards">
            {items.map((i, idx) => (
              <div key={idx} className="card">
                <div><strong>ID:</strong> {i.internal_id}</div>
                {effectiveSettings.showCategory && <div><strong>Category:</strong> {i.category}</div>}
                {effectiveSettings.showPricePerDay && <div><strong>Price/day:</strong> {formatCurrency(i.price)}</div>}
              </div>
            ))}
            {items.length === 0 && <div className="muted">No items selected.</div>}
          </div>
        )}

        <div className="flex-between" style={{ marginTop: 8 }}>
          <span className="muted">Subtotal:</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <div className="flex-between">
          <span className="total">Total ({days} day{days > 1 ? "s" : ""}):</span>
          <span className="total">{formatCurrency(total)}</span>
        </div>

        <p className="muted" style={{ marginTop: 12 }}>
          {effectiveSettings.noteText || DEFAULT_PICKLIST_SETTINGS.noteText}
        </p>
      </div>
    </div>
  );
}