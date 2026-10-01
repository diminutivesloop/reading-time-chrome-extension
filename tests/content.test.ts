import { beforeEach, describe, expect, it } from "vitest";
import type { MessageRequest, MessageResponse } from "../src/messages";
import { calculatePageStats, getArticleElement } from "../src/content";
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
