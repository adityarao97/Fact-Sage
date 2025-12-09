"use client";

import { useEffect, useState } from "react";

export default function SkipLink() {
  const [isScrollable, setIsScrollable] = useState(false);

  // Only show skip link when the page actually scrolls
  useEffect(() => {
    const checkScrollable = () => {
      const root = document.documentElement;
      const scrollable = root.scrollHeight > window.innerHeight + 8;
      setIsScrollable(scrollable);
    };

    checkScrollable();
    window.addEventListener("resize", checkScrollable);
    return () => window.removeEventListener("resize", checkScrollable);
  }, []);

  if (!isScrollable) return null;

  const focusMain = () => {
    const main = document.querySelector<HTMLElement>("#main-content");
    if (main) {
      // Ensure main can receive focus for the skip link
      if (!main.hasAttribute("tabindex")) {
        main.setAttribute("tabindex", "-1");
      }
      main.focus();
      main.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <a
      href="#main-content"
      className="skip-link"
      onClick={(e) => {
        // let the browser handle the hash jump, but also manage focus
        e.preventDefault();
        focusMain();
        // blur the link so :focus styles are removed
        (e.currentTarget as HTMLAnchorElement).blur();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          focusMain();
          (e.currentTarget as HTMLAnchorElement).blur();
        }
      }}
    >
      Skip to main content
    </a>
  );
}
