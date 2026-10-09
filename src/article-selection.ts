/**
 * In-page article selection flow.
 * Users click the first and last paragraph-like block, then we resolve
 * the nearest common ancestor as the article container.
 */

import themeCss from "./theme.css";

export const SELECTION_STYLE_ID = "reading-time-article-selection-style";
export const SELECTION_HUD_ID = "reading-time-article-selection-hud";
export const HOVER_CLASS = "reading-time-article-selection-hover";
export const CONTAINER_CLASS = "reading-time-article-selection-container";
export const HUD_MESSAGE_CLASS = "rt-sel-msg";
export const HUD_CANCEL_CLASS = "rt-sel-cancel";
export const HUD_CONFIRM_CLASS = "rt-sel-confirm";
const HUD_PANEL_CLASS = "rt-sel-panel";

let activeCleanup: (() => void) | null = null;

const SEMANTIC_TEXT_TAGS = new Set([
  "p",
  "li",
  "blockquote",
  "pre",
  "td",
  "th",
  "figcaption",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

const EXCLUDED_TAGS = new Set([
  "script",
  "style",
  "noscript",
  "svg",
  "canvas",
  "input",
  "textarea",
  "button",
  "select",
  "option",
  "nav",
]);

function ensureSelectionStyles(): void {
  if (document.getElementById(SELECTION_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = SELECTION_STYLE_ID;
  style.textContent = `
    .${HOVER_CLASS} {
      outline: 3px solid #f59e0b !important;
      outline-offset: 2px !important;
      background: rgba(245, 158, 11, 0.08) !important;
      cursor: crosshair !important;
    }

    .${CONTAINER_CLASS} {
      outline: 3px solid #22c55e !important;
      outline-offset: 2px !important;
      background: rgba(34, 197, 94, 0.1) !important;
    }

  `;

  document.head.appendChild(style);
}

function removeSelectionStyles(): void {
  document.getElementById(SELECTION_STYLE_ID)?.remove();
}

function showHud(text: string): HTMLDivElement {
  const hud = document.createElement("div");
  hud.id = SELECTION_HUD_ID;
  hud.addEventListener("click", (event) => event.stopPropagation());
  const root = hud.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `${themeCss}
    :host {
      all: initial;
      --reading-time-sepia: #f4ecd8;
      --reading-time-paper: #fffaf0;
      --reading-time-burgundy: #712636;
      --reading-time-burgundy-shadow: rgba(113, 38, 54, 0.2);
      --reading-time-burgundy-hover-shadow: rgba(113, 38, 54, 0.14);
      position: fixed;
      left: 50%;
      bottom: 16px;
      transform: translateX(-50%);
      z-index: 2147483647;
      display: block;
      width: max-content;
      height: auto;
    }

    .${HUD_PANEL_CLASS} {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: 12px;
      white-space: nowrap;
      pointer-events: none;
      background: var(--reading-time-sepia);
      color: var(--reading-time-burgundy);
      border: 1px solid var(--reading-time-burgundy);
      border-radius: 10px;
      box-shadow: 0 8px 24px var(--reading-time-burgundy-shadow);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 10px 14px;
    }

    button {
      box-sizing: border-box;
      appearance: none;
      -webkit-appearance: none;
      margin: 0;
      pointer-events: auto;
      border: 0;
      border-radius: 6px;
      font-family: inherit;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      cursor: pointer;
      line-height: 1.4;
    }

    .${HUD_CANCEL_CLASS}, .${HUD_CONFIRM_CLASS} {
      pointer-events: auto;
    }
  `;
  root.appendChild(style);
  const panel = document.createElement("div");
  panel.className = HUD_PANEL_CLASS;

  const msg = document.createElement("span");
  msg.className = HUD_MESSAGE_CLASS;
  msg.textContent = text;

  const cancelBtn = document.createElement("button");
  cancelBtn.className = `${HUD_CANCEL_CLASS} reading-time-ui-button reading-time-ui-button-secondary reading-time-ui-button-compact`;
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancel";

  panel.append(msg, cancelBtn);
  root.appendChild(panel);
  document.body.appendChild(hud);
  return hud;
}

function updateHud(hud: HTMLElement, text: string): void {
  const msg = hud.shadowRoot?.querySelector(`.${HUD_MESSAGE_CLASS}`);
  if (msg) msg.textContent = text;
}

function switchHudToConfirmation(
  hud: HTMLElement,
  onConfirm: () => void,
  onCancel: () => void,
): void {
  updateHud(hud, "Use this as the article container?");

  const panel = hud.shadowRoot?.querySelector(`.${HUD_PANEL_CLASS}`);
  hud.shadowRoot?.querySelector(`.${HUD_CANCEL_CLASS}`)?.remove();

  const confirmBtn = document.createElement("button");
  confirmBtn.className = `${HUD_CONFIRM_CLASS} reading-time-ui-button reading-time-ui-button-primary reading-time-ui-button-compact`;
  confirmBtn.type = "button";
  confirmBtn.textContent = "Confirm";
  confirmBtn.addEventListener("click", onConfirm);

  const cancelBtn = document.createElement("button");
  cancelBtn.className = `${HUD_CANCEL_CLASS} reading-time-ui-button reading-time-ui-button-secondary reading-time-ui-button-compact`;
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", onCancel);

  panel?.append(confirmBtn, cancelBtn);
}

function removeHud(): void {
  document.getElementById(SELECTION_HUD_ID)?.remove();
}

function hasEnoughText(el: HTMLElement): boolean {
  const text = (el.innerText || el.textContent || "").trim();
  return text.length >= 30;
}

function isReadableBlock(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (EXCLUDED_TAGS.has(tag)) return false;
  if (!hasEnoughText(el)) return false;

  if (SEMANTIC_TEXT_TAGS.has(tag)) {
    return true;
  }

  const style = window.getComputedStyle(el);
  const display = style.display;
  const isBlockLike =
    display === "block" ||
    display === "list-item" ||
    display === "table-cell" ||
    display === "table" ||
    display === "flex" ||
    display === "grid";

  if (!isBlockLike) {
    return false;
  }

  return (el.innerText || "").trim().length >= 60;
}

function getReadableTargetFromEventTarget(
  target: EventTarget | null,
): HTMLElement | null {
  let current = target instanceof Element ? target : null;

  while (current && current !== document.body) {
    if (
      current.id === SELECTION_HUD_ID ||
      current.closest(`#${SELECTION_HUD_ID}`)
    ) {
      return null;
    }

    if (current instanceof HTMLElement && isReadableBlock(current)) {
      return current;
    }

    current = current.parentElement;
  }

  return document.body instanceof HTMLElement && isReadableBlock(document.body)
    ? document.body
    : null;
}

function findNearestCommonAncestor(
  a: HTMLElement,
  b: HTMLElement,
): HTMLElement {
  const ancestorsOfA = new Set<HTMLElement>();

  let current: HTMLElement | null = a;
  while (current) {
    ancestorsOfA.add(current);
    current = current.parentElement;
  }

  current = b;
  while (current) {
    if (ancestorsOfA.has(current)) {
      return current;
    }
    current = current.parentElement;
  }

  return document.body;
}

export function cancelCustomArticleSelection(): void {
  if (!activeCleanup) return;
  activeCleanup();
}

/**
 * Build a CSS selector from an element's tag and classes (no structural/ancestor path)
 */
export function buildSelectorForElement(el: HTMLElement): string {
  if (el.id && document.getElementById(el.id) === el) {
    return `#${CSS.escape(el.id)}`;
  }

  const tag = el.tagName.toLowerCase();
  const classes = Array.from(el.classList).filter((c) => c.trim().length > 0);
  if (classes.length === 0) {
    return tag;
  }

  return `${tag}${classes.map((c) => `.${CSS.escape(c)}`).join("")}`;
}

/**
 * Walk up from el until its selector resolves to exactly that one element
 * (a tag+classes selector can otherwise match several elements on the page).
 * Returns null if no element up to <body> has a unique selector.
 */
export function resolveUniqueSelector(el: HTMLElement): {
  element: HTMLElement;
  selector: string;
} | null {
  let current: HTMLElement | null = el;
  while (current && current !== document.body) {
    const selector = buildSelectorForElement(current);
    if (document.querySelectorAll(selector).length === 1) {
      return { element: current, selector };
    }
    current = current.parentElement;
  }

  return null;
}

export function startCustomArticleSelection(): Promise<HTMLElement> {
  return new Promise<HTMLElement>((resolve) => {
    cancelCustomArticleSelection();
    ensureSelectionStyles();

    const hud = showHud(
      "Click the first paragraph of the article. Press Esc to cancel.",
    );
    let hovered: HTMLElement | null = null;
    let firstPick: HTMLElement | null = null;
    let articleRoot: HTMLElement | null = null;

    const setHovered = (next: HTMLElement | null): void => {
      if (hovered === next) return;

      if (hovered && hovered !== firstPick) {
        hovered.classList.remove(HOVER_CLASS);
      }

      hovered = next;

      if (hovered && hovered !== firstPick) {
        hovered.classList.add(HOVER_CLASS);
      }
    };

    const onMouseMove = (event: MouseEvent): void => {
      setHovered(getReadableTargetFromEventTarget(event.target));
    };

    const onClick = (event: MouseEvent): void => {
      const hudEl = document.getElementById(SELECTION_HUD_ID);
      const cancelBtn = hudEl?.shadowRoot?.querySelector(
        `.${HUD_CANCEL_CLASS}`,
      );
      if (cancelBtn && event.composedPath().includes(cancelBtn)) {
        event.stopImmediatePropagation();
        cleanup();
        return;
      }
      if (hudEl && event.composedPath().includes(hudEl)) {
        event.stopImmediatePropagation();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const target = getReadableTargetFromEventTarget(event.target);
      if (!target) {
        return;
      }

      if (!firstPick) {
        firstPick = target;
        firstPick.classList.remove(HOVER_CLASS);
        firstPick.classList.add(CONTAINER_CLASS);
        updateHud(
          hud,
          "Now click the last paragraph of the article. Press Esc to cancel.",
        );
        return;
      }

      // Second pick — resolve container and enter confirmation phase
      articleRoot = findNearestCommonAncestor(firstPick, target);

      // Stop selection interaction (keydown stays active for Esc-to-cancel)
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("click", onClick, true);

      // Clear pick highlights and hover
      setHovered(null);
      firstPick.classList.remove(CONTAINER_CLASS);
      firstPick = null;
      target.classList.remove(HOVER_CLASS);

      // Highlight resolved container
      articleRoot.classList.add(CONTAINER_CLASS);
      let selectedContainer = articleRoot;

      switchHudToConfirmation(
        hud,
        () => {
          cleanup();
          // Confirmed — cleanup removes container highlight, then apply
          resolve(selectedContainer);
        },
        () => cleanup(),
      );
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      cleanup();
    };

    const cleanup = (): void => {
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKeyDown, true);

      if (hovered) {
        hovered.classList.remove(HOVER_CLASS);
        hovered = null;
      }

      if (firstPick) {
        firstPick.classList.remove(CONTAINER_CLASS);
        firstPick = null;
      }

      if (articleRoot) {
        articleRoot.classList.remove(CONTAINER_CLASS);
        articleRoot = null;
      }

      removeHud();
      removeSelectionStyles();
      activeCleanup = null;
    };

    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKeyDown, true);

    activeCleanup = cleanup;
  });
}
