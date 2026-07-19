import type { MouseEvent as ReactMouseEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

const NON_DRAG_SELECTOR =
  "button, a, input, textarea, select, option, label, [role='button'], [contenteditable='true']";

/** Start window drag unless the event began on an interactive control. */
export function startWindowDrag(e: ReactMouseEvent | MouseEvent) {
  if (e.button !== 0) return;
  if (e.detail > 1) return; // ignore double-click (maximize, etc.)

  const target = e.target;
  if (target instanceof Element && target.closest(NON_DRAG_SELECTOR)) return;

  e.preventDefault();
  void getCurrentWindow().startDragging();
}
