/**
 * In-page article selection flow.
 * Users click the first and last paragraph-like block, then we resolve
 * the nearest common ancestor as the article container.
 */

export const SELECTION_STYLE_ID = "reading-time-article-selection-style";
export const SELECTION_HUD_ID = "reading-time-article-selection-hud";
export const HOVER_CLASS = "reading-time-article-selection-hover";
export const CONTAINER_CLASS = "reading-time-article-selection-container";
export const HUD_MESSAGE_CLASS = "rt-sel-msg";
export const HUD_CANCEL_CLASS = "rt-sel-cancel";
export const HUD_CONFIRM_CLASS = "rt-sel-confirm";

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
    #${SELECTION_HUD_ID} {
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      background: #0f172a;
      color: #e2e8f0;
      border: 1px solid #334155;
      border-radius: 10px;
      box-shadow: 0 10px 32px rgba(15, 23, 42, 0.45);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 10px 14px;
      pointer-events: none;
      display: flex;
      align-items: center;
      gap: 12px;
      white-space: nowrap;
    }

    #${SELECTION_HUD_ID} .${HUD_CANCEL_CLASS} {
      pointer-events: auto;
      background: #334155;
      color: #e2e8f0;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      cursor: pointer;
      line-height: 1.4;
    }

    #${SELECTION_HUD_ID} .${HUD_CANCEL_CLASS}:hover {
      background: #475569;
    }

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

    #${SELECTION_HUD_ID} .${HUD_CONFIRM_CLASS} {
      pointer-events: auto;
      background: #22c55e;
      color: #052e16;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      cursor: pointer;
      line-height: 1.4;
    }

    #${SELECTION_HUD_ID} .${HUD_CONFIRM_CLASS}:hover {
      background: #16a34a;
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

  const msg = document.createElement("span");
  msg.className = HUD_MESSAGE_CLASS;
  msg.textContent = text;

  const cancelBtn = document.createElement("button");
  cancelBtn.className = HUD_CANCEL_CLASS;
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancel";

  hud.appendChild(msg);
  hud.appendChild(cancelBtn);
  document.body.appendChild(hud);
  return hud;
}

function updateHud(hud: HTMLElement, text: string): void {
  const msg = hud.querySelector(`.${HUD_MESSAGE_CLASS}`);
  if (msg) msg.textContent = text;
}

function switchHudToConfirmation(
  hud: HTMLElement,
  onConfirm: () => void,
  onCancel: () => void,
): void {
  updateHud(hud, "Use this as the article container?");

  hud.querySelector(`.${HUD_CANCEL_CLASS}`)?.remove();

  const confirmBtn = document.createElement("button");
  confirmBtn.className = HUD_CONFIRM_CLASS;
  confirmBtn.type = "button";
  confirmBtn.textContent = "Confirm";
  confirmBtn.addEventListener("click", onConfirm);

  const cancelBtn = document.createElement("button");
  cancelBtn.className = HUD_CANCEL_CLASS;
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", onCancel);

  hud.appendChild(confirmBtn);
  hud.appendChild(cancelBtn);
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
      const cancelBtn = hudEl?.querySelector(`.${HUD_CANCEL_CLASS}`);
      if (
        cancelBtn &&
        (event.target === cancelBtn || cancelBtn.contains(event.target as Node))
      ) {
        event.stopImmediatePropagation();
        cleanup();
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
