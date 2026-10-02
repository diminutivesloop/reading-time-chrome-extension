import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MessageRequest, MessageResponse } from "../src/messages";
import {
  applyCustomArticleSelection,
  calculatePageStats,
  getArticleElement,
  resetCustomArticle,
} from "../src/content";
import { chromeMessageListeners } from "./setup";

type MessageListener = (
  request: MessageRequest,
  sender: unknown,
  sendResponse: (response?: MessageResponse) => void,
) => unknown;

const messageListener = chromeMessageListeners[0] as MessageListener;

function setInnerText(element: HTMLElement, text: string): void {
  Object.defineProperty(element, "innerText", {
    configurable: true,
    value: text,
  });
}

function requestPageStats(wordsPerMinute: number): void {
  messageListener(
    { action: "getPageStats", wordsPerMinute },
    {},
    () => undefined,
  );
}

async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  document.body.replaceChildren();
  document.title = "Original title";
});

describe("getArticleElement", () => {
  it("prefers a lone article inside a lone main element", () => {
    const main = document.createElement("main");
    const article = document.createElement("article");
    main.appendChild(article);
    document.body.appendChild(main);

    expect(getArticleElement()).toBe(article);
  });

  it("falls back from multiple articles to the main element", () => {
    const main = document.createElement("main");
    main.append(
      document.createElement("article"),
      document.createElement("article"),
    );
    document.body.appendChild(main);

    expect(getArticleElement()).toBe(main);
  });

  it("uses main element when present and no articles are available", () => {
    const main = document.createElement("main");
    document.body.appendChild(main);

    expect(getArticleElement()).toBe(main);
  });

  it("uses a lone role-main element or the body when semantic containers are absent", () => {
    const roleMain = document.createElement("div");
    roleMain.setAttribute("role", "main");
    document.body.appendChild(roleMain);
    expect(getArticleElement()).toBe(roleMain);

    roleMain.remove();
    expect(getArticleElement()).toBe(document.body);
  });
});

describe("calculatePageStats", () => {
  it("calculates word count, text length, and rounded-up reading time", () => {
    const main = document.createElement("main");
    setInnerText(main, "one two three four five six seven");
    document.body.appendChild(main);

    expect(calculatePageStats(3)).toEqual({
      wordCount: 7,
      textLength: 33,
      readingMinutes: 3,
    });
  });

  it("omits reading time when WPM is non-positive", () => {
    const main = document.createElement("main");
    setInnerText(main, "one two");
    document.body.appendChild(main);

    expect(calculatePageStats(0)).toEqual({
      wordCount: 2,
      textLength: 7,
    });
  });
});

describe("appendReadingTimeToTitle", () => {
  it("formats sub-minute estimates and preserves the original title across updates", () => {
    const main = document.createElement("main");
    setInnerText(main, "one two");
    document.body.appendChild(main);

    requestPageStats(2);
    expect(document.title).toBe("[<1m] Original title");

    requestPageStats(1);
    expect(document.title).toBe("[2m] Original title");
  });

  it("refreshes the original title when the page changes it", () => {
    const main = document.createElement("main");
    setInnerText(main, "one two");
    document.body.appendChild(main);

    requestPageStats(1);
    document.title = "Page updated its title";
    requestPageStats(2);

    expect(document.title).toBe("[<1m] Page updated its title");
  });
});

describe("applyCustomArticleSelection", () => {
  it("persists a selector for the provided element", async () => {
    const article = document.createElement("article");
    article.className = "story-body";
    document.body.appendChild(article);

    await applyCustomArticleSelection(article);

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [`articleSelector:${location.hostname}`]: "article.story-body",
    });
  });

  it("falls back to ancestor elements if unable to generate unique selector for element", async () => {
    const article = document.createElement("article");
    article.className = "story-body";
    const element1 = article.appendChild(document.createElement("div"));
    element1.className = "content";
    const element2 = article.appendChild(document.createElement("div"));
    element2.className = "content";
    document.body.appendChild(article);

    await applyCustomArticleSelection(element1);

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [`articleSelector:${location.hostname}`]: "article.story-body",
    });
  });
});

describe("resetCustomArticle", () => {
  it("clears the custom element and removes the persisted selector", async () => {
    const main = document.createElement("main");
    const article = document.createElement("div");
    article.className = "story-body";
    main.appendChild(article);
    document.body.appendChild(main);

    await applyCustomArticleSelection(article);
    expect(getArticleElement()).toBe(article);

    await resetCustomArticle();

    expect(getArticleElement()).toBe(main);
    expect(chrome.storage.local.remove).toHaveBeenCalledWith(
      `articleSelector:${location.hostname}`,
    );
  });
});

describe("resetCustomArticle failure", () => {
  it("rejects and keeps the custom element when removal fails", async () => {
    const main = document.createElement("main");
    const article = document.createElement("div");
    article.className = "story-body";
    main.appendChild(article);
    document.body.appendChild(main);
    await applyCustomArticleSelection(article);

    vi.mocked(chrome.storage.local.remove).mockRejectedValueOnce(
      new Error("fail"),
    );

    await expect(resetCustomArticle()).rejects.toThrow("fail");
    expect(getArticleElement()).toBe(article);
  });
});

describe("applyPersistedArticleSelector", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("uses a saved selector that resolves to exactly one element", async () => {
    const postBody = document.createElement("div");
    postBody.className = "post-body";
    setInnerText(postBody, "Saved selector content.");
    document.body.appendChild(postBody);

    vi.mocked(chrome.storage.local.get).mockImplementation((keys) => {
      if (Array.isArray(keys)) {
        const key = keys[0];
        if (key === `articleSelector:${location.hostname}`) {
          return Promise.resolve({ [key]: "div.post-body" });
        }
      }
      return Promise.resolve({});
    });

    const content = await import("../src/content");
    await flushPromises();

    expect(content.getArticleElement()).toBe(postBody);
  });

  it("falls back to native detection when the saved selector no longer matches", async () => {
    const main = document.createElement("main");
    setInnerText(main, "Fallback content.");
    document.body.appendChild(main);

    vi.mocked(chrome.storage.local.get).mockImplementation((keys) => {
      if (Array.isArray(keys)) {
        const key = keys[0];
        if (key === `articleSelector:${location.hostname}`) {
          return Promise.resolve({ [key]: "div.no-longer-there" });
        }
      }
      return Promise.resolve({});
    });

    const content = await import("../src/content");
    await flushPromises();

    expect(content.getArticleElement()).toBe(main);
  });
});
