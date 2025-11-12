"use client";

import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

type ThemeName = "default" | "shallow" | "deep" | "sunrise" | "sunset" | "aldora";
type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeName;
  mode: ThemeMode;
  font: string;
  setTheme: (t: ThemeName) => void;
  setMode: (m: ThemeMode) => void;
  setFont: (f: string) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_CLASSES: ThemeName[] = ["default", "shallow", "deep", "sunrise", "sunset", "aldora"];

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
};

export default function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [theme, setThemeState] = useState<ThemeName>("default");
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [font, setFontState] = useState<string>("Geist Sans");

  // Initialize from localStorage
  useEffect(() => {
    const storedTheme = (localStorage.getItem(STORAGE_KEYS.theme) as ThemeName) || "default";
    const storedMode = (localStorage.getItem(STORAGE_KEYS.mode) as ThemeMode) || "light";
    const storedFont = localStorage.getItem(STORAGE_KEYS.font) || "Geist Sans";
    setThemeState(storedTheme);
    setModeState(storedMode);
    setFontState(storedFont);
  }, []);

  const applyTheme = useCallback(
    (nextTheme: ThemeName, nextMode: ThemeMode) => {
      const root = document.documentElement;
      // Remove previous theme classes
      THEME_CLASSES.forEach((t) => root.classList.remove(`theme-${t}`));
      // Add selected theme class
      root.classList.add(`theme-${nextTheme}`);
      // Handle dark mode toggle
      if (nextMode === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    },
    []
  );

  const applyFont = useCallback((nextFont: string) => {
    const val = FONT_FAMILIES[nextFont] || FONT_FAMILIES["Geist Sans"];
    document.documentElement.style.setProperty("--app-font-family", val);
  }, []);

  // Apply on changes
  useEffect(() => {
    applyTheme(theme, mode);
  }, [theme, mode, applyTheme]);

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

  const value = useMemo(
    () => ({ theme, mode, font, setTheme, setMode, setFont }),
    [theme, mode, font, setTheme, setMode, setFont]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}