import { afterEach, describe, expect, it } from "vitest";
import {
  CONTAINER_CLASS,
  HOVER_CLASS,
  HUD_CANCEL_CLASS,
  HUD_CONFIRM_CLASS,
  SELECTION_HUD_ID,
  SELECTION_STYLE_ID,
  buildSelectorForElement,
  resolveUniqueSelector,
  startCustomArticleSelection,
} from "../src/article-selection";

const paragraphText =
  "This is long enough to be recognized as a readable paragraph block.";

function addParagraph(parent: HTMLElement, text = paragraphText): HTMLElement {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  parent.appendChild(paragraph);
  return paragraph;
}

function click(target: EventTarget): void {
  target.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
}

function moveTo(target: EventTarget): void {
  target.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
}

function setInnerText(element: HTMLElement, text: string): void {
  Object.defineProperty(element, "innerText", {
    configurable: true,
    value: text,
  });
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("custom article selection", () => {
  it("resolves the nearest common ancestor after confirmation", async () => {
    const article = document.createElement("article");
    const container1 = document.createElement("div");
    const container2 = document.createElement("div");
    const first = addParagraph(container1);
    const last = addParagraph(container2);
    article.append(container1, container2);
    document.body.appendChild(article);

    const selection = startCustomArticleSelection();
    click(first);
    expect(first.classList.contains(CONTAINER_CLASS)).toBe(true);

    click(last);
    const confirmButton = document.querySelector<HTMLButtonElement>(
      `.${HUD_CONFIRM_CLASS}`,
    );
    expect(confirmButton).not.toBeNull();
    expect(article.classList.contains(CONTAINER_CLASS)).toBe(true);

    click(confirmButton!);

    await expect(selection).resolves.toBe(article);
    expect(article.classList.contains(CONTAINER_CLASS)).toBe(false);
    expect(document.getElementById(SELECTION_HUD_ID)).toBe(null);
    expect(document.getElementById(SELECTION_STYLE_ID)).toBe(null);
  });

  it("climbs from an inline event target to a readable block and applies hover state", () => {
    const block = document.createElement("div");
    const inlineChild = document.createElement("span");
    inlineChild.textContent = "Inline text inside a readable block.";
    block.appendChild(inlineChild);
    setInnerText(
      block,
      "This generic block has enough text to be considered readable by the selector.",
    );

    const inlineOnly = document.createElement("span");
    inlineOnly.textContent =
      "This inline element has plenty of text but is not block-like.";
    setInnerText(inlineOnly, inlineOnly.textContent);

    const excludedButton = document.createElement("button");
    excludedButton.textContent =
      "This control has enough text but must not be a readable target.";
    document.body.append(block, inlineOnly, excludedButton);

    startCustomArticleSelection();

    moveTo(inlineChild);
    expect(block.classList.contains(HOVER_CLASS)).toBe(true);

    moveTo(inlineOnly);
    expect(block.classList.contains(HOVER_CLASS)).toBe(false);
    expect(inlineOnly.classList.contains(HOVER_CLASS)).toBe(false);

    moveTo(excludedButton);
    expect(excludedButton.classList.contains(HOVER_CLASS)).toBe(false);
  });

  it("ignores short targets and cancels cleanly with Escape", () => {
    const wrapper = document.createElement("section");
    const short = document.createElement("p");
    short.textContent = "Too short";
    wrapper.appendChild(short);
    const readable = addParagraph(wrapper);
    document.body.appendChild(wrapper);

    startCustomArticleSelection();
    click(short);
    expect(short.classList.contains(CONTAINER_CLASS)).toBe(false);

    click(readable);
    expect(readable.classList.contains(CONTAINER_CLASS)).toBe(true);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(readable.classList.contains(CONTAINER_CLASS)).toBe(false);
    expect(document.getElementById(SELECTION_HUD_ID)).toBe(null);
    expect(document.getElementById(SELECTION_STYLE_ID)).toBe(null);
  });

  it("does not leave selection active after the HUD cancel button is clicked", () => {
    const paragraph = addParagraph(document.body);

    startCustomArticleSelection();
    const cancelButton = document.querySelector<HTMLButtonElement>(
      `.${HUD_CANCEL_CLASS}`,
    );
    expect(cancelButton).not.toBeNull();

    click(cancelButton!);

    expect(paragraph.classList.contains(HOVER_CLASS)).toBe(false);
    expect(document.getElementById(SELECTION_HUD_ID)).toBe(null);
  });
});

describe("buildSelectorForElement", () => {
  it("prefers a unique id over tag and classes", () => {
    const el = document.createElement("div");
    el.id = "main-article";
    el.className = "content body";
    document.body.appendChild(el);

    expect(buildSelectorForElement(el)).toBe("#main-article");
  });

  it("builds a tag-plus-classes selector when there is no id", () => {
    const el = document.createElement("article");
    el.className = "post-content story-body";
    document.body.appendChild(el);

    expect(buildSelectorForElement(el)).toBe("article.post-content.story-body");
  });

  it("falls back to the bare tag name when there are no classes", () => {
    const el = document.createElement("article");
    document.body.appendChild(el);

    expect(buildSelectorForElement(el)).toBe("article");
  });

  it("escapes class names that need it", () => {
    const el = document.createElement("div");
    el.classList.add("col-6/12");
    document.body.appendChild(el);

    expect(buildSelectorForElement(el)).toBe(`div.${CSS.escape("col-6/12")}`);
  });
});

describe("resolveUniqueSelector", () => {
  it("returns the element itself when its selector is already unique", () => {
    const el = document.createElement("article");
    el.className = "story";
    document.body.appendChild(el);

    expect(resolveUniqueSelector(el)).toEqual({
      element: el,
      selector: "article.story",
    });
  });

  it("walks up to the nearest ancestor with a unique selector", () => {
    const article = document.createElement("article");
    article.className = "story";
    const first = document.createElement("div");
    first.className = "content";
    const second = document.createElement("div");
    second.className = "content";
    article.append(first, second);
    document.body.appendChild(article);

    expect(resolveUniqueSelector(first)).toEqual({
      element: article,
      selector: "article.story",
    });
  });

  it("returns null when no element in the chain has a unique selector", () => {
    const first = document.createElement("div");
    document.body.appendChild(first);
    const second = document.createElement("div");
    document.body.appendChild(second);

    expect(resolveUniqueSelector(first)).toBeNull();
  });
});
