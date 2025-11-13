"use client";

export type PickListSettings = {
  titleText: string;
  showCategory: boolean;
  showPricePerDay: boolean;
  showBrand?: boolean;
  showModel?: boolean;
  showSize?: boolean;
  showSerialNumber?: boolean;
  showHomeLocation?: boolean;
  layout: "standard-table" | "detailed-table" | "cards";
  useCompanyLogo?: boolean;
  logoUrl?: string;
  noteText?: string;
};

export const DEFAULT_PICKLIST_SETTINGS: PickListSettings = {
  titleText: "Pick List",
  showCategory: true,
  showPricePerDay: true,
  showBrand: false,
  showModel: false,
  showSize: false,
  showSerialNumber: false,
  showHomeLocation: false,
  layout: "standard-table",
  useCompanyLogo: true,
  logoUrl: "",
  noteText: "Note: Ensure all pre-rental checks are completed before checkout.",
};

const STORAGE_KEY = "picklist_settings";

export function loadPickListSettings(): PickListSettings {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return DEFAULT_PICKLIST_SETTINGS;
    const parsed = JSON.parse(raw);
    const merged: PickListSettings = { ...DEFAULT_PICKLIST_SETTINGS, ...parsed };
    // Migrate legacy layout values
    if ((parsed.layout as any) === "table") merged.layout = "standard-table";
    if ((parsed.layout as any) === "cards") merged.layout = "cards";
    return merged;
  } catch {
    return DEFAULT_PICKLIST_SETTINGS;
  }
}

export function savePickListSettings(settings: PickListSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}