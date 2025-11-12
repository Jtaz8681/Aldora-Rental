"use client";

import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

type ThemeName = "default" | "shallow" | "deep" | "sunrise" | "sunset" | "aldora" | "custom";
type ThemeMode = "light" | "dark";

type CustomColors = {
  background: string;   // hex
  primary: string;      // hex
  accent: string;       // hex
  destructive: string;  // hex
};

type ThemeContextValue = {
  theme: ThemeName;
  mode: ThemeMode;
  font: string;
  customColors: CustomColors;
  setTheme: (t: ThemeName) => void;
  setMode: (m: ThemeMode) => void;
  setFont: (f: string) => void;
  setCustomColors: (c: CustomColors) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_CLASSES: ThemeName[] = ["default", "shallow", "deep", "sunrise", "sunset", "aldora", "custom"];

const FONT_FAMILIES: Record<string, string> = {
  "Montserrat Regular": "var(--font-montserrat), system-ui, sans-serif",
  "Geist Sans": "var(--font-geist-sans), system-ui, sans-serif",
  "Arial": "Arial, Helvetica, sans-serif",
  "Helvetica": "Helvetica, Arial, sans-serif",
  "Times New Roman": "'Times New Roman', Times, serif",
  "Georgia": "Georgia, 'Times New Roman', Times, serif",
  "Trebuchet MS": "'Trebuchet MS', Helvetica, sans-serif",
  "Verdana": "Verdana, Geneva, sans-serif",
};

const STORAGE_KEYS = {
  theme: "app-theme",
  mode: "app-theme-mode",
  font: "app-font",
  custom: "app-custom-colors",
};

// Helpers: color math
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslStringFromHex(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const hRound = Math.round(h);
  const sRound = Math.round(s);
  const lRound = Math.round(l);
  return `${hRound} ${sRound}% ${lRound}%`;
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rr, gg, bb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
}

function bestTextColor(hex: string): "light" | "dark" {
  const lum = relativeLuminance(hex);
  // If background (or button) is dark, use light text; else dark text
  return lum < 0.5 ? "light" : "dark";
}

export default function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [theme, setThemeState] = useState<ThemeName>("default");
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [font, setFontState] = useState<string>("Montserrat Regular");
  const [customColors, setCustomColorsState] = useState<CustomColors>({
    background: "#F7FAFC",   // gentle light
    primary: "#0EA5B7",      // teal-ish
    accent: "#20ADC9",       // from palette
    destructive: "#C42329",  // red
  });

  // Initialize from localStorage
  useEffect(() => {
    const storedTheme = (localStorage.getItem(STORAGE_KEYS.theme) as ThemeName) || "default";
    const storedMode = (localStorage.getItem(STORAGE_KEYS.mode) as ThemeMode) || "light";
    const storedFont = localStorage.getItem(STORAGE_KEYS.font) || "Montserrat Regular";
    const storedCustom = localStorage.getItem(STORAGE_KEYS.custom);
    setThemeState(storedTheme);
    setModeState(storedMode);
    setFontState(storedFont);
    if (storedCustom) {
      try {
        const parsed = JSON.parse(storedCustom);
        setCustomColorsState(parsed);
      } catch {
        // ignore parsing errors
      }
    }
  }, []);

  const applyThemeClasses = useCallback(
    (nextTheme: ThemeName, nextMode: ThemeMode) => {
      const root = document.documentElement;
      THEME_CLASSES.forEach((t) => root.classList.remove(`theme-${t}`));
      root.classList.add(`theme-${nextTheme}`);
      if (nextMode === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    },
    []
  );

  const clearInlineVars = useCallback(() => {
    const root = document.documentElement;
    ["--background","--foreground","--card","--card-foreground","--primary","--primary-foreground","--accent","--accent-foreground","--destructive","--destructive-foreground","--ring"].forEach((v) => {
      root.style.removeProperty(v);
    });
  }, []);

  const applyCustomVariables = useCallback((modeNow: ThemeMode, colors: CustomColors) => {
    const root = document.documentElement;

    // Background: only apply in light mode to avoid overriding dark palette
    if (modeNow === "light") {
      root.style.setProperty("--background", hslStringFromHex(colors.background));
      // Also adjust card slightly lighter than background
      root.style.setProperty("--card", hslStringFromHex(colors.background));
    }

    // Foreground based on background for readability (light vs dark text)
    const bgTextPref = bestTextColor(colors.background);
    root.style.setProperty("--foreground", bgTextPref === "light" ? "0 0% 98%" : "0 0% 9%");
    root.style.setProperty("--card-foreground", bgTextPref === "light" ? "0 0% 98%" : "0 0% 9%");

    // Primary
    root.style.setProperty("--primary", hslStringFromHex(colors.primary));
    root.style.setProperty("--primary-foreground", bestTextColor(colors.primary) === "light" ? "0 0% 98%" : "0 0% 9%");

    // Accent
    root.style.setProperty("--accent", hslStringFromHex(colors.accent));
    root.style.setProperty("--accent-foreground", bestTextColor(colors.accent) === "light" ? "0 0% 98%" : "0 0% 9%");

    // Destructive
    root.style.setProperty("--destructive", hslStringFromHex(colors.destructive));
    root.style.setProperty("--destructive-foreground", bestTextColor(colors.destructive) === "light" ? "0 0% 98%" : "0 0% 9%");

    // Ring follows primary tone
    root.style.setProperty("--ring", hslStringFromHex(colors.primary));
  }, []);

  const applyFont = useCallback((nextFont: string) => {
    const val = FONT_FAMILIES[nextFont] || FONT_FAMILIES["Montserrat Regular"];
    document.documentElement.style.setProperty("--app-font-family", val);
  }, []);

  // Apply theme, mode, font
  useEffect(() => {
    applyThemeClasses(theme, mode);
    if (theme === "custom") {
      applyCustomVariables(mode, customColors);
    } else {
      clearInlineVars();
    }
  }, [theme, mode, customColors, applyThemeClasses, applyCustomVariables, clearInlineVars]);

  useEffect(() => {
    applyFont(font);
  }, [font, applyFont]);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEYS.theme, t);
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEYS.mode, m);
  }, []);

  const setFont = useCallback((f: string) => {
    setFontState(f);
    localStorage.setItem(STORAGE_KEYS.font, f);
  }, []);

  const setCustomColors = useCallback((c: CustomColors) => {
    setCustomColorsState(c);
    localStorage.setItem(STORAGE_KEYS.custom, JSON.stringify(c));
    // Auto-switch to custom when saving
    setThemeState("custom");
    localStorage.setItem(STORAGE_KEYS.theme, "custom");
  }, []);

  const value = useMemo(
    () => ({ theme, mode, font, customColors, setTheme, setMode, setFont, setCustomColors }),
    [theme, mode, font, customColors, setTheme, setMode, setFont, setCustomColors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}