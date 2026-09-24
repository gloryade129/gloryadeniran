'use client';

import React, { useEffect, useState } from "react";
import { ToggleButton, useTheme } from "@once-ui-system/core";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("dark");

  useEffect(() => {
    setMounted(true);
    setCurrentTheme(document.documentElement.getAttribute("data-theme") || "dark");
  }, []);

  useEffect(() => {
    setCurrentTheme(document.documentElement.getAttribute("data-theme") || "dark");
  }, [theme]);

  if (!mounted) return null;

  const nextTheme = currentTheme === "light" ? "dark" : "light";

  return (
    <ToggleButton
      prefixIcon={currentTheme === "dark" ? "light" : "dark"}
      onClick={() => {
        setTheme(nextTheme);
        document.documentElement.setAttribute("data-theme", nextTheme);
        localStorage.setItem("data-theme", nextTheme);
      }}
      aria-label={`Switch to ${nextTheme} mode`}
    />
  );
};

export default ThemeToggle;
