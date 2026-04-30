/**
 * Debug mode feature module
 * Provides visual debugging tools for inspecting the text extraction area and word boundaries
 */

import { getTextElement } from "./shared";

const DEBUG_OUTLINE_OVERLAY_CLASS = "reading-time-debug-outline-overlay";
const DEBUG_LABEL_CLASS = "reading-time-debug-label";
const DEBUG_STYLE_ID = "reading-time-debug-style";
const DEBUG_WORD_CLASS = "reading-time-debug-word";

let debugScrollHandler: (() => void) | null = null;

/**
 * Check if debug mode is currently active on this page
 */
export function isDebugActive(): boolean {
  return !!document.querySelector(`.${DEBUG_OUTLINE_OVERLAY_CLASS}`);
}

/**
 * Inject debug styles into the page
 */
function ensureDebugStyles(): void {
  if (document.getElementById(DEBUG_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = DEBUG_STYLE_ID;
  style.textContent = `
    .${DEBUG_OUTLINE_OVERLAY_CLASS} {
      position: absolute;
      border: 3px dashed #667eea;
      pointer-events: none;
      z-index: 10000;
      box-sizing: border-box;
    }
    .${DEBUG_LABEL_CLASS} {
      position: absolute;
      background: #667eea;
      color: white;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 3px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      white-space: nowrap;
    }
    .${DEBUG_WORD_CLASS} {
      background: rgba(102, 126, 234, 0.15);
      outline: 1px solid rgba(102, 126, 234, 0.4);
      border-radius: 2px;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Build a short CSS selector string describing an element
 */
function describeSelector(el: Element): string {
  const tag = el.tagName.toLowerCase();
  let selector = tag;
  if (el.id) selector += `#${el.id}`;
  if (el.classList.length) {
    selector += Array.from(el.classList)
      .map((c) => `.${c}`)
      .join("");
  }
  const role = el.getAttribute("role");
  if (role) selector += `[role="${role}"]`;
  return selector;
}

/**
 * Create and position the outline overlay to match the target element
 */
function createOutlineOverlay(target: HTMLElement): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.className = DEBUG_OUTLINE_OVERLAY_CLASS;

  const label = document.createElement("div");
  label.className = DEBUG_LABEL_CLASS;
  overlay.appendChild(label);

  document.body.appendChild(overlay);
  positionOutlineOverlay(overlay, target);
  return overlay;
}

/**
 * Sync the outline overlay position/size with the target element
 */
function positionOutlineOverlay(
  overlay: HTMLDivElement,
  target: HTMLElement,
): void {
  const rect = target.getBoundingClientRect();
  overlay.style.top = `${rect.top}px`;
  overlay.style.left = `${rect.left}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
}

/**
 * Enable debug mode: outline the target element and highlight words
 */
export function enableDebugMode(): void {
  disableDebugMode();
  ensureDebugStyles();

  const el = getTextElement() as HTMLElement;

  // Inject an absolutely positioned outline overlay
  const outlineOverlay = createOutlineOverlay(el);

  // Keep overlay in sync on scroll / resize
  debugScrollHandler = () => positionOutlineOverlay(outlineOverlay, el);
  // window.addEventListener("scroll", debugScrollHandler, { passive: true });
  window.addEventListener("resize", debugScrollHandler, { passive: true });

  // Walk text nodes inside the element and wrap each word in a span
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  for (const node of textNodes) {
    const text = node.nodeValue || "";
    const parts = text.split(/(\s+)/);
    if (parts.length <= 1 && !text.trim()) continue;

    const frag = document.createDocumentFragment();
    for (const part of parts) {
      if (/\S/.test(part)) {
        const span = document.createElement("span");
        span.className = DEBUG_WORD_CLASS;
        span.textContent = part;
        frag.appendChild(span);
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    }
    node.parentNode?.replaceChild(frag, node);
  }

  // Update label with selector info and word count
  const label = outlineOverlay.querySelector(
    `.${DEBUG_LABEL_CLASS}`,
  ) as HTMLElement;
  if (label) {
    const wordCount = document.querySelectorAll(`.${DEBUG_WORD_CLASS}`).length;
    label.textContent = `${describeSelector(el)} • ${wordCount.toLocaleString()} words`;
  }
}

/**
 * Disable debug mode: remove outline, highlights, and overlay
 */
export function disableDebugMode(): void {
  // Remove outline overlay element
  document.querySelector(`.${DEBUG_OUTLINE_OVERLAY_CLASS}`)?.remove();

  // Remove scroll/resize listeners
  if (debugScrollHandler) {
    window.removeEventListener("scroll", debugScrollHandler);
    window.removeEventListener("resize", debugScrollHandler);
    debugScrollHandler = null;
  }

  // Unwrap word highlight spans back to text nodes
  const wordSpans = Array.from(
    document.querySelectorAll(`.${DEBUG_WORD_CLASS}`),
  );
  for (const span of wordSpans) {
    const text = document.createTextNode(span.textContent || "");
    span.parentNode?.replaceChild(text, span);
  }

  // Merge adjacent text nodes for cleanliness
  document.body.normalize();

  // Remove injected style
  document.getElementById(DEBUG_STYLE_ID)?.remove();
}
