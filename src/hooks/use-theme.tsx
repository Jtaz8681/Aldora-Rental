"use client";

import { useContext } from "react";
import { ThemeContext } from "@/integrations/theme/ThemeProvider";

export default function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}