"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Drag-to-resize behavior for a sidebar/navbar panel, with the chosen width
 * persisted to localStorage so it survives reloads.
 *
 * Usage:
 *   const sidebar = useResizableSidebar({ storageKey: "es-nav-w", defaultWidth: 256, min: 200, max: 420 });
 *   <aside style={{ width: sidebar.width }} className={sidebar.resizing ? "" : "transition-[width]"}>
 *     <div onMouseDown={sidebar.onMouseDown} className="... cursor-col-resize" />
 *   </aside>
 *
 * `edge` is the side the drag handle sits on: "right" (default, for left-hand
 * sidebars — dragging right widens) or "left" (for right-hand panels — dragging
 * left widens).
 */
export function useResizableSidebar(opts: {
  storageKey: string;
  defaultWidth: number;
  min: number;
  max: number;
  edge?: "left" | "right";
}) {
  const { storageKey, defaultWidth, min, max, edge = "right" } = opts;
  const [width, setWidth] = useState(defaultWidth);
  const widthRef = useRef(defaultWidth);
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    const saved = Number(localStorage.getItem(storageKey));
    if (saved >= min && saved <= max) {
      setWidth(saved);
      widthRef.current = saved;
    }
  }, [storageKey, min, max]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = widthRef.current;
      setResizing(true);
      const onMove = (ev: MouseEvent) => {
        const delta = edge === "right" ? ev.clientX - startX : startX - ev.clientX;
        const next = Math.min(max, Math.max(min, startW + delta));
        widthRef.current = next;
        setWidth(next);
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.style.userSelect = "";
        setResizing(false);
        try {
          localStorage.setItem(storageKey, String(widthRef.current));
        } catch {
          /* ignore */
        }
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      document.body.style.userSelect = "none";
    },
    [storageKey, min, max, edge],
  );

  return { width, resizing, onMouseDown };
}
