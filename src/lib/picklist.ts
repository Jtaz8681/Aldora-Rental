"use client";

export type PickListSettings = {
  titleText: string;
  showCategory: boolean;
  showPricePerDay: boolean;
  layout: "table" | "cards";
  logoUrl?: string;
  noteText?: string;
};

export const DEFAULT_PICKLIST_SETTINGS: PickListSettings = {
  titleText: "Pick List",
  showCategory: true,
  showPricePerDay: true,
  layout: "table",
  logoUrl: "",
  noteText: "Note: Ensure all pre-rental checks are completed before checkout.",
};

const STORAGE_KEY = "picklist_settings";

export function loadPickListSettings(): PickListSettings {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return DEFAULT_PICKLIST_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PICKLIST_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_PICKLIST_SETTINGS;
  }
}

export function savePickListSettings(settings: PickListSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}