"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

type Props = {
  value: string;
  onChange: (id: string, name?: string) => void;
  placeholder?: string;
};

const CustomerSearch: React.FC<Props> = ({ value, onChange, placeholder = "Search first name, last name, phone, email" }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedName, setSelectedName] = useState<string>("");

  // Load initial list or selected customer's name if value provided
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (value) {
        const { data } = await supabase
          .from("customers")
          .select("id, name")
          .eq("id", value)
          .limit(1)
          .single();
        if (data) setSelectedName(data.name);
      } else {
        const { data } = await supabase
          .from("customers")
          .select("id, name, phone, email")
          .order("name", { ascending: true })
          .limit(10);
        setResults((data as CustomerRow[] | null) ?? []);
      }
    };
    init();
  }, [value]);

  // Debounced search
  useEffect(() => {
    const s = query.trim();
    const handle = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setLoading(true);
      try {
        let req = supabase
          .from("customers")
          .select("id, name, phone, email")
          .order("name", { ascending: true })
          .limit(20);

        if (s) {
          req = req.or(`name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`);
        }

        const { data, error } = await req;
        if (error) throw error;

        setResults((data as CustomerRow[] | null) ?? []);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  const displayValue = useMemo(() => {
    if (query.length > 0) return query;
    return selectedName;
  }, [query, selectedName]);

  const handleSelect = (c: CustomerRow) => {
    setSelectedName(c.name);
    setQuery("");
    onChange(c.id, c.name);
  };

  const clearSelection = () => {
    setSelectedName("");
    setQuery("");
    onChange("");
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <Input
          placeholder={placeholder}
          value={displayValue}
          onChange={(e) => setQuery(e.target.value)}
        />
        {value && (
          <button
            type="button"
            onClick={clearSelection}
            className="text-xs text-muted-foreground underline"
            aria-label="Clear selected customer"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-2 border rounded">
        <ScrollArea className="h-48">
          {loading ? (
            <div className="p-3 text-sm text-muted-foreground">Searching…</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">
              {query.trim() ? "No matches found." : "Type to search customers."}
            </div>
          ) : (
            <ul>
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(c)}
                    className={`w-full text-left px-3 py-2 hover:bg-muted ${c.id === value ? "bg-muted" : ""}`}
                  >
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[c.phone || "-", c.email || "-"].join(" · ")}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default CustomerSearch;