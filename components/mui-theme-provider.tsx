// components/mui-theme-provider.tsx
"use client";

import * as React from "react";
import { ThemeProvider as MuiThemeProviderBase, createTheme } from "@mui/material/styles";

const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#7c3aed", // Tailwind purple-600
    },
    secondary: {
      main: "#2563eb", // Tailwind blue-600
    },
    background: {
      default: "#f8fafc", // slate-50
      paper: "#ffffff",
    },
  },
  shape: {
    borderRadius: 12,
  },
});

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#a855f7", // purple-500
    },
    secondary: {
      main: "#60a5fa", // blue-400
    },
    background: {
      default: "#020617", // slate-950
      paper: "#020617",
    },
  },
  shape: {
    borderRadius: 12,
  },
});

export function MuiThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      const classList = root.classList;
      setIsDark(classList.contains("dark"));
    }
  }, []);

  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      const root = document.documentElement;
      setIsDark(root.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <MuiThemeProviderBase theme={isDark ? darkTheme : lightTheme}>
      {children}
    </MuiThemeProviderBase>
  );
}
