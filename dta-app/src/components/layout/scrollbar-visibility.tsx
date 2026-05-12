"use client";

import { useEffect } from "react";

const SCROLLING_CLASS = "is-scrolling";
const EDGE_HOVER_CLASS = "is-scrollbar-hover";
const SCROLL_IDLE_DELAY_MS = 700;
const EDGE_HOVER_PX = 22;

export function ScrollbarVisibility() {
  useEffect(() => {
    let timeoutId: number | undefined;

    const setScrolling = () => {
      document.documentElement.classList.add(SCROLLING_CLASS);

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        document.documentElement.classList.remove(SCROLLING_CLASS);
      }, SCROLL_IDLE_DELAY_MS);
    };

    const setEdgeHover = (event: MouseEvent) => {
      const distanceFromRight = window.innerWidth - event.clientX;
      const isHoveringEdge = distanceFromRight >= 0 && distanceFromRight <= EDGE_HOVER_PX;

      document.documentElement.classList.toggle(EDGE_HOVER_CLASS, isHoveringEdge);
    };

    const clearEdgeHover = () => {
      document.documentElement.classList.remove(EDGE_HOVER_CLASS);
    };

    window.addEventListener("scroll", setScrolling, { passive: true });
    window.addEventListener("mousemove", setEdgeHover, { passive: true });
    window.addEventListener("mouseout", clearEdgeHover);

    return () => {
      window.removeEventListener("scroll", setScrolling);
      window.removeEventListener("mousemove", setEdgeHover);
      window.removeEventListener("mouseout", clearEdgeHover);

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }

      document.documentElement.classList.remove(SCROLLING_CLASS);
      document.documentElement.classList.remove(EDGE_HOVER_CLASS);
    };
  }, []);

  return null;
}
