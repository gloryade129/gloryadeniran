'use client';

import React, { useEffect, useState } from "react";
import { ToggleButton, useTheme } from "@once-ui-system/core";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("dark");

  const applyTheme = (targetTheme) => {
    setCurrentTheme(targetTheme);
    try {
      document.documentElement.setAttribute("data-theme", targetTheme);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(targetTheme);

      document.body.setAttribute("data-theme", targetTheme);
      document.body.classList.remove("light", "dark");
      document.body.classList.add(targetTheme);

      localStorage.setItem("data-theme", targetTheme);
    } catch (e) {}
  };

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("data-theme") || 
      document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(saved);
  }, []);

  useEffect(() => {
    if (theme && theme !== currentTheme) {
      applyTheme(theme);
    }
  }, [theme]);

  if (!mounted) return null;

  const nextTheme = currentTheme === "light" ? "dark" : "light";

  return (
    <ToggleButton
      prefixIcon={currentTheme === "dark" ? "light" : "dark"}
      onClick={() => {
        setTheme(nextTheme);
        applyTheme(nextTheme);
      }}
      aria-label={`Switch to ${nextTheme} mode`}
      style={{
        borderRadius: '9999px',
        transition: 'all 0.25s cubic-bezier(0.2, 0, 0, 1)',
      }}
    />
  );
};

export default ThemeToggle;
